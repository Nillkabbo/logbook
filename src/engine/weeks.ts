import { formatDuration } from './time';
import { formatMoney } from './money';
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

function shortDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Local-day identity key `YYYY-MM-DD` — the one day-key in the codebase. */
export function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Alias: the key of a week is its start day's key. */
export const weekKey = localDayKey;

/** Labels a single day, e.g. "Wed, Aug 26" (or the given locale's equivalent). */
export function formatDayLabel(date: Date, locale = 'en-US'): string {
  return shortDate(date, locale);
}

/** Labels a week by its date range, e.g. "Thu, Aug 21 – Wed, Aug 27" — never a week number. */
export function weekRangeLabel(range: WeekRange, locale = 'en-US'): string {
  const lastDay = new Date(range.end);
  lastDay.setDate(lastDay.getDate() - 1);
  return `${shortDate(range.start, locale)} – ${shortDate(lastDay, locale)}`;
}

/** Date locale for a language setting; Bangla keeps Latin digits. */
export function dateLocale(language: string): string {
  return language === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US';
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

export interface WeekSummary {
  /** Fraction of target reached; exceeds 1 in an over-target week. */
  progress: number;
  overTarget: boolean;
  /** Clock-style overage (e.g. "0:15") in an over-target week; null otherwise. */
  overByLabel: string | null;
  /** Week earnings at the given rate; null when no rate is set. */
  earningsLabel: string | null;
}

/**
 * Every week-display judgment in one place: target progress and Over-target
 * (suspended for Off weeks), the overage label, and earnings. Both screen
 * models call this — no rule lives twice.
 */
export function weekSummary(
  totalSeconds: number,
  targetSeconds: number,
  off: boolean,
  hourlyRate: number,
): WeekSummary {
  const judged = off ? { progress: 0, overTarget: false } : weekProgress(totalSeconds, targetSeconds);
  return {
    progress: judged.progress,
    overTarget: judged.overTarget,
    overByLabel: judged.overTarget ? formatDuration(totalSeconds - targetSeconds) : null,
    earningsLabel: hourlyRate > 0 ? formatMoney((totalSeconds / 3600) * hourlyRate) : null,
  };
}
