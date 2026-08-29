# Pay periods

Status: done (2026-08-29)

## Problem
The app is week-native; money arrives in paychecks. Totals existed only in week/month/year shapes, so a biweekly-paid user had to mentally add week cards to reason about a paycheck.

## Decision
ADR-0003 (`docs/adr/0003-pay-periods-tile-from-week-aligned-anchor.md`). Weekly period = the Week; biweekly = two consecutive whole Weeks tiled from a user-picked anchor snapped to the week grid (no week ever straddles). Buckets by check-in (ADR-0001); earnings temporal per session (ADR-0002); target = weekly target × weeks-in-period; Off weeks never suspend period judgment. Default 'none' — every surface hidden until configured; semi-monthly deferred.

## Shape
- Engine `src/engine/periods.ts`: `periodRange`, `payPeriodActive`, `defaultPayPeriodAnchor`, `PeriodSummary`, `periodsModel` (≤12 newest-first) / `currentPeriod`; `parseLocalDayKey` added to weeks.ts.
- Persistence: settings columns `pay_period_type` / `pay_period_anchor` (localDayKey); not reset by clear-all-data (a preference).
- Surfaces: Settings picker (none/weekly/biweekly + anchor DateTimeField; biweekly selection persists an anchor in the same patch), Logs "This period" chip + paycheck strip (replaces the generic strip while active, day-view excluded), Insights "Earnings by pay period" card (shareRows, current period accented, hidden until data).
- Logs dateRange union gains 'period'; unconfigured degrades to 'all'. `logsListModel.payPeriod` / `insightsModel.payPeriods` carry the summaries.

## Tests
`periods.test.ts` (tiling, snap, before-anchor, rollover, boundaries, temporal earnings, off-week, model shape), plus logs 'period'-filter and insights payPeriods suites. 189 total.
