# 15: Schedule — recurring Work blocks with nudges

Parent spec: `.scratch/logbook-v1/spec.md` (phase 2, grill session 2026-08-28)

**What to build:** The user defines recurring weekly Work blocks — chosen weekdays (any set: Thu–Sun, or Thu+Fri+Sun scattered) plus a time range. LogBook nudges: OS notification when a block starts plus an in-app banner with one-tap Check in; a gentle "block over" notification if a session is still running at block end; Home always shows the next upcoming block. Blocks never clock a Session in automatically — the schedule prompts, the person decides. On Android in Expo Go, OS notifications are unavailable (known platform limit): the in-app next-block line and banners carry the feature there until a dev build exists.

**Blocked by:** None (independent of 10–14; grows the notifications adapter, touches Home + Settings).

**Status:** done

- [x] Settings gains a Schedule section: blocks list with add/delete — weekday multi-select pills (range = several taps) and start/end time pickers; the range must be non-empty (overnight allowed — end before start crosses midnight, owned by the start day; this line originally said "start must precede end", which contradicted the cross-midnight criterion — corrected in review)
- [x] SQLite: blocks table (weekdays set, start time, end time); engine `WorkBlock` type
- [x] Engine (TDD at the seam): `nextBlockOccurrence(blocks, now)` → next block + instant (or null); `blockOccurring(blocks, now)`; covers cross-midnight sets, week-start-independence, empty schedule
- [x] Home: "Next block: Thu 9:00" when idle; when a block starts and no session runs, a banner with one-tap Check in
- [x] OS notifications scheduled weekly per block (start nudge; end nudge only if a session is running) — through the existing guarded adapter, so platforms without notifications skip silently (iPhone gets them today)
- [x] Decoupled from totals: no target, chart, or planned-vs-actual integration this ticket
- [x] Engine tests green (existing + new); typecheck clean; bundles export; in-app behavior verified on both phones, OS notifications verified on iPhone
