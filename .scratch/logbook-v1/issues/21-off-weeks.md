# 21: Off weeks — suspend target judgment for marked weeks

Parent spec: `.scratch/logbook-v1/spec.md` (phase 4, grill session 2026-08-28)

**What to build:** Any week in Logs can be marked Off from its header (and unmarked). An Off week suspends the Weekly target and Over-target judgment: no progress bar, no OVER chip, no week-to-date vs target — totals and earnings still show, because work done in an off week is still real. Home's current week shows "Off week" in place of the progress bar. Sessions in off weeks appear in Logs and CSV untouched. Glossary term: Off week.

**Blocked by:** None (engine: week models gain an off flag; store/db persist the marked weeks).

**Status:** ready-for-agent

- [ ] Storage for marked weeks (week-start key list); mark/unmark from the Logs week header
- [ ] Engine: off weeks carry no progress/over-target (TDD: off week models, earnings/totals unaffected)
- [ ] Home: current off week shows "Off week" instead of the bar
- [ ] Unmarking restores judgment immediately
- [ ] Engine tests green; typecheck clean; bundles export; verified on both phones
