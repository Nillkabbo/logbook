import { sessionDurationSeconds } from './sessions';
import { localDayKey } from './weeks';
import type { Session } from './types';

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

function localDateTime(date: Date): string {
  return `${localDayKey(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Full CSV export, oldest session first:
 * `date,check_in,check_out,duration_minutes,note` — timestamps in the local
 * timezone; running sessions carry a blank checkout and blank duration.
 */
export function sessionsToCsv(sessions: Session[]): string {
  const lines = ['date,check_in,check_out,duration_minutes,note,category'];
  const ordered = [...sessions].sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());
  for (const session of ordered) {
    const durationMinutes =
      session.checkOut === null
        ? ''
        : String(Math.floor(sessionDurationSeconds(session) / 60));
    lines.push(
      [
        localDayKey(session.checkIn),
        localDateTime(session.checkIn),
        session.checkOut === null ? '' : localDateTime(session.checkOut),
        durationMinutes,
        escapeCsv(session.note),
        escapeCsv(session.category),
      ].join(','),
    );
  }
  return lines.join('\n');
}

// ── Import: the inverse of sessionsToCsv ──────────────────────────────────────

export interface ParsedCsvSession {
  checkIn: Date;
  checkOut: Date | null;
  note: string;
  category: string;
}

export interface CsvImportResult {
  toImport: ParsedCsvSession[];
  duplicates: number;
  skippedRunning: number;
  malformed: number;
}

/** Splits one CSV line, honoring quoted fields with doubled quotes. */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Parses the exported `YYYY-MM-DD HH:MM:SS` local-time format; null when malformed. */
function parseLocalDateTime(raw: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const date = new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Parses an exported CSV back into sessions. Merge semantics: rows whose exact
 * check-in+check-out pair already exists (or appeared earlier in the file) are
 * duplicates; running (blank-checkout) rows are skipped — they are transient
 * by definition; malformed rows are counted, never fatal.
 */
export function parseSessionsCsv(
  csv: string,
  existing: Array<{ checkIn: Date; checkOut: Date | null }>,
): CsvImportResult {
  const lines = csv.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const seen = new Set(
    existing.map((e) => `${e.checkIn.getTime()}|${e.checkOut ? e.checkOut.getTime() : ''}`),
  );
  const result: CsvImportResult = { toImport: [], duplicates: 0, skippedRunning: 0, malformed: 0 };
  for (const line of lines.slice(1)) {
    const fields = splitCsvLine(line);
    if (fields.length < 6) {
      result.malformed++;
      continue;
    }
    const checkIn = parseLocalDateTime(fields[1]);
    const checkoutRaw = fields[2].trim();
    const checkOut = checkoutRaw === '' ? null : parseLocalDateTime(checkoutRaw);
    if (!checkIn || (checkoutRaw !== '' && !checkOut)) {
      result.malformed++;
      continue;
    }
    if (checkOut === null) {
      result.skippedRunning++;
      continue;
    }
    const key = `${checkIn.getTime()}|${checkOut.getTime()}`;
    if (seen.has(key)) {
      result.duplicates++;
      continue;
    }
    seen.add(key);
    result.toImport.push({ checkIn, checkOut, note: fields[4], category: fields[5] });
  }
  return result;
}
