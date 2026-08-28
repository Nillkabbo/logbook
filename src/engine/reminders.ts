import type { Settings } from './types';

/**
 * The Reminder lifecycle, as a pure decision: a reminder exists if and only if
 * a Running session exists. The store reports what happened; this module
 * decides schedule / cancel / keep; the notifications adapter executes.
 */

export type ReminderEvent =
  | { type: 'checked-in'; checkIn: Date }
  | { type: 'checked-out' }
  | { type: 'edited'; wasRunning: boolean; nowRunning: boolean; checkIn: Date }
  | { type: 'deleted'; wasRunning: boolean };

export type ReminderDecision =
  | { kind: 'schedule'; fireAt: Date }
  | { kind: 'cancel' }
  | { kind: 'keep' };

function scheduleAt(checkIn: Date, settings: Settings, now: Date): ReminderDecision {
  const fireAt = new Date(checkIn.getTime() + settings.reminderThresholdHours * 3600_000);
  // A fire time already in the past would fire immediately — skip instead.
  return fireAt.getTime() <= now.getTime() ? { kind: 'keep' } : { kind: 'schedule', fireAt };
}

export function reminderDecision(
  event: ReminderEvent,
  settings: Settings,
  now: Date,
): ReminderDecision {
  switch (event.type) {
    case 'checked-in':
      return scheduleAt(event.checkIn, settings, now);
    case 'checked-out':
      return { kind: 'cancel' };
    case 'edited':
      if (event.wasRunning && !event.nowRunning) return { kind: 'cancel' };
      if (!event.wasRunning && event.nowRunning) {
        return scheduleAt(event.checkIn, settings, now);
      }
      return { kind: 'keep' };
    case 'deleted':
      return event.wasRunning ? { kind: 'cancel' } : { kind: 'keep' };
  }
}
