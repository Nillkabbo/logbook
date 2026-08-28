import { describe, expect, it } from 'vitest';

import { logsModel } from './logs';
import { DEFAULT_SETTINGS, type Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

const session = (id: number, checkIn: Date, checkOut: Date | null, note = ''): Session => ({
  id,
  checkIn,
  checkOut,
  note,
});

describe('logsModel', () => {
  // Thursday-start weeks. Week A = Thu Aug 27 – Wed Sep 2 2026 (current),
  // week B = Thu Aug 20 – Wed Aug 26 (previous).
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };

  // Week B: Tuesday session, Wednesday session, and a midnight-crossing session
  // owned by Wednesday (ADR-0001) even though its checkout lands in week A.
  const tue = session(1, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0)); // 2h
  const wed = session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0)); // 2h
  const overnight = session(3, at(2026, 7, 26, 23, 0), at(2026, 7, 27, 1, 0)); // 2h
  // Week A: two completed sessions today (Thu) plus one running.
  const early = session(4, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 45)); // 45m
  const late = session(5, at(2026, 7, 27, 10, 0), at(2026, 7, 27, 11, 30)); // 1h30m
  const running = session(6, at(2026, 7, 27, 11, 45), null);

  it('groups into weeks, newest first, labeled by date range', () => {
    const weeks = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    expect(weeks.map((w) => w.label)).toEqual(['Thu, Aug 27 – Wed, Sep 2', 'Thu, Aug 20 – Wed, Aug 26']);
  });

  it('week totals count completed sessions only, against the target with progress', () => {
    const weeks = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    expect(weeks[0].totalSeconds).toBe(2700 + 5400); // running excluded
    expect(weeks[0].totalLabel).toBe('2:15');
    expect(weeks[1].totalSeconds).toBe(7200 + 7200 + 7200); // midnight-crossing owned by week B
    expect(weeks[1].totalLabel).toBe('6:00');
    expect(weeks[0].targetLabel).toBe('40:00');
    expect(weeks[0].progress).toBeCloseTo(8100 / 144000, 5);
    expect(weeks[0].overTarget).toBe(false);
  });

  it('flags an over-target week', () => {
    const weeks = logsModel([tue, wed, overnight], { ...THURSDAY, weeklyTargetHours: 4 });
    expect(weeks[0].overTarget).toBe(true);
    expect(weeks[0].progress).toBeGreaterThan(1);
  });

  it('groups days within a week newest first, sessions within a day oldest first', () => {
    const weeks = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    const weekB = weeks[1];
    expect(weekB.days.map((d) => d.label)).toEqual(['Wed, Aug 26', 'Tue, Aug 25']);
    expect(weekB.days[0].sessions.map((s) => s.id)).toEqual([2, 3]);
    const weekA = weeks[0];
    expect(weekA.days[0].sessions.map((s) => s.id)).toEqual([4, 5, 6]);
  });

  it('day totals count completed sessions only; the running session is listed but not summed', () => {
    const weeks = logsModel([early, late, running], THURSDAY);
    expect(weeks[0].days[0].totalLabel).toBe('2:15');
    expect(weeks[0].days[0].sessions.map((s) => s.id)).toEqual([4, 5, 6]);
  });

  it('the midnight-crossing session appears under its check-in day', () => {
    const weeks = logsModel([overnight], THURSDAY);
    expect(weeks[0].label).toBe('Thu, Aug 20 – Wed, Aug 26');
    expect(weeks[0].days).toHaveLength(1);
    expect(weeks[0].days[0].label).toBe('Wed, Aug 26');
  });

  it('no sessions yields an empty list', () => {
    expect(logsModel([], THURSDAY)).toEqual([]);
  });
});
