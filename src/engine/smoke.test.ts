import { describe, expect, it } from 'vitest';

// Verifies the test runner executes engine tests in plain Node (ticket 01).
// Replaced by real engine tests in ticket 02.
describe('vitest runner', () => {
  it('runs in plain Node', () => {
    expect(2 + 2).toBe(4);
  });
});
