import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  completeSession,
  deleteSession as deleteSessionInDb,
  getSettings,
  insertSession,
  listSessions,
  updateSession as updateSessionInDb,
  updateSettings as updateSettingsInDb,
  type SessionPatch,
} from '@/db/database';
import { cancelCheckInReminder, scheduleCheckInReminder } from '@/notifications/reminders';
import type { Session, Settings } from '@/engine/types';
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
}

const LogbookContext = createContext<Logbook | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSessions, nextSettings] = await Promise.all([listSessions(), getSettings()]);
    setSessions(nextSessions);
    setSettings(nextSettings);
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

  const checkIn = useCallback(async () => {
    const checkInAt = new Date();
    await insertSession(checkInAt);
    await refresh();
    // Schedule after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    await scheduleCheckInReminder(checkInAt, settings.reminderThresholdHours);
  }, [refresh, settings.reminderThresholdHours]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await refresh();
    await cancelCheckInReminder();
  }, [running, refresh]);

  const saveSession = useCallback(
    async (id: number, patch: SessionPatch) => {
      const target = sessions.find((s) => s.id === id);
      await updateSessionInDb(id, patch);
      // An edit that completes a running session retires its reminder.
      if (target?.checkOut === null && patch.checkOut !== null) {
        await cancelCheckInReminder();
      }
      await refresh();
    },
    [sessions, refresh],
  );

  const removeSession = useCallback(
    async (id: number) => {
      const target = sessions.find((s) => s.id === id);
      await deleteSessionInDb(id);
      // Deleting a running session cancels the check-in, reminder included.
      if (target?.checkOut === null) {
        await cancelCheckInReminder();
      }
      await refresh();
    },
    [sessions, refresh],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      await updateSettingsInDb(patch);
      await refresh();
    },
    [refresh],
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
