<p align="center"><img src="assets/images/icon.png" width="120" alt="LogBook — the check-in circle at 9:00" /></p>

<h1 align="center">LogBook</h1>

<p align="center">A single-user work log for people paid by the hour: check in, check out, and watch the hours — and the money — add up honestly.</p>

---

LogBook is a personal time-tracking app built with Expo (SDK 57) / React Native. It is deliberately a **single-user** tool: no accounts, no cloud, no sync. Your log lives in a local SQLite database on your phone, exportable as CSV whenever you want it elsewhere.

It is built around three ideas most time trackers get wrong:

1. **A session belongs to the day it started.** Work that crosses midnight never splits across two days or two weeks — your log reads like your memory of the day ([ADR-0001](docs/adr/0001-check-in-day-ownership.md)).
2. **Earnings are historical, not current.** Rates change over time, and LogBook keeps the full rate history. Every session earns at the rate that was active **when you worked it** — a raise never rewrites your past paychecks ([ADR-0002](docs/adr/0002-temporal-earnings.md)).
3. **Pay periods are paycheck-shaped.** Money arrives weekly or biweekly, so LogBook can group your hours and earnings into anchored pay periods that always align with whole weeks — week cards always sum exactly into the period that contains them ([ADR-0003](docs/adr/0003-pay-periods-tile-from-week-aligned-anchor.md)).

## Features

**Tracking**
- One-tap check-in / check-out with a live timer, distinct haptics, and a 5-second undo bar for accidental check-outs
- Quick-add for past sessions ("forgot to clock in this morning") — defaults to the last hour on 15-minute marks
- Optional notes and categories on every session; a full edit sheet with validation (no future timestamps, check-out after check-in)
- Work blocks (recurring weekly commitments) that **prompt** you to check in — they never clock you in automatically
- A reminder notification if a session runs past your threshold

**History (Logs)**
- Months → weeks → days → sessions, newest first, with per-week color identity
- Week cards with targets, over-target pills, off-week suspension, category breakdowns, and 7-day shape bars
- Filter by category, date range (week / trailing month / **pay period** / all), and full-text search over notes and categories
- A month calendar with per-day hours and earnings — tap a day to filter the list to it
- Share a week as text (WhatsApp, Messages, anything with a share sheet)
- CSV export — full or filtered — including the rate applied and earnings for every session; CSV import merges with duplicate detection

**Money**
- Rate history: add a rate change effective any date; a current-rate badge; deleting a record is surgical
- Earnings everywhere respect the historical rate — week cards, calendar days, months, categories, pay periods, insights, CSV
- Paycheck strip on Logs: period label, hours vs target, earnings, over-target pill

**Insights**
- Average week and session, best weekday with distribution, category shares of time **and of earnings**
- Monthly hours trend (12 months), a yearly day-level heatmap, category trends by month
- Current and longest streaks, week-over-week and month-over-month deltas, all-time totals
- Earnings by pay period, with the current period accented

**Categories**
- Your own managed list: add labels up front, rename one across all history, remove one (its sessions keep their hours and become uncategorised)
- Case-insensitive uniqueness — `deep work` and `Deep work` are one category, not two
- Chips everywhere show your list first, then labels from your history

**Everything else**
- Two languages: English and বাংলা (Bangla dates keep Latin digits)
- Light / dark / system theme
- First-launch setup: week start, weekly target, optional rate and starter categories

## Screens

| Tab | What's there |
|---|---|
| **Home** | The check-in circle (timer inside while running), quick-categorise row, today's sessions, week-to-date vs target, next work block, backup nudge |
| **Logs** | Filter card (chips, calendar, search), paycheck strip, the grouped history |
| **Insights** | The analytics above |
| **Settings** | Week configuration, pay period, earnings & rate history, categories, appearance, language; sub-screens for Schedule and Data |

<details>
<summary><strong>A walkthrough of what each screen shows</strong> (for users and future developers)</summary>

**Home** — the control surface. The hero check-in circle dominates: emerald when idle
(timer hidden), solid with the live `H:MM:SS` inside while working. While a session runs
uncategorised, a chip row offers your most-used categories in one tap. Below: the date
and a ＋ (quick-add a past session), the week's 7-day bar shape with today accented, then
Today's total and the week-to-date progress card — target fraction, earnings, OVER pill,
off-week badge. Banners appear when relevant: a work block starting, a stale backup nudge.
Check out and a 5-second undo bar catches mistakes.

**Logs** — the record. A filter card up top: ＋ quick-add, calendar toggle (a month grid
with per-day hours and earnings — tap a day to filter), filtered export, share; date-range
chips (This period · This week · Month · All — the period chip only when pay periods are
configured); search over notes and categories; then a summary strip that becomes a
paycheck strip (period label · sessions · hours / target · earnings · OVER) when the
period chip is active, and a category share bar. Below, the history: month headers with
totals and earnings → week cards (colored per week, day bars, category breakdown,
off/over states) → day headers → session rows (time range, duration, note, category,
per-session earnings). Tap anything to open the edit sheet.

**Insights** — the patterns. All-time strip, average week with delta, week/month
comparisons, best weekday with distribution bars, category shares of time, earnings by
category, earnings by pay period, 12-month hours trend, the yearly day-level heatmap,
category trends by month, streaks, and all-time totals.

**Settings** — the configuration. Week card (start day, weekly target, reminder threshold,
pay period with anchor date), Earnings card (current rate, rate history with its Current
badge, add-change form), Categories card (your managed list: add, rename, remove),
Schedule and Data rows, appearance and language pickers. The **Data** sub-screen holds
export/import, the dev-only sample-data loaders, and clear-all.

**The session sheet** — one editing surface for everything: check-in/out pickers (no
future times), a still-running switch, note and category (free text + your chips), live
duration preview, delete with confirm. In create mode (quick-add) it drops the delete row
and the running switch.

</details>

## Screenshots

Device screenshots live in [`assets/screenshots/`](assets/screenshots/) and are shown
here as they land:

<!-- Add shots as files (light + dark pairs welcome), then uncomment:
<p float="left">
  <img src="assets/screenshots/home.png" width="200" />
  <img src="assets/screenshots/logs.png" width="200" />
  <img src="assets/screenshots/insights.png" width="200" />
  <img src="assets/screenshots/settings.png" width="200" />
</p>
-->

## Getting started

Requires Node.js LTS and the Expo CLI (via `npx`). Run on your device with [Expo Go](https://expo.dev/go):

```bash
npm install
npm start          # then scan the QR with Expo Go (same Wi-Fi)
```

Other commands:

```bash
npm run ios        # iOS simulator if you have Xcode
npm run android    # Android emulator if present
npm test           # the full engine test suite (vitest, runs once)
npm run typecheck  # tsc --noEmit — the lint gate (there is no ESLint)
```

> A dev-only sample-data seeder (2 months or 1 year of realistic sessions, blocks, and a rate history of $28 → $30 → $32.50) lives behind the **Data** sub-screen in Expo Go / dev builds — it is dead-code-eliminated from release bundles.

## Project layout

```
src/engine/      Pure domain logic — no React Native imports, 100% vitest-covered.
                 Sessions, weeks, months, money & rate history, pay periods,
                 insights, validation, the bilingual string dictionary.
src/db/          The only module that touches expo-sqlite.
src/hooks/       LogbookProvider — the app-wide store. Every mutation goes
                 write → refresh → notification resync, re-reading db truth.
src/components/  The UI kit: check-in circle, session sheet, calendar,
                 keyboard-safe wrappers, rate & category sections, pickers.
app/             expo-router routes: the four tabs plus hidden sub-screens.
docs/adr/        Binding architecture decisions (the three above).
CONTEXT.md       The domain glossary — canonical terms for code and docs.
CLAUDE.md        Working conventions for AI-assisted development.
.scratch/        Local specs, issues, and QA records (the issue tracker).
```

The recurring pattern: **the engine decides, adapters execute.** All domain math is pure and tested; React Native lives only at the edges.

## Development notes

- **TypeScript strict mode** throughout; `@/*` aliases `src/*`
- **195 engine tests** cover every domain rule, including the cross-surface invariants (e.g. month headers must agree with the calendar and Insights at month boundaries)
- **Bilingual by construction**: every user-facing string exists in both `en` and `bn` or the build fails
- **Design language**: layered calm — zinc surfaces, emerald reserved exclusively for the working state, red for check-out / over-target / destructive

---

<p align="center"><em>LogBook — the check-in circle at 9:00, the moment the workday starts.</em></p>
