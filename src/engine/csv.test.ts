import { describe, expect, it } from 'vitest';

import { at, session } from './test-support';

import { parseSessionsCsv, sessionsToCsv } from './csv';

describe('sessionsToCsv', () => {
  it('writes a header plus one row per session with local timestamps', () => {
    // Aug 27 2026 09:00 – 11:47 local = 2h 47m = 167 minutes
    const csv = sessionsToCsv([
      session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47), 'deep work'),
    ]);
    expect(csv.split('\n')).toEqual([
      'date,check_in,check_out,duration_minutes,note,category,rate_applied,earnings',
      '2026-08-27,2026-08-27 09:00:00,2026-08-27 11:47:00,167,deep work,,,',
    ]);
  });

  it('running sessions export blank checkout, duration, and may carry a category', () => {
    const csv = sessionsToCsv([session(2, at(2026, 7, 27, 13, 5), null, '', 'side gig')]);
    expect(csv.split('\n')[1]).toBe('2026-08-27,2026-08-27 13:05:00,,,,side gig,,');
  });

  it('durations floor to whole minutes', () => {
    // 2h 47m 30s → 167
    const csv = sessionsToCsv([
      session(3, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47, 30)),
    ]);
    expect(csv.split('\n')[1]).toContain(',167,');
  });

  it('quotes notes and categories containing commas, escapes double quotes', () => {
    const csv = sessionsToCsv([
      session(4, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0), 'Fix "the" bug, part 1', 'side, gig'),
    ]);
    expect(csv.split('\n')[1]).toBe(
      '2026-08-27,2026-08-27 09:00:00,2026-08-27 10:00:00,60,"Fix ""the"" bug, part 1","side, gig",,',
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

describe('sessionsToCsv earnings columns (ADR-0002)', () => {
  const HISTORY = [
    { id: 1, rate: 25, effectiveFrom: at(2026, 0, 1, 0, 0) },
    { id: 2, rate: 32.5, effectiveFrom: at(2026, 6, 1, 0, 0) },
  ];

  it('each session carries the rate at its own check-in and its earnings', () => {
    const csv = sessionsToCsv(
      [
        session(1, at(2026, 4, 12, 9, 0), at(2026, 4, 12, 11, 0)), // May: 2h × $25
        session(2, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47)), // Aug: 2h47m × $32.50
      ],
      HISTORY,
    );
    const rows = csv.split('\n');
    expect(rows[1]).toBe('2026-05-12,2026-05-12 09:00:00,2026-05-12 11:00:00,120,,,25.00,50.00');
    expect(rows[2]).toBe('2026-08-27,2026-08-27 09:00:00,2026-08-27 11:47:00,167,,,32.50,90.46');
  });

  it('running sessions carry the rate but blank earnings', () => {
    const csv = sessionsToCsv([session(3, at(2026, 7, 27, 13, 0), null)], HISTORY);
    expect(csv.split('\n')[1]).toBe('2026-08-27,2026-08-27 13:00:00,,,,,32.50,');
  });

  it('uncovered sessions and omitted history leave both columns blank', () => {
    const beforeRates = session(1, at(2025, 11, 31, 9, 0), at(2025, 11, 31, 10, 0));
    expect(sessionsToCsv([beforeRates], HISTORY).split('\n')[1]).toMatch(/,,,$/);
    expect(sessionsToCsv([beforeRates]).split('\n')[1]).toMatch(/,,,$/);
  });
});

describe('parseSessionsCsv — the import inverse', () => {
  const completed = session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 11, 47), 'deep work', 'client');
  const running = session(2, at(2026, 7, 27, 13, 5), null, '', 'side gig');

  it('round-trip: exporting then importing imports nothing new', () => {
    const csv = sessionsToCsv([completed, running]);
    const result = parseSessionsCsv(csv, [completed, running]);
    expect(result.toImport).toHaveLength(0);
    expect(result.duplicates).toBe(1); // the completed row
    expect(result.skippedRunning).toBe(1);
  });

  it('into an empty log: every completed row imports with note and category intact', () => {
    const csv = sessionsToCsv([completed, running]);
    const result = parseSessionsCsv(csv, []);
    expect(result.skippedRunning).toBe(1);
    expect(result.toImport).toHaveLength(1);
    expect(result.toImport[0].checkIn.getTime()).toBe(at(2026, 7, 27, 9, 0).getTime());
    expect(result.toImport[0].checkOut?.getTime()).toBe(at(2026, 7, 27, 11, 47).getTime());
    expect(result.toImport[0].note).toBe('deep work');
    expect(result.toImport[0].category).toBe('client');
  });

  it('counts malformed rows without failing the import', () => {
    const csv = [
      'date,check_in,check_out,duration_minutes,note,category',
      'not-a-date,nonsense,,60,,',
      '2026-08-27,2026-08-27 09:00:00,2026-08-27 10:00:00,60,ok,ok',
    ].join('\n');
    const result = parseSessionsCsv(csv, []);
    expect(result.malformed).toBe(1);
    expect(result.toImport).toHaveLength(1);
    expect(result.toImport[0].note).toBe('ok');
  });
});
