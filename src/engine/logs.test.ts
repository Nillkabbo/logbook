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
  // Thursday-start result.weeks. Week A = Thu Aug 27 – Wed Sep 2 2026 (current),
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

  it('groups into result.weeks, newest first, labeled by date range', () => {
    const result = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    expect(result.weeks.map((w) => w.label)).toEqual(['Thu, Aug 27 – Wed, Sep 2', 'Thu, Aug 20 – Wed, Aug 26']);
  });

  it('week totals count completed sessions only, against the target with progress', () => {
    const result = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    expect(result.weeks[0].totalLabel).toBe('2:15'); // running excluded
    expect(result.weeks[1].totalLabel).toBe('6:00'); // midnight-crossing owned by week B
    expect(result.weeks[0].targetLabel).toBe('40:00');
    expect(result.weeks[0].progress).toBeCloseTo(8100 / 144000, 5);
    expect(result.weeks[0].overTarget).toBe(false);
    expect(result.weeks[0].overByLabel).toBeNull(); // under target — no chip
  });

  it('flags an over-target week and labels the overage', () => {
    const result = logsModel([tue, wed, overnight], { ...THURSDAY, weeklyTargetHours: 4 });
    expect(result.weeks[0].overTarget).toBe(true);
    expect(result.weeks[0].progress).toBeGreaterThan(1);
    expect(result.weeks[0].overByLabel).toBe('2:00'); // 6:00 total − 4:00 target
  });

  it('groups days within a week newest first, sessions within a day newest first', () => {
    const result = logsModel([tue, wed, overnight, early, late, running], THURSDAY);
    const weekB = result.weeks[1];
    expect(weekB.days.map((d) => d.label)).toEqual(['Wednesday', 'Tuesday']);
    expect(weekB.days[0].sessions.map((s) => s.id)).toEqual([3, 2]);
    const weekA = result.weeks[0];
    expect(weekA.days[0].sessions.map((s) => s.id)).toEqual([6, 5, 4]);
  });

  it('day totals count completed sessions only; the running session is listed but not summed', () => {
    const result = logsModel([early, late, running], THURSDAY);
    expect(result.weeks[0].days[0].totalLabel).toBe('2:15');
    expect(result.weeks[0].days[0].sessions.map((s) => s.id)).toEqual([6, 5, 4]);
  });

  it('the midnight-crossing session appears under its check-in day', () => {
    const result = logsModel([overnight], THURSDAY);
    expect(result.weeks[0].label).toBe('Thu, Aug 20 – Wed, Aug 26');
    expect(result.weeks[0].days).toHaveLength(1);
    expect(result.weeks[0].days[0].label).toBe('Wednesday');
  });

  it('no sessions yields an empty list', () => {
    expect(logsModel([], THURSDAY).weeks).toEqual([]);
  });

  it('an Off week suspends judgment: no over-target, no overage, totals kept', () => {
    const result = logsModel([tue, wed, overnight], { ...THURSDAY, weeklyTargetHours: 4, offWeeks: ['2026-08-20'] });
    expect(result.weeks[0].off).toBe(true);
    expect(result.weeks[0].overTarget).toBe(false);
    expect(result.weeks[0].overByLabel).toBeNull();
    expect(result.weeks[0].totalLabel).toBe('6:00');
    expect(logsModel([tue], THURSDAY).weeks[0].off).toBe(false);
  });

  it('a category filter recomputes everything over matches and hides empty result.weeks', () => {
    const NOW = at(2026, 7, 27, 12, 0);
    const weekBClient = session(7, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0), '', 'client');
    const weekAClient = session(8, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 30), '', 'client');
    const filtered = logsModel([weekBClient, weekAClient, early, late], THURSDAY, NOW, { category: 'client' });
    // Both result.weeks keep a client match; non-matching sessions drop out of every number.
    expect(filtered.weeks).toHaveLength(2);
    expect(filtered.weeks[0].totalLabel).toBe('1:30'); // week A: only weekAClient counts
    expect(filtered.weeks[0].categoryBreakdown).toEqual([{ label: 'client', totalLabel: '1:30' }]);
    expect(filtered.weeks[1].totalLabel).toBe('2:00'); // week B
    // A category with no matches yields an empty list
    expect(logsModel([early], THURSDAY, NOW, { category: 'client' }).weeks).toEqual([]);
  });

  it('result.weeks expose seven day bars scaled to the busiest day, today marked', () => {
    const NOW = at(2026, 7, 27, 12, 0); // Thursday, inside week A
    const result = logsModel([tue, wed, early, late], THURSDAY, NOW);
    // Week A (starts Thu Aug 27): only Thursday has sessions (2:15) → the busiest day, intensity 1.
    const weekA = result.weeks[0];
    expect(weekA.dayBars).toHaveLength(7);
    expect(weekA.dayBars[0]).toMatchObject({ isToday: true, intensity: 1 });
    expect(weekA.dayBars.slice(1).every((bar) => bar.intensity === 0)).toBe(true);
    // Week B (starts Thu Aug 20): Tue 2h and Wed 2h share the maximum → both 1; bars are [Thu..Wed].
    const weekB = result.weeks[1];
    expect(weekB.dayBars.map((bar) => bar.intensity)).toEqual([0, 0, 0, 0, 0, 1, 1]);
    expect(weekB.dayBars.every((bar) => bar.isToday === false)).toBe(true);
  });

  it('result.weeks show earnings when a rate is set, per completed total', () => {
    const result = logsModel(
      [early, late], // week A total 2:15
      { ...THURSDAY, hourlyRate: 25 },
    );
    expect(result.weeks[0].earningsLabel).toBe('$56.25');
    expect(result.weeks[0].targetLabel).toBe('40:00');
  });

  it('result.weeks carry a per-category breakdown of completed sessions, largest first', () => {    const a = session(7, at(2026, 7, 25, 8, 0), at(2026, 7, 25, 10, 0), '', 'client site');
    const b = session(8, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 12, 0), '', 'study');
    const c = session(9, at(2026, 7, 26, 13, 0), at(2026, 7, 26, 15, 30), '', 'client site');
    const uncat = session(10, at(2026, 7, 25, 11, 0), at(2026, 7, 25, 11, 45));
    const run = session(11, at(2026, 7, 26, 16, 0), null, '', 'study'); // running — excluded
    const result = logsModel([a, b, c, uncat, run], THURSDAY);
    expect(result.weeks[0].categoryBreakdown).toEqual([
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

  it('the current week defaults expanded; past result.weeks default collapsed', () => {
    const result = logsModel([...weekASessions, ...weekBSessions], THURSDAY, now);
    expect(result.weeks[0].label).toBe('Thu, Aug 27 – Wed, Sep 2');
    expect(result.weeks[0].defaultExpanded).toBe(true);
    expect(result.weeks[1].defaultExpanded).toBe(false);
    expect(result.weeks[0].isCurrent).toBe(true);
    expect(result.weeks[1].isCurrent).toBe(false);
  });

  it('an over-target week defaults expanded', () => {
    const result = logsModel([...weekASessions, ...weekBSessions], { ...THURSDAY, weeklyTargetHours: 3 }, now);
    expect(result.weeks[1].overTarget).toBe(true);
    expect(result.weeks[1].defaultExpanded).toBe(true);
  });

  it('an off week defaults collapsed even with logged time', () => {
    const result = logsModel([...weekASessions, ...weekBSessions], { ...THURSDAY, offWeeks: ['2026-08-20'] }, now);
    expect(result.weeks[1].off).toBe(true);
    expect(result.weeks[1].defaultExpanded).toBe(false);
  });

  it('a week that is both current and over-target defaults expanded once', () => {
    const result = logsModel(weekASessions, { ...THURSDAY, weeklyTargetHours: 1 }, now);
    expect(result.weeks).toHaveLength(1);
    expect(result.weeks[0].overTarget).toBe(true);
    expect(result.weeks[0].defaultExpanded).toBe(true);
  });
});

describe('logsModel dateRange filter', () => {
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
  const now = at(2026, 7, 27, 15, 0); // Thursday
  // Sessions in the current week (Thu Aug 27), last week (Wed Aug 26), and 5 weeks ago.
  const today = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 0));
  const lastWeek = session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0));
  const fiveWeeksAgo = session(3, at(2026, 6, 25, 9, 0), at(2026, 6, 25, 11, 0));
  const all = [today, lastWeek, fiveWeeksAgo];

  it("'all' returns everything (default)", () => {
    const r = logsModel(all, THURSDAY, now, { dateRange: 'all' });
    expect(r.weeks).toHaveLength(3);
    expect(r.summary).toBeNull();
  });

  it("'week' keeps only the current week", () => {
    const r = logsModel(all, THURSDAY, now, { dateRange: 'week' });
    expect(r.weeks).toHaveLength(1);
    expect(r.weeks[0].isCurrent).toBe(true);
  });

  it("'month' keeps the trailing 30 days", () => {
    const r = logsModel(all, THURSDAY, now, { dateRange: 'month' });
    expect(r.weeks).toHaveLength(2); // today + lastWeek; fiveWeeksAgo drops
  });
});

describe('logsModel query filter', () => {
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
  const now = at(2026, 7, 27, 15, 0);
  const deepNote = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 0), 'payments refactor', 'Deep work');
  const meeting = session(2, at(2026, 7, 27, 13, 0), at(2026, 7, 27, 14, 0), 'standup', 'Meetings');
  const all = [deepNote, meeting];

  it('matches on note content (case-insensitive)', () => {
    const r = logsModel(all, THURSDAY, now, { query: 'PAYMENTS' });
    expect(r.weeks[0].days[0].sessions).toHaveLength(1);
    expect(r.weeks[0].days[0].sessions[0].id).toBe(1);
  });

  it('matches on category name', () => {
    const r = logsModel(all, THURSDAY, now, { query: 'meeting' });
    expect(r.weeks[0].days[0].sessions).toHaveLength(1);
    expect(r.weeks[0].days[0].sessions[0].id).toBe(2);
  });

  it('AND-combines with category filter', () => {
    const r = logsModel(all, THURSDAY, now, { category: 'Deep work', query: 'standup' });
    expect(r.weeks).toHaveLength(0); // 'standup' is in Meetings, not Deep work
  });
});

describe('logsModel filtered summary', () => {
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const, hourlyRate: 30 };
  const now = at(2026, 7, 27, 15, 0);
  const a = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 12, 0), '', 'Deep work');
  const b = session(2, at(2026, 7, 27, 13, 0), at(2026, 7, 27, 15, 0), '', 'Deep work');

  it('null when no filter is active', () => {
    const r = logsModel([a, b], THURSDAY, now);
    expect(r.summary).toBeNull();
  });

  it('counts sessions, total, and earnings for the filtered set', () => {
    const r = logsModel([a, b], THURSDAY, now, { category: 'Deep work' });
    expect(r.summary?.sessionCount).toBe(2);
    expect(r.summary?.totalLabel).toBe('5:00');
    expect(r.summary?.earningsLabel).toBe('$150.00');
  });

  it('earnings null when no rate', () => {
    const noRate = { ...THURSDAY, hourlyRate: 0 };
    const r = logsModel([a, b], noRate, now, { category: 'Deep work' });
    expect(r.summary?.earningsLabel).toBeNull();
  });
});
