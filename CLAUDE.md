# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LogBook — a single-user Expo (SDK 57) / React Native app (native-only, no web): check in and out of work, see history with filters/search/calendar, and total hours against a configurable week. TypeScript strict mode; path alias `@/*` → `src/*`.

## Commands

- `npm start` — Expo dev server (`npm run ios` / `npm run android` for a specific platform)
- `npm test` — all tests (vitest, run once)
- `npm test -- src/engine/weeks.test.ts` — a single test file; add `-t "name"` to filter by test name
- `npm run typecheck` — `tsc --noEmit` (there is no ESLint; typecheck is the lint gate)

## Architecture

Strict layering — dependencies point downward only:

1. **`src/engine/`** — pure domain logic. **No React Native imports** — these files run in vitest's node environment, which is why the engine stays pure. Every module has a colocated `<name>.test.ts`; new domain logic goes here with tests. Key modules:
   - `home.ts` — Home's view model: running session, elapsed timer, today's sessions (running first, then newest-first), week-to-date with progress/earnings/off state, date caption, weekDayBars (the 7-bar shape), weekSummary
   - `logs.ts` — Logs' view model: `logsModel(sessions, settings, now, filter?, locale?, rateHistory?)` returns `LogsResult { weeks, summary }` where filter is a `LogsFilter { category?, dateRange?, query?, day? }` (AND-combined; dateRange 'period' = the pay period containing now). Weeks collapse by default (`defaultExpanded`: current ∨ over-target). Also exports `monthDayTotals`/`monthDayEarnings` (calendar data) and `formatWeekShareText` (share text). Sessions within each day are newest-first
   - `periods.ts` — pay periods (ADR-0003): `periodRange` (weekly = the Week; biweekly = two whole Weeks tiled from a week-grid-snapped anchor), `periodsModel`/`currentPeriod` (PeriodSummary list — temporal earnings, weekly-target × weeks, Off weeks never suspend), `payPeriodActive` gates every surface
   - `schedule.ts` — work blocks: `blockRangeLabel` (consecutive-day compression: "Sun–Thu"), validation, occurrence checks
   - `time.ts` — `formatDuration` (H:MM), `formatElapsed` (H:MM:SS), `formatDurationWords` ("3h 28m"), `formatDateTime`
   - `money.ts` — `formatMoney` ("$980.00", no space) plus the rate history: `RateRecord`, `rateForDate`/`sessionEarnings`/`sumEarnings` (temporal lookups — see ADR-0002)
   - `insights.ts` — Insights' view model: averages (week/session), best weekday with distribution, category shares, current + longest streaks, week/month deltas, all-time totals, `monthlyTrends` (12-month totals), `yearlyHeatmap` (day-level intensity), `categoryTrends` (per-month category breakdowns)
   - `strings.ts` (in `src/ui/`) — pure bilingual dictionary + `interpolate`
2. **`src/db/database.ts`** — the only module that touches expo-sqlite. Stores/returns plain objects; timestamps as UTC ISO strings. `withTransaction` wraps batch writes atomically. Schema lives in `open()`; `addColumnIfMissing` for migrations.
3. **`src/hooks/useLogbook.tsx`** — `LogbookProvider`, the app-wide store. Every mutation funnels through `syncAfter` (the single notification-rebuild epilogue — it re-reads truth from the db, never render-scope state). The theme preference (`Appearance.setColorScheme`) is applied here too. The dev-only sample-data seeder lives in `src/dev/sampleData.ts`, reached from the Data sub-screen through a `__DEV__`-gated `require` — Metro dead-code-eliminates it from release bundles (verified by bundle probe), so deleting the module at release is source hygiene only.
4. **Adapters/UI** — notifications adapter, CSV export, components:
   - `src/components/CheckInToggle` — the hero circle; timer renders inside when running
   - `src/components/SessionRow` — memoised with a tick-aware comparator (completed rows don't re-render on the clock)
   - `src/components/WeekProgress` — owns every week-summary presentation (off badge, OVER pill, fraction, bar, earnings); `row` mode for Logs, `emphasized` for Home
   - `src/components/CalendarView` — month grid with intensity cells, per-day earnings, month total, tap-to-filter
   - `src/components/ChipRow` — shared pill row (empty options renders nothing)
   - `src/components/DateTimeField` — owns the iOS/Android picker platform branch
   - `src/components/SessionDetailSheet` — bottom sheet with drag-to-dismiss, dirty-tracking + discard confirm
   - `src/components/YearHeatmap` — compact 3×4 grid of 12 mini-months with day-level intensity
   - `src/components/RateSection` — the Earnings card (current-rate input, rate history list, add-rate form); props-in, policy in the engine/store
   - `src/theme.ts` — dual light/dark palettes + factories (`cardStyle`, `softPill`, `insetInput`)
5. **`app/`** — expo-router routes: tab group `(tabs)` (Home, Logs, Insights, Settings) plus hidden pushed sub-screens (`schedule`, `data`). Home's scrollable area uses FlatList (virtualized). Logs uses FlatList with typed rows (month header, week card, day header, session, collapsed week).

The recurring pattern: **the engine decides, adapters execute**. Keep decisions pure and push side effects to the edges.

Domain rules that aren't obvious from the code:

- **Sessions belong to their check-in day** — never split across midnight (ADR-0001, `docs/adr/`).
- **Earnings are temporal** — a session earns at the rate active on its check-in date, never restated at the current rate (ADR-0002). `settings.hourlyRate` is a mirror of the latest rate record, not a source of truth; every earnings surface computes from `rateHistory`.
- A running session is shown live but never counted in totals.
- Work blocks prompt a check-in; they never clock one in.
- Sessions are newest-first everywhere (running session sorts above completed on Home).
- Green (`accent`) means the working state only — never a category. Categories use neutral zinc.

## Language (i18n)

Two UI languages, English and Bangla, in the pure `STRINGS` dict in `src/ui/strings.ts` (the React provider in `src/ui/i18n.tsx` consumes it). Every user-facing string goes through `t()`/`weekdayName()`/`weekdayShortName()`; `t(key, params)` owns `{token}` interpolation. Any new key must be added to **both** `en` and `bn`. Bangla dates use Latin digits. Notification text goes through `stringsFor()`.

## Theme

Dual light/dark palettes in `src/theme.ts`, user-configurable from Settings (System / Light / Dark). Applied via `Appearance.setColorScheme` — every `useColorScheme` consumer follows. The theme module also exports pure style factories (`cardStyle`, `softPill`, `insetInput`) that own the layered-calm recipes.

## Domain vocabulary

`CONTEXT.md` is the glossary of canonical terms. Use these terms in code, tests, issues, and commits. ADRs in `docs/adr/` are binding.

## Issues and specs

The issue tracker is local markdown under `.scratch/<feature-slug>/` with `spec.md` and `issues/NN-slug.md` files carrying `Status:` lines (see `docs/agents/issue-tracker.md`).
