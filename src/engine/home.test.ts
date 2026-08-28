import { describe, expect, it } from 'vitest';

import { formatTimeOfDay, homeModel } from './home';
import { DEFAULT_SETTINGS, type Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

const session = (id: number, checkIn: Date, checkOut: Date | null, note = ''): Session => ({
  id,
  checkIn,
  checkOut,
  note,
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

  it('lists sessions owned by today, oldest first — including the running one — and totals completed only', () => {
    const model = homeModel([s1, s2, s3, s4], DEFAULT_SETTINGS, NOW);
    expect(model.todaySessions.map((s) => s.id)).toEqual([2, 3, 4]);
    expect(model.todayTotalSeconds).toBe(2700 + 5400);
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

describe('formatTimeOfDay', () => {
  it('formats 24-hour HH:MM in the local timezone', () => {
    expect(formatTimeOfDay(at(2026, 7, 27, 9, 5))).toBe('09:05');
    expect(formatTimeOfDay(at(2026, 7, 27, 14, 30))).toBe('14:30');
    expect(formatTimeOfDay(at(2026, 7, 27, 0, 0))).toBe('00:00');
    expect(formatTimeOfDay(at(2026, 7, 27, 23, 59, 59))).toBe('23:59');
  });
});
