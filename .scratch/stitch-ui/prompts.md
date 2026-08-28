# Stitch screen-generation prompts for LogBook

Each screen prompt is prefixed with the shared context block below. Sample data
is internally consistent (totals, durations, earnings all add up) so the mocks
read as a real single-user log, not filler.

---

## Shared context (prepend to every screen prompt)

Design one screen for **LogBook**, a single-user iOS time-tracking app. This is
a calm personal utility — NOT a team/SaaS product. No dashboards, no avatars,
no team stats, no charts other than simple progress bars, no side navigation,
no login/profile, no marketing hero, no illustrations. Invent no features
beyond what is listed.

**Visual language — "calm utility":**
- Page background zinc #F4F4F5; cards and sheets #FFFFFF with a 1px
  rgba(24,24,27,0.08) hairline border and 16px corner radius. No heavy shadows.
- Primary text #18181B; secondary text rgba(24,24,27,0.6). Zinc grays only —
  never blue-gray. No blue anywhere.
- Emerald #059669 is the accent and means exactly one thing: the working state
  (check-in buttons, selected pills, links, earnings, today's bar). The idle
  check-in button uses a subtle emerald→teal gradient #059669 → #0D9488.
- Red #DC2626 is reserved strictly for the check-out state, over-target weeks,
  and destructive actions. Nothing else may be red or emerald.
- Progress bars: 8px tall, fully rounded, track rgba(24,24,27,0.08), emerald
  fill (red fill only for an over-target week).
- Chips/badges: outlined pills (18px radius, 1px border), 11px bold uppercase
  micro-text.
- System font (SF Pro), tabular numerals everywhere a time or number appears.
  Section labels: 13px uppercase, letter-spaced, 60% gray.

**Vocabulary (exact — never "shift", "clock in/out", "punch", "overtime",
"goal"):** a work period is a **session**, started by **Check in** and ended by
**Check out**; a session with no check-out yet is **running** (shown live with
"now" as its end, but NEVER counted in totals); weeks are labeled by date
range like "Sun, Aug 24 – Sat, Aug 30"; each week has a **weekly target**
(40:00) and a **week-to-date** total like "29:36 / 40:00"; a week past target
shows a red "OVER +2:05" chip; a week marked not-working shows an emerald
"Off week" pill and no target bar; optional **categories** (e.g. "Deep work",
"Meetings") tag sessions as outlined chips.

**Chrome:** iPhone, status bar 9:41. Bottom tab bar: Home (house icon), Logs
(clock icon), Settings (gear icon), SF Symbols, active tint emerald, inactive
gray.

---

## Screen 1 — Home, idle

{SHARED CONTEXT}

The **Home** tab, idle state (nothing running). Screen padding 16px, content
centered, top to bottom:

1. A 220×220pt circular button, emerald→teal gradient (#059669 → #0D9488),
   white bold 26px label **"Check in"**. Generous whitespace above it.
2. Totals row — two centered columns ~32px apart:
   - **TODAY** (13px uppercase muted label) over **"6:32"** (24px semibold,
     tabular).
   - **THIS WEEK** over **"32:40 / 40:00"** (24px semibold), an 8px progress
     bar beneath it filled 82% emerald, and under the bar a small emerald
     semibold **"$980.00"**.
3. A centered muted 13px line: **"Next block: Mon, Aug 31, 9:00 AM"**.
4. Today's sessions — white cards, 16px radius, hairline border, 14px padding:
   - Card: "9:12 AM – 12:40 PM" (15px, left) and "3:28" (15px semibold,
     right) on one baseline row; below, an outlined emerald chip "Deep work".
   - Card: "2:05 PM – 5:09 PM" and "3:04"; chip "Meetings"; note line in 13px
     muted: "Sprint planning + 1:1s".
5. Tab bar with Home active.

Today's completed sessions sum to 6:32; the week-to-date is 32:40 of the
40:00 target.

---

## Screen 2 — Home, running session

{SHARED CONTEXT}

The **Home** tab while a session is running. Same layout as idle, with these
differences:

1. At the top, the live elapsed timer in 52px semibold tabular numerals,
   centered: **"2:47:12"**.
2. The 220×220pt circular button is now solid red #DC2626 with white bold
   26px **"Check out"**, wrapped in a faint concentric red "breathing" ring
   (soft, low-opacity outline just outside the circle).
3. Below the button, a centered row of quick category chips (the running
   session has no category yet): outlined emerald pills "Deep work",
   "Meetings", "Admin", "Writing", then a muted "…".
4. Totals row: **TODAY "3:28"** — only the completed morning session counts;
   the running session is NOT in totals. **THIS WEEK "29:36 / 40:00"**, bar
   74% emerald, earnings **"$888.00"**.
5. Session cards:
   - Running session first: "2:47 PM – now" and "2:47", no chip.
   - Then "9:12 AM – 12:40 PM" and "3:28" with chip "Deep work".
6. Tab bar with Home active.

---

## Screen 3 — Logs

{SHARED CONTEXT}

The **Logs** tab: full history grouped by week, newest first, scrolling
content on zinc background, 16px padding.

1. Category filter row: a filled emerald pill "All", then outlined pills
   "Deep work", "Meetings", "Admin".
2. **Current week** block:
   - Header row: "Sun, Aug 24 – Sat, Aug 30" (17px bold, left) and a muted
     13px semibold "Mark off" (right).
   - "29:36 / 40:00" (14px tabular) with an 8px progress bar, 74% emerald.
   - Earnings line: emerald 14px semibold "$888.00".
   - A row of 7 thin vertical day bars (3px wide, 2px radius, 32px max
     height, varying heights, aligned to bottom): today's bar emerald, the
     other six light zinc.
   - Category breakdown, three space-between rows, 13px (labels muted, totals
     dark, tabular): "Deep work 16:08", "Meetings 8:20", "Uncategorised 5:08".
   - Under the header, day groups. **Wednesday** (14px semibold label) with
     "3:28" (13px muted) right-aligned, then its session cards — "2:47 PM –
     now" / "2:47" (running, no chip) and "9:12 AM – 12:40 PM" / "3:28" with
     chip "Deep work". **Tuesday** with "8:56" and two completed session
     cards. **Monday** with "9:12", **Sunday** with "8:00", each with one or
     two cards.
3. **Previous week** (over target): "Sun, Aug 17 – Sat, Aug 23", "Mark off";
   "42:05 / 40:00" with the numerals in RED, an outlined red chip
   **"OVER +2:05"** beside it, and the progress bar completely filled red.
   Day bars and one or two day groups below.
4. **Week before that** (an off week): "Sun, Aug 10 – Sat, Aug 16" with
   "Mark on" on the right; instead of a target and bar, the total "10:24"
   (14px tabular) next to an outlined emerald pill **"Off week"**. One day
   group below.
5. Tab bar with Logs active.

---

## Screen 4 — Session detail sheet

{SHARED CONTEXT}

The **session edit sheet**: an iOS page-sheet modal sliding over the dimmed
Home tab. Sheet background zinc #F4F4F5, 20px padding, with a grabber handle
at the top. Top to bottom:

1. Title "Session" (22px bold).
2. "CHECK-IN" micro-label (12px uppercase, letter-spaced, muted) above a
   white 16px-radius field showing "Wed, Aug 27, 2:47 PM" (16px tabular) with
   a subtle calendar/clock glyph on the right — a compact date-time picker.
3. A row: "Still running" (15px, dark) left and an iOS toggle switch (OFF)
   right.
4. "CHECK-OUT" micro-label above the same style of field showing
   "Wed, Aug 27, 5:34 PM".
5. A centered muted 14px tabular duration preview: "2:47".
6. "CATEGORY" micro-label, white input with the text "Deep work".
7. "NOTE" micro-label, white multiline input (about 70px tall) with the text
   "Focus block — payments refactor".
8. Full-width emerald "Save" button (16px radius, white semibold 16px).
9. Centered below it, red semibold 16px text "Delete session".

---

## Screen 5 — Settings

{SHARED CONTEXT}

The **Settings** tab: a long scrolling form on zinc, 16px padding. Section
titles are 13px uppercase, letter-spaced, muted, with 8px space above each.
Inputs are white, hairline border, 16px radius, 12px padding, 16px text.

1. **WEEK STARTS ON** — seven outlined weekday pills "Sun" "Mon" "Tue" "Wed"
   "Thu" "Fri" "Sat" (18px radius); "Sun" is selected: filled emerald with
   white semibold text.
2. **WEEKLY TARGET (HOURS)** — one input with "40".
3. **REMINDER THRESHOLD (HOURS, 1–16)** — input with "10", then a 13px muted
   hint: "Applies to your next check-in."
4. **HOURLY RATE ($, OPTIONAL)** — input with "30", hint: "When set, weeks
   show their earnings. Empty hides them."
5. **SCHEDULE** — a white card row reading "Sun, Mon, Tue, Wed, Thu ·
   9:00 AM–5:00 PM" (14px tabular) with red semibold 13px "Remove" on the
   right. Below: the weekday pill row in multi-select mode ("Sun"–"Thu"
   filled emerald, "Fri"/"Sat" outlined); two half-width white fields side by
   side labeled "FROM" / "TO" (11px uppercase muted) showing "9:00 AM" /
   "5:00 PM" (16px tabular); a full-width emerald "Add block" button; a 12px
   muted hint: "Blocks nudge you to check in — they never clock you in
   automatically."
6. **LANGUAGE** — three pills: "System" (filled emerald), "English",
   "বাংলা".
7. **EXPORT** — a full-width filled emerald button "Export all sessions
   (CSV)" with 13px muted hint "One row per session via the share sheet."
   below it; then a full-width outlined emerald button "Import backup (CSV)"
   with hint "Merges a previous export — duplicates and running rows are
   skipped."
8. Tab bar with Settings active.

---

## Screen 6 — First-launch setup

{SHARED CONTEXT}

The one-time **setup modal** shown on first launch — full screen, zinc
background, content vertically centered, 24px padding:

1. "Welcome to LogBook" (26px bold, centered).
2. Intro, 15px muted, centered: "Two quick choices — you can change both
   later in Settings, or skip for now."
3. "WHEN DOES YOUR WEEK START?" (13px uppercase muted label) above the
   weekday pill row, single-select, "Sun" filled emerald.
4. "WEEKLY TARGET (HOURS)" above a white input showing "40".
5. Full-width emerald "Start tracking" button (16px radius, 16px semibold
   white).
6. Centered emerald 14px text link below: "Skip — use defaults (Sunday,
   40h)".

No tab bar on this screen.
