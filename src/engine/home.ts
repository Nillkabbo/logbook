import { formatDuration, formatElapsed } from './time';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { localDayKey, weekKey, weekRange, weekSummary } from './weeks';

export interface HomeDayBar {
  /** Local-day identity for list keys: `YYYY-MM-DD`. */
  key: string;
  isToday: boolean;
  /** Day total scaled to the week's busiest day: 0 empty … 1 busiest. */
  intensity: number;
}

export interface HomeModel {
  running: Session | null;
  elapsedSeconds: number | null;
  elapsedLabel: string | null;
  /** Weekday + date caption, e.g. "Wednesday, Aug 27" — orients the TODAY totals. */
  dateLabel: string;
  /** Seven bars from the week's start day — the week's shape at a glance. */
  weekDayBars: HomeDayBar[];
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
  // The running session always sits first — it's the live activity the user
  // is most likely to act on; completed sessions follow newest-first so the
  // latest log reads at the top.
  const todaySessions = sessions
    .filter((s) => isSameLocalDay(s.checkIn, now))
    .sort((a, b) => {
      const aRunning = a.checkOut === null ? 1 : 0;
      const bRunning = b.checkOut === null ? 1 : 0;
      if (aRunning !== bRunning) return bRunning - aRunning;
      return b.checkIn.getTime() - a.checkIn.getTime();
    });
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

  // Seven bars from the week's start day, scaled to the busiest day.
  const secondsByDayKey = new Map<string, number>();
  for (const session of sessions) {
    if (
      session.checkIn.getTime() >= week.start.getTime() &&
      session.checkIn.getTime() < week.end.getTime() &&
      session.checkOut !== null
    ) {
      const key = localDayKey(session.checkIn);
      secondsByDayKey.set(key, (secondsByDayKey.get(key) ?? 0) + sessionDurationSeconds(session));
    }
  }
  const busiest = Math.max(0, ...secondsByDayKey.values());
  const weekDayBars: HomeDayBar[] = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(week.start);
    date.setDate(date.getDate() + offset);
    const key = localDayKey(date);
    const seconds = secondsByDayKey.get(key) ?? 0;
    return { key, isToday: key === localDayKey(now), intensity: busiest === 0 ? 0 : seconds / busiest };
  });

  const dateLabel = now.toLocaleDateString(
    settings.language === 'bn' ? 'bn-BD-u-nu-latn' : 'en-US',
    { weekday: 'long', month: 'short', day: 'numeric' },
  );

  return {
    dateLabel,
    weekDayBars,
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
