import { describe, expect, it } from 'vitest';

import {
  validateHourlyRate,
  validateReminderThreshold,
  validateSessionTimes,
  validateWeeklyTarget,
} from './validation';

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

describe('validateReminderThreshold', () => {
  it('accepts the inclusive 1–16 hour range', () => {
    expect(validateReminderThreshold(1)).toBeNull();
    expect(validateReminderThreshold(10)).toBeNull();
    expect(validateReminderThreshold(16)).toBeNull();
    expect(validateReminderThreshold(2.5)).toBeNull();
  });

  it('rejects values outside 1–16 and non-numbers', () => {
    expect(validateReminderThreshold(0.5)).toMatch(/1.*16/i);
    expect(validateReminderThreshold(17)).toMatch(/1.*16/i);
    expect(validateReminderThreshold(Number.NaN)).toMatch(/number/i);
  });
});

describe('validateWeeklyTarget', () => {
  it('accepts positive hours', () => {
    expect(validateWeeklyTarget(40)).toBeNull();
    expect(validateWeeklyTarget(0.5)).toBeNull();
  });

  it('rejects zero, negatives, and non-numbers', () => {
    expect(validateWeeklyTarget(0)).toMatch(/positive/i);
    expect(validateWeeklyTarget(-5)).toMatch(/positive/i);
    expect(validateWeeklyTarget(Number.NaN)).toMatch(/number/i);
  });
});

describe('validateHourlyRate', () => {
  it('accepts zero (unset) and positive rates', () => {
    expect(validateHourlyRate(0)).toBeNull();
    expect(validateHourlyRate(25)).toBeNull();
    expect(validateHourlyRate(12.5)).toBeNull();
  });

  it('rejects negatives and non-numbers', () => {
    expect(validateHourlyRate(-1)).toMatch(/negative/i);
    expect(validateHourlyRate(Number.NaN)).toMatch(/number/i);
  });
});
