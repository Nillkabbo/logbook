import { formatDuration } from './time';
import { sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { formatDayLabel, weekRange, weekRangeLabel, type WeekRange } from './weeks';

export interface LogDay {
  /** Local-day identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  /** Sessions owned by this day (check-in day), oldest first. A running session is included. */
  sessions: Session[];
  totalSeconds: number;
  totalLabel: string;
}

export interface LogWeek {
  /** Week-start identity for list keys: `YYYY-MM-DD`. */
  key: string;
  label: string;
  range: WeekRange;
  days: LogDay[];
  totalSeconds: number;
  totalLabel: string;
  targetSeconds: number;
  targetLabel: string;
  progress: number;
  overTarget: boolean;
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
          totalSeconds: dayTotal,
          totalLabel: formatDuration(dayTotal),
        };
      });

    return {
      key: localDayKey(range.start),
      label: weekRangeLabel(range),
      range,
      days,
      totalSeconds,
      totalLabel: formatDuration(totalSeconds),
      targetSeconds,
      targetLabel: formatDuration(targetSeconds),
      progress: targetSeconds === 0 ? 0 : totalSeconds / targetSeconds,
      overTarget: totalSeconds > targetSeconds,
    };
  });
}
