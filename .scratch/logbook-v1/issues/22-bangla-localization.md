# 22: Bangla localization — full UI translation

Parent spec: `.scratch/logbook-v1/spec.md` (phase 4, grill session 2026-08-28)

**What to build:** The whole UI speaks Bangla or English: weekdays, month/date names (Intl bn-BD), every label, message, alert, and notification. Times and durations keep Latin digits (tabular, scannable). Language setting in Settings: System (default — device language via expo-localization) / English / বাংলা. A small in-house dictionary module; no heavy i18n dependency for two languages.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Dictionary module (en + bn) covering every UI string; no stray hardcoded English in components
- [ ] Dates and weekday names localized via Intl (bn-BD keeps Latin digits for numbers)
- [ ] Settings language option: System / English / বাংলা, persisted; System follows expo-localization
- [ ] Notification titles/bodies localized (reminder, block start/end, backup copy if any)
- [ ] Week/date-range labels remain glossary-accurate in both languages
- [ ] Engine tests green; typecheck clean; bundles export; verified on both phones
