---
Status: ready-for-agent
---

# Layered Calm redesign

## Problem Statement

LogBook works, but it looks like a 2016 utility: flat cards with hairline
borders, small uniform type with weak hierarchy, and no sense of depth or
liveliness. Settings has grown into one very long scroll in which the work-block
editor — a mini-app, not a setting — is buried between an hourly-rate field and
a language picker. And Logs gets visually heavier with every week of history:
each week carries a progress bar, earnings, day-bars, a category breakdown, and
day groups, so scanning back through time means wading through walls of
equally-weighted detail.

## Solution

Adopt the approved "Layered Calm" visual language (the 16-screen
"LogBook — Modern" Stitch set): floating borderless cards on a tonal zinc
canvas, depth from soft ambient shadows instead of strokes, hero-scale
numerals for the live timer and week-to-date, tonal chips instead of outlined
pills, and dark-mode parity — while emerald keeps meaning exactly "the working
state" and red keeps its check-out / over-target / destructive monopoly.
Settings regroups into calm sections with Schedule and Data living on their
own pushed sub-screens. Logs compresses older weeks into compact rows so
recent weeks keep their detail and history stays scannable. No domain rule,
calculation, or stored datum changes — this is how the app looks and flows,
not what it means.

## User Stories

1. As a user, I want cards that float on a softly shadowed surface with no
   borders, so that the interface feels modern and quiet rather than boxed-in.
2. As a user, I want the live elapsed timer rendered at hero scale, so that I
   can read the running session's duration at a glance from across the room.
3. As a user, I want the week-to-date fraction rendered larger than every
   other number on Home, so that the week's shape is the first thing I see.
4. As a user, I want the check-in toggle to keep its emerald→teal gradient and
   springy press, so that the app's signature control stays lively through the
   restyle.
5. As a user, I want the running toggle's breathing ring preserved, so that a
   running session still announces itself the moment I unlock my phone.
6. As a user, I want the running session's card visually distinct from
   completed session cards, so that I never confuse live time with logged
   time.
7. As a user checking in, I want quick category chips as tonal pills, so that
   categorising the running session costs one tap and looks calm doing it.
8. As a user, I want category chips on session rows filled with a soft emerald
   tint instead of outlined, so that categories read as labels, not buttons.
9. As a user, I want progress bars slightly thicker and fully rounded, so that
   the week's fill is legible without shouting.
10. As a user, I want the unfilled portion of every progress bar visible, so
    that I can estimate the remaining distance to my weekly target.
11. As a user, I want the check-in button to remain emerald and the check-out
    button to remain red, so that the working/stopped distinction stays
    instinctive.
12. As a user running dark mode, I want the whole redesign mirrored with a
    deep zinc canvas, lighter floating cards, and a luminous emerald, so that
    the app feels native at night without any color-semantics drift.
13. As a user, I want every time and number in tabular numerals, so that
    ticking timers and changing totals never jitter horizontally.
14. As a user with history, I want the current week fully expanded, so that
    this week's days and sessions stay one glance away.
15. As a user with history, I want any over-target week to stay expanded, so
    that the weeks where I worked past my weekly target keep their OVER chip
    and red bar visible.
16. As a user with history, I want every other past week collapsed to a
    compact row showing its date range, total, and status, so that scrolling
    back through months costs seconds, not minutes.
17. As a user with history, I want to tap a collapsed week to expand it, so
    that old detail is one tap away when I need it.
18. As a user with history, I want an off week's collapsed row to show its
    Off week pill, so that suspended weeks are identifiable without expanding
    them.
19. As a user with history, I want an off week to keep showing its total and
    earnings when expanded, so that marking a week off never hides what I
    actually logged.
20. As a user, I want to mark a week off or on from its expanded header, so
    that the existing control stays where my thumb already knows it.
21. As a user, I want Settings organised into grouped sections — Week,
    Earnings, Language — so that related settings sit together visually.
22. As a user, I want Schedule on its own sub-screen reached from Settings,
    so that the work-block list and add form get room to breathe.
23. As a user, I want Data on its own sub-screen reached from Settings, so
    that export and import are found in one obvious place.
24. As a user who exports, I want the Data screen to show when I last
    exported, so that I can tell whether my log is safely backed up without
    triggering the backup banner.
25. As a user, I want sub-screens to carry a back chevron and their own title
    while keeping the tab bar, so that pushing into Schedule or Data never
    feels like leaving the app.
26. As a user editing a session, I want the edit sheet restyled to floating
    field cards with a visibly taller note field, so that writing a note feels
    like writing, not typing into a slot.
27. As a user on first launch, I want the setup screen restyled to the same
    language, so that my first impression matches the app I will live in.
28. As a Bangla-speaking user, I want every new string the redesign
    introduces available in Bangla too, so that nothing in the refreshed UI
    falls back to English.

## Implementation Decisions

- **Token overhaul in the theme module.** Replace the bordered-card token set
  with a layered one: canvas / card / inset zinc steps per mode; ambient
  shadow tokens (subtle in light, stronger black in dark); a radius family
  (cards ~24, controls ~12, pills and bars fully rounded); an enlarged display
  tier for hero numerals. Accent semantics are unchanged and stay documented
  per token: emerald = the working state only; red = check-out, over-target,
  destructive only. Dark mode reuses the app's existing dark palette with its
  brighter accent.
- **Chips and pills go tonal.** Outlined category chips become ~10% emerald
  tint fills with emerald text. Unselected weekday/filter pills become inset
  zinc fills; selected pills become solid emerald with the on-accent text
  color. The Off week pill and OVER chip follow the same tonal treatment in
  emerald and red respectively.
- **Engine: collapse defaults are a domain decision.** The logs view model
  gains a per-week `defaultExpanded` flag: true for the current week and for
  any over-target week; false for all others (including off weeks). The flag
  is a default only — expansion overrides are screen state, never persisted.
  No other engine output changes.
- **Navigation: Settings splits, tabs stay.** The Settings tab becomes a
  grouped form plus two chevron rows. Schedule and Data become pushed
  sub-screens inside the Settings flow, each with a back chevron and its own
  title, sharing the existing store actions unchanged (save settings, add and
  remove work blocks, export, import). The "last export" line on Data derives
  from the existing last-export timestamp; when no export has happened it
  reads as never exported.
- **Components restyle in place.** Session rows, banners, progress, weekday
  picker, sheet fields, and setup reuse their existing structure and props;
  only styling moves to the new tokens. The check-in toggle keeps its
  gradient, spring press, and breathing ring.
- **Running-session distinction.** The running session's card gets a
  translucent treatment (frosted look with a hairline edge); a blur-based
  implementation is optional and only if it can be done without adding heavy
  dependencies. A small emerald "live" pulse dot on the running card is
  acceptable — emerald remains the working-state signal.
- **New strings go through i18n in both languages.** Sub-screen titles, the
  last-export line, and any collapse affordance join the string dictionary
  with English and Bangla entries; existing strings are reused verbatim
  wherever the redesign renames nothing.
- **No schema, engine-rule, or notification changes.** ADR-0001 (sessions
  belong to their check-in day) and the running-session-never-counted rule
  are untouched.

## Testing Decisions

- A good test here asserts external behavior at the engine boundary only —
  what the view model returns for a given set of sessions, settings, and now
  — never how a component renders. The visual layer has no rendering-test
  infrastructure by design (the engine stays pure so vitest can run in node),
  and this feature does not change that.
- **Engine tests (the one behavioral change):** the logs view model's
  expansion defaults are tested in its existing colocated test module, in the
  style of the current week-summary cases: current week defaults expanded; an
  over-target week defaults expanded; a past normal week defaults collapsed;
  an off week defaults collapsed; a week that is both current and
  over-target defaults expanded (not double-counted).
- **Everything presentational** is gated by the typecheck command (the repo's
  lint gate) plus manual QA against the Stitch "LogBook — Modern" project,
  which is the visual source of truth for this spec.

## Out of Scope

- Bangla mock variants of the Stitch screens (the app-side Bangla strings are
  in scope; regenerating mocks is not).
- The v1 Stitch project and any diff tooling against it.
- Notification content, reminder lifecycle, CSV format, or backup behavior.
- Any domain-rule change: week math, session ownership, totals, earnings,
  category suggestion order.
- A component-test harness or visual-regression tooling.
- Database or settings-schema changes (no new persisted settings).

## Further Notes

- Visual source of truth: the Stitch project "LogBook — Modern"; the screen
  map with canonical screen IDs lives in the stitch-ui notes alongside the
  redesign brief. Two superseded Logs-dark screens in that project are pending
  manual deletion (cosmetic, tracker-side only).
- The brief's "one glass element maximum" rule applies: if the frosted
  running card is dropped for simplicity, nothing else may take its place.
- Dark-mode muted text sits near the WCAG AA contrast edge in the mocks;
  during implementation the secondary-text opacity may be raised a step in
  dark mode without violating the token set's intent.
- No ADR is proposed: the redesign reverses cheaply (tokens + styling) and
  changes no domain rule; the navigation split is a routing choice, not an
  architectural commitment.

## Comments

- Two-axis review (Standards + Spec) run against 22ed6e1...HEAD after implementation; findings fixed in the follow-up commit (toggle bug, OVER localization, export catch, engine-owned block labels). Suite: 100 passed.

## Comments

- Round 3 (export-exactness): the user supplied the full Stitch HTML export
  (`.scratch/stitch-ui/stitch_logbook_modern` — code.html per screen), which
  replaced vision-diff estimating with exact values. All screens re-derived
  from the export's code: Home (b17c225), Logs (788171d), Settings+Schedule+Data
  (66c16d5), Session sheet+Setup (93f0961).
- Round 4 (platform polish): safe-area insets on every screen (36e134e),
  Context7-verified RN/Expo best practices — memoised rows, transactional
  imports, ripples, dark splash (f2bdc74) — and FlatList virtualization of the
  Logs history (ee9a623).
- Suite at close: 108 tests, typecheck clean, all routes rendering with zero
  console errors.
- Expert review (two commits): all 17 findings fixed or dispositioned —
  sheet cancel + dirty guard, Logs color semantics (green = working state
  only), AA dark contrast, duration promoted, hint rewritten, touch targets.
