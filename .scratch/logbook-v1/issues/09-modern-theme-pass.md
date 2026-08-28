# 09: Modern theme pass

Parent spec: `.scratch/logbook-v1/spec.md` (v1 behaviour unchanged — this is a visual layer)

**What to build:** LogBook gets a modern, calm-utility visual identity: a single token source (`src/theme.ts`) with system-following light/dark, emerald accent for the working state, red strictly reserved for check-out / over-target / destructive. The hero check-in toggle becomes the app's signature: emerald→teal gradient idle, solid red running, springy press-scale, medium haptic on both transitions, and a slow breathing ring while a Running session exists. Surfaces become themed cards (16px radius, hairline border, soft shadow iOS only), progress bars thicken to 8px, and over-target weeks show a red OVER chip with the overage. Week headers bold the date-range with right-aligned totals. Splash and adaptive-icon backgrounds sync to the palette. Engine behaviour and its tests stay untouched except for a label-only `overByLabel` addition to the screen models.

**Blocked by:** None (all of 01–08 done).

**Status:** done

- [x] `src/theme.ts` is the single source: colors (light + dark), radius, spacing, type scale; no component keeps inline hex colors
- [x] Emerald accent for check-in/active/fills; red only for check-out, over-target, delete — in both modes, system-following dark mode
- [x] Hero toggle: gradient idle / solid red running, spring press-scale, haptic on both transitions, breathing ring while a session runs
- [x] Session cards: themed surface, radius 16, hairline border; week headers bold with right-aligned total/target
- [x] Progress bars 8px rounded; over-target weeks show a red OVER chip with the overage (models gain `overByLabel`)
- [x] Setup overlay, Settings, and detail sheet restyled from the same tokens; splash/adaptive-icon backgrounds match the palette
- [ ] Engine tests remain green (plus overByLabel assertions); typecheck clean; bundles export; visually verified on iPhone and Android *(all but visual verification done — pull-to-refresh in Expo Go on both phones to see the new theme)*
