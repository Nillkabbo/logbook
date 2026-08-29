import { describe, expect, it } from 'vitest';

import {
  validateHourlyRate,
  validateRateChange,
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
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 9, 0), NOW)).toBe('errCheckoutAfter');
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 8, 0), NOW)).toBe('errCheckoutAfter');
  });

  it('rejects a future check-in', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 12, 1), null, NOW)).toBe('errCheckinFuture');
  });

  it('rejects a future checkout', () => {
    expect(validateSessionTimes(at(2026, 7, 27, 9, 0), at(2026, 7, 27, 12, 1), NOW)).toBe('errCheckoutFuture');
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
    expect(validateReminderThreshold(0.5)).toBe('errThresholdRange');
    expect(validateReminderThreshold(17)).toBe('errThresholdRange');
    expect(validateReminderThreshold(Number.NaN)).toBe('errNotNumber');
  });
});

describe('validateWeeklyTarget', () => {
  it('accepts positive hours', () => {
    expect(validateWeeklyTarget(40)).toBeNull();
    expect(validateWeeklyTarget(0.5)).toBeNull();
  });

  it('rejects zero, negatives, and non-numbers', () => {
    expect(validateWeeklyTarget(0)).toBe('errTargetPositive');
    expect(validateWeeklyTarget(-5)).toBe('errTargetPositive');
    expect(validateWeeklyTarget(Number.NaN)).toBe('errTargetNumber');
  });
});

describe('validateHourlyRate', () => {
  it('accepts zero (unset) and positive rates', () => {
    expect(validateHourlyRate(0)).toBeNull();
    expect(validateHourlyRate(25)).toBeNull();
    expect(validateHourlyRate(12.5)).toBeNull();
  });

  it('rejects negatives and non-numbers', () => {
    expect(validateHourlyRate(-1)).toBe('errRateNegative');
    expect(validateHourlyRate(Number.NaN)).toBe('errRateNumber');
  });
});

describe('validateRateChange', () => {
  it('accepts positive rates', () => {
    expect(validateRateChange(25)).toBeNull();
    expect(validateRateChange(32.5)).toBeNull();
  });

  it('rejects zero and negatives — a history record must earn', () => {
    expect(validateRateChange(0)).toBe('errRatePositive');
    expect(validateRateChange(-5)).toBe('errRatePositive');
    expect(validateRateChange(Number.NaN)).toBe('errRateNumber');
  });
});
