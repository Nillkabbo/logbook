---
Status: ready-for-agent
---

# 06 — Data sub-screen + last-export line

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Extract export and import from Settings to their own pushed Data
sub-screen (back chevron, own title, tab bar kept), reached from a chevron
row where the export section used to sit. The sub-screen shows the export
action, its hint, a last-export line derived from the existing last-export
timestamp (reading as never exported when unset), the import action, and its
hint. Export via the share sheet and CSV import with duplicate/running/
malformed skipping behave exactly as before, through the existing store
actions.

## Acceptance criteria

- [x] The Data chevron row navigates to a pushed sub-screen with back
      chevron, "Data" title, and the tab bar still present
- [x] Export and import work from the new screen exactly as before
- [x] The last-export line shows the real timestamp, or reads as never
      exported when none exists, and refreshes after a successful export
- [x] Hints ("one row per session via the share sheet", "merges a previous
      export…") are preserved verbatim
- [x] New strings exist in both English and Bangla
- [x] `npm run typecheck` and `npm test` pass

## Blocked by

- 05 — Settings regroup + Schedule sub-screen


## Comments

- Implemented in commit 1e2cb72 (2026-08-28). Typecheck green; full suite 98 passed.
