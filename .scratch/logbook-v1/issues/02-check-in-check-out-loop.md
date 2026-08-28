# 02: Check-in/check-out loop with SQLite persistence

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** The core tracer bullet — a complete path from UI to database. On Home, one giant button toggles Check in ↔ Check out. Check-in creates a running session in SQLite (nullable checkout) and starts a live elapsed timer; check-out completes it with an exact timestamp. Home lists today's sessions with clock-style times and today's total (completed sessions only — the running one is excluded but visible). A running session survives closing and reopening the app. The domain engine module is born here as pure functions, with its first unit tests.

**Blocked by:** 01 — Scaffold Expo app with tab shell.

**Status:** ready-for-agent

- [ ] Tapping Check in persists a running session (nullable `check_out_utc`) and flips the button to Check out with a live elapsed timer
- [ ] Tapping Check out completes the session with an exact timestamp; the pair appears in today's session list
- [ ] Session times and durations render clock-style (`7:45`), never decimal
- [ ] Today's total sums completed sessions only; the running session is excluded from the total but listed
- [ ] Multiple sessions per day accumulate correctly
- [ ] Killing and reopening the app shows the session still running with the timer continuing
- [ ] SQLite schema exists: `sessions` (id, check_in_utc, check_out_utc nullable, note, created_at) and `settings` (week-start day, weekly target, reminder threshold, setup flag) seeded with defaults (Sunday, 40h, 10h)
- [ ] Engine unit tests pass: clock-style formatting (including durations over an hour), elapsed at a fixed `now`, grouping sessions into "today" — pure functions, no mocks
