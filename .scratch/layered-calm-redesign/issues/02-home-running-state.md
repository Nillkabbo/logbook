---
Status: ready-for-agent
---

# 02 — Home running state

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Restyle Home while a session runs: the live elapsed timer becomes the hero
numeral (~64px, semibold, tabular); the toggle stays solid red with its
breathing ring and springy press; the quick-category row becomes tonal pills;
and the running session's card becomes visually distinct from completed
cards via a translucent frosted treatment with a hairline edge (blur-based
implementation optional — a translucent fill is acceptable). A small emerald
"live" pulse dot on the running card is allowed since emerald remains the
working-state signal. The running session continues to be shown live but
never counted in totals.

## Acceptance criteria

- [ ] Live timer renders at hero scale with tabular numerals and ticks as
      before
- [ ] Check-out button stays solid red with breathing ring and spring press
      intact
- [ ] Quick-category chips are tonal emerald pills including the "…" more
      affordance
- [ ] The running session's card is visually distinct (translucent/frosted)
      from the completed session cards
- [ ] Running time is excluded from the today and week-to-date totals exactly
      as before
- [ ] Assigning a category from the quick row still works in one tap
- [ ] `npm run typecheck` and `npm test` pass

## Blocked by

- 01 — Home idle in Layered Calm


## Comments

- Implemented in commit c12c32d (2026-08-28). Typecheck green; full suite 98 passed.
