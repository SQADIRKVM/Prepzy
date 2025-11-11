import * as Device from 'expo-device';
import { Platform } from 'react-native';
import {
  requestWebNotificationPermission,
  scheduleWebNotification as scheduleWeb,
  cancelWebNotification,
  isWebNotificationSupported,
  WebNotificationOptions,
} from './webNotificationService';
import { getSoundUri } from './soundService';

// Import notifications conditionally
// IMPORTANT: The Expo Go SDK 53+ warning is about PUSH notifications (remote from server)
// We use LOCAL scheduled notifications, which work perfectly fine in Expo Go
// The warning is just informational - local notifications are fully supported

let Notifications: any = null;
let notificationsAvailable = false;

// Try to import expo-notifications
// Note: The SDK 53 warning is just a console message, not an actual error
// Local scheduled notifications work fine even with this warning
try {
  Notifications = require('expo-notifications');
  notificationsAvailable = true;
} catch (error) {
  // Only mark as unavailable if it's a real import error
  // The push notification warning doesn't prevent local notifications from working
  console.log('Could not import expo-notifications:', error);
  notificationsAvailable = false;
}

// Configure how notifications should be handled when app is in foreground
// This works for LOCAL scheduled notifications (not push notifications)
if (Notifications && Notifications.setNotificationHandler) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (_notification: any) => {
        // Always play sound, even in foreground
        // This is for LOCAL scheduled notifications, which work fine in Expo Go
        return {
          shouldShowAlert: true,
          shouldPlaySound: true, // This ensures sound plays
          shouldSetBadge: true,
        };
      },
    });
  } catch (error) {
    console.log('Could not set notification handler:', error);
  }
}

export interface ReminderOption {
  id: string;
  label: string;
  timeInSeconds: number;
}

// Available reminder options
export const REMINDER_OPTIONS: ReminderOption[] = [
  { id: '1week', label: '1 week before', timeInSeconds: 7 * 24 * 60 * 60 },
  { id: '3days', label: '3 days before', timeInSeconds: 3 * 24 * 60 * 60 },
  { id: '1day', label: '1 day before', timeInSeconds: 24 * 60 * 60 },
  { id: '12hours', label: '12 hours before', timeInSeconds: 12 * 60 * 60 },
  { id: '1hour', label: '1 hour before', timeInSeconds: 60 * 60 },
  { id: '30min', label: '30 minutes before', timeInSeconds: 30 * 60 },
];

/**
 * Parse custom reminder string (e.g., '1d9h30m' -> timeInSeconds)
 * @param reminderStr - Reminder string in format like '1d9h30m', '2h', '45m', etc.
 * @returns Time in seconds
 */
function parseReminderStringToSeconds(reminderStr: string): number {
  const daysMatch = reminderStr.match(/(\d+)d/);
  const hoursMatch = reminderStr.match(/(\d+)h/);
  const minutesMatch = reminderStr.match(/(\d+)m/);
  
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
  
  return days * 24 * 60 * 60 + hours * 60 * 60 + minutes * 60;
}

/**
 * Create label from reminder string
 * @param reminderStr - Reminder string in format like '1d9h30m'
 * @returns Human-readable label
 */
function createReminderLabel(reminderStr: string): string {
  const daysMatch = reminderStr.match(/(\d+)d/);
  const hoursMatch = reminderStr.match(/(\d+)h/);
  const minutesMatch = reminderStr.match(/(\d+)m/);
  
  const days = daysMatch ? parseInt(daysMatch[1]) : 0;
  const hours = hoursMatch ? parseInt(hoursMatch[1]) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1]) : 0;
  
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  return parts.join(', ') || '0 minutes';
}

/**
 * Request notification permissions from the user
 * @returns {Promise<boolean>} True if permission granted, false otherwise
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Handle web notifications
  if (Platform.OS === 'web') {
    return await requestWebNotificationPermission();
  }

  // Check if notifications are available
  // The Expo Go SDK 53+ warning is about PUSH notifications, not LOCAL scheduled notifications
  // Local scheduled notifications work perfectly fine
  if (!notificationsAvailable || !Notifications) {
    // Try to require it again - local notifications work even with the push notification warning
    try {
      Notifications = require('expo-notifications');
      notificationsAvailable = true;
    } catch (error) {
      // Only fail if it's a real error, not the expected push notification warning
      const errorMessage = error && typeof error === 'object' && 'message' in error 
        ? String(error.message) 
        : String(error);
      
      if (!errorMessage.includes('Push notifications') && 
          !errorMessage.includes('removed from Expo Go')) {
        console.log('Notifications truly not available:', errorMessage);
        return false;
      }
      // If it's just the push notification warning, continue - local notifications work
      try {
        Notifications = require('expo-notifications');
        notificationsAvailable = true;
      } catch (e) {
        return false;
      }
    }
  }

  // Note: Notifications can work on simulators/emulators too, but with limitations
  // We'll allow it and let the OS handle it

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return false;
    }

    // Configure notification channel for Android
    // According to Expo docs: https://docs.expo.dev/versions/latest/sdk/notifications/
    if (Platform.OS === 'android') {
      try {
        await Notifications.setNotificationChannelAsync('exam-reminders', {
          name: 'Exam Reminders',
          description: 'Notifications for exam reminders',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#6366F1',
          sound: 'default', // Channel default sound - can be 'default' or custom sound URI
          enableVibrate: true,
          showBadge: true,
          enableLights: true,
        });
        console.log('[NotificationService] Android notification channel configured with sound');
      } catch (error) {
        console.error('[NotificationService] Error configuring Android channel:', error);
      }
    }

    return true;
  } catch (error) {
    console.error('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Schedule notifications for an exam based on selected reminders
 * @param examId - The exam ID
 * @param examTitle - The exam title
 * @param examDate - The exam date (ISO string)
 * @param reminderIds - Array of reminder IDs to schedule
 * @returns {Promise<string[]>} Array of scheduled notification IDs
 */
export async function scheduleExamNotifications(
  examId: string,
  examTitle: string,
  examDate: string,
  reminderIds: string[],
  notificationSound?: string
): Promise<string[]> {
  // Check if notifications are available
  // Note: Local scheduled notifications work in Expo Go, only push notifications don't
  if (!notificationsAvailable || !Notifications) {
    // Try to require it again - the warning doesn't mean local notifications don't work
    try {
      Notifications = require('expo-notifications');
      notificationsAvailable = true;
    } catch (error) {
      console.log('Notifications not available');
      return [];
    }
  }

  // Ensure we have permission
  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    console.warn('Notification permissions not granted. Cannot schedule notifications.');
    return [];
  }

  const notificationIds: string[] = [];
  const examDateTime = new Date(examDate);
  const now = new Date();

  console.log(`[NotificationService] Scheduling notifications for exam: ${examTitle}`);
  console.log(`[NotificationService] Exam date: ${examDate}, Current time: ${now.toISOString()}`);
  console.log(`[NotificationService] Reminders to schedule: ${reminderIds.join(', ')}`);
  console.log(`[NotificationService] Sound setting: ${notificationSound || 'default'}`);

  for (const reminderId of reminderIds) {
    // Check if it's a predefined reminder ID or a custom reminder string
    let reminderOption = REMINDER_OPTIONS.find(r => r.id === reminderId);
    let timeInSeconds: number;
    let reminderLabel: string;

    if (reminderOption) {
      // Predefined reminder
      timeInSeconds = reminderOption.timeInSeconds;
      reminderLabel = reminderOption.label.replace(' before', '');
    } else {
      // Custom reminder string (e.g., '1d9h30m')
      timeInSeconds = parseReminderStringToSeconds(reminderId);
      reminderLabel = createReminderLabel(reminderId);
      
      if (timeInSeconds === 0) {
        console.warn(`Invalid reminder format: ${reminderId}`);
        continue;
      }
    }

    // Calculate trigger time (exam time - reminder offset)
    const triggerTime = new Date(examDateTime.getTime() - timeInSeconds * 1000);

    console.log(`[NotificationService] Processing reminder: ${reminderId}`);
    console.log(`[NotificationService] Time offset: ${timeInSeconds}s (${Math.round(timeInSeconds / 3600)} hours)`);
    console.log(`[NotificationService] Trigger time: ${triggerTime.toISOString()}`);

    // Only schedule if trigger time is in the future
    if (triggerTime > now) {
      try {
        // Map sound name to notification sound
        // Expo supports: 'default', true (default), false (no sound), or custom sound file URI
        let soundSetting: any = 'default';
        let customSoundUri: string | null = null;
        
        if (notificationSound) {
          if (notificationSound === 'None (Silent)' || notificationSound === 'None') {
            soundSetting = false; // No sound
          } else if (notificationSound === 'Default') {
            soundSetting = Platform.OS === 'android' ? true : 'default';
          } else {
            // Try to get custom sound file URI (downloads from web if not cached)
            try {
              customSoundUri = await getSoundUri(notificationSound);
              if (customSoundUri) {
                // Use custom sound file
                soundSetting = customSoundUri;
              } else {
                // Fallback to default if download failed
                soundSetting = Platform.OS === 'android' ? true : 'default';
              }
            } catch (error) {
              console.error(`[NotificationService] Failed to get sound URI for ${notificationSound}:`, error);
              soundSetting = Platform.OS === 'android' ? true : 'default';
            }
          }
        }

        // Sound configuration:
        // - iOS: sound can be 'default', false, or custom sound file URI
        // - Android: sound can be true (use channel default), false (no sound), or custom sound URI
        let soundForNotification: any;
        if (Platform.OS === 'android') {
          if (soundSetting === false) {
            soundForNotification = false;
          } else if (customSoundUri) {
            soundForNotification = customSoundUri; // Custom sound URI
          } else {
            soundForNotification = true; // Use channel default
          }
        } else {
          // iOS
          if (soundSetting === false) {
            soundForNotification = false;
          } else if (customSoundUri) {
            soundForNotification = customSoundUri; // Custom sound file URI
          } else {
            soundForNotification = 'default'; // System default
          }
        }

        const notificationContent: any = {
          title: 'Exam Reminder',
          body: `${examTitle} is coming up ${reminderLabel} before!`,
          data: { examId, type: 'exam-reminder' },
          sound: soundForNotification,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        };

        const triggerConfig = Platform.OS === 'android' 
          ? { date: triggerTime, channelId: 'exam-reminders' }
          : { date: triggerTime };

        console.log(`[NotificationService] Scheduling notification with content:`, notificationContent);
        console.log(`[NotificationService] Trigger config:`, triggerConfig);

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: notificationContent,
          trigger: triggerConfig,
        });

        notificationIds.push(notificationId);
        console.log(`[NotificationService] ✅ Successfully scheduled notification ${notificationId} for ${triggerTime.toISOString()} with sound: ${notificationSound || 'default'}${customSoundUri ? ` (custom: ${customSoundUri})` : ''}`);
      } catch (error) {
        console.error(`[NotificationService] ❌ Failed to schedule notification for ${reminderId}:`, error);
        if (error instanceof Error) {
          console.error(`[NotificationService] Error details: ${error.message}`);
          console.error(`[NotificationService] Stack: ${error.stack}`);
        }
      }
    } else {
      console.warn(`[NotificationService] ⚠️ Skipping ${reminderId} - trigger time ${triggerTime.toISOString()} has passed (current: ${now.toISOString()})`);
    }
  }

  console.log(`[NotificationService] Total notifications scheduled: ${notificationIds.length} out of ${reminderIds.length} requested`);
  return notificationIds;
}

/**
 * Schedule web notifications for exams
 */
async function scheduleWebExamNotifications(
  examId: string,
  examTitle: string,
  examDate: string,
  reminderIds: string[],
  notificationSound?: string
): Promise<string[]> {
  if (!isWebNotificationSupported()) {
    console.log('[NotificationService] Web notifications not supported');
    return [];
  }

  const hasPermission = await requestWebNotificationPermission();
  if (!hasPermission) {
    console.warn('[NotificationService] Web notification permissions not granted');
    return [];
  }

  const notificationIds: string[] = [];
  const examDateTime = new Date(examDate);
  const now = new Date();

  console.log(`[NotificationService] Scheduling web notifications for exam: ${examTitle}`);

  for (const reminderId of reminderIds) {
    let reminderOption = REMINDER_OPTIONS.find(r => r.id === reminderId);
    let timeInSeconds: number;
    let reminderLabel: string;

    if (reminderOption) {
      timeInSeconds = reminderOption.timeInSeconds;
      reminderLabel = reminderOption.label.replace(' before', '');
    } else {
      timeInSeconds = parseReminderStringToSeconds(reminderId);
      reminderLabel = createReminderLabel(reminderId);
      
      if (timeInSeconds === 0) {
        console.warn(`Invalid reminder format: ${reminderId}`);
        continue;
      }
    }

    const triggerTime = new Date(examDateTime.getTime() - timeInSeconds * 1000);

    if (triggerTime > now) {
      try {
        const notificationOptions: WebNotificationOptions = {
          title: 'Exam Reminder',
          body: `${examTitle} is coming up ${reminderLabel} before!`,
          icon: '/favicon.png',
          badge: '/favicon.png',
          tag: `exam-${examId}-${reminderId}`,
          data: { examId, type: 'exam-reminder' },
          requireInteraction: false,
          silent: notificationSound === 'None (Silent)' || notificationSound === 'None',
        };

        const notificationId = await scheduleWeb(notificationOptions, triggerTime);
        if (notificationId) {
          notificationIds.push(notificationId);
          console.log(`[NotificationService] ✅ Scheduled web notification ${notificationId} for ${triggerTime.toISOString()}`);
        }
      } catch (error) {
        console.error(`[NotificationService] ❌ Failed to schedule web notification for ${reminderId}:`, error);
      }
    } else {
      console.warn(`[NotificationService] ⚠️ Skipping ${reminderId} - trigger time has passed`);
    }
  }

  console.log(`[NotificationService] Total web notifications scheduled: ${notificationIds.length} out of ${reminderIds.length} requested`);
  return notificationIds;
}

/**
 * Cancel specific notifications by their IDs
 * @param notificationIds - Array of notification IDs to cancel
 */
export async function cancelNotifications(notificationIds: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) return;

  // Handle web notifications
  if (Platform.OS === 'web') {
    for (const notificationId of notificationIds) {
      cancelWebNotification(notificationId);
      console.log(`[NotificationService] Cancelled web notification ${notificationId}`);
    }
    return;
  }

  // Handle native notifications
  if (!notificationsAvailable || !Notifications) {
    return;
  }

  try {
    for (const notificationId of notificationIds) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log(`[NotificationService] Cancelled notification ${notificationId}`);
    }
  } catch (error) {
    console.error('Failed to cancel notifications:', error);
  }
}

/**
 * Cancel all notifications for a specific exam
 * @param notificationIds - Array of notification IDs associated with the exam
 */
export async function cancelExamNotifications(notificationIds?: string[]): Promise<void> {
  if (!notificationIds || notificationIds.length === 0) return;
  await cancelNotifications(notificationIds);
}

/**
 * Schedule a single notification (for goal achievements, etc.)
 */
export async function scheduleNotification(
  options: { title: string; body: string; data?: any },
  triggerDate: Date
): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (isWebNotificationSupported()) {
      const hasPermission = await requestWebNotificationPermission();
      if (hasPermission) {
        return await scheduleWeb({
          title: options.title,
          body: options.body,
          tag: 'goal-achievement',
          data: options.data,
        }, triggerDate);
      }
    }
    return null;
  }

  if (!notificationsAvailable || !Notifications) {
    try {
      Notifications = require('expo-notifications');
      notificationsAvailable = true;
    } catch (error) {
      return null;
    }
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return null;
  }

  try {
    const notificationContent: any = {
      title: options.title,
      body: options.body,
      sound: true,
      data: options.data || {},
    };

    if (Platform.OS === 'android') {
      notificationContent.android = {
        channelId: 'exam-reminders',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };
    }

    const triggerConfig = Platform.OS === 'android' 
      ? { date: triggerDate, channelId: 'exam-reminders' }
      : { date: triggerDate };

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: notificationContent,
      trigger: triggerConfig,
    });

    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Reschedule notifications for an exam (cancel old ones and schedule new ones)
 * @param oldNotificationIds - Previous notification IDs to cancel
 * @param examId - The exam ID
 * @param examTitle - The exam title
 * @param examDate - The exam date (ISO string)
 * @param reminderIds - Array of reminder IDs to schedule
 * @returns {Promise<string[]>} Array of new notification IDs
 */
export async function rescheduleExamNotifications(
  oldNotificationIds: string[] | undefined,
  examId: string,
  examTitle: string,
  examDate: string,
  reminderIds: string[],
  notificationSound?: string
): Promise<string[]> {
  // Cancel old notifications
  if (oldNotificationIds && oldNotificationIds.length > 0) {
    await cancelNotifications(oldNotificationIds);
  }

  // Schedule new notifications
  return await scheduleExamNotifications(examId, examTitle, examDate, reminderIds, notificationSound);
}

/**
 * Get all scheduled notifications
 */
export async function getAllScheduledNotifications(): Promise<any[]> {
  if (!notificationsAvailable || !Notifications) {
    return [];
  }
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  if (!notificationsAvailable || !Notifications) {
    return;
  }
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('Cancelled all scheduled notifications');
  } catch (error) {
    console.error('Error cancelling all notifications:', error);
  }
}

/**
 * Add listener for when notification is received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: any) => void
): any {
  if (!notificationsAvailable || !Notifications) {
    // Return a dummy subscription object
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationReceivedListener(callback);
  } catch (error) {
    console.error('Error adding notification received listener:', error);
    return { remove: () => {} };
  }
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseReceivedListener(
  callback: (response: any) => void
): any {
  if (!notificationsAvailable || !Notifications) {
    // Return a dummy subscription object
    return { remove: () => {} };
  }
  try {
    return Notifications.addNotificationResponseReceivedListener(callback);
  } catch (error) {
    console.error('Error adding notification response listener:', error);
    return { remove: () => {} };
  }
}
