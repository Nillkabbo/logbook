# 19: System clock format — 12/24-hour follows the phone

Parent spec: `.scratch/logbook-v1/spec.md` (phase 3, grill session 2026-08-28)

**What to build:** Screen times respect the phone's 12/24-hour preference via expo-localization's uses24HourClock — 2:30 PM or 14:30 as the user's device dictates. Storage stays UTC; the CSV stays 24-hour forever (machine format, never ambiguous). The engine's formatTimeOfDay gains an hour12 mode, TDD both ways; every screen and the sheet pass the device preference.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] formatTimeOfDay(date, hour12?) — TDD: 24h as today, 12h with AM/PM, zero-padding rules
- [ ] expo-localization provides the device preference; screens, sheet, and next-block line use it
- [ ] CSV output unchanged (24h) — regression-tested
- [ ] Engine tests green; typecheck clean; bundles export; verified on both phones
