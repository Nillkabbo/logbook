import { describe, expect, it } from 'vitest';

import { deleteEvent, editEvent, reminderDecision } from './reminders';
import { DEFAULT_SETTINGS, type Session } from './types';

const at = (y: number, mo: number, d: number, h: number, mi: number) =>
  new Date(y, mo, d, h, mi);

// NOW = Thursday Aug 27 2026, 12:00 local. Threshold default 10h.
const NOW = at(2026, 7, 27, 12, 0);

describe('editEvent / deleteEvent — deriving lifecycle events', () => {
  const running: Session = {
    id: 1,
    checkIn: at(2026, 7, 27, 9, 0),
    checkOut: null,
    note: '',
    category: '',
  };

  it('an edit derives wasRunning/nowRunning from the before-session and patch', () => {
    const completing = { ...running, checkOut: at(2026, 7, 27, 11, 0) };
    expect(editEvent(running, completing)).toEqual({
      type: 'edited',
      wasRunning: true,
      nowRunning: false,
      checkIn: running.checkIn,
    });
    const completingOther = { ...running, checkOut: at(2026, 7, 27, 11, 0) };
    void completingOther;
  });

  it('an edit that toggles a completed session back to running derives the schedule case', () => {
    const before: Session = { ...running, checkOut: at(2026, 7, 27, 10, 0) };
    const reopened = { ...before, checkOut: null };
    expect(editEvent(before, reopened)).toEqual({
      type: 'edited',
      wasRunning: false,
      nowRunning: true,
      checkIn: before.checkIn,
    });
  });

  it('a delete derives wasRunning from the before-session', () => {
    expect(deleteEvent(running)).toEqual({ type: 'deleted', wasRunning: true });
    expect(deleteEvent({ ...running, checkOut: at(2026, 7, 27, 10, 0) })).toEqual({
      type: 'deleted',
      wasRunning: false,
    });
  });
});

describe('reminderDecision — the Reminder lifecycle', () => {
  it('check-in schedules at check-in + threshold', () => {
    // 09:00 + 10h = 19:00 today
    const decision = reminderDecision(
      { type: 'checked-in', checkIn: at(2026, 7, 27, 9, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(decision).toEqual({ kind: 'schedule', fireAt: at(2026, 7, 27, 19, 0) });
  });

  it('check-in whose fire time already elapsed never schedules', () => {
    // Checked in yesterday 22:00 → fire at 08:00 today, already past NOW
    const decision = reminderDecision(
      { type: 'checked-in', checkIn: at(2026, 7, 26, 22, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(decision).toEqual({ kind: 'keep' });
  });

  it('check-out cancels', () => {
    expect(reminderDecision({ type: 'checked-out' }, DEFAULT_SETTINGS, NOW)).toEqual({
      kind: 'cancel',
    });
  });

  it('an edit that completes a running session cancels', () => {
    const decision = reminderDecision(
      { type: 'edited', wasRunning: true, nowRunning: false, checkIn: at(2026, 7, 27, 9, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(decision).toEqual({ kind: 'cancel' });
  });

  it('an edit that changes only times or note keeps the existing reminder', () => {
    const decision = reminderDecision(
      { type: 'edited', wasRunning: false, nowRunning: false, checkIn: at(2026, 7, 27, 9, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(decision).toEqual({ kind: 'keep' });
    const stillRunning = reminderDecision(
      { type: 'edited', wasRunning: true, nowRunning: true, checkIn: at(2026, 7, 27, 9, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(stillRunning).toEqual({ kind: 'keep' });
  });

  it('an edit that makes a session running schedules from its check-in', () => {
    // Toggled to running; check-in 11:00 + 10h = 21:00, still ahead of NOW
    const decision = reminderDecision(
      { type: 'edited', wasRunning: false, nowRunning: true, checkIn: at(2026, 7, 27, 11, 0) },
      DEFAULT_SETTINGS,
      NOW,
    );
    expect(decision).toEqual({ kind: 'schedule', fireAt: at(2026, 7, 27, 21, 0) });
  });

  it('deleting a running session cancels; deleting a completed one keeps', () => {
    expect(
      reminderDecision({ type: 'deleted', wasRunning: true }, DEFAULT_SETTINGS, NOW),
    ).toEqual({ kind: 'cancel' });
    expect(
      reminderDecision({ type: 'deleted', wasRunning: false }, DEFAULT_SETTINGS, NOW),
    ).toEqual({ kind: 'keep' });
  });
});
