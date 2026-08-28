# 16: UX polish batch — consistency, preview, empty states, haptics

Parent spec: `.scratch/logbook-v1/spec.md` (phase 3, grill session 2026-08-28)

**What to build:** Four small fixes to existing screens. Home's session rows become tappable and open the same detail sheet Logs uses. The sheet gains a live duration preview that updates as timestamps are picked (so wrong-but-valid ranges are caught by eye), and Delete moves clear of Save so the destructive action can't be mis-tapped. First-run empty states on Home and Logs become friendly — icon plus one guiding line ("Tap Check in when you start working"). Save, delete, and export success each give a subtle haptic, matching the toggle.

**Blocked by:** None.

**Status:** done

- [x] Home rows open the session detail sheet (same component and behavior as Logs)
- [x] Sheet shows a live duration label while either timestamp picker changes
- [x] Delete visually separated from Save; no accidental destructive taps
- [x] Friendly first-run empty states on Home and Logs (icon + one guiding line)
- [x] Haptics on save, delete, and export success
- [x] Engine tests green; typecheck clean; bundles export; verified on both phones
