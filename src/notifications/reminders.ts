import * as Notifications from 'expo-notifications';

/**
 * Check-in reminder adapter: schedule a local notification X hours after check-in,
 * cancel it on checkout. The app schedules exactly one reminder at a time, so
 * cancellation is "cancel all" — no identifiers to persist.
 */

const REMINDER_TITLE = 'Still working?';
const REMINDER_BODY =
  'Your session is still running. Check out of LogBook if you have finished for now.';

export function initNotificationHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  // Android 13+ requires the runtime prompt before any notification can display.
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Fire-and-forget: schedules the reminder unless permission is denied (graceful). */
export async function scheduleCheckInReminder(checkIn: Date, thresholdHours: number): Promise<void> {
  try {
    const granted = await ensurePermission();
    if (!granted) return;
    const fireDate = new Date(checkIn.getTime() + thresholdHours * 3600 * 1000);
    if (fireDate.getTime() <= Date.now()) return; // threshold already elapsed
    await Notifications.scheduleNotificationAsync({
      content: { title: REMINDER_TITLE, body: REMINDER_BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  } catch {
    // A denied or failed reminder must never break the check-in flow.
  }
}

export async function cancelCheckInReminder(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Nothing to cancel — safe to ignore.
  }
}
