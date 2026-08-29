# Research: check in from outside the app (2026-08-29)

Status: decision-ready, not built

Every hardware-integration path requires leaving Expo Go for a dev build. Migration is cheap for LogBook (no custom native code, no EAS required — `npx expo run:ios` local builds suffice; ~half a day).

- **Path A — `expo-quick-actions`** (long-press icon → app flashes open, action fires; Android shortcut pinnable as a one-tap tile). Effort **S**, both platforms, config-plugin only. Community lib (Evan Bacon); verify against SDK 57.
- **Path B — `expo-widgets`** (first-party, alpha, iOS-only): true in-widget toggle + Live Activities, but widget JS runs in a separate extension with its own state — fights LogBook's one-running-session-in-SQLite invariant (needs reconciliation via `addUserInteractionListener`, delivery timing undocumented). Effort **M–L**. Wait for non-alpha.
- **Path C — `react-native-android-widget`**: headless JS in the app process writes expo-sqlite directly — invariant-safe, true no-launch toggling on Android. Effort **M**.
- **Path D — hand-written native**: full fidelity (App Intents, shared App-Group SQLite) but weeks of native work. Effort **L**.

**Recommendation**: Path A now; add C if no-launch toggling matters; hold B until it sheds alpha and documents interaction delivery.

Source: background research agent, 2026-08-29 (24 sources: Expo docs/blog, react-native-android-widget docs, Apple WidgetKit docs).
