# 18: CSV import — restorable backups

Parent spec: `.scratch/logbook-v1/spec.md` (phase 3, grill session 2026-08-28)

**What to build:** Settings' Export section gains Import: pick a previously exported CSV (expo-document-picker), a pure engine parser turns rows back into sessions, and they merge — rows whose exact check-in+check-out pair already exists are skipped as duplicates; running (blank-checkout) rows are skipped entirely (transient by definition). A confirmation reports "imported N, skipped M duplicates" and the log refreshes. Backups finally restore.

**Blocked by:** None.

**Status:** ready-for-agent

- [ ] Engine: parse exported CSV back to sessions (inverse of sessionsToCsv; comma/quote-escaping handled) — TDD incl. malformed rows
- [ ] Engine: duplicate rule = exact check-in+check-out pair already present — TDD
- [ ] Settings: Import button → document picker → merge via the store → confirmation alert with counts
- [ ] Blank-checkout rows skipped and counted; import never breaks a running session
- [ ] Round-trip test: export → import → zero duplicates imported — TDD
- [ ] Engine tests green; typecheck clean; bundles export; verified on both phones
