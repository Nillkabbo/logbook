# 07: First-launch setup + Settings screen

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** On first launch (setup flag unset), a one-time overlay asks for week-start day and weekly target with two pickers; Skip accepts defaults (Sunday, 40h) and both values are changeable later. The Settings tab edits week-start day, weekly target, and reminder threshold (validated to 1–16h); changes take effect immediately across the app — Home's week-to-date re-computes, Logs re-groups under the new week boundaries.

**Blocked by:** 03 (engine must honor a configured week-start day), 04 (reminder threshold must feed scheduling).

**Status:** ready-for-agent

- [ ] First launch shows a one-time setup overlay with week-start-day and weekly-target pickers
- [ ] Skip uses defaults Sunday / 40h; completing or skipping sets the setup flag so the overlay never returns
- [ ] Settings screen edits week-start day, weekly target, and reminder threshold
- [ ] Reminder threshold validated to the 1–16h range
- [ ] Changing week-start day immediately re-groups Logs and re-computes Home's week-to-date
- [ ] Changing the weekly target updates progress bars and over-target states everywhere
- [ ] Changing the reminder threshold affects the next check-in's scheduled notification
