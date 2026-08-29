Status: done (2026-08-29)

## What's wrong

Fixing a typo or renaming a category means editing every Session that carries
it, one at a time. Because labels are case-sensitive, "deep work" and
"Deep work" live forever as two separate categories — in Insights shares,
Logs filters, and every breakdown — with no way to merge them.

## What I expected

Rename a category once, in my Categories list; every Session carrying the old
label updates, and Insights, Logs filters, and breakdowns follow immediately.

## Steps to reproduce

1. Create two Sessions: one categorised "deep work", one "Deep work"
2. Open Insights — both appear as separate rows in category shares
3. Open the Logs filter chips — both appear separately
4. Try to merge/rename: only per-Session editing exists

## Blocked by

- 01-pin-custom-categories (the manager surface the rename lives in)

## Additional context

Reported during QA session 2026-08-29. Renaming should treat the Sessions'
hours and earnings as unchanged — only the label moves.
