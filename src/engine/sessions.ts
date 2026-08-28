import type { Session } from './types';

/** Whole seconds a session has run: completed duration, or elapsed-since-check-in for a running session. */
export function sessionDurationSeconds(session: Session, now?: Date): number {
  const end = session.checkOut ?? now;
  if (!end) {
    throw new Error('A running session needs `now` to compute its duration');
  }
  return Math.floor((end.getTime() - session.checkIn.getTime()) / 1000);
}
