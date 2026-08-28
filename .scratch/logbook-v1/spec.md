# Spec: LogBook v1 — check-in/check-out time tracking

Status: ready-for-agent
Feature: logbook-v1

## Problem Statement

I have no reliable record of when I work. Guessing hours after the fact is inaccurate, and paper notes or generic clock apps don't total my hours the way my week actually runs — my week doesn't start on Sunday, and I often forget to stop a timer. I need to check in when I start work and check out when I stop, with exact timestamps, and later see the full log and my weekly hours counted on my chosen week-start day.

## Solution

A single-user mobile app (LogBook) built with Expo/React Native. One giant button on the Home screen toggles between Check in and Check out; while running, it shows a live elapsed timer and can fire a reminder notification so I don't forget to check out. A Logs screen shows the full history grouped by week — labeled by date range with total/target and a progress bar — and by day, and lets me edit a session's timestamps and note or delete it. A Settings screen lets me change my week-start day, weekly target, and reminder threshold, and export every session to CSV via the share sheet. Everything is stored locally on the device; the app runs entirely in Expo Go.

## User Stories

1. As a user, I want to check in with a single tap on a giant button, so that starting work takes no thought.
2. As a user, I want the check-in button to become a check-out button while a session is running, so that the same one tap ends my session.
3. As a user, I want a live elapsed timer on the Home screen while a session is running, so that I can see how long I've been working at a glance.
4. As a user, I want timestamps recorded with seconds precision, so that my log is exact.
5. As a user, I want multiple check-in/check-out sessions per day, so that breaks don't distort my record.
6. As a user, I want today's sessions listed on the Home screen, so that I can review the day without leaving Home.
7. As a user, I want today's total on the Home screen, so that I know how much I've worked today.
8. As a user, I want my week-to-date total shown against my weekly target, so that I know where I stand this week.
9. As a user, I want a running session excluded from totals until I check out, so that totals only count completed work.
10. As a user, I want a running session to survive closing or restarting the app, so that an accidental close doesn't end my session.
11. As a user, I want durations displayed clock-style (like 7:45 or 32:30), so that reading them is natural and never needs decimal conversion in my head.
12. As a user, I want a reminder notification X hours after I check in, so that I don't forget to check out.
13. As a user, I want that reminder cancelled when I check out, so that stale notifications don't nag me after the fact.
14. As a user, I want to configure the reminder threshold (1–16 hours, default 10), so that reminders match how long my work blocks actually run.
15. As a user, I want a one-time setup on first launch asking for my week-start day and weekly target, so that the app matches my work rhythm from the start.
16. As a user, I want to skip first-launch setup with sensible defaults (Sunday, 40h), so that I can start tracking immediately.
17. As a user, I want to see my full session history on a Logs screen, newest first, so that I can find any past session.
18. As a user, I want logs grouped by week and then by day, so that the history mirrors how I think about my time.
19. As a user, I want each week header labeled by its date range (like "Thu, Aug 21 – Wed, Aug 27"), so that I never have to decode week numbers.
20. As a user, I want each week header to show the week's total against my target with a progress bar, so that I can compare weeks at a glance.
21. As a user, I want weeks where I exceeded the target shown distinctly as over-target, so that overtime is visible.
22. As a user, I want to tap a session to open a detail sheet with native date/time pickers for both timestamps, so that fixing a missed checkout is easy.
23. As a user, I want to attach and edit a short note on each session, so that the log can carry context I'll want later.
24. As a user, I want edits validated (checkout must be after check-in; no future timestamps), so that I can't corrupt my log with a bad edit.
25. As a user, I want to delete a session with a confirmation step, so that mistakes are removable but never accidental.
26. As a user, I want deleting a running session to cancel the check-in, so that an accidental check-in can be undone cleanly.
27. As a user, I want timestamps stored in UTC but displayed in my phone's current timezone, so that my history stays correct even if I change timezones.
28. As a user, I want a session that crosses midnight to count toward the day and week of its check-in (Wednesday 11 PM → Thursday 2 AM is Wednesday's week entirely), so that late nights don't split across weeks.
29. As a user, I want to change my week-start day in Settings later, so that my first-launch choice isn't permanent.
30. As a user, I want to change my weekly target in Settings later, so that the target tracks changes in my workload.
31. As a user, I want to export all my sessions as CSV (date, check_in, check_out, duration_minutes, note — one row per session) via the OS share sheet, so that I can archive or analyze my log anywhere.
32. As a user, I want all data stored locally on my device with no account, so that the app works offline and my log stays private.

## Implementation Decisions

- **Stack**: Expo managed workflow, React Native, TypeScript, expo-router for navigation. The entire v1 runs in **Expo Go — no dev build needed** (verified against official Expo docs, Aug 2026: local notifications, SQLite, and the community datetime picker all work in Expo Go; only remote push on Android or notification icon/color customization would require a dev build).
- **Architecture — one test seam**: a framework-free **domain engine** module. Its entry points are pure functions that take `(sessions, settings, now)` and return fully-computed screen models: week ranges and labels from the configured start day, session-to-day/week ownership, today/week totals, progress and over-target state, logs grouping (weeks → days → sessions), elapsed-time labels, and CSV rows. Everything platform-facing — screens, SQLite access, notifications, sharing — is a thin adapter over the engine and is not unit-tested in v1.
- **Storage**: SQLite via expo-sqlite. A `sessions` table with `id`, `check_in_utc`, `check_out_utc` (nullable — null means a running session), `note`, `created_at`. A `settings` table holding week-start day, weekly target hours, reminder threshold hours, and a setup-completed flag.
- **Timestamps**: stored in UTC with seconds precision; rendered in the device's current timezone. Per-session timezone capture is deliberately not built.
- **Session ownership**: a session belongs to the day and week of its **check-in**, even across midnight. No midnight splitting, ever.
- **Week math**: boundaries computed from the configured start day (Thursday ⇒ Thursday 00:00 through Wednesday 23:59 local). Weeks are labeled by date range strings, not week numbers.
- **Running session**: displayed with a live elapsed timer, excluded from all totals until checkout, and represented by the nullable `check_out_utc`.
- **Reminders**: on check-in, schedule a local notification X hours later (X = reminder threshold); cancel it on checkout. On Android 13+, request notification permission before scheduling.
- **Logs detail sheet**: native date/time pickers for both timestamps, a note field, Save (with validation), and Delete with a confirmation step. Deleting a running session cancels the check-in.
- **First-launch setup**: two pickers (week-start day, weekly target), skippable with defaults Sunday and 40 hours; both values changeable later in Settings.
- **CSV export**: all sessions, one row each — `date, check_in, check_out, duration_minutes, note` — written to a file and delivered via the OS share sheet.
- **Formatting**: all durations clock-style (`7:45`, `32:30`), never decimal.

## Testing Decisions

- **What makes a good test here**: feed the pure engine a list of sessions, settings, and (where relevant) a fixed `now`; assert on the returned screen models. External behavior only — no asserting on internals, and no mocks required because the engine imports nothing from React Native.
- **Tested module**: the domain engine, exclusively and exhaustively, with Vitest in plain Node. Cases to cover: week boundaries for every weekday as the configured start day; sessions starting exactly at a week boundary; midnight-crossing sessions owned by the check-in day/week; multi-session days summing correctly; running sessions excluded from totals but shown with a correct elapsed label at a fixed `now`; clock-style formatting including hour counts over 24 (week totals) and zero-padding; week label strings; progress-bar values and over-target state; CSV row generation including running sessions' blank checkout.
- **Prior art**: none — this is a greenfield repo. These engine tests become the prior art for future features.
- **Not unit-tested in v1**: screens, SQLite calls, notification scheduling/cancellation, and the share sheet. These are thin adapters, verified manually in Expo Go.

## Out of Scope

Cloud sync, accounts/auth, multiple jobs or categories, pay-rate calculation, charts, home-screen widgets, midnight session splitting, per-session timezone capture, and automated UI/E2E test suites.

## Further Notes

- Target phone platform (iPhone vs Android) is still unconfirmed; it affects only run/test instructions, not the code. Reminder: Android 13+ requires `requestPermissionsAsync()` before local notifications will display.
- The workspace is not yet a git repository — `git init` early.
- Suggested build order: scaffold the Expo project and git init → SQLite layer (schema, migrations, settings access) → domain engine via TDD → Home screen (toggle, running state, live timer, reminder scheduling) → Logs screen (grouping + detail sheet) → first-launch setup + Settings → CSV export.
- This spec synthesizes the completed grilling/design session recorded in the handoff of 2026-08-27; the user approved every design decision it contains.
