import { describe, expect, it } from 'vitest';

import { at, session } from './test-support';

import { groupSessionsByMonth, logsListModel, logsModel, monthDayEarnings, type LogsRow } from './logs';
import { DEFAULT_SETTINGS } from './types';

const RATE_30 = [{ id: 1, rate: 30, effectiveFrom: new Date(2000, 0, 1) }];
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
    const NOW = at(2026, 7, 27, 12, 0);
    const result = logsModel(
      [early, late], // week A total 2:15
      { ...THURSDAY, hourlyRate: 25 },
      NOW,
      undefined,
      'en-US',
      [{ id: 1, rate: 25, effectiveFrom: new Date(2000, 0, 1) }],
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
    const RATE_30 = [{ id: 1, rate: 30, effectiveFrom: new Date(2000, 0, 1) }];
    const r = logsModel([a, b], THURSDAY, now, { category: 'Deep work' }, 'en-US', RATE_30);
    expect(r.summary?.sessionCount).toBe(2);
    expect(r.summary?.totalLabel).toBe('5:00');
    expect(r.summary?.earningsLabel).toBe('$150.00');
  });

  it('earnings null when no rate', () => {
    const r = logsModel([a, b], THURSDAY, now, { category: 'Deep work' });
    expect(r.summary?.earningsLabel).toBeNull();
  });
});

describe('monthDayEarnings', () => {
  it('sums per-day earnings at each session\'s own rate', () => {
    const sessions = [
      session(1, at(2026, 7, 10, 9, 0), at(2026, 7, 10, 13, 0)), // 4h at $25 → $100
      session(2, at(2026, 7, 10, 14, 0), at(2026, 7, 10, 15, 0)), // 1h at $25 → $25
      session(3, at(2026, 7, 20, 9, 0), at(2026, 7, 20, 11, 0)), // 2h at $30 → $60, other day
      session(4, at(2026, 6, 5, 9, 0), at(2026, 6, 5, 10, 0)), // July session — excluded
    ];
    const history = [
      { id: 1, rate: 25, effectiveFrom: at(2026, 0, 1, 0, 0) },
      { id: 2, rate: 30, effectiveFrom: at(2026, 7, 11, 0, 0) },
    ];
    const earnings = monthDayEarnings(sessions, 2026, 7, history);
    expect(earnings.get(10)).toBe(125); // both Aug 10 sessions at $25 (change lands Aug 11)
    expect(earnings.get(20)).toBe(60);
    expect(earnings.has(5)).toBe(false);
  });

  it('empty map when no rate covers any session', () => {
    const sessions = [session(1, at(2026, 7, 10, 9, 0), at(2026, 7, 10, 13, 0))];
    expect(monthDayEarnings(sessions, 2026, 7, []).size).toBe(0);
  });
});

describe('cross-surface month consistency (ADR-0002)', () => {
  // Sunday-start weeks: Jul 26 – Aug 1 2026 is one week straddling the month
  // boundary. Two sessions in it — one July-owned, one August-owned — at $10/h.
  const SETTINGS = { ...DEFAULT_SETTINGS, weekStartDay: 0 as const };
  const HISTORY = [{ id: 1, rate: 10, effectiveFrom: new Date(2000, 0, 1, 0, 0) }];
  const sessions = [
    session(1, at(2026, 6, 27, 9, 0), at(2026, 6, 27, 11, 0)), // Mon Jul 27, 2h → July
    session(2, at(2026, 7, 1, 9, 0), at(2026, 7, 1, 12, 0)), // Sat Aug 1, 3h → August
  ];

  it('month headers bucket by check-in month, not by the week card they render under', () => {
    const groups = groupSessionsByMonth(sessions, SETTINGS, HISTORY, 'en-US');
    const july = groups.find((g) => g.key === '2026-6');
    const august = groups.find((g) => g.key === '2026-7');
    expect(groups.map((g) => g.key)).toEqual(['2026-7', '2026-6']); // newest first
    expect(july?.totalSeconds).toBe(7200);
    expect(july?.earnings).toBe(20);
    expect(august?.totalSeconds).toBe(10800);
    expect(august?.earnings).toBe(30);
    // One straddling week counts for both months it touches.
    expect(july?.weekCount).toBe(1);
    expect(august?.weekCount).toBe(1);
  });

  it('the same month earns the same number on every surface', () => {
    const groups = groupSessionsByMonth(sessions, SETTINGS, HISTORY, 'en-US');
    const julyEarnings = groups.find((g) => g.key === '2026-6')?.earnings ?? 0;
    const augustEarnings = groups.find((g) => g.key === '2026-7')?.earnings ?? 0;

    // Calendar: per-day earnings summed per month
    const calJuly = [...monthDayEarnings(sessions, 2026, 6, HISTORY).values()].reduce((a, b) => a + b, 0);
    const calAugust = [...monthDayEarnings(sessions, 2026, 7, HISTORY).values()].reduce((a, b) => a + b, 0);

    // Week cards: both sessions live in the one boundary week
    const { weeks } = logsModel(sessions, SETTINGS, at(2026, 7, 2, 9, 0), undefined, 'en-US', HISTORY);
    const weekEarnings = weeks[0]?.totalEarnings ?? 0;

    expect(calJuly).toBe(julyEarnings);
    expect(calAugust).toBe(augustEarnings);
    expect(weekEarnings).toBe(julyEarnings + augustEarnings);
  });
});

describe('logsListModel — the screen\'s single engine call', () => {
  const SETTINGS = { ...DEFAULT_SETTINGS, weekStartDay: 0 as const };
  const RATE_10 = [{ id: 1, rate: 10, effectiveFrom: new Date(2000, 0, 1, 0, 0) }];
  // Two completed sessions on Mon Jul 27 2026 (one categorised) + one the prior week.
  const jul27a = session(1, at(2026, 6, 27, 9, 0), at(2026, 6, 27, 11, 0), '', 'Deep work');
  const jul27b = session(2, at(2026, 6, 27, 13, 0), at(2026, 6, 27, 14, 0), '', '');
  const lastWeek = session(3, at(2026, 6, 20, 9, 0), at(2026, 6, 20, 10, 0), '', 'Deep work');
  const SESSIONS = [jul27a, jul27b, lastWeek];
  const NOW = at(2026, 6, 28, 12, 0); // Tuesday — Jul 27's week is current, Jul 20's is not

  const base = (overrides: Partial<Parameters<typeof logsListModel>[0]> = {}) =>
    logsListModel({ sessions: SESSIONS, settings: SETTINGS, now: NOW, rateHistory: RATE_10, ...overrides });

  it('flattens to month header → week card → day header → session rows, newest week first', () => {
    const m = base();
    // Both weeks are July-owned — one month header covers both.
    expect(m.rows.map((r) => r.kind)).toEqual([
      'month', 'week', 'day', 'session', 'session', // Jul 26 week (current, expanded by default)
      'collapsed', // Jul 20 week: not current, not over target → collapsed
    ]);
    const month = m.rows[0] as Extract<LogsRow, { kind: 'month' }>;
    expect(month.label).toBe('July 2026');
    expect(month.totalLabel).toBe('4:00'); // all three sessions are July-owned by check-in day
    expect(month.earningsLabel).toBe('$40'); // 4h × $10, compact
    expect(month.weekCount).toBe(2);
  });

  it('expansion overrides are data: a record flips weeks and months the model would not choose', () => {
    const m = base({ expanded: { [m0()]: true } });
    function m0() {
      return '2026-07-19'; // the Jul 20 week's key (week starts Sunday)
    }
    // The old week now renders expanded: day + session rows replace the collapsed row.
    const kinds = m.rows.map((r) => r.kind);
    expect(kinds).toContain('week');
    expect(kinds.filter((k) => k === 'collapsed')).toHaveLength(0);
    expect(m.rows.at(-1)?.kind).toBe('session');

    // Month keys are `YYYY-M` with 0-based M: July 2026 = '2026-6'.
    const collapsedMonth = base({ monthsExpanded: { '2026-6': false } });
    expect(collapsedMonth.rows.map((r) => r.kind)).toEqual(['month']); // header only
  });

  it('the day filter narrows rows, summary, and grand totals to one check-in day', () => {
    const m = base({ filter: { day: '2026-07-27' } });
    expect(m.filtered).toEqual([jul27a, jul27b]);
    expect(m.grandSessionCount).toBe(2);
    expect(m.grandTotalLabel).toBe('3:00');
    expect(m.grandEarningsLabel).toBe('$30.00');
    expect(m.rows.filter((r) => r.kind === 'session')).toHaveLength(2);
  });

  it('grand labels hide when nothing is covered; shares sort desc with empty label last', () => {
    const m = base({ rateHistory: [] });
    expect(m.grandEarningsLabel).toBeNull();
    const shares = m.categoryShares;
    expect(shares.map((c) => c.label)).toEqual(['Deep work', '']);
    expect(shares[0].seconds).toBeGreaterThanOrEqual(shares[1].seconds);
  });

  it('calendar data only computes when a month is given — and ignores the day filter', () => {
    const closed = base();
    expect(closed.dayTotals).toBeUndefined();
    expect(closed.dayEarnings).toBeUndefined();

    const open = base({ calendarMonth: new Date(2026, 6, 1), filter: { day: '2026-07-27' } });
    expect(open.dayTotals?.get(20)).toBe(3600); // last week's session still shows in the calendar
    expect(open.dayEarnings?.get(27)).toBeCloseTo(30, 5);
  });
});

describe("logsModel 'period' date-range filter", () => {
  const SETTINGS = {
    ...DEFAULT_SETTINGS,
    weekStartDay: 4 as const, // Thursday
    payPeriodType: 'biweekly' as const,
    payPeriodAnchor: '2026-08-20',
  };
  const NOW = at(2026, 7, 28, 12, 0); // inside Aug 20 – Sep 2
  const inPeriod = [
    session(1, at(2026, 7, 21, 9, 0), at(2026, 7, 21, 10, 0)), // first member week
    session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0)), // second member week
  ];
  const outOfPeriod = session(3, at(2026, 7, 13, 9, 0), at(2026, 7, 13, 10, 0)); // Aug 13

  it('keeps exactly the two member weeks of the current pay period', () => {
    const r = logsModel([...inPeriod, outOfPeriod], SETTINGS, NOW, { dateRange: 'period' });
    expect(r.weeks.map((w) => w.key)).toEqual(['2026-08-27', '2026-08-20']);
    expect(r.summary?.sessionCount).toBe(2);
  });

  it('weekly configured: the period filter equals the week filter', () => {
    const weekly = { ...SETTINGS, payPeriodType: 'weekly' as const };
    const byWeek = logsModel([...inPeriod, outOfPeriod], weekly, NOW, { dateRange: 'week' });
    const byPeriod = logsModel([...inPeriod, outOfPeriod], weekly, NOW, { dateRange: 'period' });
    expect(byPeriod.weeks.map((w) => w.key)).toEqual(byWeek.weeks.map((w) => w.key));
  });

  it("unconfigured 'period' degrades to 'all' — never an empty list", () => {
    const r = logsModel([...inPeriod, outOfPeriod], DEFAULT_SETTINGS, NOW, { dateRange: 'period' });
    expect(r.weeks).toHaveLength(3);
  });

  it('logsListModel.payPeriod: null when off; coherent with the period filter when on', () => {
    const off = logsListModel({ sessions: inPeriod, settings: DEFAULT_SETTINGS, now: NOW });
    expect(off.payPeriod).toBeNull();

    const on = logsListModel({ sessions: [...inPeriod, outOfPeriod], settings: SETTINGS, now: NOW, filter: { dateRange: 'period' } });
    expect(on.payPeriod?.key).toBe('2026-08-20');
    expect(on.payPeriod?.sessionCount).toBe(on.summary?.sessionCount); // strip ≡ filtered set
    expect(on.payPeriod?.targetSeconds).toBe(80 * 3600); // 2 × 40h weekly target
  });
});
