import { formatMoney, sumEarnings, type RateRecord } from './money';
import { sumCompletedSessions } from './sessions';
import { formatDuration } from './time';
import type { Session, Settings, Weekday } from './types';
import {
  localDayKey,
  parseLocalDayKey,
  weekProgress,
  weekRange,
  weekRangeLabel,
  type WeekRange,
} from './weeks';

/** A configured pay period — the 'none' case never reaches these functions. */
export type ConfiguredPayPeriod = 'weekly' | 'biweekly';

/**
 * The pay period containing `date` (ADR-0003): a weekly pay period is simply
 * the configured Week; a biweekly pay period is two consecutive whole Weeks,
 * tiled in 14-day steps from the anchor snapped to the week-start grid — so no
 * Week ever straddles a boundary. `anchor` is unused for weekly periods.
 */
export function periodRange(
  date: Date,
  type: ConfiguredPayPeriod,
  anchor: Date,
  weekStartDay: Weekday,
): WeekRange {
  if (type === 'weekly') {
    return weekRange(date, weekStartDay);
  }
  // Snap to the week grid, then tile. Math.round absorbs a DST-shifted
  // midnight's ±1h; setDate does calendar-day arithmetic in local time.
  const base = weekRange(anchor, weekStartDay).start;
  const day = weekRange(date, weekStartDay).start;
  const k = Math.floor(Math.round((day.getTime() - base.getTime()) / 86_400_000) / 14);
  const start = new Date(base);
  start.setDate(start.getDate() + k * 14);
  const end = new Date(start);
  end.setDate(end.getDate() + 14);
  return { start, end };
}

/** True when every period surface should show: weekly needs nothing, biweekly needs a parseable anchor. */
export function payPeriodActive(settings: Settings): boolean {
  if (settings.payPeriodType === 'weekly') return true;
  if (settings.payPeriodType === 'biweekly') {
    return settings.payPeriodAnchor !== null && parseLocalDayKey(settings.payPeriodAnchor) !== null;
  }
  return false;
}

/** The week-start key a fresh biweekly config anchors to: the most recent week-start. */
export function defaultPayPeriodAnchor(weekStartDay: Weekday, now: Date): string {
  return localDayKey(weekRange(now, weekStartDay).start);
}

/** One pay period's paycheck summary — the Logs strip and the Insights card both render this. */
export interface PeriodSummary {
  /** Week-start identity for list keys: `YYYY-MM-DD`. */
  key: string;
  /** Date-range label, e.g. "Thu, Aug 14 – Wed, Aug 27". */
  label: string;
  range: WeekRange;
  /** Completed sessions in the period (check-in ownership; running never counts). */
  sessionCount: number;
  totalSeconds: number;
  totalLabel: string;
  /** weeklyTargetHours × weeks-in-period. */
  targetSeconds: number;
  targetLabel: string;
  /** Fraction of target reached; exceeds 1 when over. Zero target → 0. */
  progress: number;
  overTarget: boolean;
  /** Temporal earnings — each session at its own check-in rate (ADR-0002). */
  earnings: number;
  earningsLabel: string | null;
  /** The period containing `now` — still accumulating. */
  isCurrent: boolean;
}

export interface PeriodsModel {
  /** Newest-first, up to 12, including the current (partial) period. Empty when inactive. */
  periods: PeriodSummary[];
  /** The isCurrent entry — the Logs paycheck strip's data. Null when inactive. */
  current: PeriodSummary | null;
}

const PERIODS_SHOWN = 12;

/**
 * Pay periods bucket sessions by check-in (ADR-0001 — with grid-aligned
 * periods this equals "the period of the check-in's week"), total completed
 * sessions only, and earn each session at its own rate (ADR-0002). The
 * period target is the weekly target times the weeks in the period; an Off
 * week never suspends period judgment. Inactive ('none' or a biweekly
 * config without a usable anchor) yields the empty model — never throws.
 */
export function periodsModel(
  sessions: Session[],
  settings: Settings,
  now: Date,
  locale = 'en-US',
  rateHistory: RateRecord[] = [],
): PeriodsModel {
  if (!payPeriodActive(settings)) {
    return { periods: [], current: null };
  }
  const type = settings.payPeriodType as ConfiguredPayPeriod;
  const anchor = parseLocalDayKey(settings.payPeriodAnchor ?? '') ?? now;
  const currentRange = periodRange(now, type, anchor, settings.weekStartDay);
  const periods: PeriodSummary[] = [];
  for (let i = 0; i < PERIODS_SHOWN; i++) {
    const start = new Date(currentRange.start);
    start.setDate(start.getDate() - i * (type === 'biweekly' ? 14 : 7));
    const end = new Date(start);
    end.setDate(end.getDate() + (type === 'biweekly' ? 14 : 7));
    periods.push(summarizePeriod({ start, end }, sessions, settings, now, locale, rateHistory));
  }
  return { periods, current: periods[0] ?? null };
}

/** Just the current period — the Logs list model's cheap path (no 12-period loop). */
export function currentPeriod(
  sessions: Session[],
  settings: Settings,
  now: Date,
  locale = 'en-US',
  rateHistory: RateRecord[] = [],
): PeriodSummary | null {
  if (!payPeriodActive(settings)) return null;
  const type = settings.payPeriodType as ConfiguredPayPeriod;
  const anchor = parseLocalDayKey(settings.payPeriodAnchor ?? '') ?? now;
  return summarizePeriod(
    periodRange(now, type, anchor, settings.weekStartDay),
    sessions,
    settings,
    now,
    locale,
    rateHistory,
  );
}

function summarizePeriod(
  range: WeekRange,
  sessions: Session[],
  settings: Settings,
  now: Date,
  locale: string,
  rateHistory: RateRecord[],
): PeriodSummary {
  const weeksInPeriod = settings.payPeriodType === 'biweekly' ? 2 : 1;
  const inPeriod = sessions.filter(
    (s) => s.checkIn.getTime() >= range.start.getTime() && s.checkIn.getTime() < range.end.getTime(),
  );
  const completed = inPeriod.filter((s) => s.checkOut !== null);
  const totalSeconds = sumCompletedSessions(inPeriod);
  const targetSeconds = Math.round(settings.weeklyTargetHours * 3600) * weeksInPeriod;
  const judged = weekProgress(totalSeconds, targetSeconds); // periods never suspend judgment
  const earnings = sumEarnings(inPeriod, rateHistory);
  return {
    key: localDayKey(range.start),
    label: weekRangeLabel(range, locale),
    range,
    sessionCount: completed.length,
    totalSeconds,
    totalLabel: formatDuration(totalSeconds),
    targetSeconds,
    targetLabel: formatDuration(targetSeconds),
    progress: judged.progress,
    overTarget: judged.overTarget,
    earnings,
    earningsLabel: earnings > 0 ? formatMoney(earnings) : null,
    isCurrent:
      now.getTime() >= range.start.getTime() && now.getTime() < range.end.getTime(),
  };
}
