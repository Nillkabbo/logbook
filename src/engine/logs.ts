import { currentPeriod, resolveCurrentPeriodRange, type PeriodSummary } from './periods';
import { formatDuration } from './time';
import { formatMoney, sessionEarnings, sumEarnings, type RateRecord } from './money';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import {
  localDayKey,
  weekKey,
  weekRange,
  weekRangeLabel,
  weekSummary,
  type WeekRange,
} from './weeks';

export interface LogDay {
  /** Local-day identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  /** Sessions owned by this day (check-in day), oldest first. A running session is included. */
  sessions: Session[];
  totalLabel: string;
}

export interface DayBar {
  /** Local-day identity for list keys: `YYYY-MM-DD`. */
  key: string;
  isToday: boolean;
  /** Day total scaled to the week's busiest day: 0 empty … 1 busiest. */
  intensity: number;
}

/** The filter dimensions the Logs screen offers. All optional; AND-combined. */
export interface LogsFilter {
  /** Exact category match. */
  category?: string;
  /** 'week' = current week; 'month' = trailing 30 days; 'period' = the pay period containing `now` (requires a configured pay period — degrades to no filtering); 'all' = everything. */
  dateRange?: 'week' | 'month' | 'period' | 'all';
  /** Case-insensitive substring match on note and category. */
  query?: string;
  /** Exact check-in day, as a `YYYY-MM-DD` localDayKey (a calendar tap). */
  day?: string;
}

/** Summary of the filtered set — shown when any filter is active. */
export interface FilteredSummary {
  sessionCount: number;
  totalLabel: string;
  earningsLabel: string | null;
}

/** logsModel's result: grouped weeks plus the filtered-set summary. */
export interface LogsResult {
  weeks: LogWeek[];
  summary: FilteredSummary | null;
}

export interface LogWeek {
  /** Week-start identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  range: WeekRange;
  days: LogDay[];
  /** Seven bars from the week's start day — the week's shape at a glance. */
  dayBars: DayBar[];
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  /** Clock-style overage (e.g. "2:00") in an over-target week; null otherwise. */
  overByLabel: string | null;
  /** Week earnings at the set rate; null when no rate is set. */
  earningsLabel: string | null;
  /** Raw week earnings (per-session rates summed) — month totals sum this. */
  totalEarnings: number;
  /** True when this week is marked Off — target judgment suspended. */
  off: boolean;
  /** Total completed seconds this week — month totals compute from this. */
  totalSeconds: number;
  /** Whether this week first renders expanded: the current week and over-target weeks demand attention; the rest start collapsed. */
  defaultExpanded: boolean;
  /** True for the week that contains `now`. */
  isCurrent: boolean;
  /** Completed-session totals per category, largest first; empty label = uncategorised. */
  categoryBreakdown: Array<{ label: string; totalLabel: string }>;
}

function localMidnight(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Full history grouped newest-first. Filters (category, date range, search,
 * calendar day) recompute every number over the matching sessions only; weeks
 * without matches hide. The summary aggregates the filtered set for the totals bar.
 */
export function logsModel(
  sessions: Session[],
  settings: Settings,
  now: Date = new Date(),
  filter?: LogsFilter,
  locale = 'en-US',
  rateHistory: RateRecord[] = [],
): LogsResult {
  let effective = sessions;
  if (filter?.category !== undefined) {
    effective = effective.filter((s) => s.category === filter.category);
  }
  if (filter?.dateRange === 'week') {
    const week = weekRange(now, settings.weekStartDay);
    effective = effective.filter(
      (s) => s.checkIn.getTime() >= week.start.getTime() && s.checkIn.getTime() < week.end.getTime(),
    );
  } else if (filter?.dateRange === 'month') {
    const cutoff = now.getTime() - 30 * 24 * 3600 * 1000;
    effective = effective.filter((s) => s.checkIn.getTime() >= cutoff);
  } else if (filter?.dateRange === 'period') {
    const resolved = resolveCurrentPeriodRange(settings, now); // null → no filtering
    if (resolved !== null) {
      const { range } = resolved;
      effective = effective.filter(
        (s) => s.checkIn.getTime() >= range.start.getTime() && s.checkIn.getTime() < range.end.getTime(),
      );
    }
  }
  if (filter?.query && filter.query.trim().length > 0) {
    const q = filter.query.trim().toLowerCase();
    effective = effective.filter(
      (s) => s.note.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
    );
  }

  // Filtered summary — only when a filter narrowed the set.
  const hasActiveFilter =
    (filter?.category !== undefined && filter.category !== null) ||
    (filter?.dateRange !== undefined && filter.dateRange !== 'all') ||
    (filter?.query !== undefined && filter.query.trim().length > 0);
  const summary: FilteredSummary | null = hasActiveFilter
    ? {
        sessionCount: effective.length,
        totalLabel: formatDuration(sumCompletedSessions(effective)),
        earningsLabel: (() => {
          const earned = sumEarnings(effective, rateHistory);
          return earned > 0 ? formatMoney(earned) : null;
        })(),
      }
    : null;
  const byWeek = new Map<number, { range: WeekRange; sessions: Session[] }>();
  for (const session of effective) {
    const range = weekRange(session.checkIn, settings.weekStartDay);
    const key = range.start.getTime();
    const bucket = byWeek.get(key) ?? { range, sessions: [] };
    bucket.sessions.push(session);
    byWeek.set(key, bucket);
  }

  const weeks = [...byWeek.values()].sort(
    (a, b) => b.range.start.getTime() - a.range.start.getTime(),
  );
  const targetSeconds = Math.round(settings.weeklyTargetHours * 3600);
  const currentWeekStart = weekRange(now, settings.weekStartDay).start.getTime();

  const groupedWeeks = weeks.map(({ range, sessions }) => {
    const totalSeconds = sumCompletedSessions(sessions);
    const off = settings.offWeeks.includes(weekKey(range.start));
    // Per-session earnings: each session uses the rate at its check-in date
    const weekEarnings = sumEarnings(sessions, rateHistory);
    const summary = weekSummary(totalSeconds, targetSeconds, off, weekEarnings > 0 ? weekEarnings : null);

    const byCategory = new Map<string, number>();
    for (const session of sessions) {
      if (session.checkOut === null || session.category === '') continue;
      byCategory.set(
        session.category,
        (byCategory.get(session.category) ?? 0) + sessionDurationSeconds(session),
      );
    }
    // Uncategorised sessions join the breakdown last, labelled ''.
    const uncategorised =
      sessions
        .filter((s) => s.checkOut !== null && s.category === '')
        .reduce((sum, s) => sum + sessionDurationSeconds(s), 0) || null;
    const categoryBreakdown = [
      ...[...byCategory.entries()]
        .map(([label, seconds]) => ({ label, seconds }))
        .sort((a, b) => b.seconds - a.seconds),
      ...(uncategorised !== null ? [{ label: '', seconds: uncategorised }] : []),
    ].map(({ label, seconds }) => ({ label, totalLabel: formatDuration(seconds) }));

    const byDay = new Map<number, { date: Date; sessions: Session[] }>();
    for (const session of sessions) {
      const date = localMidnight(session.checkIn);
      const key = date.getTime();
      const bucket = byDay.get(key) ?? { date, sessions: [] };
      bucket.sessions.push(session);
      byDay.set(key, bucket);
    }
    const days: LogDay[] = [...byDay.values()]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .map(({ date, sessions: daySessions }) => {
        daySessions.sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
        const dayTotal = sumCompletedSessions(daySessions);
        return {
          key: localDayKey(date),
          label: date.toLocaleDateString(locale, { weekday: 'long' }),
          sessions: daySessions,
          totalLabel: formatDuration(dayTotal),
        };
      });

    // Seven bars from the week's start day, scaled to the busiest day.
    const secondsByDayKey = new Map(
      [...byDay.values()].map(({ date, sessions: daySessions }) => [
        localDayKey(date),
        sumCompletedSessions(daySessions),
      ]),
    );
    const busiest = Math.max(0, ...secondsByDayKey.values());
    const dayBars: DayBar[] = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(range.start);
      date.setDate(date.getDate() + offset);
      const key = localDayKey(date);
      const seconds = secondsByDayKey.get(key) ?? 0;
      return {
        key,
        isToday: key === localDayKey(now),
        intensity: busiest === 0 ? 0 : seconds / busiest,
      };
    });

    return {
      key: localDayKey(range.start),
      label: weekRangeLabel(range, locale),
      range,
      days,
      dayBars,
      totalLabel: formatDuration(totalSeconds),
      targetLabel: formatDuration(targetSeconds),
      progress: summary.progress,
      overTarget: summary.overTarget,
      overByLabel: summary.overByLabel,
      off,
      totalSeconds,
      defaultExpanded: range.start.getTime() === currentWeekStart || summary.overTarget,
      isCurrent: range.start.getTime() === currentWeekStart,
      earningsLabel: summary.earningsLabel,
      totalEarnings: weekEarnings,
      categoryBreakdown,
    };
  });

  return { weeks: groupedWeeks, summary };
}

/** Day-of-month → completed seconds, for the calendar's intensity dots. */
export function monthDayTotals(
  sessions: Session[],
  year: number,
  month: number, // 0-based, matching Date
): Map<number, number> {
  const totals = new Map<number, number>();
  for (const session of sessions) {
    if (
      session.checkOut === null ||
      session.checkIn.getFullYear() !== year ||
      session.checkIn.getMonth() !== month
    ) {
      continue;
    }
    const day = session.checkIn.getDate();
    totals.set(day, (totals.get(day) ?? 0) + sessionDurationSeconds(session));
  }
  return totals;
}

/** Calendar-month grouping for the Logs list: totals bucket by check-in month. */
export interface MonthGroup {
  /** Month identity for list keys: `YYYY-M` (0-based M, matching Date). */
  key: string;
  label: string;
  totalSeconds: number;
  /** Calendar-month earnings at each session's own rate. */
  earnings: number;
  /** Distinct weeks with at least one session in this month. */
  weekCount: number;
}

/**
 * Groups sessions into calendar months, newest first. Totals bucket by the
 * session's check-in month (matching the calendar and Insights) — a week
 * straddling a month boundary contributes to both months' headers, even
 * though its card renders under the month the week starts in.
 */
export function groupSessionsByMonth(
  sessions: Session[],
  settings: Settings,
  rateHistory: RateRecord[],
  locale = 'en-US',
): MonthGroup[] {
  const byMonth = new Map<
    string,
    { start: Date; sessions: Session[]; weeks: Set<string> }
  >();
  for (const session of sessions) {
    if (session.checkOut === null) continue;
    const start = new Date(session.checkIn.getFullYear(), session.checkIn.getMonth(), 1);
    const key = `${start.getFullYear()}-${start.getMonth()}`;
    const bucket = byMonth.get(key) ?? { start, sessions: [], weeks: new Set<string>() };
    bucket.sessions.push(session);
    bucket.weeks.add(weekKey(weekRange(session.checkIn, settings.weekStartDay).start));
    byMonth.set(key, bucket);
  }
  return [...byMonth.values()]
    .sort((a, b) => b.start.getTime() - a.start.getTime())
    .map(({ start, sessions, weeks }) => ({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleDateString(locale, { month: 'long', year: 'numeric' }),
      totalSeconds: sumCompletedSessions(sessions),
      earnings: sumEarnings(sessions, rateHistory),
      weekCount: weeks.size,
    }));
}

/** Day-of-month → earnings at each session's own rate, for the calendar cells. */
export function monthDayEarnings(
  sessions: Session[],
  year: number,
  month: number, // 0-based, matching Date
  rateHistory: RateRecord[],
): Map<number, number> {
  const earnings = new Map<number, number>();
  for (const session of sessions) {
    if (
      session.checkOut === null ||
      session.checkIn.getFullYear() !== year ||
      session.checkIn.getMonth() !== month
    ) {
      continue;
    }
    const day = session.checkIn.getDate();
    const earned =
      sessionEarnings(sessionDurationSeconds(session), session.checkIn, rateHistory) ?? 0;
    // Days without a covering rate stay absent — the calendar hides money there.
    if (earned > 0 || earnings.has(day)) {
      earnings.set(day, (earnings.get(day) ?? 0) + earned);
    }
  }
  return earnings;
}

// ── The Logs list model — the screen's single engine call ─────────────────────

/** One flattened FlatList row: a month header, week card, day header, session card, or collapsed week. */
export type LogsRow =
  | { kind: 'month'; key: string; label: string; totalLabel: string; earningsLabel: string | null; weekCount: number }
  | { kind: 'week'; key: string; week: LogWeek }
  | { kind: 'day'; key: string; day: LogDay }
  | { kind: 'session'; key: string; session: Session }
  | { kind: 'collapsed'; key: string; week: LogWeek };

/** Everything `logsListModel` needs. Expansion overrides are data (per-visit, screen-owned); the model applies the defaults. */
export interface LogsListInput {
  sessions: Session[];
  settings: Settings;
  now: Date;
  filter?: LogsFilter;
  locale?: string;
  rateHistory?: RateRecord[];
  /** When set, the calendar's day maps are computed for this month (from ALL sessions — the calendar ignores the day filter). */
  calendarMonth?: Date;
  /** Per-visit week-expansion overrides keyed by week key; `?? defaultExpanded` when absent. */
  expanded?: Record<string, boolean>;
  /** Per-visit month-expansion overrides keyed by `YYYY-M`; absent = expanded. */
  monthsExpanded?: Record<string, boolean>;
}

/** One category's share of the filtered set's completed time; `label` '' = uncategorised. */
export interface LogCategoryShare {
  label: string;
  seconds: number;
}

/** The Logs screen's whole view: flattened rows plus every strip the screen renders. */
export interface LogsListViewModel {
  rows: LogsRow[];
  /** The model's weeks, newest-first — the share picker's list. */
  weeks: LogWeek[];
  /** The day/category/query-filtered session list — the filtered CSV export's input. */
  filtered: Session[];
  /** The filtered-set summary; null when no filter is active. */
  summary: FilteredSummary | null;
  grandSessionCount: number;
  grandTotalLabel: string;
  /** Formatted money when any covered earnings exist, else null. */
  grandEarningsLabel: string | null;
  /** Completed seconds under the filters — the category bar's denominator. */
  filteredSeconds: number;
  categoryShares: LogCategoryShare[];
  /** Present only when `calendarMonth` was given. */
  dayTotals?: Map<number, number>;
  dayEarnings?: Map<number, number>;
  /** The current pay period's paycheck summary; null when the feature is off. */
  payPeriod: PeriodSummary | null;
}

/**
 * The deep module behind the Logs screen: weeks, month headers, expansion,
 * day filtering, summary strip, category bar, and calendar data — one call,
 * one view-model. The screen keeps interaction state and rendering only.
 */
export function logsListModel(input: LogsListInput): LogsListViewModel {
  const { sessions, settings, now } = input;
  const locale = input.locale ?? 'en-US';
  const rateHistory = input.rateHistory ?? [];

  // The calendar-day filter narrows every number, like the other filter axes.
  const dayFiltered =
    input.filter?.day !== undefined
      ? sessions.filter((s) => localDayKey(s.checkIn) === input.filter!.day)
      : sessions;

  const { weeks, summary } = logsModel(
    dayFiltered,
    settings,
    now,
    {
      category: input.filter?.category,
      dateRange: input.filter?.dateRange,
      query: input.filter?.query,
    },
    locale,
    rateHistory,
  );
  const monthGroups = groupSessionsByMonth(dayFiltered, settings, rateHistory, locale);

  const rows: LogsRow[] = [];
  let lastMonthKey = '';
  for (const week of weeks) {
    const monthStart = new Date(week.range.start.getFullYear(), week.range.start.getMonth(), 1);
    const monthKey = `${monthStart.getFullYear()}-${monthStart.getMonth()}`;
    if (monthKey !== lastMonthKey) {
      const group = monthGroups.find((g) => g.key === monthKey);
      if (group) {
        rows.push({
          kind: 'month',
          key: `m-${monthKey}`,
          label: group.label,
          totalLabel: formatDuration(group.totalSeconds),
          // Compact dollars for a section header; exact money lives on the week cards.
          earningsLabel: group.earnings > 0 ? `$${group.earnings.toFixed(0)}` : null,
          weekCount: group.weekCount,
        });
      }
      lastMonthKey = monthKey;
    }
    if (!(input.monthsExpanded?.[monthKey] ?? true)) continue;
    const isExpanded = input.expanded?.[week.key] ?? week.defaultExpanded;
    if (!isExpanded) {
      rows.push({ kind: 'collapsed', key: `w-${week.key}`, week });
      continue;
    }
    rows.push({ kind: 'week', key: `w-${week.key}`, week });
    for (const day of week.days) {
      rows.push({ kind: 'day', key: `d-${day.key}`, day });
      for (const session of day.sessions) {
        rows.push({ kind: 'session', key: `s-${session.id}`, session });
      }
    }
  }

  const grandSeconds = sumCompletedSessions(dayFiltered);
  const grandEarnings = sumEarnings(dayFiltered, rateHistory);

  // Category bar shares over the filtered set, completed time only.
  const catSeconds = new Map<string, number>();
  for (const session of dayFiltered) {
    if (session.checkOut === null) continue;
    const cat = session.category || '';
    catSeconds.set(cat, (catSeconds.get(cat) ?? 0) + sessionDurationSeconds(session));
  }
  const categoryShares: LogCategoryShare[] = [...catSeconds.entries()]
    .map(([label, seconds]) => ({ label, seconds }))
    .sort((a, b) => b.seconds - a.seconds);

  return {
    rows,
    weeks,
    filtered: dayFiltered,
    summary,
    grandSessionCount: dayFiltered.filter((s) => s.checkOut !== null).length,
    grandTotalLabel: formatDuration(grandSeconds),
    grandEarningsLabel: grandEarnings > 0 ? formatMoney(grandEarnings) : null,
    filteredSeconds: grandSeconds,
    categoryShares,
    ...(input.calendarMonth !== undefined && {
      dayTotals: monthDayTotals(sessions, input.calendarMonth.getFullYear(), input.calendarMonth.getMonth()),
      dayEarnings: monthDayEarnings(sessions, input.calendarMonth.getFullYear(), input.calendarMonth.getMonth(), rateHistory),
    }),
    payPeriod: currentPeriod(sessions, settings, now, locale, rateHistory),
  };
}

/** A share-ready text summary of one week — formatted for messaging apps. */
export function formatWeekShareText(week: LogWeek, locale = 'en-US'): string {
  const lines: string[] = [];
  lines.push(`LogBook — ${week.label}`);
  lines.push('');
  lines.push(`Total: ${week.totalLabel} / ${week.targetLabel}`);
  if (week.earningsLabel) lines.push(`Earned: ${week.earningsLabel}`);
  if (week.categoryBreakdown.length > 0) {
    lines.push('');
    for (const entry of week.categoryBreakdown) {
      lines.push(`  ${entry.label || 'Uncategorised'}: ${entry.totalLabel}`);
    }
  }
  if (week.days.length > 0) {
    lines.push('');
    lines.push('Sessions:');
    for (const day of week.days) {
      for (const session of day.sessions) {
        const duration = formatDuration(sessionDurationSeconds(session));
        const category = session.category.length > 0 ? ` (${session.category})` : '';
        const note = session.note.length > 0 ? ` — ${session.note}` : '';
        lines.push(`  • ${day.label}: ${duration}${category}${note}`);
      }
    }
  }
  return lines.join('\n');
}
