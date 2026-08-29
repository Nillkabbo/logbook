/**
 * The pure string dictionary — no React Native imports, so vitest can test
 * key parity, placeholder parity, and interpolation in node. The React
 * provider that consumes this lives in i18n.tsx.
 */

/** Two UI languages; Bangla dates keep Latin digits (see engine dateLocale). */
export type Language = 'en' | 'bn';

const en = {
  tabHome: 'Home', tabLogs: 'Logs', tabSettings: 'Settings',
  checkIn: 'Check in', checkOut: 'Check out', since: 'since',
  sessionEnded: 'Session ended', undo: 'Undo',
  month: 'Month', searchHint: 'Search notes & categories',
  shareWeek: 'Share week', calendar: 'Calendar',
  shareAll: 'Share all {n} sessions', shareThis: 'Share this week',
  loadSample: 'Load sample data',
  loadSampleShort: '2 months',
  loadSampleLong: '1 year',
  insights: 'Insights', avgWeek: 'Average week', avgSession: 'Average session',
  months: '{n} months', weeksInMonth: '{n} weeks',
  bestDay: 'Most productive day', streak: 'Current streak', longestStreak: 'Longest streak',
  days: 'days', thisVsLastWeek: 'This week vs last', thisVsLastMonth: 'This month vs last',
  monthlyTrends: 'Hours by month',
  exportFiltered: 'Export filtered ({n})',
  yearOverview: 'This year',
  categoryTrends: 'Categories by month',
  vs: 'vs', allTime: 'All time', sessions: 'sessions', hours: 'hours',
  clearData: 'Clear all data',
  clearDataConfirm: 'Clear all data?',
  clearDataBody: 'All sessions, work blocks, and settings will be permanently deleted.',
  clearDataAction: 'Delete everything',
  rateHistory: 'Rate history', addRateChange: 'Add rate change',
  effectiveFrom: 'Effective from', currentRate: 'Current rate',
  from_date: 'from {date}', noRateHistory: 'No rate changes yet — set your rate above.',
  sampleLoaded: 'Loaded {n} sessions across 8 weeks',
  dataCleared: 'All data cleared',
  nSessions: '{n} sessions',
  today: 'Today', thisWeek: 'This week', offWeek: 'Off week',
  nextBlock: 'Next block', blockInProgress: 'Work block in progress — checked in yet?',
  emptyHome: 'Nothing logged yet today.\nTap Check in when you start working.',
  emptyLogs: 'No sessions yet — your history builds here.',
  backupTitle: 'Back up your log — the last export was over a month ago (or never).',
  exportNow: 'Export now', dismiss: 'Dismiss',
  weekStartsOn: 'Week starts on', weeklyTarget: 'Weekly target (hours)',
  reminderThreshold: 'Reminder threshold (hours, 1–16)',
  reminderHint: "We'll nudge you if a session runs past this.",
  hourlyRate: 'Hourly rate ($, optional)',
  rateHint: 'When set, weeks show their earnings. Empty hides them.',
  language: 'Language', system: 'System',
  theme: 'Appearance', light: 'Light', dark: 'Dark',
  week: 'Week', earnings: 'Earnings', data: 'Data',
  noBlocks: 'No work blocks yet', nBlocks: '{n} work blocks', dataSub: 'Export & import',
  overLabel: 'OVER', currentWeek: 'Current Week', earnedLabel: 'earned', lastExport: 'Last export: {date}',
  lastExportNever: 'Never exported',
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
  markOffConfirm: 'Pause target tracking for this week?',
  discard: 'Discard', keepEditing: 'Keep editing',
  discardChanges: 'Discard changes?',
  discardChangesBody: 'Your edits to this session will be lost.',
  errCheckinFuture: 'Check-in cannot be in the future.',
  errCheckoutFuture: 'Check-out cannot be in the future.',
  errCheckoutAfter: 'Check-out must be after check-in.',
  errThresholdRange: 'Reminder threshold must be between 1 and 16 hours.',
  errNotNumber: 'Reminder threshold must be a number.',
  errTargetNumber: 'Weekly target must be a number.',
  errTargetPositive: 'Weekly target must be a positive number of hours.',
  errRateNumber: 'Hourly rate must be a number.',
  errRateNegative: 'Hourly rate cannot be negative — leave it empty to hide earnings.',
  errBlockRange: 'The block needs a time range — start and end are the same.',
  importedNSessions: 'Imported {n} sessions.',
  skippedCounts: 'Skipped {duplicates} duplicates, {running} running, {malformed} malformed.',
  notifReminderTitle: 'Still working?',
  notifReminderBody: 'Your session is still running. Check out of LogBook if you have finished for now.',
  notifBlockStartTitle: 'Work block starting',
  notifBlockStartBody: 'A scheduled work block is starting — check in when you begin.',
  notifBlockEndTitle: 'Block over',
  notifBlockEndBody: "Wrap up if you're still working.",
} as const;

export type StringKey = keyof typeof en;

// Typed against the en keys: a missing Bangla string is a compile error the
// typecheck gate catches, not a runtime undefined.
const bn: Record<StringKey, string> = {
  tabHome: 'হোম', tabLogs: 'লগ', tabSettings: 'সেটিংস',
  checkIn: 'চেক ইন', checkOut: 'চেক আউট', since: 'শুরু',
  sessionEnded: 'সেশন শেষ', undo: 'ফিরিয়ে আনুন',
  month: 'মাস', searchHint: 'নোট ও ক্যাটাগরি খুঁজুন',
  shareWeek: 'সপ্তাহ শেয়ার', calendar: 'ক্যালেন্ডার',
  shareAll: 'সব {n}টি সেশন শেয়ার', shareThis: 'এই সপ্তাহ শেয়ার',
  loadSample: 'নমুনা ডেটা লোড',
  loadSampleShort: '২ মাস',
  loadSampleLong: '১ বছর',
  insights: 'ইনসাইট', avgWeek: 'গড় সপ্তাহ', avgSession: 'গড় সেশন',
  months: '{n} মাস', weeksInMonth: '{n} সপ্তাহ',
  bestDay: 'সবচেয়ে উৎপাদনশীল দিন', streak: 'বর্তমান ধারাবাহিকতা', longestStreak: 'দীর্ঘতম ধারাবাহিকতা',
  days: 'দিন', thisVsLastWeek: 'এই সপ্তাহ বনাম গত', thisVsLastMonth: 'এই মাস বনাম গত',
  monthlyTrends: 'মাস অনুযায়ী ঘণ্টা',
  exportFiltered: 'ফিল্টার করা এক্সপোর্ট ({n})',
  yearOverview: 'এই বছর',
  categoryTrends: 'মাস অনুযায়ী ক্যাটাগরি',
  vs: 'বনাম', allTime: 'সর্বকালীন', sessions: 'সেশন', hours: 'ঘণ্টা',
  clearData: 'সব ডেটা মুছুন',
  clearDataConfirm: 'সব ডেটা মুছে ফেলবেন?',
  clearDataBody: 'সব সেশন, ওয়ার্ক ব্লক এবং সেটিংস চিরতরে মুছে যাবে।',
  clearDataAction: 'সব মুছে ফেলুন',
  rateHistory: 'রেটের ইতিহাস', addRateChange: 'রেট পরিবর্তন যোগ করুন',
  effectiveFrom: 'কার্যকর হওয়ার তারিখ', currentRate: 'বর্তমান রেট',
  from_date: '{date} থেকে', noRateHistory: 'এখনো কোনো রেট পরিবর্তন নেই — উপরে আপনার রেট সেট করুন।',
  sampleLoaded: '৮ সপ্তাহে {n}টি সেশন লোড হয়েছে',
  dataCleared: 'সব ডেটা মুছে ফেলা হয়েছে',
  nSessions: '{n}টি সেশন',
  today: 'আজ', thisWeek: 'এই সপ্তাহ', offWeek: 'অফ সপ্তাহ',
  nextBlock: 'পরের ব্লক', blockInProgress: 'কাজের ব্লক চলছে — চেক ইন করেছেন?',
  emptyHome: 'আজ এখনো কিছু লেখা হয়নি।\nকাজ শুরু করার সময় চেক ইন চাপুন।',
  emptyLogs: 'এখনো কোনো সেশন নেই — আপনার ইতিহাস এখানে জমা হবে।',
  backupTitle: 'লগের ব্যাকআপ নিন — শেষ এক্সপোর্ট এক মাসের বেশি আগে (বা কখনোই নয়)।',
  exportNow: 'এখনই এক্সপোর্ট', dismiss: 'বন্ধ করুন',
  weekStartsOn: 'সপ্তাহ শুরু হয়', weeklyTarget: 'সাপ্তাহিক টার্গেট (ঘণ্টা)',
  reminderThreshold: 'রিমাইন্ডার (ঘণ্টা, ১–১৬)',
  reminderHint: 'কোনো সেশন এই সময়ের বেশি চললে মনে করিয়ে দেব।',
  hourlyRate: 'ঘণ্টার হার ($, ঐচ্ছিক)',
  rateHint: 'সেট করলে সপ্তাহে আয় দেখাবে। খালি রাখলে লুকানো থাকবে।',
  language: 'ভাষা', system: 'সিস্টেম',
  theme: 'চেহারা', light: 'লাইট', dark: 'ডার্ক',
  week: 'সপ্তাহ', earnings: 'আয়', data: 'ডেটা',
  noBlocks: 'এখনো কোনো কাজের ব্লক নেই', nBlocks: '{n}টি কাজের ব্লক', dataSub: 'এক্সপোর্ট ও ইমপোর্ট',
  overLabel: 'ওভার', currentWeek: 'চলতি সপ্তাহ', earnedLabel: 'অর্জিত', lastExport: 'শেষ এক্সপোর্ট: {date}',
  lastExportNever: 'কখনো এক্সপোর্ট হয়নি',
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
  stillRunning: 'এখনো চলছে', note: 'নোট', category: 'ক্যাটগরি',
  categoryPlaceholder: 'কোন ধরনের কাজ?', notePlaceholder: 'এই সেশনটি কীসের ছিল?',
  delete: 'সেশন মুছুন', save: 'সংরক্ষণ', soFar: 'এ পর্যন্ত', now: 'এখন',
  uncategorised: 'ক্যাটগরিহীন', all: 'সব',
  welcome: 'LogBook-এ স্বাগতম',
  welcomeIntro: 'দুটি ছোট পছন্দ — পরে সেটিংস থেকে বদলাতে পারবেন, বা এখনই এড়িয়ে যান।',
  weekStartQ: 'আপনার সপ্তাহ কবে শুরু হয়?',
  startTracking: 'শুরু করুন',
  skipSetup: 'এড়িয়ে যান — ডিফল্ট (রবিবার, ৪০ ঘণ্টা)',
  somethingWrong: 'কিছু একটা সমস্যা হয়েছে',
  exportUnavailable: 'এক্সপোর্ট সম্ভব নয়', exportUnavailableBody: 'এই ডিভাইসে শেয়ারিং নেই।',
  exportFailed: 'এক্সপোর্ট ব্যর্থ', deleteSession: 'সেশন মুছে ফেলবেন?',
  deleteSessionBody: 'এই সেশনটি চিরতরে মুছে যাবে।',
  cancel: 'বাতিল', markOff: 'অফ করুন', markOn: 'অফ সরান',
  markOffConfirm: 'এই সপ্তাহের টার্গেট ট্র্যাকিং বন্ধ করবেন?',
  discard: 'বাতিয়ে দিন', keepEditing: 'সম্পাদনা চালিয়ে যান',
  discardChanges: 'পরিবর্তন বাতিল?',
  discardChangesBody: 'এই সেশনের সম্পাদনা হারিয়ে যাবে।',
  errCheckinFuture: 'চেক ইন ভবিষ্যতের সময় হতে পারে না।',
  errCheckoutFuture: 'চেক আউট ভবিষ্যতের সময় হতে পারে না।',
  errCheckoutAfter: 'চেক আউট চেক ইনের পরে হতে হবে।',
  errThresholdRange: 'রিমাইন্ডার ১ থেকে ১৬ ঘণ্টার মধ্যে হতে হবে।',
  errNotNumber: 'রিমাইন্ডার একটি সংখ্যা হতে হবে।',
  errTargetNumber: 'সাপ্তাহিক টার্গেট একটি সংখ্যা হতে হবে।',
  errTargetPositive: 'সাপ্তাহিক টার্গেট ধনাত্মক ঘণ্টা হতে হবে।',
  errRateNumber: 'ঘণ্টার হার একটি সংখ্যা হতে হবে।',
  errRateNegative: 'ঘণ্টার হার ঋণাত্মক হতে পারে না — আয় লুকাতে খালি রাখুন।',
  errBlockRange: 'ব্লকের জন্য সময়সীমা দরকার — শুরু আর শেষ একই।',
  importedNSessions: '{n}টি সেশন ইমপোর্ট হয়েছে।',
  skippedCounts: 'বাদ: {duplicates}টি ডুপ্লিকেট, {running}টি চলমান, {malformed}টি ত্রুটিপূর্ণ।',
  notifReminderTitle: 'এখনো কাজ করছেন?',
  notifReminderBody: 'আপনার সেশন এখনো চলছে। শেষ হলে LogBook থেকে চেক আউট করুন।',
  notifBlockStartTitle: 'কাজের ব্লক শুরু হচ্ছে',
  notifBlockStartBody: 'নির্ধারিত কাজের ব্লক শুরু হচ্ছে — শুরু করার পর চেক ইন করুন।',
  notifBlockEndTitle: 'ব্লক শেষ',
  notifBlockEndBody: 'এখনো কাজ করছেন হলে শেষ করুন।',
};

export const STRINGS: Record<Language, Record<StringKey, string>> = { en, bn };

export const WEEKDAYS: Record<Language, readonly string[]> = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  bn: ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'],
};

/** Substitution values for the keys that carry {tokens}. */
export type StringParams = Record<string, string | number>;

/** Substitute every {token}; a missing param stays literal so production never throws. */
export function interpolate(template: string, params?: StringParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (token, name: string) =>
    name in params ? String(params[name]) : token,
  );
}

/** One localized, interpolated string. */
export function stringFor(language: Language, key: StringKey, params?: StringParams): string {
  return interpolate(STRINGS[language][key], params);
}

/** Dictionary access for non-React callers (notification adapter). */
export function stringsFor(language: Language) {
  return STRINGS[language];
}

/** Short day names for compact pills and block summaries. */
export const WEEKDAYS_SHORT: Record<Language, readonly string[]> = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  bn: ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'],
};
