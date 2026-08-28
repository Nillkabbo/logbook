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

## Comments

- Web QA evidence added (appweb/ screenshots): visuals verified in light and dark; boxShadow token fix landed in the follow-up commit. Web-only input defect (RN-web + React 19 responder) documented — does not affect Expo Go/native. Remaining for sign-off: reporter verifies on device via Expo Go.

- Follow-up passes: export-exactness from the user-provided Stitch HTML export
  (b17c225, 788171d, 66c16d5, 93f0961), safe areas + UX polish (36e134e),
  documented RN/Expo best practices (f2bdc74), FlatList virtualization
  (ee9a623). Dark parity re-verified per screen during capture passes; web
  evidence in `.scratch/stitch-ui/appweb/`.
- Human visual sign-off: **still pending** — the only open item on this issue.

- Expert review pass (post-exactness): six screens analyzed by a senior-review
  lens (Home light+dark, Logs, Settings, Schedule, sheet, setup). Findings:
  4 critical, 5 high, 8 medium. All fixed in 420e7cd (C1 sheet cancel with
  dirty-tracking + discard confirm; C2 picker affordance; C3 dark secondary
  text 75% = AA; C4 setup skip demoted) and 4804019 (H1 Logs color system —
  green stops meaning a category, neutral dots, today-dot marker, dark filter
  selected; H2 sheet duration '3h 28m' at 20px; H4 hint rewrite; M1 weekday
  initials; M5 suggestion pills; M6 dark track; M7 44pt setup pills).
  H3/M2/M3 dispositioned as already-fixed or ratified export decisions.
- Remaining: reporter's device walk (Expo Go) for the human sign-off box.
