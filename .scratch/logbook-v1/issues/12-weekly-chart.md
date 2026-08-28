# 12: Weekly chart — day bars in week headers

Parent spec: `.scratch/logbook-v1/spec.md` (phase 2, grill session 2026-08-28)

**What to build:** Each Logs week header gains seven thin vertical bars — one per day of the week, heights scaled to that day's total, today's bar in the accent color, others muted. The week's shape at a glance; no new screens. Day totals already exist in `logsModel`; empty days render as flat baseline marks.

**Blocked by:** 10 — the category breakdown and the bars share the week-header area; land categories first.

**Status:** done

- [x] Engine: `LogWeek` days already carry totals; expose whatever the bars need (labels-only discipline) — TDD if the interface changes
- [x] Bars render inside each Logs week header: scaled heights, today accented, theme tokens only
- [x] Weeks with no data render flat baselines, not blank gaps
- [x] Engine tests green; typecheck clean; bundles export; verified on both phones
