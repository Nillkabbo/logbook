---
Status: ready-for-agent
---

# 04 — Logs compression

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Compress the Logs history: the logs view model (in the engine) gains a
per-week `defaultExpanded` flag — true for the current week and for any
over-target week, false for all others including off weeks — tested in its
existing colocated test module. The screen renders collapsed weeks as
compact rows (date range, total, status pill where applicable, chevron) and
expanded weeks with the full existing detail (progress, earnings, day bars,
category breakdown, day groups with the mark-off/on control), restyled to
Layered Calm. Tapping a collapsed or expanded week toggles it; overrides are
screen state only and never persisted. Off weeks keep showing totals and
earnings when expanded, with no target judgment.

## Acceptance criteria

- [ ] Engine tests cover the expansion defaults: current week expanded;
      over-target week expanded; past normal week collapsed; off week
      collapsed; a week that is both current and over-target counts once and
      is expanded
- [ ] Collapsed weeks render as compact rows with date range, total, status
      pill (Off week / OVER) where applicable, and a chevron
- [ ] Tapping a week toggles expansion; user overrides survive until the
      visit ends and are not persisted
- [ ] Expanded weeks keep every existing element: mark off/on, progress and
      over-target treatment, earnings, day bars, category breakdown, day
      groups
- [ ] Weeks are labeled by date range only, never week numbers
- [ ] Category filter behavior is unchanged
- [ ] `npm run typecheck` and `npm test` pass

## Blocked by

- 01 — Home idle in Layered Calm


## Comments

- Implemented in commit e988a47 (2026-08-28). Typecheck green; full suite 98 passed.
