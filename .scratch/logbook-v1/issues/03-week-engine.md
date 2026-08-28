# 03: Week engine — week-start-day math + week-to-date on Home

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** The highest-risk pure logic in the app, built TDD-first in the domain engine: week boundaries computed from the configured week-start day (Thursday ⇒ Thursday 00:00 through Wednesday 23:59), session ownership by check-in day (a Wednesday 11 PM → Thursday 2 AM session belongs to Wednesday's day and week entirely — no midnight splitting), and week-to-date totals. Home then shows the week-to-date total against the weekly target from the settings table (defaults Sunday / 40h) with a progress bar and a distinct over-target state.

**Blocked by:** 02 — Check-in/check-out loop with SQLite persistence.

**Status:** ready-for-agent

- [ ] Unit tests pass for week boundaries with every weekday configured as the week-start day
- [ ] Unit tests pass for a session starting exactly at a week boundary, and for midnight-crossing sessions owned by the check-in day/week
- [ ] Unit tests pass for week-to-date totals across multiple sessions and days, with running sessions excluded
- [ ] Home shows week-to-date total vs weekly target (read from settings) with a progress bar
- [ ] Exceeding the target renders a distinct over-target state
- [ ] All engine tests run in plain Node with no device or mocks
