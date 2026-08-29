# Architecture review #2 — outcomes

Status: done (2026-08-29)

Scoped to what changed after review #1 (whose five candidates all landed):
pay periods, the categories subsystem, the picker modal, the keyboard sweep.

## Fixed during the walk (a07cfcb)

The categories verbs reopened the store's value-memo deps contract — the exact
hole fb695ed closed. The contract is now a named principle: **every member of
the value object appears in the deps array, no exceptions, no reliance on
refresh() churn masking omissions.** Any future verb that adds state or
callbacks must land both lists in the same commit.

## Candidates landed

1. **KeyboardSafe** (9c1a25e) — keyboard behavior's one home.
   `KeyboardSafeScrollView` (screens: taps + iOS insets) and
   `KeyboardSafeSheetBody` (sheets: KAV + taps). Never both mechanisms on one
   surface; Android's adjustResize story documented once. New input surfaces
   start safe by default.
2. **categoryNameConflicts** (6961089) — case-insensitive uniqueness as one
   engine predicate; store verbs, setup's chip buffer, and the (documented,
   case-sensitive) db UNIQUE backstop all ask it.
3. **Setup layout + commit order** (6961089) — top-anchored (was center-clipped
   on small screens); rate and categories commit before setupCompleted flips.
4. **resolveCurrentPeriodRange** (c7678de) — the single settings→range seam for
   periodsModel, currentPeriod, and the Logs 'period' filter; periodsModel's
   count is a caller parameter.

## Deliberately not done — do not re-suggest without new evidence

- **Store commit() epilogue helper**: deferred until the next verb lands
  (bundling it with real usage beats a standalone pass).
- **Home undo-toast extraction**: Home is 413 fully-delegated lines — not a
  grab-bag. Extract the toast (~60 lines) only when Home next grows.
- **Store interface breadth (26 members)**: the store doing its job; category
  verbs do not parallel rate verbs (rates carry the ADR-0002 mirror obligation
  categories structurally lack).
