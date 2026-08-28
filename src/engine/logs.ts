import { formatDuration } from './time';
import { formatMoney } from './money';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { dateLocale, formatDayLabel, weekKey, weekProgress, weekRange, weekRangeLabel, type WeekRange } from './weeks';

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
  /** Completed-session totals per category, largest first; empty label = uncategorised. */
  categoryBreakdown: Array<{ label: string; totalLabel: string }>;
}

function localDayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
 * Full history grouped newest-first. An optional category filter recomputes
 * every number over the matching sessions only; weeks without matches hide.
 */
export function logsModel(
  sessions: Session[],
  settings: Settings,
  now: Date = new Date(),
  category?: string,
  locale = 'en-US',
): LogWeek[] {
  const effective = category === undefined ? sessions : sessions.filter((s) => s.category === category);
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

  return weeks.map(({ range, sessions }) => {
    const totalSeconds = sumCompletedSessions(sessions);
    const off = settings.offWeeks.includes(weekKey(range.start));
    const progress = off ? { progress: 0, overTarget: false } : weekProgress(totalSeconds, targetSeconds);

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
        daySessions.sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
        const dayTotal = sumCompletedSessions(daySessions);
        return {
          key: localDayKey(date),
          label: formatDayLabel(date, locale),
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
      progress: progress.progress,
      overTarget: progress.overTarget,
      overByLabel: progress.overTarget ? formatDuration(totalSeconds - targetSeconds) : null,
      off,
      earningsLabel:
        settings.hourlyRate > 0
          ? formatMoney((totalSeconds / 3600) * settings.hourlyRate)
          : null,
      categoryBreakdown,
    };
  });
}
