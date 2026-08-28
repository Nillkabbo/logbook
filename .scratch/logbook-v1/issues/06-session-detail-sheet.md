# 06: Session detail sheet — edit, note, delete

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** Fixing a missed checkout or adding context, from the Logs screen. Tapping a session row opens a detail sheet with native date/time pickers for both timestamps and a note field. Save validates: checkout must be after check-in, and neither timestamp may be in the future; valid edits update the session everywhere (Home totals, week headers, day totals). Delete asks for confirmation; deleting a running session cancels the check-in — no timer on Home — and cancels its pending reminder.

**Blocked by:** 04 (deleting a running session must cancel its reminder), 05 (the sheet opens from a Logs row).

**Status:** done

- [x] Tapping a log row opens a detail sheet with native pickers for check-in and check-out plus a note field
- [x] Saving with checkout ≤ check-in, or any future timestamp, is rejected with a clear message
- [x] A valid edit updates the log row, day total, week header, and Home totals
- [x] Edits that move a session across midnight or a week boundary re-own it to the new check-in day/week
- [x] Delete requires confirmation; a confirmed delete removes the session from everywhere
- [x] Deleting a running session cancels the check-in (Home returns to Check in state) and cancels the pending reminder
- [x] Note text persists and displays in the log list and detail sheet
