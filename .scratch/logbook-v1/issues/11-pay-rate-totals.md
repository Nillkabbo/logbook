# 11: Pay-rate totals — weekly earnings line

Parent spec: `.scratch/logbook-v1/spec.md` (phase 2, grill session 2026-08-28)

**What to build:** An optional hourly Rate in Settings (validated: a positive number, USD). When set, each week header — Home's week card and Logs — shows the week's earnings (week total × rate, formatted `$ 320.50`, computed from completed sessions only). When unset, no earnings appear anywhere and no Rate UI is shown beyond the Settings field.

**Blocked by:** 10 — both reshape the week headers; landing 10 first avoids touching them twice.

**Status:** done

- [x] Settings: hourly Rate field (positive number, blank allowed) alongside target and threshold
- [x] Engine: week models expose an `earningsLabel: string | null` — TDD (rate × completed total; null when unset)
- [x] Week headers on Home and Logs render the earnings line from tokens
- [x] Engine tests green; typecheck clean; bundles export; verified on both phones
