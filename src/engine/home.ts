import { formatDuration, formatElapsed } from './time';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { weekKey, weekRange, weekSummary } from './weeks';

export interface HomeModel {
  running: Session | null;
  elapsedSeconds: number | null;
  elapsedLabel: string | null;
  /** Sessions owned by today (check-in day), oldest first — a running session is included. */
  todaySessions: Session[];
  todayTotalLabel: string;
  /** Completed sessions owned by the current week (check-in day ownership), running excluded. */
  weekToDateLabel: string;
  weeklyTargetLabel: string;
  /** Fraction of target reached; exceeds 1 in an over-target week. */
  weekProgress: number;
  overTarget: boolean;
  /** Clock-style overage (e.g. "0:15") in an over-target week; null otherwise. */
  overByLabel: string | null;
  /** Week earnings at the set rate; null when no rate is set. */
  earningsLabel: string | null;
  /** True when the current week is marked Off — target judgment suspended. */
  off: boolean;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Everything the Home screen renders, computed from the session list at `now`:
 * running-session state, today grouping, and week-to-date against the target,
 * with weeks bounded by the configured week-start day.
 */
export function homeModel(sessions: Session[], settings: Settings, now: Date): HomeModel {
  const running = sessions.find((s) => s.checkOut === null) ?? null;
  const elapsedSeconds = running ? sessionDurationSeconds(running, now) : null;
  const todaySessions = sessions
    .filter((s) => isSameLocalDay(s.checkIn, now))
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  const todayTotalSeconds = sumCompletedSessions(todaySessions);

  const week = weekRange(now, settings.weekStartDay);
  const weekToDateSeconds = sumCompletedSessions(
    sessions.filter(
      (s) =>
        s.checkIn.getTime() >= week.start.getTime() && s.checkIn.getTime() < week.end.getTime(),
    ),
  );
  const weeklyTargetSeconds = Math.round(settings.weeklyTargetHours * 3600);
  const off = settings.offWeeks.includes(weekKey(week.start));
  const summary = weekSummary(weekToDateSeconds, weeklyTargetSeconds, off, settings.hourlyRate);

  return {
    running,
    elapsedSeconds,
    elapsedLabel: elapsedSeconds === null ? null : formatElapsed(elapsedSeconds),
    todaySessions,
    todayTotalLabel: formatDuration(todayTotalSeconds),
    weekToDateLabel: formatDuration(weekToDateSeconds),
    weeklyTargetLabel: formatDuration(weeklyTargetSeconds),
    weekProgress: summary.progress,
    overTarget: summary.overTarget,
    overByLabel: summary.overByLabel,
    off,
    earningsLabel: summary.earningsLabel,
  };
}
