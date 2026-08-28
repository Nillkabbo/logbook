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

import {
  completeSession,
  deleteSession as deleteSessionInDb,
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
import { deleteEvent, editEvent, reminderDecision } from '@/engine/reminders';
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

  const running = useMemo(() => sessions.find((s) => s.checkOut === null) ?? null, [sessions]);

  // Tick the clock only while a session runs, so Home's timer stays live.
  useEffect(() => {
    if (!running) return;
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // Once, after the first load, rebuild every OS notification from current
  // truth — OS triggers persist across launches but reflect stale states.
  const resynced = useRef(false);
  useEffect(() => {
    if (!ready || resynced.current) return;
    resynced.current = true;
    const reminder = running
      ? reminderDecision({ type: 'checked-in', checkIn: running.checkIn }, settings, new Date())
      : null;
    syncNotifications({ reminder, blocks, language: settings.language });
  }, [ready, running, settings, blocks]);

  const checkIn = useCallback(async () => {
    const checkInAt = new Date();
    await insertSession(checkInAt);
    await refresh();
    // Sync after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    const reminder = reminderDecision({ type: 'checked-in', checkIn: checkInAt }, settings, new Date());
    await syncNotifications({ reminder, blocks, language: settings.language });
  }, [refresh, settings, blocks]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await refresh();
    const reminder = reminderDecision({ type: 'checked-out' }, settings, new Date());
    await syncNotifications({ reminder, blocks, language: settings.language });
  }, [running, refresh, settings, blocks]);

  const saveSession = useCallback(
    async (id: number, patch: SessionPatch) => {
      const target = sessions.find((s) => s.id === id);
      if (!target) return;
      await updateSessionInDb(id, patch);
      await refresh();
      const reminder = reminderDecision(editEvent(target, patch), settings, new Date());
      await syncNotifications({ reminder, blocks, language: settings.language });
    },
    [sessions, refresh, settings, blocks],
  );

  const removeSession = useCallback(
    async (id: number) => {
      const target = sessions.find((s) => s.id === id);
      if (!target) return;
      await deleteSessionInDb(id);
      await refresh();
      const reminder = reminderDecision(deleteEvent(target), settings, new Date());
      await syncNotifications({ reminder, blocks, language: settings.language });
    },
    [sessions, refresh, settings, blocks],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      await updateSettingsInDb(patch);
      await refresh();
    },
    [refresh],
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
  // silently drop a running session's notification.
  const currentReminder = useCallback(() => {
    if (!running) return null;
    return reminderDecision({ type: 'checked-in', checkIn: running.checkIn }, settings, new Date());
  }, [running, settings]);

  const addBlock = useCallback(
    async (weekdays: Weekday[], startMinute: number, endMinute: number) => {
      await insertBlock(weekdays, startMinute, endMinute);
      await refresh();
      await syncNotifications({ reminder: currentReminder(), blocks: await listBlocks(), language: settings.language });
    },
    [refresh, currentReminder],
  );

  const importCsv = useCallback(
    async (csv: string): Promise<CsvImportResult> => {
      const result = parseSessionsCsv(csv, sessions);
      for (const row of result.toImport) {
        await insertSession(row.checkIn, row.note, row.category);
      }
      await refresh();
      return result;
    },
    [sessions, refresh],
  );

  const removeBlock = useCallback(
    async (id: number) => {
      await deleteBlockInDb(id);
      await refresh();
      await syncNotifications({ reminder: currentReminder(), blocks: await listBlocks(), language: settings.language });
    },
    [refresh, currentReminder],
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
