import * as SQLite from 'expo-sqlite';

import {
  DEFAULT_SETTINGS,
  type Session,
  type SessionPatch,
  type Settings,
  type Weekday,
} from '@/engine/types';
import type { WorkBlock } from '@/engine/schedule';

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
      category TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      week_start_day INTEGER NOT NULL DEFAULT 0,
      weekly_target_hours REAL NOT NULL DEFAULT 40,
      reminder_threshold_hours REAL NOT NULL DEFAULT 10,
      hourly_rate REAL NOT NULL DEFAULT 0,
      last_export_at INTEGER,
      off_weeks TEXT NOT NULL DEFAULT '',
      pay_period_type TEXT NOT NULL DEFAULT 'none',
      pay_period_anchor TEXT,
      language TEXT NOT NULL DEFAULT 'system',
      theme_preference TEXT NOT NULL DEFAULT 'system',
      setup_completed INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekdays TEXT NOT NULL,
      start_minute INTEGER NOT NULL,
      end_minute INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rate_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rate REAL NOT NULL,
      effective_from_utc TEXT NOT NULL
    );
    INSERT OR IGNORE INTO settings (id) VALUES (1);
  `);
  // Migrations for databases created before a column existed.
  await addColumnIfMissing(db, 'sessions', 'category', "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'settings', 'hourly_rate', 'REAL NOT NULL DEFAULT 0');
  await addColumnIfMissing(db, 'settings', 'last_export_at', 'INTEGER');
  await addColumnIfMissing(db, 'settings', 'off_weeks', "TEXT NOT NULL DEFAULT ''");
  await addColumnIfMissing(db, 'settings', 'pay_period_type', "TEXT NOT NULL DEFAULT 'none'");
  await addColumnIfMissing(db, 'settings', 'pay_period_anchor', 'TEXT');
  await addColumnIfMissing(db, 'settings', 'theme_preference', "TEXT NOT NULL DEFAULT 'system'");
  await addColumnIfMissing(db, 'settings', 'language', "TEXT NOT NULL DEFAULT 'system'");
  // Migrate a flat hourlyRate into the rate history (one record, effective from epoch)
  const rateRows = await db.getAllAsync<{ count: number }>('SELECT COUNT(*) as count FROM rate_history');
  if ((rateRows[0]?.count ?? 0) === 0) {
    const settingsRow = await db.getFirstAsync<{ hourly_rate: number }>('SELECT hourly_rate FROM settings WHERE id = 1');
    if (settingsRow && settingsRow.hourly_rate > 0) {
      await db.runAsync(
        'INSERT INTO rate_history (rate, effective_from_utc) VALUES (?, ?)',
        settingsRow.hourly_rate,
        '2000-01-01T00:00:00.000Z', // covers all history
      );
    }
  }
  return db;
}

async function addColumnIfMissing(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

interface SessionRow {
  id: number;
  check_in_utc: string;
  check_out_utc: string | null;
  note: string;
  category: string;
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    checkIn: new Date(row.check_in_utc),
    checkOut: row.check_out_utc === null ? null : new Date(row.check_out_utc),
    note: row.note,
    category: row.category,
  };
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SessionRow>(
    'SELECT id, check_in_utc, check_out_utc, note, category FROM sessions ORDER BY check_in_utc ASC',
  );
  return rows.map(rowToSession);
}

/** Runs `task` inside one transaction — a failure rolls the whole batch back. */
export async function withTransaction(task: () => Promise<void>): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(task);
}

export async function insertSession(checkIn: Date, note = '', category = ''): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sessions (check_in_utc, check_out_utc, note, category) VALUES (?, NULL, ?, ?)',
    checkIn.toISOString(),
    note,
    category,
  );
  return result.lastInsertRowId;
}

/** Inserts a session with a known checkout (quick-add, CSV import). One atomic statement. */
export async function insertCompletedSession(
  checkIn: Date,
  checkOut: Date,
  note = '',
  category = '',
): Promise<number> {
  const db = await getDb();
  const result = await db.runAsync(
    'INSERT INTO sessions (check_in_utc, check_out_utc, note, category) VALUES (?, ?, ?, ?)',
    checkIn.toISOString(),
    checkOut.toISOString(),
    note,
    category,
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
    'UPDATE sessions SET check_in_utc = ?, check_out_utc = ?, note = ?, category = ? WHERE id = ?',
    patch.checkIn.toISOString(),
    patch.checkOut === null ? null : patch.checkOut.toISOString(),
    patch.note,
    patch.category,
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
    hourly_rate: number;
    last_export_at: number | null;
    off_weeks: string;
    pay_period_type: string;
    pay_period_anchor: string | null;
    language: string;
    theme_preference: string;
    setup_completed: number;
  }>('SELECT week_start_day, weekly_target_hours, reminder_threshold_hours, hourly_rate, last_export_at, off_weeks, pay_period_type, pay_period_anchor, language, theme_preference, setup_completed FROM settings WHERE id = 1');
  if (!row) {
    return DEFAULT_SETTINGS;
  }
  return {
    weekStartDay: (row.week_start_day % 7) as Weekday,
    weeklyTargetHours: row.weekly_target_hours,
    reminderThresholdHours: row.reminder_threshold_hours,
    hourlyRate: row.hourly_rate,
    lastExportAt: row.last_export_at ?? null,
    offWeeks: row.off_weeks ? row.off_weeks.split(',').filter(Boolean) : [],
    payPeriodType: row.pay_period_type === 'weekly' || row.pay_period_type === 'biweekly' ? row.pay_period_type : 'none',
    payPeriodAnchor: row.pay_period_anchor ?? null,
    language: row.language === 'en' || row.language === 'bn' ? row.language : 'system',
    themePreference: row.theme_preference === 'light' || row.theme_preference === 'dark' ? row.theme_preference : 'system',
    setupCompleted: row.setup_completed === 1,
  };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  const db = await getDb();
  const current = await getSettings();
  const next = { ...current, ...patch };
  await db.runAsync(
    `UPDATE settings SET week_start_day = ?, weekly_target_hours = ?, reminder_threshold_hours = ?, hourly_rate = ?, last_export_at = ?, off_weeks = ?, pay_period_type = ?, pay_period_anchor = ?, language = ?, theme_preference = ?, setup_completed = ? WHERE id = 1`,
    next.weekStartDay,
    next.weeklyTargetHours,
    next.reminderThresholdHours,
    next.hourlyRate,
    next.lastExportAt,
    next.offWeeks.join(','),
    next.payPeriodType,
    next.payPeriodAnchor,
    next.language,
    next.themePreference,
    next.setupCompleted ? 1 : 0,
  );
}

interface BlockRow {
  id: number;
  weekdays: string;
  start_minute: number;
  end_minute: number;
}

function rowToBlock(row: BlockRow): WorkBlock {
  return {
    id: row.id,
    weekdays: row.weekdays.split(',').map((n) => (Number(n) % 7) as Weekday),
    startMinute: row.start_minute,
    endMinute: row.end_minute,
  };
}

export async function listBlocks(): Promise<WorkBlock[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<BlockRow>(
    'SELECT id, weekdays, start_minute, end_minute FROM blocks ORDER BY id ASC',
  );
  return rows.map(rowToBlock);
}

export async function insertBlock(weekdays: Weekday[], startMinute: number, endMinute: number): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO blocks (weekdays, start_minute, end_minute) VALUES (?, ?, ?)',
    weekdays.join(','),
    startMinute,
    endMinute,
  );
}

export async function deleteBlock(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM blocks WHERE id = ?', id);
}

import type { RateRecord } from '@/engine/money';

interface RateRow {
  id: number;
  rate: number;
  effective_from_utc: string;
}

function rowToRate(row: RateRow): RateRecord {
  return { id: row.id, rate: row.rate, effectiveFrom: new Date(row.effective_from_utc) };
}

export async function listRateHistory(): Promise<RateRecord[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<RateRow>(
    'SELECT id, rate, effective_from_utc FROM rate_history ORDER BY effective_from_utc ASC',
  );
  return rows.map(rowToRate);
}

export async function insertRate(rate: number, effectiveFrom: Date): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'INSERT INTO rate_history (rate, effective_from_utc) VALUES (?, ?)',
    rate,
    effectiveFrom.toISOString(),
  );
}

export async function deleteRate(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM rate_history WHERE id = ?', id);
}
