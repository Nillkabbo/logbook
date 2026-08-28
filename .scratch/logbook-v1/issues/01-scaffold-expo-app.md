# 01: Scaffold Expo app with tab shell

Parent spec: `.scratch/logbook-v1/spec.md`

**What to build:** The LogBook app launches in Expo Go on a physical phone: a TypeScript Expo project with expo-router showing three tabs — Home, Logs, Settings — with placeholder content, so every later ticket has a running app to build on. The workspace becomes a git repository, and a test runner (Vitest, plain Node) is configured so pure-logic tests can be added from ticket 02 onward.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] `create-expo-app` TypeScript project scaffolded with expo-router; runs in Expo Go on a physical device with no runtime errors
- [ ] Three tabs navigable (Home, Logs, Settings) with placeholder content
- [ ] Workspace is a git repository with an initial commit
- [ ] Vitest installed and a trivial test passes in plain Node (no React Native test machinery)
- [ ] The entire v1 stays compatible with Expo Go — no dev build required
