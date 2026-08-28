import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  completeSession,
  deleteSession as deleteSessionInDb,
  getSettings,
  insertSession,
  listSessions,
  updateSession as updateSessionInDb,
  updateSettings as updateSettingsInDb,
} from '@/db/database';
import type { Session, Settings } from '@/engine/types';
import { DEFAULT_SETTINGS } from '@/engine/types';
import type { SessionPatch } from '@/db/database';
import { cancelCheckInReminder, scheduleCheckInReminder } from '@/notifications/reminders';

/**
 * App-side store over the SQLite adapter: loads sessions + settings, exposes
 * actions, and keeps a ticking `now` while a session is running (for the live timer).
 */
export function useLogbook() {
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
    await scheduleCheckInReminder(checkInAt, settings.reminderThresholdHours);
    await refresh();
  }, [refresh, settings.reminderThresholdHours]);

  const checkOut = useCallback(async () => {
    if (!running) return;
    await completeSession(running.id, new Date());
    await cancelCheckInReminder();
    await refresh();
  }, [running, refresh]);

  const saveSession = useCallback(
    async (id: number, patch: SessionPatch) => {
      await updateSessionInDb(id, patch);
      await refresh();
    },
    [refresh],
  );

  const removeSession = useCallback(
    async (id: number) => {
      await deleteSessionInDb(id);
      await refresh();
    },
    [refresh],
  );

  const saveSettings = useCallback(
    async (patch: Partial<Settings>) => {
      await updateSettingsInDb(patch);
      await refresh();
    },
    [refresh],
  );

  return {
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
  };
}
