import { isRunningInExpoGo } from 'expo';
import type * as NotificationsModule from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'daily-expense-reminder';
const CHANNEL_ID = 'daily-reminder';
const ADD_EXPENSE_ACTION = 'add-expense';

/**
 * Why reminders can't run here, or null when they can.
 * - Web: scheduled local notifications aren't supported.
 * - Expo Go on Android: importing expo-notifications throws at start-up ("Runtime not ready"),
 *   because it registers a push-token listener that Expo Go on Android rejects since SDK 53.
 */
export const remindersUnsupportedReason: string | null =
  Platform.OS === 'web'
    ? 'Reminders work in the phone app, not in this web preview.'
    : Platform.OS === 'android' && isRunningInExpoGo()
      ? 'Reminders need the installed app (APK). Expo Go on Android can’t schedule them.'
      : null;

export const remindersSupported = remindersUnsupportedReason === null;

// Only load the library where it's safe to (see above).
const Notifications: typeof NotificationsModule | null = remindersSupported
  ? require('expo-notifications')
  : null;

export type ReminderStatus = 'scheduled' | 'off' | 'denied' | 'unsupported';

Notifications?.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function ensurePermission(N: typeof NotificationsModule): Promise<boolean> {
  // Android 13+ only shows the permission prompt once a channel exists.
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Daily spending reminder',
      importance: N.AndroidImportance.HIGH,
    });
  }
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await N.requestPermissionsAsync()).granted;
}

const reminderContent: NotificationsModule.NotificationContentInput = {
  title: '💸 How much did you spend today?',
  body: 'Tap to log today’s expenses before you forget.',
  data: { action: ADD_EXPENSE_ACTION },
};

/** Schedules (or cancels) the repeating daily reminder at `hour`:00. */
export async function syncDailyReminder(enabled: boolean, hour: number): Promise<ReminderStatus> {
  if (!Notifications) return 'unsupported';
  await Notifications.cancelScheduledNotificationAsync(REMINDER_ID).catch(() => {});
  if (!enabled) return 'off';
  if (!(await ensurePermission(Notifications))) return 'denied';
  await Notifications.scheduleNotificationAsync({
    identifier: REMINDER_ID,
    content: reminderContent,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId: CHANNEL_ID,
    },
  });
  return 'scheduled';
}

/** Fires the reminder once, a few seconds from now, so it can be checked without waiting. */
export async function sendTestReminder(): Promise<ReminderStatus> {
  if (!Notifications) return 'unsupported';
  if (!(await ensurePermission(Notifications))) return 'denied';
  await Notifications.scheduleNotificationAsync({
    content: reminderContent,
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
  return 'scheduled';
}

/** Calls `onTap` when the user opens the app from a reminder. Returns an unsubscribe function. */
export function onReminderTapped(onTap: () => void): () => void {
  const N = Notifications;
  if (!N) return () => {};
  const handle = (response: NotificationsModule.NotificationResponse | null) => {
    if (response?.notification.request.content.data?.action !== ADD_EXPENSE_ACTION) return;
    onTap();
    N.clearLastNotificationResponseAsync().catch(() => {});
  };
  N.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = N.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}

export function formatHour(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}
