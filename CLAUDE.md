# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LogBook — a single-user Expo (SDK 57) / React Native app: check in and out of work, see history, and total hours against a configurable week. TypeScript strict mode; path alias `@/*` → `src/*`.

## Commands

- `npm start` — Expo dev server (`npm run ios` / `npm run android` for a specific platform)
- `npm test` — all tests (vitest, run once)
- `npm test -- src/engine/weeks.test.ts` — a single test file; add `-t "name"` to filter by test name
- `npm run typecheck` — `tsc --noEmit` (there is no ESLint; typecheck is the lint gate)

## Architecture

Strict layering — dependencies point downward only:

1. **`src/engine/`** — pure domain logic (types, session/week math, reminder decision, validation, CSV, schedule, money, view models for Home/Logs). **No React Native imports** — these files run in vitest's node environment, which is why the engine stays pure. Every module has a colocated `<name>.test.ts`; new domain logic goes here with tests.
2. **`src/db/database.ts`** — the only module that touches expo-sqlite. Stores/returns plain `Session`/`Settings`/`WorkBlock` objects; timestamps as UTC ISO strings (`check_out_utc` NULL = running). Schema lives in `open()`; adding a column to an existing table also needs an `addColumnIfMissing` migration line there.
3. **`src/hooks/useLogbook.tsx`** — `LogbookProvider`, the app-wide store every screen consumes. Loads db → state, exposes actions (`checkIn`, `saveSession`, …), ticks a `now` clock only while a session runs, and owns `syncAfter`: the single place that runs a reminder-lifecycle decision and then rebuilds all OS notifications from current truth (also re-run once after first load, since OS triggers persist but go stale).
4. **Adapters/UI** — `src/notifications/reminders.ts` (executes reminder/work-block decisions via expo-notifications; Android Expo Go can't host that module, so it lazy-loads and no-ops), `src/export/csvExport.ts` (share sheet), `src/components/`, `src/ui/i18n.tsx`, `src/theme.ts`.
5. **`app/`** — expo-router file routes: tab group `(tabs)` (Home, Logs, Settings) plus hidden pushed sub-screens (`schedule`, `data`) that stay inside the group so the tab bar persists; root `_layout.tsx` wires the providers.

The recurring pattern: **the engine decides, adapters execute** (e.g. `reminderDecision` returns schedule/cancel/keep; the notifications adapter just does it). Keep decisions pure and push side effects to the edges.

Domain rules that aren't obvious from the code:

- **Sessions belong to their check-in day** — never split across midnight (ADR-0001, `docs/adr/`).
- A running session is shown live but never counted in totals.
- Work blocks prompt a check-in; they never clock one in.

## Language (i18n)

Two UI languages, English and Bangla, in the `STRINGS` dict in `src/ui/i18n.tsx`. Every user-facing string goes through `t()`/`weekdayName()`, and any new key must be added to **both** `en` and `bn` (the `StringKey` type derives from `en`). Bangla dates use Latin digits (see `dateLocale` in `src/engine/weeks.ts`). Notification text goes through `stringsFor()` since it renders outside React.

## Domain vocabulary

`CONTEXT.md` is the glossary of canonical terms, each with an explicit avoid-list (say "session" not shift/entry/timer, "check-in" not punch in/clock in, "running session" not open/active session, "weekly target" not goal/quota, "off week" not vacation week…). Use these terms in code, tests, issues, and commits — check it before naming things. ADRs in `docs/adr/` are binding; if a change contradicts one, surface it explicitly rather than silently overriding.

## Issues and specs

The issue tracker is local markdown, not GitHub: one directory per feature under `.scratch/<feature-slug>/` with `spec.md` and `issues/NN-slug.md` files carrying `Status:` lines (see `docs/agents/issue-tracker.md` for the full conventions, `docs/agents/triage-labels.md` for the five canonical labels).
