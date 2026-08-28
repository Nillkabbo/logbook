import { describe, expect, it } from 'vitest';

import { formatDuration, formatElapsed } from './durations';

describe('formatDuration', () => {
  // Worked examples: clock-style H:MM, minutes zero-padded, seconds floored away.
  it('formats hours and padded minutes', () => {
    expect(formatDuration(27930)).toBe('7:45'); // 7h 45m 30s
    expect(formatDuration(117000)).toBe('32:30'); // 32h 30m — week-scale, hours unbounded
  });

  it('formats sub-hour durations', () => {
    expect(formatDuration(420)).toBe('0:07');
    expect(formatDuration(3600)).toBe('1:00');
    expect(formatDuration(60)).toBe('0:01');
    expect(formatDuration(0)).toBe('0:00');
  });

  it('floors partial minutes away — never rounds up', () => {
    expect(formatDuration(59)).toBe('0:00');
    expect(formatDuration(119)).toBe('0:01');
  });
});

describe('formatElapsed', () => {
  // Live running-session timer: H:MM:SS with minutes and seconds zero-padded.
  it('formats hours, padded minutes, padded seconds', () => {
    expect(formatElapsed(3725)).toBe('1:02:05');
    expect(formatElapsed(3600)).toBe('1:00:00');
    expect(formatElapsed(59)).toBe('0:00:59');
    expect(formatElapsed(0)).toBe('0:00:00');
  });
});
