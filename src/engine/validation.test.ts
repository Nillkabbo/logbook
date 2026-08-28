import { describe, expect, it } from 'vitest';

import { validateSessionTimes } from './validation';

const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

// NOW = Thu Aug 27 2026, 12:00 local.
const NOW = at(2026, 7, 27, 12, 0);

describe('validateSessionTimes', () => {
  it('accepts a normal completed pair in the past', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 30), NOW)).toBeNull();
  });

  it('accepts a running session (null checkout) with a past check-in', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 11, 45), null, NOW)).toBeNull();
  });

  it('rejects checkout at or before check-in', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 0), NOW)).toMatch(
      /after/i,
    );
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 8, 0), NOW)).toMatch(
      /after/i,
    );
  });

  it('rejects a future check-in', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 12, 1), null, NOW)).toMatch(/future/i);
  });

  it('rejects a future checkout', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 12, 1), NOW)).toMatch(
      /future/i,
    );
  });
});
