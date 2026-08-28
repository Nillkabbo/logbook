import { describe, expect, it } from 'vitest';

import { sessionDurationSeconds } from './sessions';

// Local-time constructors keep these examples independent of the machine's timezone:
// the engine only ever compares Date objects, so instants are what matter.
const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

describe('sessionDurationSeconds', () => {
  it('completed session: checkout minus check-in', () => {
    // 09:00 → 11:47 = 2h 47m = 10020s
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0), checkOut: at(2026, 7, 27, 11, 47), note: '' };
    expect(sessionDurationSeconds(session)).toBe(10020);
  });

  it('running session: now minus check-in, seconds precision', () => {
    // 09:00:15 → 09:30:45 = 30m 30s = 1830s
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0, 15), checkOut: null, note: '' };
    expect(sessionDurationSeconds(session, at(2026, 7, 27, 9, 30, 45))).toBe(1830);
  });

  it('running session without `now` is a contract violation', () => {
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0), checkOut: null, note: '' };
    expect(() => sessionDurationSeconds(session)).toThrow();
  });
});
