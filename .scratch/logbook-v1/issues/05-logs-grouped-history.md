# 05: Logs screen — history grouped by week and day

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** The full scrollable history on the Logs tab, newest first, grouped by week and then by day, computed by the domain engine and covered by unit tests. Each week header shows its date-range label (like "Thu, Aug 21 – Wed, Aug 27" — never week numbers), the week's total against the target, a progress bar, and a distinct over-target state. Timestamps stored in UTC render in the device's current timezone. An empty state shows before any session exists.

**Blocked by:** 03 — Week engine (grouping depends on week boundaries and ownership).

**Status:** ready-for-agent

- [ ] Logs lists all sessions newest-first, grouped by week then by day
- [ ] Week headers show date-range label, total/target, and progress bar; over-target weeks styled distinctly
- [ ] Unit tests pass for date-range labels, week/day grouping, and ownership (including midnight-crossing sessions and a session starting exactly at a boundary)
- [ ] UTC timestamps display in the device's current timezone
- [ ] Empty state renders when there are no sessions
