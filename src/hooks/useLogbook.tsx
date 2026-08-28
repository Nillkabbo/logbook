import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, Platform } from 'react-native';

import {
  completeSession,
  deleteSession as deleteSessionInDb,
  withTransaction,
  getSettings,
  insertSession,
  insertBlock,
  deleteBlock as deleteBlockInDb,
  listBlocks,
  listSessions,
  updateSession as updateSessionInDb,
  updateSettings as updateSettingsInDb,
} from '@/db/database';
import { syncNotifications } from '@/notifications/reminders';
import { deleteEvent, editEvent, reminderDecision, type ReminderEvent } from '@/engine/reminders';
import type { WorkBlock } from '@/engine/schedule';
import { parseSessionsCsv, sessionsToCsv, type CsvImportResult } from '@/engine/csv';
import { exportCsvViaShareSheet } from '@/export/csvExport';
import type { Session, SessionPatch, Settings, Weekday } from '@/engine/types';
import { DEFAULT_SETTINGS } from '@/engine/types';

/**
 * App-wide store over the SQLite adapter, shared by every screen via
 * <LogbookProvider>. Loads sessions + settings, exposes actions, and ticks a
 * `now` clock while a session runs (for the live timer).
 */

interface Logbook {
  sessions: Session[];
  settings: Settings;
  now: Date;
  ready: boolean;
  running: Session | null;
  refresh: () => Promise<void>;
  checkIn: () => Promise<void>;
  checkOut: () => Promise<void>;
  saveSession: (id: number, patch: SessionPatch) => Promise<void>;
  removeSession: (id: number) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Runs the CSV export and records the timestamp; false when sharing is unavailable. */
  exportBackup: () => Promise<boolean>;
  blocks: WorkBlock[];
  addBlock: (weekdays: Weekday[], startMinute: number, endMinute: number) => Promise<void>;
  removeBlock: (id: number) => Promise<void>;
  /** Merges an exported CSV into the log; returns the counts for reporting. */
  importCsv: (csv: string) => Promise<CsvImportResult>;
  /** Dev-only: populates ~2 months of sample data. */
  loadSampleData: () => void;
}

const LogbookContext = createContext<Logbook | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSessions, nextSettings, nextBlocks] = await Promise.all([
      listSessions(),
      getSettings(),
      listBlocks(),
    ]);
    setSessions(nextSessions);
    setSettings(nextSettings);
    setBlocks(nextBlocks);
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The theme preference drives the app-wide color scheme; every useColorScheme
  // consumer (tokens, expo-router navigation) follows it. 'unspecified' restores
  // system-following. Web has no Appearance override — the device scheme rules.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Appearance.setColorScheme(
      settings.themePreference === 'system'
        ? 'unspecified'
        : settings.themePreference,
    );
  }, [settings.themePreference]);

  const running = useMemo(() => sessions.find((s) => s.checkOut === null) ?? null, [sessions]);

  // Tick the clock only while a session runs, so Home's timer stays live.
  useEffect(() => {
    if (!running) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // The one sync verb: run a Reminder-lifecycle decision (or re-derive the
  // running session's), then rebuild every OS notification from current truth.
  // Truth is re-read from the db, never from render-scope state — callers run
  // this right after refresh(), when closures still hold the previous render's
  // settings and blocks.
  const syncAfter = useCallback(
    async (event: ReminderEvent | null) => {
      const [freshSettings, freshBlocks] = await Promise.all([getSettings(), listBlocks()]);
      const reminder = event
        ? reminderDecision(event, freshSettings, new Date())
        : running
          ? reminderDecision({ type: 'checked-in', checkIn: running.checkIn }, freshSettings, new Date())
          : null;
      await syncNotifications({
        reminder,
        blocks: freshBlocks,
        language: freshSettings.language,
      });
    },
    [running],
  );

  // Once, after the first load, rebuild every OS notification from current
  // truth — OS triggers persist across launches but reflect stale states.
  const resynced = useRef(false);
  useEffect(() => {
    if (!ready || resynced.current) return;
    resynced.current = true;
    syncAfter(null);
  }, [ready, syncAfter]);

  // DEV-ONLY: 2 months of realistic sample data, explicitly triggered from
  // the Data sub-screen. Remove the button after testing.
  const loadSampleData = useCallback(async () => {
    (async () => {
      // Deterministic pseudo-random for reproducibility
      let seed = 42;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
      };
      const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
      const randInt = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

      const categories = ['Deep work', 'Deep work', 'Deep work', 'Meetings', 'Meetings', 'Admin', 'Writing'];
      const notes: Record<string, string[]> = {
        'Deep work': ['payments refactor', 'auth flow', 'dashboard polish', 'API migration', 'bug hunt', 'perf pass', ''],
        'Meetings': ['sprint planning', '1:1 with Sam', 'design review', 'client call', 'standup', ''],
        'Admin': ['expenses', 'inbox zero', 'timesheet', ''],
        'Writing': ['blog post', 'release notes', 'docs update', ''],
      };
      const now = new Date();
      const days = 60;
      const threeWeeksAgoStart = new Date(now);
      threeWeeksAgoStart.setDate(now.getDate() - now.getDay() - 21);

      for (let d = days; d >= 0; d--) {
        const date = new Date(now);
        date.setDate(date.getDate() - d);
        const dow = date.getDay();

        // Weekends mostly off (85% chance of no sessions)
        if ((dow === 0 || dow === 6) && rand() < 0.85) continue;

        // ~20% of weekdays off too (vacation/sick)
        if (dow >= 1 && dow <= 5 && rand() < 0.2) continue;

        // One full off week 3 weeks ago
        const threeWeeksAgoEnd = new Date(threeWeeksAgoStart);
        threeWeeksAgoEnd.setDate(threeWeeksAgoStart.getDate() + 7);
        if (date >= threeWeeksAgoStart && date < threeWeeksAgoEnd) continue;

        // 1-3 sessions per day
        const sessionCount = randInt(1, 3);
        let cursor = 8 + randInt(0, 60); // start between 8:00 and 9:00

        for (let i = 0; i < sessionCount; i++) {
          const cat = pick(categories);
          const note = pick(notes[cat] ?? ['']);
          const durMin = randInt(45, 240); // 45min to 4h
          const startMin = cursor;
          const endMin = cursor + durMin;
          if (endMin > 17 * 60 + 30) break; // don't go past ~5:30 PM

          const checkIn = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(startMin / 60), startMin % 60);
          const checkOut = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(endMin / 60), endMin % 60);
          await insertSession(checkIn, note, cat);
          cursor = endMin + randInt(30, 90); // lunch/gap
        }
      }

      // Settings: rate + one off week
      const offWeekStart = threeWeeksAgoStart;
      const offKey = `${offWeekStart.getFullYear()}-${String(offWeekStart.getMonth() + 1).padStart(2, '0')}-${String(offWeekStart.getDate()).padStart(2, '0')}`;
      await updateSettingsInDb({ hourlyRate: 30, setupCompleted: true, offWeeks: [offKey] });
      await refresh();
    })();
  }, [refresh]);

  const checkIn = useCallback(async () => {
    const checkInAt = new Date();
    await insertSession(checkInAt);
    await refresh();
    // Sync after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    await syncAfter({ type: 'checked-in', checkIn: checkInAt });
  }, [refresh, syncAfter]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await refresh();
    await syncAfter({ type: 'checked-out' });
  }, [running, refresh, syncAfter]);

  const saveSession = useCallback(
    async (id: number, patch: SessionPatch) => {
      const target = sessions.find((s) => s.id === id);
      if (!target) return;
      await updateSessionInDb(id, patch);
      await refresh();
      await syncAfter(editEvent(target, patch));
    },
    [sessions, refresh, syncAfter],
  );

  const removeSession = useCallback(
    async (id: number) => {
      const target = sessions.find((s) => s.id === id);
      if (!target) return;
      await deleteSessionInDb(id);
      await refresh();
      await syncAfter(deleteEvent(target));
    },
    [sessions, refresh, syncAfter],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      await updateSettingsInDb(patch);
      await refresh();
      // Notification content follows the language; the reminder's fire time
      // follows the threshold — rebuild when either moves.
      if (patch.language !== undefined || patch.reminderThresholdHours !== undefined) {
        await syncAfter(null);
      }
    },
    [refresh, syncAfter],
  );

  const exportBackup = useCallback(async (): Promise<boolean> => {
    const shared = await exportCsvViaShareSheet(sessionsToCsv(sessions));
    if (shared) {
      await updateSettingsInDb({ lastExportAt: Date.now() });
      await refresh();
    }
    return shared;
  }, [sessions, refresh]);

  // Block changes must rebuild the reminder too — a null reminder would
  // silently drop a running session's notification. The single seam handles it.
  const addBlock = useCallback(
    async (weekdays: Weekday[], startMinute: number, endMinute: number) => {
      await insertBlock(weekdays, startMinute, endMinute);
      await refresh();
      await syncAfter(null);
    },
    [refresh, syncAfter],
  );

  const importCsv = useCallback(
    async (csv: string): Promise<CsvImportResult> => {
      const result = parseSessionsCsv(csv, sessions);
      // One transaction: an import lands whole or not at all.
      await withTransaction(async () => {
        for (const row of result.toImport) {
          await insertSession(row.checkIn, row.note, row.category);
        }
      });
      await refresh();
      return result;
    },
    [sessions, refresh],
  );

  const removeBlock = useCallback(
    async (id: number) => {
      await deleteBlockInDb(id);
      await refresh();
      await syncAfter(null);
    },
    [refresh, syncAfter],
  );

  // Memoised: consumers depend on this identity for effects (focus refresh).
  const value = useMemo<Logbook>(
    () => ({
      sessions,
      settings,
      now,
      ready,
      running,
      refresh,
      checkIn,
      checkOut,
      saveSession,
      removeSession,
      saveSettings,
      exportBackup,
      blocks,
      addBlock,
      removeBlock,
      importCsv,
      loadSampleData,
    }),
    [
      sessions,
      settings,
      now,
      ready,
      running,
      refresh,
      checkIn,
      checkOut,
      saveSession,
      removeSession,
      saveSettings,
      exportBackup,
      blocks,
      addBlock,
      removeBlock,
      importCsv,
    ],
  );

  return <LogbookContext.Provider value={value}>{children}</LogbookContext.Provider>;
}

export function useLogbook(): Logbook {
  const logbook = useContext(LogbookContext);
  if (!logbook) {
    throw new Error('useLogbook must be used inside <LogbookProvider>');
  }
  return logbook;
}
