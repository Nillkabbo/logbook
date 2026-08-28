# 17: Logs category filter — per-category analysis view

Parent spec: `.scratch/logbook-v1/spec.md` (phase 3, grill session 2026-08-28)

**What to build:** A chip row atop Logs — "All" plus one chip per category actually in use. While a category is active, the entire view recomputes over the matching sessions: rows, week totals, day bars, and the category breakdown — answering "how much of this week was client site?" on the same screen. "All" restores the unfiltered record. The filtering happens in the engine (logsModel takes an optional category), TDD at the seam.

**Blocked by:** None (touches the Logs screen and the engine's logsModel interface).

**Status:** done

- [x] logsModel accepts an optional category filter — TDD: totals/bars/breakdown recompute over matches; non-matching weeks hide; "All" equals today's behavior
- [x] Chip row renders All + used categories, styled from tokens, active state clear
- [x] Filter state resets to All on next visit (not sticky)
- [x] Engine tests green; typecheck clean; bundles export; verified on both phones
