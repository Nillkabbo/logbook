import { describe, expect, it } from 'vitest';

import { blockOccurring, nextBlockOccurrence, validateBlockTimes } from './schedule';
import type { WorkBlock } from './schedule';
import type { Weekday } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo, d, h, mi);

// Calendar facts: Aug 27 2026 is a Thursday; Aug 30 is a Sunday; Sep 3 is the next Thursday.
const THURSDAY = 4 as Weekday;

const block = (id: number, weekdays: Weekday[], start: number, end: number): WorkBlock => ({
  id,
  weekdays,
  startMinute: start,
  endMinute: end,
});

describe('nextBlockOccurrence', () => {
  const thuEvening = block(1, [THURSDAY], 18 * 60, 22 * 60); // Thu 18:00–22:00

  it('finds today’s upcoming start', () => {
    // Now Thu 12:00 → starts today 18:00
    const next = nextBlockOccurrence([thuEvening], at(2026, 7, 27, 12, 0));
    expect(next?.startsAt.getTime()).toBe(at(2026, 7, 27, 18, 0).getTime());
    expect(next?.block.id).toBe(1);
  });

  it('skips a start already in progress and jumps to next week', () => {
    // Now Thu 19:00 — today’s start (18:00) has passed → next Thursday, Sep 3
    const next = nextBlockOccurrence([thuEvening], at(2026, 7, 27, 19, 0));
    expect(next?.startsAt.getTime()).toBe(at(2026, 8, 3, 18, 0).getTime());
  });

  it('finds a block later in the week', () => {
    const sunMorning = block(2, [0 as Weekday], 9 * 60, 12 * 60); // Sunday 9:00
    const next = nextBlockOccurrence([sunMorning], at(2026, 7, 27, 12, 0)); // Thu
    expect(next?.startsAt.getTime()).toBe(at(2026, 7, 30, 9, 0).getTime());
  });

  it('earliest of several blocks wins', () => {
    const late = block(3, [THURSDAY], 20 * 60, 22 * 60);
    const early = block(4, [THURSDAY], 15 * 60, 17 * 60);
    const next = nextBlockOccurrence([late, early], at(2026, 7, 27, 12, 0));
    expect(next?.block.id).toBe(4);
  });

  it('empty schedule yields null', () => {
    expect(nextBlockOccurrence([], at(2026, 7, 27, 12, 0))).toBeNull();
  });
});

describe('blockOccurring', () => {
  it('inside a same-day block', () => {
    const thuEvening = block(1, [THURSDAY], 18 * 60, 22 * 60);
    expect(blockOccurring([thuEvening], at(2026, 7, 27, 19, 30))).toEqual(thuEvening);
    expect(blockOccurring([thuEvening], at(2026, 7, 27, 17, 59))).toBeNull();
    expect(blockOccurring([thuEvening], at(2026, 7, 27, 22, 0))).toBeNull(); // end exclusive
  });

  it('overnight block: Friday 01:00 belongs to Thursday’s block', () => {
    const overnight = block(2, [THURSDAY], 22 * 60, 2 * 60); // Thu 22:00 → 02:00
    expect(blockOccurring([overnight], at(2026, 7, 28, 1, 0))).toEqual(overnight); // Friday 01:00
    expect(blockOccurring([overnight], at(2026, 7, 28, 2, 0))).toBeNull(); // ended
    expect(blockOccurring([overnight], at(2026, 7, 27, 21, 59))).toBeNull(); // not started
  });

  it('right weekday but wrong day is not occurring', () => {
    const thuEvening = block(1, [THURSDAY], 18 * 60, 22 * 60);
    expect(blockOccurring([thuEvening], at(2026, 7, 28, 19, 0))).toBeNull(); // Friday
  });
});

describe('validateBlockTimes', () => {
  it('accepts any range except an empty one', () => {
    expect(validateBlockTimes(9 * 60, 17 * 60)).toBeNull();
    expect(validateBlockTimes(22 * 60, 2 * 60)).toBeNull(); // overnight is fine
    expect(validateBlockTimes(9 * 60, 9 * 60)).toMatch(/range/i);
  });
});
