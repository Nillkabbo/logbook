import { formatDuration } from './time';
import { sessionDurationSeconds, sumCompletedSessions } from './sessions';
import type { Session, Settings } from './types';
import { weekRange } from './weeks';

/** One weekday's total worked hours, for the distribution card. */
export interface WeekdayHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  hours: number;
}

/** One category's share of total worked time. */
export interface CategoryShare {
  label: string;
  hours: number;
  percentage: number;
}

/** Everything the Insights screen renders, computed from the full session list. */
/** One month's total for the trends chart. */
export interface MonthlyTotal {
  /** Year-month key, e.g. '2026-08'. */
  key: string;
  /** Short month label, e.g. 'Aug'. */
  label: string;
  hours: number;
  earnings: number | null;
}

export interface InsightsModel {
  /** Monthly totals for the trends chart, oldest first, up to 12 months. */
  monthlyTrends: MonthlyTotal[];
  /** Average hours per week, over weeks that have at least one session. */
  averageWeekHours: number;
  averageWeekLabel: string;
  /** Average session length in minutes. */
  averageSessionMinutes: number;
  averageSessionLabel: string;

  /** The weekday with the most total hours. */
  bestWeekday: { day: number; hours: number };
  /** Total hours per weekday, 7 entries (index = day, 0=Sunday). */
  weekdayHours: WeekdayHours[];

  /** Category shares, largest first; '' = uncategorised. */
  categoryShares: CategoryShare[];

  /** Consecutive days with ≥1 completed session, ending today or yesterday. */
  currentStreak: number;
  /** Longest run of consecutive days with ≥1 completed session. */
  longestStreak: number;

  /** This week vs last week (completed hours). */
  thisWeekHours: number;
  lastWeekHours: number;
  weekDeltaHours: number;

  /** This calendar month vs last calendar month (completed hours). */
  thisMonthHours: number;
  lastMonthHours: number;
  monthDeltaHours: number;

  /** All-time totals (completed sessions only). */
  totalSessions: number;
  totalHours: number;
  totalHoursLabel: string;
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * The Insights view model: averages, best weekday, category shares, streaks,
 * week/month comparisons, and all-time totals — computed from the full
 * session list at `now`. Running sessions are excluded from all totals.
 */
export function insightsModel(
  sessions: Session[],
  settings: Settings,
  now: Date,
  locale = 'en-US',
): InsightsModel {
  const completed = sessions.filter((s) => s.checkOut !== null);

  // ── Weekday hours ──
  const weekdaySeconds = new Array(7).fill(0);
  for (const s of completed) {
    weekdaySeconds[s.checkIn.getDay()] += sessionDurationSeconds(s);
  }
  const weekdayHours: WeekdayHours[] = weekdaySeconds.map((sec, day) => ({
    day,
    hours: sec / 3600,
  }));
  const bestDay = weekdayHours.reduce((best, cur) => (cur.hours > best.hours ? cur : best), weekdayHours[0]);

  // ── Category shares ──
  const catSeconds = new Map<string, number>();
  let totalSeconds = 0;
  for (const s of completed) {
    const dur = sessionDurationSeconds(s);
    totalSeconds += dur;
    const cat = s.category || '';
    catSeconds.set(cat, (catSeconds.get(cat) ?? 0) + dur);
  }
  const categoryShares: CategoryShare[] = [...catSeconds.entries()]
    .map(([label, sec]) => ({
      label,
      hours: sec / 3600,
      percentage: totalSeconds > 0 ? (sec / totalSeconds) * 100 : 0,
    }))
    .sort((a, b) => b.hours - a.hours);

  // ── Streaks ──
  const dayKeys = new Set(completed.map((s) => localDayKey(s.checkIn)));
  // Current streak: count back from today (or yesterday if today has none)
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!dayKeys.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayKeys.has(localDayKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  // Longest streak
  let longestStreak = 0;
  let run = 0;
  const sortedDays = [...dayKeys].sort();
  let prev: Date | null = null;
  for (const key of sortedDays) {
    const [y, m, d] = key.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    if (prev && date.getTime() - prev.getTime() === 86400000) {
      run++;
    } else {
      run = 1;
    }
    longestStreak = Math.max(longestStreak, run);
    prev = date;
  }

  // ── Week comparisons ──
  const thisWeek = weekRange(now, settings.weekStartDay);
  const lastWeekStart = new Date(thisWeek.start);
  lastWeekStart.setDate(thisWeek.start.getDate() - 7);
  const lastWeekEnd = new Date(thisWeek.end);
  lastWeekEnd.setDate(thisWeek.end.getDate() - 7);

  const thisWeekHours =
    sumCompletedSessions(
      completed.filter(
        (s) => s.checkIn.getTime() >= thisWeek.start.getTime() && s.checkIn.getTime() < thisWeek.end.getTime(),
      ),
    ) / 3600;
  const lastWeekHours =
    sumCompletedSessions(
      completed.filter(
        (s) => s.checkIn.getTime() >= lastWeekStart.getTime() && s.checkIn.getTime() < lastWeekEnd.getTime(),
      ),
    ) / 3600;

  // ── Month comparisons ──
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const thisMonthHours =
    sumCompletedSessions(
      completed.filter((s) => s.checkIn.getTime() >= thisMonthStart.getTime()),
    ) / 3600;
  const lastMonthHours =
    sumCompletedSessions(
      completed.filter(
        (s) => s.checkIn.getTime() >= lastMonthStart.getTime() && s.checkIn.getTime() < thisMonthStart.getTime(),
      ),
    ) / 3600;

  // ── Average week ──
  // Count distinct weeks that have at least one completed session
  const weekKeys = new Set(
    completed.map((s) => localDayKey(weekRange(s.checkIn, settings.weekStartDay).start)),
  );
  const weeksWithData = Math.max(1, weekKeys.size);
  const averageWeekHours = totalSeconds / 3600 / weeksWithData;

  // ── Average session ──
  const averageSessionMinutes = completed.length > 0 ? totalSeconds / 60 / completed.length : 0;

  // ── Monthly trends (last 12 calendar months, oldest first) ──
  const monthlyTrends: MonthlyTotal[] = [];
  const nowMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const monthSeconds = sumCompletedSessions(
      completed.filter(
        (s) => s.checkIn.getTime() >= monthStart.getTime() && s.checkIn.getTime() < monthEnd.getTime(),
      ),
    );
    monthlyTrends.push({
      key: `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`,
      label: monthStart.toLocaleDateString(locale, { month: 'short' }),
      hours: monthSeconds / 3600,
      earnings: settings.hourlyRate > 0 ? ((monthSeconds / 3600) * settings.hourlyRate) : null,
    });
  }

  return {
    monthlyTrends,
    averageWeekHours,
    averageWeekLabel: formatDuration(Math.round(averageWeekHours * 3600)),
    averageSessionMinutes,
    averageSessionLabel: formatDuration(Math.round(averageSessionMinutes * 60)),

    bestWeekday: { day: bestDay.day, hours: bestDay.hours },
    weekdayHours,

    categoryShares,

    currentStreak,
    longestStreak,

    thisWeekHours,
    lastWeekHours,
    weekDeltaHours: thisWeekHours - lastWeekHours,

    thisMonthHours,
    lastMonthHours,
    monthDeltaHours: thisMonthHours - lastMonthHours,

    totalSessions: completed.length,
    totalHours: totalSeconds / 3600,
    totalHoursLabel: formatDuration(Math.round(totalSeconds)),
  };
}
