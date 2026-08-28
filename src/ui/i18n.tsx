import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { getLocales } from 'expo-localization';

import type { Settings } from '@/engine/types';

/** Two UI languages; Bangla dates keep Latin digits via the -u-nu-latn extension. */
export type Language = 'en' | 'bn';
export type LanguageSetting = 'system' | Language;

export const DATE_LOCALES: Record<Language, string> = {
  en: 'en-US',
  bn: 'bn-BD-u-nu-latn',
};

const WEEKDAYS: Record<Language, readonly string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};

const STRINGS = {
  en: {
    tabHome: 'Home', tabLogs: 'Logs', tabSettings: 'Settings',
    checkIn: 'Check in', checkOut: 'Check out',
    today: 'Today', thisWeek: 'This week', offWeek: 'Off week',
    nextBlock: 'Next block', blockInProgress: 'Work block in progress — checked in yet?',
    emptyHome: 'Nothing logged yet today.\nTap Check in when you start working.',
    emptyLogs: 'No sessions yet — your history builds here.',
    backupTitle: 'Back up your log — the last export was over a month ago (or never).',
    exportNow: 'Export now', dismiss: 'Dismiss',
    weekStartsOn: 'Week starts on', weeklyTarget: 'Weekly target (hours)',
    reminderThreshold: 'Reminder threshold (hours, 1–16)',
    reminderHint: 'Applies to your next check-in.',
    hourlyRate: 'Hourly rate ($, optional)',
    rateHint: 'When set, weeks show their earnings. Empty hides them.',
    language: 'Language', system: 'System',
    exportSection: 'Export', exportAll: 'Export all sessions (CSV)',
    exportHint: 'One row per session via the share sheet.',
    importBackup: 'Import backup (CSV)',
    importHint: 'Merges a previous export — duplicates and running rows are skipped.',
    importComplete: 'Import complete', importFailed: 'Import failed',
    schedule: 'Schedule', addBlock: 'Add block',
    from: 'From', to: 'To', remove: 'Remove',
    pickDays: 'Pick days', pickDaysBody: 'Choose at least one weekday for the block.',
    checkTimes: 'Check the times',
    blockHint: 'Blocks nudge you to check in — they never clock you in automatically.',
    session: 'Session', checkInLabel: 'Check-in', checkOutLabel: 'Check-out',
    stillRunning: 'Still running', note: 'Note', category: 'Category',
    categoryPlaceholder: 'What kind of work?', notePlaceholder: 'What was this session for?',
    delete: 'Delete session', save: 'Save', soFar: 'so far', now: 'now',
    uncategorised: 'Uncategorised', all: 'All',
    welcome: 'Welcome to LogBook',
    welcomeIntro: 'Two quick choices — you can change both later in Settings, or skip for now.',
    weekStartQ: 'When does your week start?',
    startTracking: 'Start tracking',
    skipSetup: 'Skip — use defaults (Sunday, 40h)',
    somethingWrong: 'Something went wrong',
    exportUnavailable: 'Export unavailable', exportUnavailableBody: 'Sharing is not available on this device.',
    exportFailed: 'Export failed', deleteSession: 'Delete session?',
    deleteSessionBody: 'This session will be removed permanently.',
    cancel: 'Cancel', markOff: 'Mark off', markOn: 'Mark on',
    notifReminderTitle: 'Still working?',
    notifReminderBody: 'Your session is still running. Check out of LogBook if you have finished for now.',
    notifBlockStartTitle: 'Work block starting',
    notifBlockStartBody: 'A scheduled work block is starting — check in when you begin.',
    notifBlockEndTitle: 'Block over',
    notifBlockEndBody: "Wrap up if you're still working.",
  },
  bn: {
    tabHome: 'হোম', tabLogs: 'লগ', tabSettings: 'সেটিংস',
    checkIn: 'চেক ইন', checkOut: 'চেক আউট',
    today: 'আজ', thisWeek: 'এই সপ্তাহ', offWeek: 'ছুটির সপ্তাহ',
    nextBlock: 'পরের ব্লক', blockInProgress: 'কাজের ব্লক চলছে — চেক ইন করেছেন?',
    emptyHome: 'আজ এখনো কিছু লেখা হয়নি।\nকাজ শুরু করার সময় চেক ইন চাপুন।',
    emptyLogs: 'এখনো কোনো সেশন নেই — আপনার ইতিহাস এখানে জমা হবে।',
    backupTitle: 'লগের ব্যাকআপ নিন — শেষ এক্সপোর্ট এক মাসের বেশি আগে (বা কখনোই নয়)।',
    exportNow: 'এখনই এক্সপোর্ট', dismiss: 'বন্ধ করুন',
    weekStartsOn: 'সপ্তাহ শুরু হয়', weeklyTarget: 'সাপ্তাহিক লক্ষ্য (ঘণ্টা)',
    reminderThreshold: 'রিমাইন্ডার (ঘণ্টা, ১–১৬)',
    reminderHint: 'আপনার পরের চেক ইনে প্রযোজ্য।',
    hourlyRate: 'ঘণ্টার হার ($, ঐচ্ছিক)',
    rateHint: 'সেট করলে সপ্তাহে আয় দেখাবে। খালি রাখলে লুকানো থাকবে।',
    language: 'ভাষা', system: 'সিস্টেম',
    exportSection: 'এক্সপোর্ট', exportAll: 'সব সেশন এক্সপোর্ট (CSV)',
    exportHint: 'প্রতি সেশনে এক সারি, শেয়ার শিটের মাধ্যমে।',
    importBackup: 'ব্যাকআপ ইমপোর্ট (CSV)',
    importHint: 'আগের এক্সপোর্ট মিশে যায় — ডুপ্লিকেট ও চলমান সারি বাদ যায়।',
    importComplete: 'ইমপোর্ট সম্পন্ন', importFailed: 'ইমপোর্ট ব্যর্থ',
    schedule: 'সময়সূচি', addBlock: 'ব্লক যোগ করুন',
    from: 'শুরু', to: 'শেষ', remove: 'সরান',
    pickDays: 'দিন বাছুন', pickDaysBody: 'ব্লকের জন্য অন্তত একটি দিন বাছুন।',
    checkTimes: 'সময় দেখুন',
    blockHint: 'ব্লক চেক ইনের জন্য মনে করায় — নিজে থেকে চেক ইন করে না।',
    session: 'সেশন', checkInLabel: 'চেক ইন', checkOutLabel: 'চেক আউট',
    stillRunning: 'এখনো চলছে', note: 'নোট', category: 'ক্যাটাগরি',
    categoryPlaceholder: 'কোন ধরনের কাজ?', notePlaceholder: 'এই সেশনটি কীসের ছিল?',
    delete: 'সেশন মুছুন', save: 'সংরক্ষণ', soFar: 'এ পর্যন্ত', now: 'এখন',
    uncategorised: 'ক্যাটাগরিহীন', all: 'সব',
    welcome: 'LogBook-এ স্বাগতম',
    welcomeIntro: 'দুটি ছোট পছন্দ — পরে সেটিংস থেকে বদলাতে পারবেন, বা এখনই এড়িয়ে যান।',
    weekStartQ: 'আপনার সপ্তাহ কবে শুরু হয়?',
    startTracking: 'শুরু করুন',
    skipSetup: 'এড়িয়ে যান — ডিফল্ট (রবিবার, ৪০ ঘণ্টা)',
    somethingWrong: 'কিছু একটা সমস্যা হয়েছে',
    exportUnavailable: 'এক্সপোর্ট সম্ভব নয়', exportUnavailableBody: 'এই ডিভাইসে শেয়ারিং নেই।',
    exportFailed: 'এক্সপোর্ট ব্যর্থ', deleteSession: 'সেশন মুছে ফেলবেন?',
    deleteSessionBody: 'এই সেশনটি চিরতরে মুছে যাবে।',
    cancel: 'বাতিল', markOff: 'ছুটি করুন', markOn: 'ফিরিয়ে আনুন',
    notifReminderTitle: 'এখনো কাজ করছেন?',
    notifReminderBody: 'আপনার সেশন এখনো চলছে। শেষ হলে LogBook থেকে চেক আউট করুন।',
    notifBlockStartTitle: 'কাজের ব্লক শুরু হচ্ছে',
    notifBlockStartBody: 'নির্ধারিত কাজের ব্লক শুরু হচ্ছে — শুরু করার পর চেক ইন করুন।',
    notifBlockEndTitle: 'ব্লক শেষ',
    notifBlockEndBody: 'এখনো কাজ করছেন হলে শেষ করুন।',
  },
} as const;

export type StringKey = keyof (typeof STRINGS)['en'];

interface I18n {
  language: Language;
  locale: string;
  t: (key: StringKey) => string;
  weekdayName: (weekday: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

/** Resolves the effective language from the setting, following the device when 'system'. */
export function effectiveLanguage(setting: LanguageSetting): Language {
  if (setting === 'en' || setting === 'bn') return setting;
  const device = getLocales()[0]?.languageCode ?? 'en';
  return device.startsWith('bn') ? 'bn' : 'en';
}

export function I18nProvider({
  languageSetting,
  children,
}: {
  languageSetting: LanguageSetting;
  children: ReactNode;
}) {
  const language = effectiveLanguage(languageSetting);
  const value = useMemo<I18n>(
    () => ({
      language,
      locale: DATE_LOCALES[language],
      t: (key) => STRINGS[language][key],
      weekdayName: (weekday) => WEEKDAYS[language][weekday] ?? '',
    }),
    [language],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const i18n = useContext(I18nContext);
  if (!i18n) throw new Error('useI18n must be used inside <I18nProvider>');
  return i18n;
}

/** Dictionary access for non-React callers (notification adapter). */
export function stringsFor(language: Language) {
  return STRINGS[language];
}
