---
Status: ready-for-agent
---

# 03 — Session edit sheet restyle

## Parent

`.scratch/layered-calm-redesign/spec.md`

## What to build

Restyle the session edit sheet to the Layered Calm language: the check-in and
check-out fields, category input, and note input become floating field cards
(no borders); the note field is visibly taller than the category field
(two-plus text rows); the Save action stays emerald and the delete action
stays red. All existing behavior — time validation, the still-running switch
anchoring check-out, category suggestions, delete confirmation — is
preserved unchanged.

## Acceptance criteria

- [ ] Sheet fields render as borderless floating cards with soft shadows, in
      both light and dark mode
- [ ] The note field is visibly taller than the category field
- [ ] Save is the only emerald element; the delete link is the only red
      element on the sheet
- [ ] Saving with valid times, the still-running toggle flow, category
      suggestions, and delete-with-confirmation all behave exactly as before
- [ ] New strings (if any) exist in both English and Bangla
- [ ] `npm run typecheck` and `npm test` pass

## Blocked by

- 01 — Home idle in Layered Calm
