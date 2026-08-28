/** Domain types shared across the LogBook engine. Pure data — no React Native. */

/** A check-in/check-out pair. `checkOut === null` means the session is running. */
export interface Session {
  id: number;
  checkIn: Date;
  checkOut: Date | null;
  note: string;
}

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface Settings {
  weekStartDay: Weekday;
  weeklyTargetHours: number;
  reminderThresholdHours: number;
  setupCompleted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  weekStartDay: 0, // Sunday
  weeklyTargetHours: 40,
  reminderThresholdHours: 10,
  setupCompleted: false,
};
