import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { DateTime } from 'luxon';
import { Platform } from 'react-native';
import type { Schedule, ScheduleItem } from '@types';
import { expandOccurrences } from '@engine/scheduler';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationData = {
  scheduleId: string;
  occurrenceISO: string;
  items: ScheduleItem[];
  groupLabel: string;
};

/**
 * Request notification permissions
 */
export async function requestPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Notification permissions not granted');
    return false;
  }

  // Set notification channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('medication', {
      name: 'Medication Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3b82f6',
      sound: 'default',
    });
  }

  return true;
}

/**
 * Schedule notifications for a schedule's upcoming occurrences
 */
export async function scheduleNotificationsForSchedule(
  schedule: Schedule,
  groupLabel: string,
  daysAhead = 7
): Promise<string[]> {
  const now = DateTime.now();
  const rangeEnd = now.plus({ days: daysAhead });

  const occurrences = expandOccurrences(schedule, now.toISO()!, rangeEnd.toISO()!);

  const notificationIds: string[] = [];

  for (const occurrence of occurrences) {
    // Only schedule future occurrences
    if (occurrence > now) {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Time for Your Medication',
          body: groupLabel,
          data: {
            scheduleId: schedule.id,
            occurrenceISO: occurrence.toISO(),
            items: schedule.items,
            groupLabel,
          } as NotificationData,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'medication',
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: occurrence.toJSDate() },
      });

      notificationIds.push(notificationId);
    }
  }

  console.log(`Scheduled ${notificationIds.length} notifications for schedule ${schedule.id}`);
  return notificationIds;
}

/**
 * Cancel all notifications for a schedule
 */
export async function cancelNotificationsForSchedule(scheduleId: string): Promise<void> {
  const allNotifications = await Notifications.getAllScheduledNotificationsAsync();

  for (const notification of allNotifications) {
    const data = notification.content.data as NotificationData;
    if (data.scheduleId === scheduleId) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }

  console.log(`Cancelled notifications for schedule ${scheduleId}`);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  console.log('Cancelled all notifications');
}

/**
 * Refresh all notifications (typically called when schedules change)
 */
export async function refreshAllNotifications(
  schedules: Schedule[],
  pillLookup: Map<string, any>
): Promise<void> {
  // Cancel all existing notifications
  await cancelAllNotifications();

  // Re-schedule for all active schedules
  for (const schedule of schedules) {
    const groupLabel = schedule.items
      .map((item) => {
        const pill = pillLookup.get(item.pillId);
        return pill ? `${item.qty}× ${pill.name}` : '';
      })
      .filter(Boolean)
      .join(' + ');

    await scheduleNotificationsForSchedule(schedule, groupLabel);
  }

  console.log('Refreshed all notifications');
}

/**
 * Set up background task to refresh notifications
 */
export function setupBackgroundTask() {
  TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
    try {
      console.log('Background task: Refreshing notifications');
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background task error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

/**
 * Add notification action categories
 */
export async function setupNotificationCategories(): Promise<void> {
  await Notifications.setNotificationCategoryAsync('medication', [
    {
      identifier: 'dispense',
      buttonTitle: 'Dispense Now',
      options: {
        opensAppToForeground: true,
      },
    },
    {
      identifier: 'skip',
      buttonTitle: 'Skip',
      options: {
        opensAppToForeground: false,
      },
    },
  ]);
}

/**
 * Get notification listener
 */
export function addNotificationReceivedListener(
  listener: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(listener);
}

/**
 * Get notification response listener (when user taps notification)
 */
export function addNotificationResponseReceivedListener(
  listener: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(listener);
}
