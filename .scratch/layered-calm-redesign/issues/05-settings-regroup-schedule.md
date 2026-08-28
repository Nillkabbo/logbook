---
Status: ready-for-agent
---

# 05 — Settings regroup + Schedule sub-screen

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Regroup the Settings tab into Layered Calm grouped cards — Week (week-start
picker, weekly target, reminder threshold), Earnings (hourly rate), Language
— and extract the work-block editor to its own pushed sub-screen: a
chevron row on Settings ("Schedule", with the block summary as sub-label)
navigates to a screen carrying a back chevron and its own title, with the
tab bar still visible. The work-block list, weekday multi-select, From/To
fields, add-block flow, remove flow, and the "blocks nudge, never clock in"
hint all move to the new home and keep working through the existing store
actions. The export/import section remains on Settings until issue 06.
Sub-screen titles join the string dictionary in English and Bangla.

## Acceptance criteria

- [x] Settings renders as grouped floating cards (Week / Earnings /
      navigation / Language) with section labels, no long single form
- [x] The Schedule chevron row navigates to a pushed sub-screen with back
      chevron, "Schedule" title, and the tab bar still present
- [x] Adding and removing work blocks works from the new screen exactly as
      before, with validation and hint copy preserved
- [x] Week-start, weekly target, reminder threshold, hourly rate, and
      language controls still save exactly as before
- [x] New strings exist in both English and Bangla
- [x] `npm run typecheck` and `npm test` pass

## Blocked by

- 01 — Home idle in Layered Calm


## Comments

- Implemented in commit 4c9141b (2026-08-28). Typecheck green; full suite 98 passed.
