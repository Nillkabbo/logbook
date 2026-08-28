/** Domain types shared across the LogBook engine. Pure data — no React Native. */

/** A check-in/check-out pair. `checkOut === null` means the session is running. */
export interface Session {
  id: number;
  checkIn: Date;
  checkOut: Date | null;
  note: string;
  /** Free-form work label; empty when uncategorised. */
  category: string;
}

/** 0 = Sunday … 6 = Saturday, matching `Date.prototype.getDay()`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** UI language: follow the device, or fixed English/Bangla. */
export type LanguageSetting = 'system' | 'en' | 'bn';

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
  /** Dollars per worked hour; 0 means unset — earnings hidden. */
  hourlyRate: number;
  /** Epoch ms of the last CSV export; null when none has happened. */
  lastExportAt: number | null;
  /** Week-start keys (YYYY-MM-DD) marked as Off weeks — target judgment suspended. */
  offWeeks: string[];
  /** UI language; 'system' follows the device. */
  language: LanguageSetting;
  setupCompleted: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  weekStartDay: 0, // Sunday
  weeklyTargetHours: 40,
  reminderThresholdHours: 10,
  hourlyRate: 0,
  lastExportAt: null,
  offWeeks: [],
  language: 'system',
  setupCompleted: false,
};

/** An edited session's new truth: both timestamps (checkout null = running), note, and category. */
export interface SessionPatch {
  checkIn: Date;
  checkOut: Date | null;
  note: string;
  category: string;
}
