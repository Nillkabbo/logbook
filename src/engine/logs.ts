import { formatDuration } from './time';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { formatDayLabel, weekProgress, weekRange, weekRangeLabel, type WeekRange } from './weeks';

export interface LogDay {
  /** Local-day identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  /** Sessions owned by this day (check-in day), oldest first. A running session is included. */
  sessions: Session[];
  totalLabel: string;
}

export interface LogWeek {
  /** Week-start identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  range: WeekRange;
  days: LogDay[];
  totalLabel: string;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
  /** Clock-style overage (e.g. "2:00") in an over-target week; null otherwise. */
  overByLabel: string | null;
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
export function logsModel(sessions: Session[], settings: Settings): LogWeek[] {
  const byWeek = new Map<number, { range: WeekRange; sessions: Session[] }>();
  for (const session of sessions) {
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
    const progress = weekProgress(totalSeconds, targetSeconds);

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
          label: formatDayLabel(date),
          sessions: daySessions,
          totalLabel: formatDuration(dayTotal),
        };
      });

    return {
      key: localDayKey(range.start),
      label: weekRangeLabel(range),
      range,
      days,
      totalLabel: formatDuration(totalSeconds),
      targetLabel: formatDuration(targetSeconds),
      progress: progress.progress,
      overTarget: progress.overTarget,
      overByLabel: progress.overTarget ? formatDuration(totalSeconds - targetSeconds) : null,
      categoryBreakdown,
    };
  });
}
