import { describe, expect, it } from 'vitest';

import { at, session } from './test-support';
import {
  currentPeriod,
  defaultPayPeriodAnchor,
  payPeriodActive,
  periodRange,
  periodsModel,
} from './periods';
import { DEFAULT_SETTINGS, type Settings } from './types';
import { localDayKey, weekRange } from './weeks';

// Reference facts: Aug 20 2026 is a Thursday. Thursday-start weeks tile
// Aug 20–26, Aug 27–Sep 2, …; biweekly pairs Aug 20–Sep 2, Sep 3–16, …
const THURSDAY_START = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
const ANCHOR = at(2026, 7, 20); // Thursday, on the week grid

const biweekly = (overrides: Partial<Settings> = {}): Settings => ({
  ...THURSDAY_START,
  payPeriodType: 'biweekly',
  payPeriodAnchor: localDayKey(ANCHOR),
  ...overrides,
});

describe('periodRange', () => {
  it('weekly periods are simply weeks', () => {
    for (const date of [at(2026, 7, 20), at(2026, 7, 27, 9, 30), at(2026, 11, 31)]) {
      expect(periodRange(date, 'weekly', ANCHOR, 4)).toEqual(weekRange(date, 4));
    }
  });

  it('biweekly tiles in 14-day steps: day 13 is still the first period, day 14 starts the next', () => {
    const first = periodRange(at(2026, 7, 20), 'biweekly', ANCHOR, 4);
    expect(localDayKey(first.start)).toBe('2026-08-20');
    expect(localDayKey(first.end)).toBe('2026-09-03'); // end exclusive
    expect(localDayKey(periodRange(at(2026, 8, 2), 'biweekly', ANCHOR, 4).start)).toBe('2026-08-20'); // Wed Sep 2
    expect(localDayKey(periodRange(at(2026, 8, 3), 'biweekly', ANCHOR, 4).start)).toBe('2026-09-03'); // Thu Sep 3
  });

  it('tiles backward before the anchor (negative k)', () => {
    // Thu Aug 6 is one 14-day step before the anchor's period.
    const before = periodRange(at(2026, 7, 6), 'biweekly', ANCHOR, 4);
    expect(localDayKey(before.start)).toBe('2026-08-06');
    expect(localDayKey(before.end)).toBe('2026-08-20');
    // A mid-week date before the anchor lands in the right earlier tile.
    expect(localDayKey(periodRange(at(2026, 7, 10), 'biweekly', ANCHOR, 4).start)).toBe('2026-08-06');
  });

  it('snaps a mid-week anchor to the week grid', () => {
    const saturdayAnchor = at(2026, 7, 22); // Saturday, Thursday-start week begins Aug 20
    const range = periodRange(at(2026, 7, 25), 'biweekly', saturdayAnchor, 4);
    expect(localDayKey(range.start)).toBe('2026-08-20');
  });

  it('rolls over month and year boundaries', () => {
    const decAnchor = at(2025, 11, 25); // Thursday Dec 25 2025
    const spanning = periodRange(at(2026, 0, 2), 'biweekly', decAnchor, 4);
    expect(localDayKey(spanning.start)).toBe('2025-12-25');
    expect(localDayKey(spanning.end)).toBe('2026-01-08');
  });

  it('end is exclusive: a check-in exactly at end belongs to the next period', () => {
    const atBoundary = at(2026, 8, 3, 0, 0); // Thu Sep 3 midnight
    expect(localDayKey(periodRange(atBoundary, 'biweekly', ANCHOR, 4).start)).toBe('2026-09-03');
  });
});

describe('payPeriodActive / defaultPayPeriodAnchor', () => {
  it('weekly is always active; biweekly needs a parseable anchor; none never is', () => {
    expect(payPeriodActive({ ...DEFAULT_SETTINGS, payPeriodType: 'weekly' })).toBe(true);
    expect(payPeriodActive(biweekly())).toBe(true);
    expect(payPeriodActive(biweekly({ payPeriodAnchor: null }))).toBe(false);
    expect(payPeriodActive(biweekly({ payPeriodAnchor: 'garbage' }))).toBe(false);
    expect(payPeriodActive(DEFAULT_SETTINGS)).toBe(false);
  });

  it('the default anchor is the current week-start key', () => {
    expect(defaultPayPeriodAnchor(4, at(2026, 7, 29, 15, 0))).toBe('2026-08-27'); // week of Aug 27–Sep 2
  });
});

describe('periodsModel', () => {
  const RATE_25_THEN_30 = [
    { id: 1, rate: 25, effectiveFrom: at(2000, 0, 1, 0, 0) },
    { id: 2, rate: 30, effectiveFrom: at(2026, 7, 25, 0, 0) }, // mid-period change (Aug 25)
  ];
  const NOW = at(2026, 7, 28, 12, 0); // inside the Aug 20 – Sep 2 period

  it('empty model when inactive', () => {
    const m = periodsModel([session(1, NOW, at(2026, 7, 28, 13, 0))], THURSDAY_START, NOW);
    expect(m).toEqual({ periods: [], current: null });
    expect(currentPeriod([], THURSDAY_START, NOW)).toBeNull();
  });

  it('weekly periods mirror the week: same totals, target = weekly target', () => {
    const s = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 17, 0)); // 8h Thursday
    const m = periodsModel([s], { ...THURSDAY_START, payPeriodType: 'weekly' }, NOW, 'en-US', RATE_25_THEN_30);
    expect(m.periods).toHaveLength(12);
    expect(m.current?.totalSeconds).toBe(8 * 3600);
    expect(m.current?.targetSeconds).toBe(40 * 3600);
    expect(m.current?.isCurrent).toBe(true);
    expect(m.current?.earningsLabel).toBe('$240.00'); // 8h × $30 (Aug 27 > Aug 25 change)
  });

  it('biweekly: target doubles, buckets by check-in week, temporal earnings', () => {
    const lateNight = session(1, at(2026, 7, 26, 23, 0), at(2026, 7, 27, 1, 0)); // Wed→Thu overnight: Wednesday's
    const afterChange = session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 13, 0)); // 4h × $30
    const beforeChange = session(3, at(2026, 7, 21, 9, 0), at(2026, 7, 21, 13, 0)); // 4h × $25
    const running = session(4, at(2026, 7, 27, 14, 0), null);
    const m = periodsModel([lateNight, afterChange, beforeChange, running], biweekly(), NOW, 'en-US', RATE_25_THEN_30);
    const cur = m.current!;
    expect(cur.totalSeconds).toBe(2 * 3600 + 4 * 3600 + 4 * 3600); // overnight counts once, by check-in
    expect(cur.sessionCount).toBe(3); // running excluded
    expect(cur.targetSeconds).toBe(80 * 3600);
    expect(cur.earnings).toBe(2 * 30 + 4 * 30 + 4 * 25); // each session at its own rate
    expect(cur.overTarget).toBe(false);
  });

  it('an Off week inside the period never suspends period judgment', () => {
    const offWeek = biweekly({ offWeeks: ['2026-08-20'] }); // first member week is Off
    const over = [
      session(1, at(2026, 7, 21, 9, 0), at(2026, 7, 21, 19, 0)), // 10h in the Off week
      session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 19, 0)), // 10h in the second week
    ];
    const m = periodsModel(over, offWeek, NOW);
    expect(m.current?.totalSeconds).toBe(20 * 3600); // Off-week hours still count
    // 20h vs an 80h biweekly target is not over — force over with a low target
    const low = periodsModel(over, { ...offWeek, weeklyTargetHours: 5 }, NOW);
    expect(low.current?.overTarget).toBe(true); // judgment runs despite the Off member week
  });

  it('lists newest-first with exactly one isCurrent; the current period stays partial', () => {
    const s1 = session(1, at(2026, 7, 14, 9, 0), at(2026, 7, 14, 10, 0)); // in the Aug 6–19 period
    const m = periodsModel([s1], biweekly(), NOW);
    expect(m.periods.map((p) => p.key).slice(0, 3)).toEqual(['2026-08-20', '2026-08-06', '2026-07-23']);
    expect(m.periods.filter((p) => p.isCurrent)).toHaveLength(1);
    expect(m.periods[0].isCurrent).toBe(true);
    // The earlier period has data; the current one is still accumulating (0 so far).
    expect(m.periods[1].sessionCount).toBe(1);
    expect(m.periods[0].sessionCount).toBe(0);
  });

  it('currentPeriod matches the model\'s current entry', () => {
    const s = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0));
    const m = periodsModel([s], biweekly(), NOW, 'en-US', RATE_25_THEN_30);
    expect(currentPeriod([s], biweekly(), NOW, 'en-US', RATE_25_THEN_30)).toEqual(m.current);
  });
});
