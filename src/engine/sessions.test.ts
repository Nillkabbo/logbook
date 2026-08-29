import { describe, expect, it } from 'vitest';

import { at, session } from './test-support';

import { categoryList, sessionDurationSeconds, newSessionDraft, NEW_SESSION_ID } from './sessions';
import { validateSessionTimes } from './validation';

// Local-time constructors keep these examples independent of the machine's timezone:
// the engine only ever compares Date objects, so instants are what matter.
describe('sessionDurationSeconds', () => {
  it('completed session: checkout minus check-in', () => {
    // 09:00 → 11:47 = 2h 47m = 10020s
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0), checkOut: at(2026, 7, 27, 11, 47), note: '', category: '' };
    expect(sessionDurationSeconds(session)).toBe(10020);
  });

  it('running session: now minus check-in, seconds precision', () => {
    // 09:00:15 → 09:30:45 = 30m 30s = 1830s
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0, 15), checkOut: null, note: '', category: '' };
    expect(sessionDurationSeconds(session, at(2026, 7, 27, 9, 30, 45))).toBe(1830);
  });

  it('running session without `now` is a contract violation', () => {
    const session = { id: 1, checkIn: at(2026, 7, 27, 9, 0), checkOut: null, note: '', category: '' };
    expect(() => sessionDurationSeconds(session)).toThrow();
  });
});

describe('newSessionDraft', () => {
  it('spans exactly the last hour on 15-minute boundaries with zeroed seconds', () => {
    const draft = newSessionDraft(at(2026, 7, 27, 14, 37, 12));
    expect(draft.checkOut!.getTime() - draft.checkIn.getTime()).toBe(60 * 60 * 1000);
    expect(draft.checkOut!.getHours()).toBe(14);
    expect(draft.checkOut!.getMinutes()).toBe(30); // 37 floored to 30
    expect(draft.checkOut!.getSeconds()).toBe(0);
    expect(draft.checkIn.getMinutes()).toBe(30);
  });

  it('never proposes future times and passes edit validation', () => {
    const now = at(2026, 7, 27, 9, 3);
    const draft = newSessionDraft(now);
    expect(draft.checkIn.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(draft.checkOut!.getTime()).toBeLessThanOrEqual(now.getTime());
    expect(validateSessionTimes(draft.checkIn, draft.checkOut, now)).toBeNull();
  });

  it('carries the draft id and empty note/category', () => {
    const draft = newSessionDraft(at(2026, 7, 27, 14, 0));
    expect(draft.id).toBe(NEW_SESSION_ID);
    expect(draft.note).toBe('');
    expect(draft.category).toBe('');
  });
});

describe('categoryList', () => {
  const s = (category: string) => session(1, at(2026, 7, 27, 9, 0), at(2026, 7, 27, 10, 0), '', category);

  it('managed categories come first, then history-only labels in MRU order', () => {
    const sessions = [s('History A'), s('Deep work'), s('History B')]; // MRU: B, Deep work, A
    const list = categoryList(['Mine', 'Deep work'], sessions);
    expect(list).toEqual(['Mine', 'Deep work', 'History B', 'History A']);
  });

  it('dedupe is case-insensitive and the managed label wins', () => {
    const sessions = [s('deep work')]; // history spelling differs
    expect(categoryList(['Deep work'], sessions)).toEqual(['Deep work']);
  });

  it('empty managed list falls back to pure history (current behavior)', () => {
    const sessions = [s('A'), s('B')];
    expect(categoryList([], sessions)).toEqual(['B', 'A']);
  });

  it('applies the limit across the union; empty labels never appear', () => {
    const sessions = [s(''), s('A')];
    expect(categoryList(['M1', 'M2'], sessions, 2)).toEqual(['M1', 'M2']);
  });
});
