---
Status: ready-for-agent
---

# 07 — First-launch setup restyle

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Restyle the first-launch setup modal to Layered Calm: tonal weekday pills
(Sun selected in solid emerald), inset borderless target input, solid
emerald Start tracking button, emerald skip link, centered composition.
The skip flow (defaults apply), validation, and the don't-flash-before-load
behavior are preserved unchanged. Existing strings are reused verbatim; any
new ones are added bilingually.

## Acceptance criteria

- [ ] Setup renders in the Layered Calm language in both light and dark mode
- [ ] Weekday pills are tonal; the selected day reads clearly as selected
- [ ] Start tracking commits the chosen week-start day and weekly target;
      skip applies defaults — both exactly as before
- [ ] Invalid target input still shows the existing validation error
- [ ] New strings (if any) exist in both English and Bangla
- [ ] `npm run typecheck` and `npm test` pass

## Blocked by

- 01 — Home idle in Layered Calm
