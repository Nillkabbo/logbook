import { describe, expect, it } from 'vitest';

import { formatMoney } from './money';

describe('formatMoney', () => {
  it('formats USD with two decimals', () => {
    expect(formatMoney(56.25)).toBe('$ 56.25');
    expect(formatMoney(0)).toBe('$ 0.00');
  });

  it('groups thousands', () => {
    expect(formatMoney(12500.5)).toBe('$ 12,500.50');
  });
});
