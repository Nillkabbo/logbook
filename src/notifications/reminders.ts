/**
 * Check-in reminder adapter: schedule a local notification X hours after check-in,
 * cancel it on checkout. The app schedules exactly one reminder at a time, so
 * cancellation is "cancel all" — no identifiers to persist.
 *
 * expo-notifications must never be imported statically: on Android in Expo Go
 * the module throws at import time (remote push was removed from Expo Go in
 * SDK 53), which would crash the whole app at startup. We load it lazily and
 * degrade to a no-op there — local reminders still work on iOS Expo Go and in
 * development builds.
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import type { ReminderDecision } from '@/engine/reminders';
import type { WorkBlock } from '@/engine/schedule';
import type { Weekday } from '@/engine/types';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null = null;
let unavailable = false;
let reminderId: string | null = null;
let blockIds: string[] = [];

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
function calendarWeekday(weekday: Weekday): number {
  return weekday === 0 ? 1 : weekday + 1;
}

/**
 * Executes a Reminder-lifecycle decision. The reminder is cancelled by id when
 * known; a cancel-all fallback (fresh session) also wipes block notifications,
 * so the current blocks are rescheduled immediately after.
 */
export async function applyReminderDecision(
  decision: ReminderDecision,
  blocks: WorkBlock[] = [],
): Promise<void> {
  if (decision.kind === 'keep') return;
  const mod = await loadNotifications();
  if (!mod) return;
  try {
    if (decision.kind === 'cancel') {
      if (reminderId !== null) {
        await mod.cancelScheduledNotificationAsync(reminderId);
      } else {
        await mod.cancelAllScheduledNotificationsAsync();
        blockIds = [];
        await scheduleBlocks(mod, blocks);
      }
      reminderId = null;
      return;
    }
    const granted = await ensurePermission(mod);
    if (!granted) return;
    reminderId = await mod.scheduleNotificationAsync({
      content: { title: REMINDER_TITLE, body: REMINDER_BODY },
      trigger: {
        type: mod.SchedulableTriggerInputTypes.DATE,
        date: decision.fireAt,
      },
    });
  } catch {
    // A denied or failed reminder must never break the check-in flow.
  }
}

async function scheduleBlocks(mod: NotificationsModule, blocks: WorkBlock[]): Promise<void> {
  const ids: string[] = [];
  for (const block of blocks) {
    for (const weekday of block.weekdays) {
      ids.push(
        await mod.scheduleNotificationAsync({
          content: { title: BLOCK_START_TITLE, body: BLOCK_START_BODY },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.CALENDAR,
            hour: Math.floor(block.startMinute / 60),
            minute: block.startMinute % 60,
            weekday: calendarWeekday(weekday),
            repeats: true,
          },
        }),
      );
      const endsNextDay = block.endMinute <= block.startMinute;
      const endWeekday = endsNextDay ? ((weekday + 1) % 7) as Weekday : weekday;
      ids.push(
        await mod.scheduleNotificationAsync({
          content: { title: BLOCK_END_TITLE, body: BLOCK_END_BODY },
          trigger: {
            type: mod.SchedulableTriggerInputTypes.CALENDAR,
            hour: Math.floor(block.endMinute / 60),
            minute: block.endMinute % 60,
            weekday: calendarWeekday(endWeekday),
            repeats: true,
          },
        }),
      );
    }
  }
  blockIds = ids;
}

/** Reschedules all weekly block notifications after the blocks change. */
export async function syncBlockNotifications(blocks: WorkBlock[]): Promise<void> {
  const mod = await loadNotifications();
  if (!mod) return;
  try {
    for (const id of blockIds) {
      await mod.cancelScheduledNotificationAsync(id);
    }
    await scheduleBlocks(mod, blocks);
  } catch {
    // Block notifications are prompts, not data — failure is non-fatal.
  }
}
