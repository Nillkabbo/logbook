# LogBook — Stitch UI mocks

## Projects

| Project | ID | What it is |
|---|---|---|
| **LogBook — Modern** | `projects/2728273835776498055` | The "layered calm" redesign (current). 11 screens: 8 light + 3 dark mirrors |
| LogBook (v1) | `projects/10169479017008139807` | Original "calm utility" mocks — kept as the baseline to diff against |

Design brief for the redesign: `redesign.md` (direction recipe + IA changes,
decided via grill-with-docs session 2026-08-28). Generation prompts live in
`prompts.md` (v1); the modern prompts were inline evolutions of the same
shared-context pattern — v2 context = tonal layering instead of borders,
24px radii, soft shadows, hero numerals, tonal chips, one glass element.

## Design systems

- **Layered Calm** — `assets/f366fe865b854245bd844c07a1712be6` (light). Stitch
  distilled this itself from the prompt language; it carries the full token
  set (canvas/card/inset zinks, `0 8px 24px rgba(24,24,27,0.06)` shadow, tonal
  emerald chips, 10px bars, tabular numerals).
- **Layered Calm — Dark** — `assets/18214753559769765508` (dark mirror,
  `#34D399` seed).
- LogBook — calm utility — `assets/16181993135456896685` (v1 project).

## Modern screens (16 canonical: 8 light + 8 dark)

| Screen | Stitch ID | Status |
|---|---|---|
| Home — idle (light) | `d82046381ed34a6f8f74605e9a225891` | verified clean |
| Home — running (light) | `442dcd2034db4f3187dc39872dfe6403` | verified; post-edit: timer `2:47:12`, running card glass |
| Logs (light) | `9dac1f94d6c441fe93a78d39b3cb4483` | edit receipt-verified (Monday card, Sunday group, Tuesday times); **thumbnail URL 400s — view in Stitch** |
| Session edit sheet (light) | `2060b859844b44f1b3eb0f7e5b415137` | verified clean |
| Settings (light) | `b40471a6b7574797b5bfe85e173f4ba5` | verified clean |
| Schedule (light) | `d1b9599f247546f19c1d7f3474b8692b` | verified clean |
| Data (light) | `5d7719264346484694053759cc10b725` | verified clean |
| Setup (light) | `df912ab95d394ae78f822a95c4624817` | verified clean |
| Home — idle (dark) | `eddd29bfd8dc4758be4fbaf100364c30` | verified clean |
| Home — running (dark) | `a3b471bffee64c81bc33be24da9e96e9` | verified; post-edit: "…" chip |
| **Logs (dark) — canonical** | `016d4b1cfccd4295bad9c278afe3ef13` | verified correct — the edit agent inspected its HTML and confirmed Monday/Sunday/Tuesday are all right |
| Session edit sheet (dark) | `a3d60ed35a5c4b6580f68d8917836b32` | verified; grabber added in place (file rotated) |
| Settings (dark) | `4af4d4e34f32431883ce3afafc1bbad1` | verified; post-edit: Fri/Sat pills added (picker had only 5) |
| Schedule (dark) | `1ab31f93713e47859b39b36411c57860` | verified; post-edit: bar title "Settings" → "Schedule" |
| Data (dark) | `224665b42eae41c686c148660d21dc3f` | verified; post-edit: bar title "Settings" → "Data" |
| Setup (dark) | `56d70d3b60df43c8b6dda5685c17eea1` | verified; extra logo mark + "→" on CTA left as fashion |

### Superseded duplicates — delete manually in the Stitch UI

Timed-out edits can spawn corrected copies instead of editing in place; two did:

- `72c4f326356f45dcb09d677cba16ef7d` — "LogBook Logs — Dark" (the ORIGINAL, 2332px, with the orphaned-Monday defects). Superseded by `016d4b1c`.
- `bb29fb3bf4e14b23bad7832289d78b64` — "LogBook History — Dark (Corrected)" (duplicate corrected copy, 2778px). `016d4b1c` is the canonical one; this is redundant.

## Files

- `screens/` — v1 screenshots (pre-edit renders; Stitch thumbnails re-render lazily)
- `modern/` — modern screenshots as downloaded (light-Logs missing: bad CDN token)

## Known minor deviations (left as-is)

- Dark-mode muted grays sit near the WCAG AA edge — check before implementing.
- The dark check-in gradient is barely perceptible.
- Setup weekday pills wrap to two rows.
- Session sheet scrim is lighter than typical iOS; the "Still running" toggle row has no card container.
- The running card in the light design carries a small emerald pulse dot (working-state semantics — allowed, not in the app today).
- Bangla remains mock-pending (all screens English).

## Working notes for Stitch via MCP

- Generation/edit calls frequently exceed the MCP client timeout but complete
  server-side — never retry a timed-out call; poll `list_screens` instead.
- `list_screens`/`get_project` lag behind reality; `get_screen` by ID is truth.
- `projectId` is a TOP-LEVEL parameter on create/update design system, not
  inside the `designSystem` object.
- Screenshot thumbnails re-render lazily; identical URL ≠ stale content is
  guaranteed — verify edits via the returned DOM-operation receipts.
