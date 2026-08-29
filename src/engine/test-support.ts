import type { Session } from './types';

/**
 * Shared engine-test fixtures. Every parameter defaults, so a partial call is a
 * valid midnight-ish instant, never an Invalid Date — the silent-NaN footgun
 * that hand-copied per-file variants shipped twice. Scenario `NOW` constants
 * stay per-suite: each describe pins its own date.
 */
export const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) =>
  new Date(y, mo, d, h, mi, s);

/** A Session with defaults; 4th positional is `note`, 5th is `category` (both ''). */
export const session = (
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
