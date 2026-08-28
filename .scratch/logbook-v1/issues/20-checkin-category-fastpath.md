# 20: Check-in category fast path — chips while running

Parent spec: `.scratch/logbook-v1/spec.md` (phase 4, grill session 2026-08-28)

**What to build:** While the running session has no Category, Home shows a compact chip row under the timer: the four most recently used categories plus a "…" chip that opens the session sheet. One tap sets the category instantly and the row disappears. The sheet remains the full editor; this is the two-second path for the common case.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Chip row renders only while a session runs AND its category is empty
- [ ] Chips = four most recently used categories (most recent first) + "…" into the sheet
- [ ] Tapping a chip saves the category without leaving Home; row disappears once set
- [ ] Styled from tokens; haptic on set
- [ ] Engine tests green; typecheck clean; bundles export; verified on both phones
