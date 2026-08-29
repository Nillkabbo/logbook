import { describe, expect, it } from 'vitest';

import { at } from './test-support';

import { formatDateTime, formatDuration, formatDurationWords, formatElapsed, formatTimeOfDay,
} from './time';

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

describe('formatTimeOfDay', () => {
  it('12-hour mode: h:mm with AM/PM, no leading zero on the hour', () => {
    expect(formatTimeOfDay(at(2026, 7, 27, 14, 30), true)).toBe('2:30 PM');
    expect(formatTimeOfDay(at(2026, 7, 27, 9, 5), true)).toBe('9:05 AM');
    expect(formatTimeOfDay(at(2026, 7, 27, 0, 0), true)).toBe('12:00 AM');
    expect(formatTimeOfDay(at(2026, 7, 27, 23, 59), true)).toBe('11:59 PM');
  });

  it('formats 24-hour HH:MM in the local timezone', () => {
    expect(formatTimeOfDay(at(2026, 7, 27, 9, 5))).toBe('09:05');
    expect(formatTimeOfDay(at(2026, 7, 27, 14, 30))).toBe('14:30');
    expect(formatTimeOfDay(at(2026, 7, 27, 0, 0))).toBe('00:00');
    expect(formatTimeOfDay(at(2026, 7, 27, 23, 59, 59))).toBe('23:59');
  });
});

describe('formatDateTime', () => {
  it('renders weekday, day, and time of day', () => {
    const d = new Date(2026, 7, 27, 14, 47);
    expect(formatDateTime(d, 'en-US')).toBe('Thu, Aug 27, 14:47');
    expect(formatDateTime(d, 'en-US', true)).toBe('Thu, Aug 27, 2:47 PM');
  });
});

describe('formatDurationWords', () => {
  it('renders hours and minutes', () => {
    expect(formatDurationWords(12480)).toBe('3h 28m');
  });
  it('omits zero minutes and zero hours', () => {
    expect(formatDurationWords(7200)).toBe('2h');
    expect(formatDurationWords(600)).toBe('10m');
  });
});
