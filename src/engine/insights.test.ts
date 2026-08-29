import { describe, expect, it } from 'vitest';

import { insightsModel } from './insights';
import { DEFAULT_SETTINGS, type Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo, d, h, mi);
const session = (id: number, checkIn: Date, checkOut: Date, cat = ''): Session => ({
  id,
  checkIn,
  checkOut,
  note: '',
  category: cat,
});

describe('insightsModel', () => {
  const NOW = at(2026, 7, 28, 15, 0); // Friday Aug 28
  const SETTINGS = DEFAULT_SETTINGS;

  it('computes all-time totals from completed sessions only', () => {
    const a = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 12, 0), 'Deep work');
    const b = session(2, at(2026, 7, 28, 9, 0), at(2026, 7, 28, 11, 0), 'Meetings');
    const running = { ...session(3, at(2026, 7, 28, 14, 0), at(2026, 7, 28, 15, 0)), checkOut: null as unknown as Date };
    const m = insightsModel([a, b, running], SETTINGS, NOW);
    expect(m.totalSessions).toBe(2); // running excluded
    expect(m.totalHoursLabel).toBe('5:00'); // 3h + 2h
  });

  it('finds the best weekday', () => {
    // 3 sessions on Tuesday, 1 on Thursday
    const t1 = session(1, at(2026, 7, 25, 9, 0), at(2026, 7, 25, 17, 0)); // Tue 8h
    const t2 = session(2, at(2026, 7, 18, 9, 0), at(2026, 7, 18, 13, 0)); // Tue 4h
    const th = session(3, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 0)); // Thu 2h
    const m = insightsModel([t1, t2, th], SETTINGS, NOW);
    expect(m.bestWeekday.day).toBe(2); // Tuesday
    expect(m.bestWeekday.hours).toBe(12);
  });

  it('computes category shares as percentages', () => {
    const a = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 13, 0), 'Deep work'); // 4h
    const b = session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 11, 0), 'Meetings'); // 2h
    const m = insightsModel([a, b], SETTINGS, NOW);
    expect(m.categoryShares[0].label).toBe('Deep work');
    expect(m.categoryShares[0].percentage).toBeCloseTo(66.67, 1);
    expect(m.categoryShares[1].percentage).toBeCloseTo(33.33, 1);
  });

  it('counts the current streak ending today', () => {
    // Sessions today, yesterday, 2 days ago — but not 3 days ago
    const today = session(1, at(2026, 7, 28, 9, 0), at(2026, 7, 28, 10, 0));
    const yday = session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0));
    const two = session(3, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 10, 0));
    const m = insightsModel([today, yday, two], SETTINGS, NOW);
    expect(m.currentStreak).toBe(3);
  });

  it('current streak is 0 if no session today or yesterday', () => {
    const old = session(1, at(2026, 7, 20, 9, 0), at(2026, 7, 20, 10, 0));
    const m = insightsModel([old], SETTINGS, NOW);
    expect(m.currentStreak).toBe(0);
  });

  it('finds the longest streak even if not current', () => {
    // 5-day streak last week, 1 day this week
    const sessions: Session[] = [];
    for (let i = 10; i <= 14; i++) {
      sessions.push(session(i, at(2026, 7, i, 9, 0), at(2026, 7, i, 10, 0)));
    }
    sessions.push(session(99, at(2026, 7, 28, 9, 0), at(2026, 7, 28, 10, 0)));
    const m = insightsModel(sessions, SETTINGS, NOW);
    expect(m.longestStreak).toBe(5);
    expect(m.currentStreak).toBe(1);
  });

  it('computes month-over-month delta', () => {
    // July: 20h, August: 10h
    const jul = session(1, at(2026, 6, 15, 9, 0), at(2026, 6, 15, 13, 0)); // 4h
    const jul2 = session(2, at(2026, 6, 16, 9, 0), at(2026, 6, 16, 13, 0)); // 4h
    const jul3 = session(3, at(2026, 6, 17, 9, 0), at(2026, 6, 17, 13, 0)); // 4h
    const jul4 = session(4, at(2026, 6, 20, 9, 0), at(2026, 6, 20, 13, 0)); // 4h
    const jul5 = session(5, at(2026, 6, 21, 9, 0), at(2026, 6, 21, 13, 0)); // 4h
    const aug = session(6, at(2026, 7, 15, 9, 0), at(2026, 7, 15, 13, 0)); // 4h
    const aug2 = session(7, at(2026, 7, 16, 9, 0), at(2026, 7, 16, 13, 0)); // 4h
    const aug3 = session(8, at(2026, 7, 20, 9, 0), at(2026, 7, 20, 13, 0)); // 4h
    const m = insightsModel([jul, jul2, jul3, jul4, jul5, aug, aug2, aug3], SETTINGS, NOW);
    expect(m.lastMonthHours).toBeCloseTo(20, 0);
    expect(m.thisMonthHours).toBeCloseTo(12, 0);
    expect(m.monthDeltaHours).toBeCloseTo(-8, 0);
  });

  it('average session length is total minutes / count', () => {
    const a = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 30)); // 90min
    const b = session(2, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 10, 30)); // 90min
    const m = insightsModel([a, b], SETTINGS, NOW);
    expect(m.averageSessionMinutes).toBe(90);
    expect(m.averageSessionLabel).toBe('1:30');
  });
});
