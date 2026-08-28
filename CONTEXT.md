# LogBook

A single-user time log: the user checks in and out of work, and the app records exact timestamps, shows the full history, and totals hours on a week whose start day the user configures.

## Language

**Session**:
A check-in/check-out pair, owned by the day of its check-in. A session may be running (no check-out yet).
_Avoid_: shift, entry, block, timer

**Check-in**:
The timestamp marking the start of a session.
_Avoid_: punch in, clock in, start

**Check-out**:
The timestamp marking the end of a session.
_Avoid_: punch out, clock out, stop

**Running session**:
A session whose check-out has not happened yet. Shown with a live timer, but never counted in totals.
_Avoid_: open session, active session, live session

**Day total**:
The sum of completed sessions owned by that day.
_Avoid_: daily sum, hours worked

**Week**:
The seven days beginning on the week-start day at 00:00 local time. Labeled by its date range (e.g. "Thu, Aug 21 – Wed, Aug 27"), never by a week number.
_Avoid_: ISO week, week number, calendar week

**Week-start day**:
The configurable weekday on which a week begins. Default Sunday.
_Avoid_: week beginning, first day

**Weekly target**:
The configurable number of hours a week aims for. Default 40.
_Avoid_: goal, quota, limit

**Week-to-date**:
The sum of day totals across the days of the current week so far.
_Avoid_: weekly hours, week total (use "week total" only for a finished week)

**Over-target**:
A week whose total exceeds the weekly target. Displayed distinctly.
_Avoid_: overtime, excess

**Reminder threshold**:
The configurable number of hours after check-in at which a reminder fires if the session is still running. Default 10, range 1–16.
_Avoid_: alarm, timeout, notification delay

**Reminder lifecycle**:
The rule that a reminder exists if and only if a Running session exists, maintained across the check-in, check-out, edit, and delete transitions.
_Avoid_: notification rules, reminder logic

**Category**:
A short free-form label marking the kind of work a Session belongs to. Optional; drawn from the user's own history.
_Avoid_: tag, project, client

**Rate**:
The configurable dollars earned per worked hour; the basis of a week's earnings. Optional — unset means earnings are not shown.
_Avoid_: salary, wage

**Work block**:
A recurring weekly commitment — chosen weekdays plus a start and end time. Prompts a check-in; never clocks one in.
_Avoid_: shift, appointment, schedule entry

**Off week**:
A Week the user has marked as not working; the Weekly target and Over-target judgment are suspended for it. Totals and earnings still show.
_Avoid_: vacation week, holiday week, pause week
