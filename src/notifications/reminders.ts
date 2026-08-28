import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ReminderDecision } from '@/engine/reminders';
import { blockTriggers, type WorkBlock } from '@/engine/schedule';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null = null;
let unavailable = false;

/** Android Expo Go cannot host expo-notifications at all (removed in SDK 53) — don't even try. */
function notificationsSupportedHere(): boolean {
  const inExpoGo = Constants.executionEnvironment === 'storeClient';
  return !(Platform.OS === 'android' && inExpoGo);
}

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (cached) return cached;
  if (unavailable || !notificationsSupportedHere()) {
    unavailable = true;
    return null;
  }
  try {
    const mod = await import('expo-notifications');
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
    return mod;
  } catch {
    unavailable = true;
    return null;
  }
}

const REMINDER_TITLE = 'Still working?';
const REMINDER_BODY =
  'Your session is still running. Check out of LogBook if you have finished for now.';
const BLOCK_START_TITLE = 'Work block starting';
const BLOCK_START_BODY = 'A scheduled work block is starting — check in when you begin.';
const BLOCK_END_TITLE = 'Block over';
const BLOCK_END_BODY = 'Wrap up if you’re still working.';

export async function initNotificationHandling(): Promise<void> {
  await loadNotifications();
}

async function ensurePermission(mod: NotificationsModule): Promise<boolean> {
  const current = await mod.getPermissionsAsync();
  if (current.granted) return true;
  // Android 13+ requires the runtime prompt before any notification can display.
  const requested = await mod.requestPermissionsAsync();
  return requested.granted;
}

/** Notification-side weekday: iOS/Android calendar triggers use 1=Sunday … 7=Saturday. */
function calendarWeekday(weekday: number): number {
  return weekday === 0 ? 1 : weekday + 1;
}

export interface NotificationState {
  /** The Reminder-lifecycle decision for the current session state; null = no reminder. */
  reminder: ReminderDecision | null;
  blocks: WorkBlock[];
}

/**
 * The one executor: rebuilds every OS notification from the given state —
 * cancel-all first (so stale triggers from any previous state die), then the
 * reminder (when the decision says schedule) and every block's weekly triggers
 * from the engine's specs. Policy lives in the engine; this only executes.
 * Idempotent, which is why every caller — session actions, block changes, and
 * app start — uses the same call.
 */
export async function syncNotifications(state: NotificationState): Promise<void> {
  const mod = await loadNotifications();
  if (!mod) return;
  try {
    await mod.cancelAllScheduledNotificationsAsync();

    if (state.reminder?.kind === 'schedule') {
      const granted = await ensurePermission(mod);
      if (granted) {
        await mod.scheduleNotificationAsync({
          content: { title: REMINDER_TITLE, body: REMINDER_BODY },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.DATE,
            date: state.reminder.fireAt,
          },
        });
      }
    }

    for (const block of state.blocks) {
      for (const trigger of blockTriggers(block)) {
        await mod.scheduleNotificationAsync({
          content:
            trigger.kind === 'start'
              ? { title: BLOCK_START_TITLE, body: BLOCK_START_BODY }
              : { title: BLOCK_END_TITLE, body: BLOCK_END_BODY },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.CALENDAR,
            hour: trigger.hour,
            minute: trigger.minute,
            weekday: calendarWeekday(trigger.weekday),
            repeats: true,
          },
        });
      }
    }
  } catch {
    // Notifications are prompts, not data — a failed sync is non-fatal.
  }
}
