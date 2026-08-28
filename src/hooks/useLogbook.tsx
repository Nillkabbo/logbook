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
} from '@/db/database';
import { applyReminderDecision } from '@/notifications/reminders';
import { reminderDecision } from '@/engine/reminders';
import type { Session, SessionPatch, Settings } from '@/engine/types';
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
    // Apply after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    await applyReminderDecision(
      reminderDecision({ type: 'checked-in', checkIn: checkInAt }, settings, new Date()),
    );
  }, [refresh, settings]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await refresh();
    await applyReminderDecision(reminderDecision({ type: 'checked-out' }, settings, new Date()));
  }, [running, refresh, settings]);

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
      await applyReminderDecision(decision);
    },
    [sessions, refresh, settings],
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
      await applyReminderDecision(decision);
    },
    [sessions, refresh, settings],
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
