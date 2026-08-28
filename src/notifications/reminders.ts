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

/**
 * Executes a Reminder-lifecycle decision. Scheduling, cancelling, permissions,
 * and platform availability live here — the policy lives in the engine.
 */
export async function applyReminderDecision(decision: ReminderDecision): Promise<void> {
  if (decision.kind === 'keep') return;
  const mod = await loadNotifications();
  if (!mod) return;
  try {
    if (decision.kind === 'cancel') {
      await mod.cancelAllScheduledNotificationsAsync();
      return;
    }
    const granted = await ensurePermission(mod);
    if (!granted) return;
    await mod.scheduleNotificationAsync({
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
