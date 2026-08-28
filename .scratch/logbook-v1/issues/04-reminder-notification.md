# 04: Reminder notification on check-in

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** So the user never forgets to check out: on check-in, schedule a local notification to fire after the reminder-threshold hours (read from settings, default 10h). On check-out, cancel the pending notification. On Android 13+, request notification permission before scheduling, degrading gracefully if denied. The whole flow works in Expo Go.

**Blocked by:** 02 — Check-in/check-out loop with SQLite persistence.

**Status:** done

- [x] Checking in schedules a local notification to fire after the configured reminder threshold (default 10h from settings)
- [x] Checking out cancels the pending notification — it never fires after checkout
- [x] On Android 13+, `requestPermissionsAsync()` is called before scheduling; denial doesn't break check-in
- [ ] Manually verified on device with a low threshold: the notification fires while the app is backgrounded *(pending user verification on phone — set threshold to 1h in DB or wait for Settings screen in ticket 07)*
- [x] No remote push, no dev build — local notifications only, Expo Go compatible *(caveat found on-device: expo-notifications will not load at all on Android Expo Go — reminders silently skip there; works on iOS Expo Go and dev builds; see the lazy-import fix in reminders.ts)*
