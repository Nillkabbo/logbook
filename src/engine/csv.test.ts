import { describe, expect, it } from 'vitest';

import { sessionsToCsv } from './csv';
import type { Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number, s = 0) =>
  new Date(y, mo, d, h, mi, s);

const session = (id: number, checkIn: Date, checkOut: Date | null, note = ''): Session => ({
  id,
  checkIn,
  checkOut,
  note,
});

describe('sessionsToCsv', () => {
  it('writes a header plus one row per session with local timestamps', () => {
    // Aug 27 2026 09:00 – 11:47 local = 2h 47m = 167 minutes
    const csv = sessionsToCsv([
      session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47), 'deep work'),
    ]);
    expect(csv.split('\n')).toEqual([
      'date,check_in,check_out,duration_minutes,note',
      '2026-08-27,2026-08-27 09:00:00,2026-08-27 11:47:00,167,deep work',
    ]);
  });

  it('running sessions export blank checkout and blank duration', () => {
    const csv = sessionsToCsv([session(2, at(2026, 7, 27, 13, 5), null)]);
    expect(csv.split('\n')[1]).toBe('2026-08-27,2026-08-27 13:05:00,,,');
  });

  it('durations floor to whole minutes', () => {
    // 2h 47m 30s → 167
    const csv = sessionsToCsv([
      session(3, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47, 30)),
    ]);
    expect(csv.split('\n')[1]).toContain(',167,');
  });

  it('quotes notes containing commas and escapes double quotes', () => {
    const csv = sessionsToCsv([
      session(4, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0), 'Fix "the" bug, part 1'),
    ]);
    expect(csv.split('\n')[1]).toBe(
      '2026-08-27,2026-08-27 09:00:00,2026-08-27 10:00:00,60,"Fix ""the"" bug, part 1"',
    );
  });

  it('writes sessions oldest first', () => {
    const csv = sessionsToCsv([
      session(2, at(2026, 7, 27, 10, 0), at(2026, 7, 27, 11, 0)),
      session(1, at(2026, 7, 26, 9, 0), at(2026, 7, 26, 10, 0)),
    ]);
    const rows = csv.split('\n');
    expect(rows[1]).toContain('2026-08-26');
    expect(rows[2]).toContain('2026-08-27');
  });
});
