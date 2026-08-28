import { describe, expect, it } from 'vitest';

import { weekRange, weekRangeLabel } from './weeks';

const at = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0) => new Date(y, mo, d, h, mi, s);

// Reference facts (worked examples from the spec): in August 2026,
// Aug 20 is a Thursday, Aug 27 is a Thursday, Aug 23 is a Sunday.
// A week runs from its start day at 00:00 local to just before the next start day.

describe('weekRange', () => {
  it('Thursday week-start: a Thursday sits at the start of its own week', () => {
    const range = weekRange(at(2026, 7, 27, 15, 30), 4);
    expect(range.start.getTime()).toBe(at(2026, 7, 27).getTime());
    expect(range.end.getTime()).toBe(at(2026, 8, 3).getTime()); // exclusive: next Thursday, Sep 3
  });

  it('Thursday week-start: a Wednesday is the last day of the previous week', () => {
    const range = weekRange(at(2026, 7, 26, 23, 59), 4);
    expect(range.start.getTime()).toBe(at(2026, 7, 20).getTime());
    expect(range.end.getTime()).toBe(at(2026, 7, 27).getTime());
  });

  it('default Sunday week-start', () => {
    const range = weekRange(at(2026, 7, 27, 12, 0), 0);
    expect(range.start.getTime()).toBe(at(2026, 7, 23).getTime());
    expect(range.end.getTime()).toBe(at(2026, 7, 30).getTime());
  });

  it('every weekday as the configured start, for Thursday Aug 27 2026', () => {
    // start-day → [expected start, expected exclusive end]
    const expected: Array<[number, [number, number, number], [number, number, number]]> = [
      [0, [2026, 7, 23], [2026, 7, 30]], // Sunday
      [1, [2026, 7, 24], [2026, 7, 31]], // Monday
      [2, [2026, 7, 25], [2026, 8, 1]], // Tuesday
      [3, [2026, 7, 26], [2026, 8, 2]], // Wednesday
      [4, [2026, 7, 27], [2026, 8, 3]], // Thursday
      [5, [2026, 7, 21], [2026, 7, 28]], // Friday
      [6, [2026, 7, 22], [2026, 7, 29]], // Saturday
    ];
    for (const [weekStartDay, start, end] of expected) {
      const range = weekRange(at(2026, 7, 27, 12, 0), weekStartDay as 0);
      expect(range.start.getTime(), `weekStartDay ${weekStartDay} start`).toBe(
        at(start[0], start[1], start[2]).getTime(),
      );
      expect(range.end.getTime(), `weekStartDay ${weekStartDay} end`).toBe(
        at(end[0], end[1], end[2]).getTime(),
      );
    }
  });

  it('a session starting exactly at the boundary instant belongs to the new week', () => {
    const range = weekRange(at(2026, 7, 27, 0, 0, 0), 4);
    expect(range.start.getTime()).toBe(at(2026, 7, 27).getTime());
  });
});

describe('weekRangeLabel', () => {
  it('labels by date range, never week numbers', () => {
    // Spec example format: "Thu, Aug 21 – Wed, Aug 27" (Thursday-start week before Aug 27 2026)
    expect(weekRangeLabel(weekRange(at(2026, 7, 26), 4))).toBe('Thu, Aug 20 – Wed, Aug 26');
    // A Thursday-start week beginning on its start day
    expect(weekRangeLabel(weekRange(at(2026, 7, 27), 4))).toBe('Thu, Aug 27 – Wed, Sep 2');
    // Default Sunday week containing Thursday Aug 27
    expect(weekRangeLabel(weekRange(at(2026, 7, 27), 0))).toBe('Sun, Aug 23 – Sat, Aug 29');
  });

  it('labels roll over month and year boundaries correctly', () => {
    // Dec 29 2026 is a Tuesday; Sunday-start week Dec 27 – Jan 2 2027
    expect(weekRangeLabel(weekRange(at(2026, 11, 29), 0))).toBe('Sun, Dec 27 – Sat, Jan 2');
  });
});
