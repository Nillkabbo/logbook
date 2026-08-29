Status: done (2026-08-29)

## What's wrong

The only categories offered anywhere are labels already used on some Session.
After loading sample data, the four seeded categories dominate every chip row,
and there is no way to say up front "these are my categories." A brand-new user
sees no chips at all — the only way to create a category is to type one inside
a Session's edit sheet and save.

## What I expected

A Categories section where I can create my own labels before any Session uses
them. My categories appear as chips wherever categories are offered — the Home
quick row while a Session runs, the Session sheet, and the Logs filter — even
with zero Sessions carrying them.

## Steps to reproduce

1. Load sample data (Data sub-screen)
2. Open any Session — the Category chips show only the seeded labels
3. Check Settings — there is no Categories section anywhere
4. Start a check-in with no history at all: the Home quick row shows no chips

## Blocked by

None — can start immediately.

## Additional context

Reported during QA session 2026-08-29. Labels are case-sensitive today
("deep work" and "Deep work" are two categories); pinning a list is also the
natural place to prevent near-duplicate labels going forward.
