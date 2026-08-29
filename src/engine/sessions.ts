import type { Session } from './types';

/** Whole seconds a session has run: completed duration, or elapsed-since-check-in for a running session. */
export function sessionDurationSeconds(session: Session, now?: Date): number {
  const end = session.checkOut ?? now;
  if (!end) {
    throw new Error('A running session needs `now` to compute its duration');
  }
  return Math.floor((end.getTime() - session.checkIn.getTime()) / 1000);
}

/** Sum of completed-session durations in seconds; running sessions contribute nothing. */
export function sumCompletedSessions(sessions: Session[]): number {
  return sessions
    .filter((s) => s.checkOut !== null)
    .reduce((sum, s) => sum + sessionDurationSeconds(s), 0);
}

/** Distinct categories in most-recently-used order (empty labels never included). */
export function categorySuggestions(sessions: Session[], limit?: number): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const session of [...sessions].reverse()) {
    const category = session.category;
    if (category.length === 0 || seen.has(category)) continue;
    seen.add(category);
    ordered.push(category);
  }
  return limit === undefined ? ordered : ordered.slice(0, limit);
}

/** List id for a session that doesn't exist yet — quick-add drafts only, never persisted. */
export const NEW_SESSION_ID = -1;

/**
 * Quick-add draft: the last hour, snapped to 15-minute marks. Never future,
 * checkout always after check-in, seconds zeroed. The dominant quick-add is
 * "forgot to clock in earlier today"; yesterday is a two-tap picker change.
 */
export function newSessionDraft(now: Date): Session {
  const checkOut = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes());
  checkOut.setMinutes(Math.floor(checkOut.getMinutes() / 15) * 15, 0, 0);
  const checkIn = new Date(checkOut.getTime() - 60 * 60 * 1000);
  return { id: NEW_SESSION_ID, checkIn, checkOut, note: '', category: '' };
}
