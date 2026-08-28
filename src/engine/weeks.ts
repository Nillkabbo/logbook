import type { Weekday } from './types';

export interface WeekRange {
  /** Inclusive: the configured week-start day at 00:00 local time. */
  start: Date;
  /** Exclusive: the next week-start day at 00:00 local time. */
  end: Date;
}

/**
 * The week containing `date`, beginning on the configured week-start day.
 * Example: with Thursday starts, Wed Aug 26 2026 23:59 falls in the week
 * starting Thu Aug 20.
 */
export function weekRange(date: Date, weekStartDay: Weekday): WeekRange {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const daysSinceWeekStart = (start.getDay() - weekStartDay + 7) % 7;
  start.setDate(start.getDate() - daysSinceWeekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return { start, end };
}

function shortDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Local-day identity key `YYYY-MM-DD` — the Week's storage identity for Off weeks. */
export function weekKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Labels a single day, e.g. "Wed, Aug 26". */
export function formatDayLabel(date: Date): string {
  return shortDate(date);
}

/** Labels a week by its date range, e.g. "Thu, Aug 21 – Wed, Aug 27" — never a week number. */
export function weekRangeLabel(range: WeekRange): string {
  const lastDay = new Date(range.end);
  lastDay.setDate(lastDay.getDate() - 1);
  return `${shortDate(range.start)} – ${shortDate(lastDay)}`;
}

export interface WeekProgressModel {
  /** Fraction of target reached; exceeds 1 in an over-target week. Zero target → 0. */
  progress: number;
  overTarget: boolean;
}

/** The Over-target rule, computed in one place for every week display. */
export function weekProgress(totalSeconds: number, targetSeconds: number): WeekProgressModel {
  return {
    progress: targetSeconds === 0 ? 0 : totalSeconds / targetSeconds,
    overTarget: totalSeconds > targetSeconds,
  };
}
