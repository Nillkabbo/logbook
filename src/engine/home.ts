import { formatDuration, formatElapsed } from './durations';
import { sessionDurationSeconds } from './sessions';
import type { Session, Settings } from './types';

export interface HomeModel {
  running: Session | null;
  elapsedSeconds: number | null;
  elapsedLabel: string | null;
  /** Sessions owned by today (check-in day), oldest first — a running session is included. */
  todaySessions: Session[];
  todayTotalSeconds: number;
  todayTotalLabel: string;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Everything the Home screen renders, computed from the session list at `now`.
 * `settings` is part of the agreed engine seam; the week-to-date fields arrive in ticket 03.
 */
export function homeModel(sessions: Session[], settings: Settings, now: Date): HomeModel {
  void settings;
  const running = sessions.find((s) => s.checkOut === null) ?? null;
  const elapsedSeconds = running ? sessionDurationSeconds(running, now) : null;
  const todaySessions = sessions
    .filter((s) => isSameLocalDay(s.checkIn, now))
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  const todayTotalSeconds = todaySessions
    .filter((s) => s.checkOut !== null)
    .reduce((sum, s) => sum + sessionDurationSeconds(s), 0);
  return {
    running,
    elapsedSeconds,
    elapsedLabel: elapsedSeconds === null ? null : formatElapsed(elapsedSeconds),
    todaySessions,
    todayTotalSeconds,
    todayTotalLabel: formatDuration(todayTotalSeconds),
  };
}

/** 24-hour `HH:MM` wall-clock time in the local timezone. */
export function formatTimeOfDay(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
