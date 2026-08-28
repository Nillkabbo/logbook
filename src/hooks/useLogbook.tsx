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
import {
  applyReminderDecision,
  resyncAllNotifications,
  syncBlockNotifications,
} from '@/notifications/reminders';
import { reminderDecision } from '@/engine/reminders';
import type { WorkBlock } from '@/engine/schedule';
import { sessionsToCsv } from '@/engine/csv';
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
  // truth — in-memory ids died with the previous launch, and stale triggers
  // (deleted blocks, a checked-out session) would otherwise fire forever.
  const resynced = useRef(false);
  useEffect(() => {
    if (!ready || resynced.current) return;
    resynced.current = true;
    resyncAllNotifications(running, settings, blocks);
  }, [ready, running, settings, blocks]);

  const checkIn = useCallback(async () => {
    const checkInAt = new Date();
    await insertSession(checkInAt);
    await refresh();
    // Apply after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    await applyReminderDecision(
      reminderDecision({ type: 'checked-in', checkIn: checkInAt }, settings, new Date()),
      blocks,
    );
  }, [refresh, settings, blocks]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await refresh();
    await applyReminderDecision(
      reminderDecision({ type: 'checked-out' }, settings, new Date()),
      blocks,
    );
  }, [running, refresh, settings, blocks]);

  const saveSession = useCallback(
    async (id: number, patch: SessionPatch) => {
      const target = sessions.find((s) => s.id === id);
      await updateSessionInDb(id, patch);
      await refresh();
      const decision = reminderDecision(
        {
          type: 'edited',
          wasRunning: target?.checkOut === null,
          nowRunning: patch.checkOut === null,
          checkIn: patch.checkIn,
        },
        settings,
        new Date(),
      );
      await applyReminderDecision(decision, blocks);
    },
    [sessions, refresh, settings, blocks],
  );

  const removeSession = useCallback(
    async (id: number) => {
      const target = sessions.find((s) => s.id === id);
      await deleteSessionInDb(id);
      await refresh();
      const decision = reminderDecision(
        { type: 'deleted', wasRunning: target?.checkOut === null },
        settings,
        new Date(),
      );
      await applyReminderDecision(decision, blocks);
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

  const addBlock = useCallback(
    async (weekdays: Weekday[], startMinute: number, endMinute: number) => {
      await insertBlock(weekdays, startMinute, endMinute);
      const nextBlocks = await listBlocks();
      setBlocks(nextBlocks);
      await syncBlockNotifications(nextBlocks);
    },
    [],
  );

  const removeBlock = useCallback(async (id: number) => {
    await deleteBlockInDb(id);
    const nextBlocks = await listBlocks();
    setBlocks(nextBlocks);
    await syncBlockNotifications(nextBlocks);
  }, []);

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
