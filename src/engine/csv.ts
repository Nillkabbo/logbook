import { sessionDurationSeconds } from './sessions';
import type { Session } from './types';

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function localDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function localDateTime(date: Date): string {
  return `${localDate(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Full CSV export, oldest session first:
 * `date,check_in,check_out,duration_minutes,note` — timestamps in the local
 * timezone; running sessions carry a blank checkout and blank duration.
 */
export function sessionsToCsv(sessions: Session[]): string {
  const lines = ['date,check_in,check_out,duration_minutes,note'];
  const ordered = [...sessions].sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  for (const session of ordered) {
    const durationMinutes =
      session.checkOut === null
        ? ''
        : String(Math.floor(sessionDurationSeconds(session) / 60));
    lines.push(
      [
        localDate(session.checkIn),
        localDateTime(session.checkIn),
        session.checkOut === null ? '' : localDateTime(session.checkOut),
        durationMinutes,
        escapeCsv(session.note),
      ].join(','),
    );
  }
  return lines.join('\n');
}
