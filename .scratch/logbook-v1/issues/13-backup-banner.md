# 13: Backup banner — export nudge on launch

Parent spec: `.scratch/logbook-v1/spec.md` (phase 2, grill session 2026-08-28)

**What to build:** The user's data lives only on the phone, so LogBook nudges: when the app launches and the last CSV export is older than 30 days (or has never happened), Home shows a dismissible banner — "Back up your log" with a one-tap Export that opens the share sheet. Exporting (from the banner or Settings) records the timestamp. Works identically on both phones; no notifications involved.

**Blocked by:** None (independent of the header chain).

**Status:** done

- [x] Settings storage gains a last-export timestamp, written by every export path
- [x] Home shows the banner when last export is >30 days ago or never; dismissible until next launch (gated on at least one existing session — an empty log needs no backup; noted in review as an unrequested-but-sensible addition)
- [x] Banner's export action runs the existing CSV export and clears the banner
- [x] Styled from theme tokens; engine untouched (pure adapter/UI) unless a pure helper earns a test
- [x] Typecheck clean; bundles export; verified on both phones
