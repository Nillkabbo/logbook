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
  insertCompletedSession,
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
import type { RateRecord } from '@/engine/money';
import { listRateHistory, insertRate, deleteRate } from '@/db/database';
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
  /** Quick-adds a past session ("forgot to clock in"); never fires a checked-in reminder. */
  createSession: (patch: SessionPatch) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<void>;
  /** Runs the CSV export and records the timestamp; false when sharing is unavailable. */
  exportBackup: () => Promise<boolean>;
  blocks: WorkBlock[];
  addBlock: (weekdays: Weekday[], startMinute: number, endMinute: number) => Promise<void>;
  removeBlock: (id: number) => Promise<void>;
  /** Merges an exported CSV into the log; returns the counts for reporting. */
  importCsv: (csv: string) => Promise<CsvImportResult>;
  /** Dev-only: populates sample data; returns the count loaded. weeks=8 for 2mo, 52 for 1yr. */
  loadSampleData: (weeks?: number) => Promise<number>;
  /** Rate history, oldest first. */
  rateHistory: RateRecord[];
  /** Adds a rate change (replaces any record with the same effective date). */
  addRateChange: (rate: number, effectiveFrom: Date) => Promise<void>;
  /** Removes a rate record. */
  removeRate: (id: number) => Promise<void>;
  /** Sets the rate effective today; 0 clears every record (earnings hidden). */
  setCurrentRate: (rate: number) => Promise<void>;
  /** Deletes all sessions, blocks, and settings (after confirmation). */
  clearAllData: () => Promise<void>;
}

const LogbookContext = createContext<Logbook | null>(null);

export function LogbookProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [blocks, setBlocks] = useState<WorkBlock[]>([]);
  const [rateHistory, setRateHistory] = useState<RateRecord[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const [nextSessions, nextSettings, nextBlocks, nextRates] = await Promise.all([
      listSessions(),
      getSettings(),
      listBlocks(),
      listRateHistory(),
    ]);
    setSessions(nextSessions);
    setSettings(nextSettings);
    setBlocks(nextBlocks);
    setRateHistory(nextRates);
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
  // the Data sub-screen. Clears existing data first so re-loading never
  // duplicates. Remove after testing.
  const loadSampleData = useCallback(async (weeks = 8) => {
    {
      // Clear existing data so re-loading is idempotent
      for (const session of await listSessions()) {
        await deleteSessionInDb(session.id);
      }
      for (const block of await listBlocks()) {
        await deleteBlockInDb(block.id);
      }
      for (const record of await listRateHistory()) {
        await deleteRate(record.id);
      }

      // Deterministic PRNG (Lehmer/Park-Miller)
      let prng = 12345;
      const rand = () => {
        prng = (prng * 48271) % 2147483647;
        return prng / 2147483647;
      };
      const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
      const randInt = (min: number, max: number) =>
        min + Math.floor(rand() * (max - min + 1));

      const CATEGORIES = ['Deep work', 'Deep work', 'Meetings', 'Meetings', 'Admin', 'Writing'];
      const NOTES: Record<string, string[]> = {
        'Deep work': ['payments refactor', 'auth flow', 'dashboard polish', 'API migration', 'bug hunt'],
        'Meetings': ['sprint planning', '1:1 with Sam', 'design review', 'client call', 'standup'],
        'Admin': ['expenses', 'inbox zero', 'timesheet'],
        'Writing': ['blog post', 'release notes', 'docs update'],
      };

      const now = new Date();

      // ── Work blocks ──
      await insertBlock([1, 2, 3, 4, 5], 540, 1020); // Mon–Fri 9:00–17:00
      await insertBlock([6], 600, 840); // Sat 10:00–14:00

      // ── Rate history: $28 from Jan, $30 from Apr, $32.50 from Aug ──
      await insertRate(28, new Date(now.getFullYear(), 0, 1));
      await insertRate(30, new Date(now.getFullYear(), 3, 1));
      await insertRate(32.5, new Date(now.getFullYear(), 7, 1));

      // ── Compute week boundaries relative to this week's Sunday ──
      const thisSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());

      const weekStart = (weeksAgo: number) => {
        const d = new Date(thisSunday);
        d.setDate(thisSunday.getDate() - weeksAgo * 7);
        return d;
      };
      const weekEnd = (weeksAgo: number) => {
        const d = new Date(thisSunday);
        d.setDate(thisSunday.getDate() - weeksAgo * 7 + 7);
        return d;
      };

      // Off week = 2 weeks ago; over-target = 3 and 5 weeks ago
      const OFF_WEEK = 2;
      const OVER_WEEKS = [3, 5];

      let count = 0;

      // ── Generate sessions ──
      for (let weeksAgo = weeks; weeksAgo >= 0; weeksAgo--) {
        const wStart = weekStart(weeksAgo);
        const wEnd = weekEnd(weeksAgo);
        const isOff = weeksAgo === OFF_WEEK;
        const isOver = OVER_WEEKS.includes(weeksAgo);

        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
          if (isOff) break; // skip the entire off week

          const date = new Date(wStart);
          date.setDate(wStart.getDate() + dayOffset);
          const dow = date.getDay();

          // Sunday: never
          if (dow === 0) continue;
          // Saturday: 20% chance
          if (dow === 6 && rand() > 0.2) continue;
          // Weekday: 15% skip (not in over-target weeks)
          if (dow >= 1 && dow <= 5 && rand() < 0.15 && !isOver) continue;
          // Today (weeksAgo=0, dayOffset=today's dow): skip if before now
          if (weeksAgo === 0 && date > now) continue;

          // 1-3 sessions per day
          const sessionsToday = isOver ? randInt(2, 3) : randInt(1, 3);
          // Over-target weeks get longer sessions
          const baseDur = isOver ? randInt(180, 300) : randInt(60, 240);

          // Start times: morning ~8:30, midday ~12:00, afternoon ~14:30
          const startHours = [8.5, 12, 14.5];

          for (let i = 0; i < sessionsToday; i++) {
            const cat = pick(CATEGORIES);
            const note = rand() < 0.35 ? pick(NOTES[cat] ?? ['']) : '';
            const startH = startHours[i] + rand() * 0.5; // up to 30min jitter
            const durMin = baseDur + randInt(-30, 30);
            const startTotalMin = Math.floor(startH * 60);
            const endTotalMin = Math.min(startTotalMin + durMin, 17 * 60 + 30);
            if (endTotalMin - startTotalMin < 30) continue;

            const checkIn = new Date(
              date.getFullYear(), date.getMonth(), date.getDate(),
              Math.floor(startTotalMin / 60), startTotalMin % 60,
            );
            const checkOut = new Date(
              date.getFullYear(), date.getMonth(), date.getDate(),
              Math.floor(endTotalMin / 60), endTotalMin % 60,
            );
            const id = await insertSession(checkIn, note, cat);
            await completeSession(id, checkOut);
            count++;
          }
        }
      }

      // ── Running session: started 45 minutes ago ──
      const runningStart = new Date(now.getTime() - 45 * 60 * 1000);
      await insertSession(runningStart, '', '');
      count++;

      // ── Settings ──
      const offSunday = weekStart(OFF_WEEK);
      const offKey = `${offSunday.getFullYear()}-${String(offSunday.getMonth() + 1).padStart(2, '0')}-${String(offSunday.getDate()).padStart(2, '0')}`;
      await updateSettingsInDb({ hourlyRate: 32.5, offWeeks: [offKey] });

      await refresh();
      return count;
    };
  }, [refresh]);

  const clearAllData = useCallback(async () => {
    for (const session of await listSessions()) {
      await deleteSessionInDb(session.id);
    }
    for (const block of await listBlocks()) {
      await deleteBlockInDb(block.id);
    }
    for (const record of await listRateHistory()) {
      await deleteRate(record.id);
    }
    await updateSettingsInDb({
      hourlyRate: 0,
      lastExportAt: null,
      offWeeks: [],
    });
    await refresh();
  }, [refresh]);

  const checkIn = useCallback(async () => {
    // The app supports one running session — the UI disables the toggle, but
    // the store is the invariant's last line of defense.
    if (running) return;
    const checkInAt = new Date();
    await insertSession(checkInAt);
    await refresh();
    // Sync after refresh: the OS permission prompt must never delay the
    // button/timer flipping to the running state.
    await syncAfter({ type: 'checked-in', checkIn: checkInAt });
  }, [running, refresh, syncAfter]);

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
    const shared = await exportCsvViaShareSheet(sessionsToCsv(sessions, rateHistory));
    if (shared) {
      await updateSettingsInDb({ lastExportAt: Date.now() });
      await refresh();
    }
    return shared;
  }, [sessions, rateHistory, refresh]);

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
      // One transaction: an import lands whole or not at all. Every row is
      // completed (running rows are skipped by the parser), so an import can
      // never introduce a running session.
      await withTransaction(async () => {
        for (const row of result.toImport) {
          await insertCompletedSession(row.checkIn, row.checkOut, row.note, row.category);
        }
      });
      await refresh();
      return result;
    },
    [sessions, refresh],
  );

  /** Quick-adds a session ("forgot to clock in"). Never fires a checked-in reminder. */
  const createSession = useCallback(
    async (patch: SessionPatch) => {
      await withTransaction(async () => {
        const id = await insertSession(patch.checkIn, patch.note, patch.category);
        if (patch.checkOut !== null) {
          await completeSession(id, patch.checkOut);
        }
      });
      await refresh();
      // A backfilled completed session gets no reminder of its own; the null
      // epilogue re-derives the current running session's reminder from truth.
      await syncAfter(patch.checkOut === null ? { type: 'checked-in', checkIn: patch.checkIn } : null);
    },
    [refresh, syncAfter],
  );

  const removeBlock = useCallback(
    async (id: number) => {
      await deleteBlockInDb(id);
      await refresh();
      await syncAfter(null);
    },
    [refresh, syncAfter],
  );

  const addRateChange = useCallback(async (rate: number, effectiveFrom: Date) => {
    // One record per effective date — re-adding the same date replaces it.
    const before = await listRateHistory();
    for (const record of before) {
      if (record.effectiveFrom.getTime() === effectiveFrom.getTime()) {
        await deleteRate(record.id);
      }
    }
    await insertRate(rate, effectiveFrom);
    // settings.hourlyRate mirrors the latest-effective record (ties → newest insert).
    const after = await listRateHistory();
    const latest = after.reduce((a, b) =>
      b.effectiveFrom.getTime() >= a.effectiveFrom.getTime() ? b : a,
    );
    await updateSettingsInDb({ hourlyRate: latest.rate });
    await refresh();
  }, [refresh]);

  const removeRate = useCallback(async (id: number) => {
    await deleteRate(id);
    const all = await listRateHistory();
    const latest = all[all.length - 1];
    await updateSettingsInDb({ hourlyRate: latest?.rate ?? 0 });
    await refresh();
  }, [refresh]);

  /** Sets the rate effective today — the "current rate" input's commit path. */
  const setCurrentRate = useCallback(
    async (rate: number) => {
      if (rate > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        await addRateChange(rate, today);
        return;
      }
      // Unset: clear every record so earnings hide everywhere (matches the old flat-unset).
      for (const record of await listRateHistory()) {
        await deleteRate(record.id);
      }
      await updateSettingsInDb({ hourlyRate: 0 });
      await refresh();
    },
    [addRateChange, refresh],
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
      createSession,
      saveSettings,
      exportBackup,
      blocks,
      addBlock,
      removeBlock,
      importCsv,
      loadSampleData,
      clearAllData,
      rateHistory,
      addRateChange,
      removeRate,
      setCurrentRate,
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
      createSession,
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
