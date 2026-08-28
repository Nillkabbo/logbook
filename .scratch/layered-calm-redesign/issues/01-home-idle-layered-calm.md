---
Status: ready-for-agent
---

# 01 — Home idle in Layered Calm (light + dark)

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Restyle the idle Home screen end-to-end in the Layered Calm language, and in
doing so introduce the entire token system it depends on: layered zinc
surfaces (canvas / card / inset steps per mode), ambient shadow tokens
(subtle in light, stronger in dark), the radius family (cards ~24, controls
~12, pills and bars fully rounded), the enlarged display tier for hero
numerals, and tonal chip fills replacing outlines. This is the tracer bullet:
the token system comes into existence through one real screen, not a
standalone theme refactor. The check-in toggle's gradient, spring press, and
haptic behavior are preserved unchanged. Dark mode mirrors the new light work
using the app's existing dark palette with its brighter accent.

## Acceptance criteria

- [ ] Home idle renders borderless floating cards on a tonal zinc canvas with
      soft ambient shadows, in both light and dark mode
- [ ] The week-to-date fraction renders in the enlarged display tier, visibly
      larger than the today total
- [ ] Progress bar is ~10px, fully rounded, with the unfilled track visible
- [ ] Category chips are tonal emerald fills (no outline)
- [ ] Emerald appears only on working-state elements; no red anywhere on this
      screen; no blue anywhere
- [ ] Tabular numerals on every time and number
- [ ] Behavior unchanged: totals math, earnings line, next-block line, and
      tapping a session row still opens the session sheet (the sheet itself
      may be unstyled at this point)
- [ ] `npm run typecheck` and `npm test` pass

## Blocked by

None - can start immediately
