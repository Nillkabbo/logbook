import { formatDuration } from './time';
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
  /** 'week' = current week only; 'month' = trailing 30 days; 'all' = everything. */
  dateRange?: 'week' | 'month' | 'all';
  /** Case-insensitive substring match on note and category. */
  query?: string;
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
  /** True when this week is marked Off — target judgment suspended. */
  off: boolean;
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
 * Full history grouped newest-first: weeks (bounded by the configured week-start
 * day, labeled by date range) containing days (check-in-day ownership) containing
 * sessions (oldest first). Totals count completed sessions only.
 */
/**
 * Full history grouped newest-first. Filters (category, date range, search)
 * recompute every number over the matching sessions only; weeks without
 * matches hide. The summary aggregates the filtered set for the totals bar.
 */
export function logsModel(
  sessions: Session[],
  settings: Settings,
  now: Date = new Date(),
  filter?: LogsFilter,
  locale = 'en-US',
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
        earningsLabel:
          settings.hourlyRate > 0
            ? `$${((sumCompletedSessions(effective) / 3600) * settings.hourlyRate).toFixed(2)}`
            : null,
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
    const summary = weekSummary(totalSeconds, targetSeconds, off, settings.hourlyRate);

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
      defaultExpanded: range.start.getTime() === currentWeekStart || summary.overTarget,
      isCurrent: range.start.getTime() === currentWeekStart,
      earningsLabel: summary.earningsLabel,
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
