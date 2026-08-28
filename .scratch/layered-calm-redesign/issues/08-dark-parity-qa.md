---
Status: ready-for-agent
---

# 08 — Dark parity + visual QA sweep vs Stitch

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

The closing sweep: audit every screen in dark mode for parity with the
light design and against the Stitch "LogBook — Modern" source of truth,
and fix drift. Includes the semantic color audit (emerald = working state
only; red = check-out / over-target / destructive only; no blue anywhere),
the contrast check for dark-mode secondary text (the spec allows raising its
opacity one step if needed), and a full typecheck + test run. This slice's
acceptance includes a human visual sign-off — the implementer's job is to
prepare, present, and fix; the sign-off itself is the reporter's.

## Acceptance criteria

- [ ] Every screen audited side-by-side against its Stitch counterpart
- [ ] Dark mode shows layered surfaces with the brighter accent and no
      semantic drift
- [ ] Dark secondary text passes a legibility check; opacity slack used at
      most one step
- [ ] Semantic color audit passes on all screens (emerald/red monopolies, no
      blue)
- [ ] `npm run typecheck` and `npm test` pass on the final state
- [ ] Human visual sign-off recorded under `## Comments`

## Blocked by

- 02 — Home running state
- 04 — Logs compression
- 05 — Settings regroup + Schedule sub-screen
- 06 — Data sub-screen + last-export line
- 07 — First-launch setup restyle

## Comments

- Mechanical sweep implemented in commit 28cbf25: border token retired, semantic color audit passed, dark muted text measured ~6.5:1 (AA pass, opacity slack unused). Full suite 98 passed.
- Human visual sign-off: **pending** — awaiting reporter review of the running app vs the Stitch source of truth.
