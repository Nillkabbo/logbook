import { describe, expect, it } from 'vitest';

import { homeModel } from './home';
import { DEFAULT_SETTINGS, type Session } from './types';

const RATE_25 = [{ id: 1, rate: 25, effectiveFrom: new Date(2000, 0, 1) }];
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

describe('homeModel', () => {
  // Scenario: "today" is Thu Aug 27 2026, 12:00 local.
  // s2: today 09:00–09:45 (2700s), s3: today 10:00–11:30 (5400s),
  // s4: running since today 11:45, s1: yesterday 09:00–11:00.
  const NOW = at(2026, 7, 27, 12, 0);

  const s1 = session(1, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0));
  const s2 = session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 45));
  const s3 = session(3, at(2026, 7, 27, 10, 0), at(2026, 7, 27, 11, 30));
  const s4 = session(4, at(2026, 7, 27, 11, 45), null);

  it('finds the running session and formats its elapsed time at `now`', () => {
    const model = homeModel([s1, s2, s3, s4], DEFAULT_SETTINGS, NOW);
    expect(model.running?.id).toBe(4);
    expect(model.elapsedSeconds).toBe(900); // 11:45 → 12:00
    expect(model.elapsedLabel).toBe('0:15:00');
  });

  it('lists sessions owned by today, running first then oldest — and totals completed only', () => {
    const model = homeModel([s1, s2, s3, s4], DEFAULT_SETTINGS, NOW);
    expect(model.todaySessions.map((s) => s.id)).toEqual([4, 3, 2]);
    expect(model.todayTotalLabel).toBe('2:15');
  });

  it('excludes yesterday-owned sessions from today (check-in-day ownership)', () => {
    const model = homeModel([s1], DEFAULT_SETTINGS, NOW);
    expect(model.todaySessions).toEqual([]);
    expect(model.todayTotalLabel).toBe('0:00');
  });

  it('a running session from yesterday stays running on Home but never joins today', () => {
    const overnight = session(5, at(2026, 7, 26, 22, 0), null);
    const model = homeModel([overnight, s2], DEFAULT_SETTINGS, NOW);
    expect(model.running?.id).toBe(5);
    expect(model.todaySessions.map((s) => s.id)).toEqual([2]);
  });

  it('no running session: running is null and elapsed labels are null', () => {
    const model = homeModel([s2, s3], DEFAULT_SETTINGS, NOW);
    expect(model.running).toBeNull();
    expect(model.elapsedLabel).toBeNull();
    expect(model.elapsedSeconds).toBeNull();
  });

  it('today is judged in local time at `now`', () => {
    // Check-in Aug 27 23:30, now Aug 28 00:15 — different local days.
    const lateNight = session(6, at(2026, 7, 27, 23, 30), null);
    const model = homeModel([lateNight], DEFAULT_SETTINGS, at(2026, 7, 28, 0, 15));
    expect(model.running?.id).toBe(6);
    expect(model.todaySessions).toEqual([]);
  });
});

describe('homeModel week-to-date', () => {
  // NOW = Thursday Aug 27 2026, 12:00. s1 = Wednesday Aug 26 (belongs to the
  // previous week under a Thursday start, but to the current week under Sunday).
  // s2/s3 = completed today (2700s + 5400s). s4 = running since 11:45 (never counted).
  const NOW = at(2026, 7, 27, 12, 0);
  const s1 = session(1, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0));
  const s2 = session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 45));
  const s3 = session(3, at(2026, 7, 27, 10, 0), at(2026, 7, 27, 11, 30));
  const s4 = session(4, at(2026, 7, 27, 11, 45), null);
  const SESSIONS = [s1, s2, s3, s4];

  it('Thursday-start week: Wednesday session belongs to the previous week; running excluded', () => {
    const model = homeModel(SESSIONS, { ...DEFAULT_SETTINGS, weekStartDay: 4 }, NOW);
    expect(model.weekToDateLabel).toBe('2:15');
    expect(model.overTarget).toBe(false);
    expect(model.weekProgress).toBeCloseTo(8100 / 144000, 5); // vs 40h target
  });

  it('Sunday-start week: the same Wednesday session joins this week', () => {
    const model = homeModel(SESSIONS, DEFAULT_SETTINGS, NOW);
    expect(model.weekToDateLabel).toBe('4:15');
  });

  it('a midnight-crossing session counts toward its check-in week (ADR-0001)', () => {
    // Wed Aug 26 23:00 → Thu Aug 27 01:00, Thursday-start weeks: owned by the Aug 20 week.
    const overnight = session(7, at(2026, 7, 26, 23, 0), at(2026, 7, 27, 1, 0));
    const model = homeModel([overnight], { ...DEFAULT_SETTINGS, weekStartDay: 4 }, NOW);
    expect(model.weekToDateLabel).toBe('0:00'); // the Aug 20–26 week is not the current week
  });

  it('flags over-target weeks and labels the overage', () => {
    const model = homeModel(SESSIONS, { ...DEFAULT_SETTINGS, weekStartDay: 4, weeklyTargetHours: 2 }, NOW);
    expect(model.overTarget).toBe(true);
    expect(model.weekProgress).toBeGreaterThan(1);
    expect(model.weeklyTargetLabel).toBe('2:00');
    expect(model.overByLabel).toBe('0:15'); // 2:15 total − 2:00 target
  });

  it('under target: no overage label', () => {
    const model = homeModel(SESSIONS, { ...DEFAULT_SETTINGS, weekStartDay: 4 }, NOW);
    expect(model.overByLabel).toBeNull();
  });

  it('an Off week suspends judgment but keeps totals and earnings', () => {
    const off = homeModel(
      SESSIONS,
      { ...DEFAULT_SETTINGS, weekStartDay: 4, hourlyRate: 25, offWeeks: ['2026-08-27'] },
      NOW,
      RATE_25);
    expect(off.off).toBe(true);
    expect(off.overTarget).toBe(false);
    expect(off.overByLabel).toBeNull();
    expect(off.weekToDateLabel).toBe('2:15'); // totals still show
    expect(off.earningsLabel).toBe('$56.25'); // money is still real
    const judged = homeModel(SESSIONS, { ...DEFAULT_SETTINGS, weekStartDay: 4, hourlyRate: 25 }, NOW, RATE_25);
    expect(judged.off).toBe(false);
  });

  it('earnings appear when a rate is set; hidden when unset', () => {
    const withRate = homeModel(
      SESSIONS,
      { ...DEFAULT_SETTINGS, weekStartDay: 4, hourlyRate: 25 },
      NOW,
      RATE_25);
    // 2:15 completed × $25/h = 2.25h × 25 = $56.25
    expect(withRate.earningsLabel).toBe('$56.25');
    const withoutRate = homeModel(SESSIONS, { ...DEFAULT_SETTINGS, weekStartDay: 4 }, NOW);
    expect(withoutRate.earningsLabel).toBeNull();
  });
});

describe('homeModel weekDayBars', () => {
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
  // Thu Aug 27 (today), Wed Aug 26, Tue Aug 25 — 2h each; Sunday empty.
  const now = at(2026, 7, 27, 15, 0);
  const thu = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 0));
  const wed = session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0));
  const tue = session(3, at(2026, 7, 25, 9, 0), at(2026, 7, 25, 11, 0));

  it('seven bars from the week start, today flagged, empty days at 0', () => {
    const m = homeModel([thu, wed, tue], THURSDAY, now);
    expect(m.weekDayBars).toHaveLength(7);
    expect(m.weekDayBars[0].isToday).toBe(true); // Thursday = week start = offset 0
    expect(m.weekDayBars[0].intensity).toBe(1); // all worked days equal 2h → all busiest
    expect(m.weekDayBars[1].intensity).toBe(0); // Friday, no sessions
  });

  it('scales to the busiest day', () => {
    const big = session(4, at(2026, 7, 27, 8, 0), at(2026, 7, 27, 16, 0)); // 8h today
    const m = homeModel([big, tue], THURSDAY, now);
    expect(m.weekDayBars[0].intensity).toBe(1); // 8h today = busiest
    expect(m.weekDayBars[1].intensity).toBe(0); // Friday empty
  });

  it('dateLabel orients with weekday and date', () => {
    const m = homeModel([], THURSDAY, now);
    expect(m.dateLabel).toBe('Thursday, Aug 27');
  });
});

describe('homeModel running-first sort', () => {
  const THURSDAY = { ...DEFAULT_SETTINGS, weekStartDay: 4 as const };
  const now = at(2026, 7, 27, 15, 0);
  const morning = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 12, 0));
  const running = session(2, at(2026, 7, 27, 14, 0), null);
  const afternoon = session(3, at(2026, 7, 27, 8, 0), at(2026, 7, 27, 8, 30));

  it('the running session sorts first regardless of check-in time', () => {
    const m = homeModel([morning, running, afternoon], THURSDAY, now);
    expect(m.todaySessions[0].id).toBe(2); // running
    expect(m.todaySessions.map((s) => s.id)).toEqual([2, 1, 3]); // then newest-first
  });
});
