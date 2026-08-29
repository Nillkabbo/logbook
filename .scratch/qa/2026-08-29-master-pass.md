# Master device QA pass — everything outstanding (2026-08-29)

~25 commits since the last device-verified state: rate history, quick-add batch,
architecture refactor (Logs screen rewired behind logsListModel), pay periods.
Engine is test-covered; this pass verifies screen wiring and numbers.

## Setup
Data screen → Load 1 year (seeds $28→$30→$32.50 rates, off week, over weeks).

## Rate history
- [ ] Settings → Earnings lists $28.00 (Jan 1), $30.00 (Apr 1), $32.50 (Aug 1), Current badge on $32.50; input reads 32.5
- [ ] A spring week's card prices at $28–30, an August week at $32.50 (not everything at 32.50)
- [ ] Calendar July cells at $30/day, August at $32.50/day
- [ ] Insights strip $ total > hours × 32.50 (most history earned less)
- [ ] Edit current rate → new "from today" row; clear it → all rows gone, earnings hidden everywhere
- [ ] Add-rate form: invalid input shows an error (not silent)

## Quick-add
- [ ] Logs toolbar "＋" and Home date-row "＋" → sheet titled "New session": no delete row, no Still-running switch, defaults = last hour on 15-min marks
- [ ] Save → lands in today's list, totals include it, no notification scheduled
- [ ] Edit then swipe down → discard confirm

## Architecture refactor (Logs screen)
- [ ] Logs renders identically to before: month headers, week cards, filters, search, calendar, share
- [ ] Boundary month: August header includes Aug 1–2 sessions even if their week card sits under July
- [ ] While a session runs, Logs doesn't visibly re-sort/flicker each second
- [ ] Both exports open the share sheet; filenames logbook-backup-* and logbook-filtered-*; 8 CSV columns; spring rows rate 28.00, Aug 32.50
- [ ] Export → Clear all data → Import: every session keeps its checkout; no phantom running session; backup banner alerts if export fails (hard to force — skip if untestable)

## Pay periods
- [ ] Settings → Week card → Pay period: None/Weekly/Every 2 weeks; pick Every 2 weeks → anchor field appears
- [ ] Logs shows 4th chip "This period": exactly two week cards, their totals sum to the paycheck strip; strip earnings = the two cards' earnings added
- [ ] Over-target period shows the OVER pill (weekly target 1h makes this instant)
- [ ] Insights "Earnings by pay period" card: recent periods, current accented
- [ ] Weekly config → chip mirrors This week (40h); None → chip and card gone
- [ ] Mid-week anchor pick → periods still start on your week-start day
- [ ] Bangla: নতুন সেশন / বেতন-পিরিয়ড / এই পিরিয়ড labels; dates keep Latin digits

## Standing (from earlier features, quick glance)
- [ ] Undo toast after check-out; week colors distinguish weeks; share text opens WhatsApp
