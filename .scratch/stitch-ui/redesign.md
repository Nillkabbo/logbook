# LogBook — "Layered calm" redesign brief

Decided 2026-08-28 via grill-with-docs session. Mocks only (Stitch); the Expo
app and `src/theme.ts` are untouched. Baseline to diff against: the v1 Stitch
project "LogBook" (`projects/10169479017008139807`, see README.md).

## Direction (research-backed)

"Spatial / layered neutrals + selective bold numerals + spring motion":

- **Depth by tonal layering, not borders.** Canvas zinc #F4F4F5; cards #FFFFFF
  floating with a soft ambient shadow (≈0 8px 24px rgba(24,24,27,0.06)), no
  stroke, 24px radius. Insets zinc #E4E4E7, borderless.
- **Hero numerals.** Live elapsed timer ~64px semibold tabular; week-to-date
  fraction display-scale in the totals row. Everything else 15/13.
- **One glass element, max:** the running-session card on Home (translucent
  white + backdrop-blur look). Nothing else glassy.
- **Motion cues (static mocks):** breathing ring on the running toggle,
  springy press affordances implied; never animated in the mock itself.
- **Chips go tonal:** emerald at ~10% tint fill with emerald text (replaces
  v1's outlined pills). Filter pills: zinc-100 fill; selected = solid emerald.
- **Unchanged semantics:** emerald #059669 = the working state only; red
  #DC2626 = check-out / over-target / destructive only; zinc grays, never
  blue-gray; tabular numerals everywhere; CONTEXT.md vocabulary verbatim.
- Progress bars 10px (was 8), fully rounded, zinc-200 track.

## Information architecture (8 light screens)

| # | Screen | Change from v1 |
|---|---|---|
| 1 | Home — idle | restyle only |
| 2 | Home — running | restyle + glass running card |
| 3 | Logs — history | **compressed**: current + over-target weeks expanded, older weeks collapsed to compact rows (range · total · status pill · chevron) |
| 4 | Session edit sheet | restyle only |
| 5 | Settings — top level | **regrouped** into borderless grouped cards; simple settings inline (week start, target, threshold, rate, language); Schedule and Data become chevron rows |
| 6 | Schedule (sub-screen) | **new** — split from Settings: title + back, block list with Remove, weekday multi-select, FROM/TO, Add block, hint |
| 7 | Data (sub-screen) | **new** — split from Settings: export/import cards, hints, "Last export" line (grounded in `settings.lastExportAt`) |
| 8 | First-launch setup | restyle only |

Plus **3 dark mirrors** (Home idle, Home running, Logs) using the app's real
dark tokens: canvas #18181B, cards #27272A, text #FAFAFA, accent #34D399,
stop #F87171.

## Sub-screens get a header exception

Pushed sub-screens (Schedule, Data) carry a title + back chevron — the only
place a header is allowed. Tab screens and modals stay headerless.
