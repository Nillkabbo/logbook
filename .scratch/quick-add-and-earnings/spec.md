# Quick-add, earnings by category, CSV earnings columns

Status: done (2026-08-29)

The "small batch" cycle from the 2026-08 roadmap review, plus one discovered bug.

## Quick-add a past session

The only creation verb was `checkIn()` (always now, always running); backfilling meant check-in-now then edit. Now: a "+" on the Logs toolbar and Home's date row opens the session sheet in create mode (`isNew`): title "New session", no delete row, no still-running switch. Defaults come from the pure `newSessionDraft(now)` — the last hour snapped to 15-minute marks, never future. The draft is snapshotted into screen state once at open (the ticking `now` must never re-seed the form mid-edit). Store action `createSession(patch)` inserts atomically and never fires a checked-in reminder.

## Earnings by category

`insightsModel.categoryEarnings` — per-category `sessionEarnings` at each session's own rate (ADR-0002), earnings-weighted percentages, largest first. A category with no covered sessions is absent (unknown rate ≠ earned nothing). New Insights card beside the hours card, hidden when nothing is covered.

## CSV earnings columns + import checkout fix

`sessionsToCsv(sessions, rateHistory?)` gains `rate_applied` and `earnings` columns (two decimals; blank when uncovered; earnings blank for running rows). Import is positionally unaffected.

**Bug fixed:** `importCsv` inserted rows via `insertSession` which hardcodes `check_out NULL` — every imported completed session landed as *running*, breaking the single-running invariant. Now inserts via the new `insertCompletedSession`; imports can never introduce a running session. Also: `checkIn()` early-returns when a session is already running (the invariant's last line of defense), and the Logs filtered export carries rate history too.
