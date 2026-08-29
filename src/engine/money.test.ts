import { describe, expect, it } from 'vitest';

import { formatMoney, rateForDate, sessionEarnings, sumEarnings, type RateRecord } from './money';

describe('formatMoney', () => {
  it('formats USD with two decimals', () => {
    expect(formatMoney(56.25)).toBe("$56.25");
    expect(formatMoney(0)).toBe("$0.00");
  });

  it('groups thousands', () => {
    expect(formatMoney(12500.5)).toBe("$12,500.50");
  });
});

describe('rateForDate', () => {
  const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo, d, h, mi, 0);
  // Unsorted on purpose: lookups must not depend on input order.
  const history: RateRecord[] = [
    { id: 2, rate: 30, effectiveFrom: at(2026, 3, 1, 0, 0) },
    { id: 1, rate: 25, effectiveFrom: at(2026, 0, 1, 0, 0) },
    { id: 3, rate: 32.5, effectiveFrom: at(2026, 7, 1, 0, 0) },
  ];

  it('returns the latest record effective at or before the date', () => {
    expect(rateForDate(history, at(2026, 1, 15))).toBe(25); // after Jan, before Apr
    expect(rateForDate(history, at(2026, 3, 1))).toBe(30); // exactly on the change date
    expect(rateForDate(history, at(2026, 11, 31))).toBe(32.5);
  });

  it('null when no record covers the date', () => {
    expect(rateForDate(history, at(2025, 11, 31))).toBeNull();
    expect(rateForDate([], at(2026, 5, 1))).toBeNull();
  });
});

describe('sessionEarnings', () => {
  const history = [{ id: 1, rate: 25, effectiveFrom: new Date(2000, 0, 1, 0, 0) }];

  it('duration × the rate at the check-in date', () => {
    expect(sessionEarnings(7200, new Date(2026, 7, 10, 9, 0), history)).toBe(50); // 2h × $25
  });

  it('null when the rate is absent or non-positive', () => {
    expect(sessionEarnings(7200, new Date(2026, 7, 10, 9, 0), [])).toBeNull();
    expect(sessionEarnings(7200, new Date(2026, 7, 10, 9, 0), [
      { id: 1, rate: 0, effectiveFrom: new Date(2000, 0, 1, 0, 0) },
    ])).toBeNull();
  });
});

describe('sumEarnings', () => {
  const at = (y: number, mo: number, d: number, h = 0, mi = 0) => new Date(y, mo, d, h, mi, 0);
  const history = [
    { id: 1, rate: 25, effectiveFrom: at(2026, 0, 1) },
    { id: 2, rate: 30, effectiveFrom: at(2026, 6, 1) },
  ];
  const sessions = [
    { checkIn: at(2026, 4, 12, 9), checkOut: at(2026, 4, 12, 11) }, // 2h × $25
    { checkIn: at(2026, 7, 27, 9), checkOut: at(2026, 7, 27, 12) }, // 3h × $30
    { checkIn: at(2026, 7, 28, 9), checkOut: null }, // running — contributes nothing
  ];

  it('sums each session at its own rate; running sessions skip', () => {
    expect(sumEarnings(sessions, history)).toBe(50 + 90);
  });

  it('0 when nothing is covered', () => {
    expect(sumEarnings(sessions, [])).toBe(0);
  });
});
