# Rate history

Status: done (2026-08-29)

## Problem

Earnings were computed at one flat `settings.hourlyRate`, so a raise rewrote history: every past week, month, calendar day, and insight re-priced itself at today's rate. Real rates change over time, sometimes mid-month, and the log should show what was actually earned when.

## Decision

Temporal earnings — see ADR-0002 (`docs/adr/0002-temporal-earnings.md`). Each session earns at the rate active on its check-in date; `settings.hourlyRate` becomes a mirror of the latest rate record, not a source of truth.

## Shape

- `rate_history` table (rate, effective_from_utc), migrated from the flat field on first open (one record effective 2000-01-01).
- Engine: `RateRecord`, `rateForDate`, `sessionEarnings`, `sumEarnings` in `src/engine/money.ts`.
- Every earnings surface computes from `rateHistory`: homeModel, logsModel (weeks + filtered summary), month grouping (raw `LogWeek.totalEarnings`), `monthDayEarnings` for the calendar, insightsModel (monthly trends + all-time), SessionRow.
- Settings: current-rate input records a change effective today (`setCurrentRate`; 0 clears all records); full history list with per-record delete and an add-rate-change form with date picker (`addRateChange` replaces a same-date record).
- Sample-data seeder seeds $28 → $30 → $32.50 over the year and clears rate history on reload.

## Tests

`money.test.ts`, plus earnings cases in `home.test.ts`, `logs.test.ts` (weeks, filtered summary, monthDayEarnings), `insights.test.ts` (totalEarnings, monthlyTrends).
