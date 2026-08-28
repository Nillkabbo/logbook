import { describe, expect, it } from 'vitest';

import { logsModel } from './logs';
import { DEFAULT_SETTINGS, type Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

const session = (
  id: number,
  checkIn: Date,
  checkOut: Date | null,
  note = '',
  category = '',
): Session => ({
  id,
  checkIn,
  checkOut,
  note,
  category,
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
    expect(weeks[0].totalLabel).toBe('2:15'); // running excluded
    expect(weeks[1].totalLabel).toBe('6:00'); // midnight-crossing owned by week B
    expect(weeks[0].targetLabel).toBe('40:00');
    expect(weeks[0].progress).toBeCloseTo(8100 / 144000, 5);
    expect(weeks[0].overTarget).toBe(false);
    expect(weeks[0].overByLabel).toBeNull(); // under target — no chip
  });

  it('flags an over-target week and labels the overage', () => {
    const weeks = logsModel([tue, wed, overnight], { ...THURSDAY, weeklyTargetHours: 4 });
    expect(weeks[0].overTarget).toBe(true);
    expect(weeks[0].progress).toBeGreaterThan(1);
    expect(weeks[0].overByLabel).toBe('2:00'); // 6:00 total − 4:00 target
  });

  it('groups days within a week newest first, sessions within a day newest first', () => {
    const weeks = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    const weekB = weeks[1];
    expect(weekB.days.map((d) => d.label)).toEqual(['Wednesday', 'Tuesday']);
    expect(weekB.days[0].sessions.map((s) => s.id)).toEqual([3, 2]);
    const weekA = weeks[0];
    expect(weekA.days[0].sessions.map((s) => s.id)).toEqual([6, 5, 4]);
  });

  it('day totals count completed sessions only; the running session is listed but not summed', () => {
    const weeks = logsModel([early, late, running], THURSDAY);
    expect(weeks[0].days[0].totalLabel).toBe('2:15');
    expect(weeks[0].days[0].sessions.map((s) => s.id)).toEqual([6, 5, 4]);
  });

  it('the midnight-crossing session appears under its check-in day', () => {
    const weeks = logsModel([overnight], THURSDAY);
    expect(weeks[0].label).toBe('Thu, Aug 20 – Wed, Aug 26');
    expect(weeks[0].days).toHaveLength(1);
    expect(weeks[0].days[0].label).toBe('Wednesday');
  });

  it('no sessions yields an empty list', () => {
    expect(logsModel([], THURSDAY)).toEqual([]);
  });

  it('an Off week suspends judgment: no over-target, no overage, totals kept', () => {
    const weeks = logsModel([tue, wed, overnight], { ...THURSDAY, weeklyTargetHours: 4, offWeeks: ['2026-08-20'] });
    expect(weeks[0].off).toBe(true);
    expect(weeks[0].overTarget).toBe(false);
    expect(weeks[0].overByLabel).toBeNull();
    expect(weeks[0].totalLabel).toBe('6:00');
    expect(logsModel([tue], THURSDAY)[0].off).toBe(false);
  });

  it('a category filter recomputes everything over matches and hides empty weeks', () => {
    const NOW = at(2026, 7, 27, 12, 0);
    const weekBClient = session(7, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0), '', 'client');
    const weekAClient = session(8, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 30), '', 'client');
    const filtered = logsModel([weekBClient, weekAClient, early, late], THURSDAY, NOW, 'client');
    // Both weeks keep a client match; non-matching sessions drop out of every number.
    expect(filtered).toHaveLength(2);
    expect(filtered[0].totalLabel).toBe('1:30'); // week A: only weekAClient counts
    expect(filtered[0].categoryBreakdown).toEqual([{ label: 'client', totalLabel: '1:30' }]);
    expect(filtered[1].totalLabel).toBe('2:00'); // week B
    // A category with no matches yields an empty list
    expect(logsModel([early], THURSDAY, NOW, 'client')).toEqual([]);
  });

  it('weeks expose seven day bars scaled to the busiest day, today marked', () => {
    const NOW = at(2026, 7, 27, 12, 0); // Thursday, inside week A
    const weeks = logsModel([tue, wed, early, late], THURSDAY, NOW);
    // Week A (starts Thu Aug 27): only Thursday has sessions (2:15) → the busiest day, intensity 1.
    const weekA = weeks[0];
    expect(weekA.dayBars).toHaveLength(7);
    expect(weekA.dayBars[0]).toMatchObject({ isToday: true, intensity: 1 });
    expect(weekA.dayBars.slice(1).every((bar) => bar.intensity === 0)).toBe(true);
    // Week B (starts Thu Aug 20): Tue 2h and Wed 2h share the maximum → both 1; bars are [Thu..Wed].
    const weekB = weeks[1];
    expect(weekB.dayBars.map((bar) => bar.intensity)).toEqual([0, 0, 0, 0, 0, 1, 1]);
    expect(weekB.dayBars.every((bar) => bar.isToday === false)).toBe(true);
  });

  it('weeks show earnings when a rate is set, per completed total', () => {
    const weeks = logsModel(
      [early, late], // week A total 2:15
      { ...THURSDAY, hourlyRate: 25 },
    );
    expect(weeks[0].earningsLabel).toBe('$56.25');
    expect(weeks[0].targetLabel).toBe('40:00');
  });

  it('weeks carry a per-category breakdown of completed sessions, largest first', () => {    const a = session(7, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0), '', 'client site');
    const b = session(8, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 12, 0), '', 'study');
    const c = session(9, at(2026, 7, 26, 13, 0), at(2026, 7, 26, 15, 30), '', 'client site');
    const uncat = session(10, at(2026, 7, 25, 11, 0), at(2026, 7, 25, 11, 45));
    const run = session(11, at(2026, 7, 26, 16, 0), null, '', 'study'); // running — excluded
    const weeks = logsModel([a, b, c, uncat, run], THURSDAY);
    expect(weeks[0].categoryBreakdown).toEqual([
      { label: 'client site', totalLabel: '4:30' }, // 2h + 2h30m
      { label: 'study', totalLabel: '3:00' },
      { label: '', totalLabel: '0:45' }, // uncategorised
    ]);
  });
});

describe('logsModel expansion defaults', () => {
  // Week A (current) starts Thu Aug 27 2026; week B (previous) starts Thu Aug 20.
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
  const now = at(2026, 7, 28, 12, 0); // Friday, inside week A
  const weekASessions = [
    session(4, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 45)),
    session(5, at(2026, 7, 27, 10, 0), at(2026, 7, 27, 11, 30)),
  ];
  const weekBSessions = [
    session(1, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0)),
    session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0)),
  ];

  it('the current week defaults expanded; past weeks default collapsed', () => {
    const weeks = logsModel([...weekASessions, ...weekBSessions], THURSDAY, now);
    expect(weeks[0].label).toBe('Thu, Aug 27 – Wed, Sep 2');
    expect(weeks[0].defaultExpanded).toBe(true);
    expect(weeks[1].defaultExpanded).toBe(false);
    expect(weeks[0].isCurrent).toBe(true);
    expect(weeks[1].isCurrent).toBe(false);
  });

  it('an over-target week defaults expanded', () => {
    const weeks = logsModel([...weekASessions, ...weekBSessions], { ...THURSDAY, weeklyTargetHours: 3 }, now);
    expect(weeks[1].overTarget).toBe(true);
    expect(weeks[1].defaultExpanded).toBe(true);
  });

  it('an off week defaults collapsed even with logged time', () => {
    const weeks = logsModel([...weekASessions, ...weekBSessions], { ...THURSDAY, offWeeks: ['2026-08-20'] }, now);
    expect(weeks[1].off).toBe(true);
    expect(weeks[1].defaultExpanded).toBe(false);
  });

  it('a week that is both current and over-target defaults expanded once', () => {
    const weeks = logsModel(weekASessions, { ...THURSDAY, weeklyTargetHours: 1 }, now);
    expect(weeks).toHaveLength(1);
    expect(weeks[0].overTarget).toBe(true);
    expect(weeks[0].defaultExpanded).toBe(true);
  });
});
