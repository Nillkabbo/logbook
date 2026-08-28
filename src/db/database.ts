import * as SQLite from 'expo-sqlite';

import {
  DEFAULT_SETTINGS,
  type Session,
  type SessionPatch,
  type Settings,
  type Weekday,
} from '@/engine/types';

/**
 * SQLite adapter for LogBook. The only module that talks to expo-sqlite; everything
 * above it works with plain `Session`/`Settings` objects. Timestamps are stored as
 * UTC ISO-8601 strings (`check_out_utc` NULL = running session).
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= open();
  return dbPromise;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('logbook.db');
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_in_utc TEXT NOT NULL,
      check_out_utc TEXT,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      week_start_day INTEGER NOT NULL DEFAULT 0,
      weekly_target_hours REAL NOT NULL DEFAULT 40,
      reminder_threshold_hours REAL NOT NULL DEFAULT 10,
      setup_completed INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);
  return db;
}

interface SessionRow {
  id: number;
  check_in_utc: string;
  check_out_utc: string | null;
  note: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    checkIn: new Date(row.check_in_utc),
    checkOut: row.check_out_utc === null ? null : new Date(row.check_out_utc),
    note: row.note,
  };
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT id, check_in_utc, check_out_utc, note FROM sessions ORDER BY check_in_utc ASC',
  );
  return rows.map(rowToSession);
}

export async function insertSession(checkIn: Date, note = ''): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sessions (check_in_utc, check_out_utc, note) VALUES (?, NULL, ?)',
    checkIn.toISOString(),
    note,
  );
  return result.lastInsertRowId;
}

export async function completeSession(id: number, checkOut: Date): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE sessions SET check_out_utc = ? WHERE id = ?', checkOut.toISOString(), id);
}

export async function updateSession(id: number, patch: SessionPatch): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE sessions SET check_in_utc = ?, check_out_utc = ?, note = ? WHERE id = ?',
    patch.checkIn.toISOString(),
    patch.checkOut === null ? null : patch.checkOut.toISOString(),
    patch.note,
    id,
  );
}

export async function deleteSession(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM sessions WHERE id = ?', id);
}

export async function getSettings(): Promise<Settings> {
  const db = await getDb();
  const row = await db.getFirstAsync<{
    week_start_day: number;
    weekly_target_hours: number;
    reminder_threshold_hours: number;
    setup_completed: number;
  }>('SELECT week_start_day, weekly_target_hours, reminder_threshold_hours, setup_completed FROM settings WHERE id = 1');
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return {
    weekStartDay: (row.week_start_day % 7) as Weekday,
    weeklyTargetHours: row.weekly_target_hours,
    reminderThresholdHours: row.reminder_threshold_hours,
    setupCompleted: row.setup_completed === 1,
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDb();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.runAsync(
    `UPDATE settings SET week_start_day = ?, weekly_target_hours = ?, reminder_threshold_hours = ?, setup_completed = ? WHERE id = 1`,
    next.weekStartDay,
    next.weeklyTargetHours,
    next.reminderThresholdHours,
    next.setupCompleted ? 1 : 0,
  );
}
