import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { getLocales } from 'expo-localization';

import { dateLocale } from '@/engine/weeks';
import type { LanguageSetting } from '@/engine/types';
import { WEEKDAYS, stringFor } from './strings';
import type { Language, StringKey, StringParams } from './strings';

export type { Language, StringKey } from './strings';
export type { LanguageSetting };
export { stringsFor } from './strings';

interface I18n {
  language: Language;
  locale: string;
  t: (key: StringKey, params?: StringParams) => string;
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
      locale: dateLocale(language),
      t: (key, params) => stringFor(language, key, params),
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
