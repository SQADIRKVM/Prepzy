/**
 * Web Notification Service for PWA
 * Handles browser notifications for web/iOS PWA
 */

// Extend Window interface for TypeScript
declare global {
  interface Window {
    Notification?: typeof Notification;
  }
}

export interface WebNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Request notification permission for web
 */
export async function requestWebNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[WebNotifications] Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.log('[WebNotifications] Permission denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('[WebNotifications] Error requesting permission:', error);
    return false;
  }
}

/**
 * Schedule a web notification
 */
export async function scheduleWebNotification(
  options: WebNotificationOptions,
  triggerTime: Date
): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[WebNotifications] Notifications not supported');
    return null;
  }

  const hasPermission = await requestWebNotificationPermission();
  if (!hasPermission) {
    console.log('[WebNotifications] Permission not granted');
    return null;
  }

  // Calculate delay in milliseconds
  const now = new Date();
  const delay = triggerTime.getTime() - now.getTime();

  if (delay <= 0) {
    console.log('[WebNotifications] Trigger time has passed');
    return null;
  }

  // Use setTimeout for web notifications
  const timeoutId = setTimeout(() => {
    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.png',
        badge: options.badge || '/favicon.png',
        tag: options.tag,
        data: options.data,
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('[WebNotifications] Error showing notification:', error);
    }
  }, delay);

  // Return timeout ID as notification ID
  return `web-${timeoutId}`;
}

/**
 * Cancel a scheduled web notification
 */
export function cancelWebNotification(notificationId: string): void {
  if (notificationId.startsWith('web-')) {
    const timeoutId = parseInt(notificationId.replace('web-', ''));
    clearTimeout(timeoutId);
  }
}

/**
 * Show immediate web notification (for testing/preview)
 */
export async function showWebNotification(options: WebNotificationOptions): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.log('[WebNotifications] Notifications not supported');
    return;
  }

  const hasPermission = await requestWebNotificationPermission();
  if (!hasPermission) {
    console.log('[WebNotifications] Permission not granted');
    return;
  }

  try {
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.png',
      badge: options.badge || '/favicon.png',
      tag: options.tag,
      data: options.data,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('[WebNotifications] Error showing notification:', error);
  }
}

/**
 * Check if web notifications are supported
 */
export function isWebNotificationSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'Notification' in window && typeof Notification !== 'undefined';
}

/**
 * Get current notification permission status
 */
export function getWebNotificationPermission(): NotificationPermission | null {
  if (typeof window === 'undefined' || !isWebNotificationSupported()) {
    return null;
  }
  return Notification.permission;
}

