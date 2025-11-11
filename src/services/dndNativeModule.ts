/**
 * Native Module Wrapper for DND Control
 * 
 * This file provides a bridge to native Android/iOS DND functionality.
 * In Expo, NativeModules may not be available, so we provide fallbacks.
 * 
 * For a production app, you would need to:
 * 1. Eject from Expo (or use Expo dev client with custom native code)
 * 2. Create native modules for Android (Java/Kotlin) and iOS (Swift/Objective-C)
 * 3. Use Android's NotificationManager.setInterruptionFilter()
 * 4. Use iOS's UNUserNotificationCenter (limited - iOS doesn't allow direct DND control)
 */

import { Platform, NativeModules } from 'react-native';

export interface DNDNativeModule {
  // Android
  setInterruptionFilter?: (filter: number) => Promise<boolean>;
  getCurrentInterruptionFilter?: () => Promise<number>;
  isNotificationPolicyAccessGranted?: () => Promise<boolean>;
  requestNotificationPolicyAccess?: () => Promise<boolean>;
  
  // iOS (limited - iOS doesn't allow direct DND control)
  checkFocusStatus?: () => Promise<boolean>;
}

/**
 * Get the native DND module if available
 */
export function getDNDNativeModule(): DNDNativeModule | null {
  if (Platform.OS === 'android') {
    try {
      // Try to get NotificationManager from native modules
      const { NotificationManager } = NativeModules;
      if (NotificationManager) {
        return {
          setInterruptionFilter: NotificationManager.setInterruptionFilter,
          getCurrentInterruptionFilter: NotificationManager.getCurrentInterruptionFilter,
          isNotificationPolicyAccessGranted: NotificationManager.isNotificationPolicyAccessGranted,
          requestNotificationPolicyAccess: NotificationManager.requestNotificationPolicyAccess,
        };
      }
    } catch (error) {
      console.log('[DNDNativeModule] NotificationManager not available:', error);
    }
  }

  if (Platform.OS === 'ios') {
    try {
      // iOS doesn't provide direct DND control APIs
      // We can only check Focus status if available
      const { FocusManager } = NativeModules;
      if (FocusManager) {
        return {
          checkFocusStatus: FocusManager.checkFocusStatus,
        };
      }
    } catch (error) {
      console.log('[DNDNativeModule] FocusManager not available:', error);
    }
  }

  return null;
}

/**
 * Check if native DND control is available
 */
export function isNativeDNDAvailable(): boolean {
  const module = getDNDNativeModule();
  if (Platform.OS === 'android') {
    return !!(module?.setInterruptionFilter && module?.getCurrentInterruptionFilter);
  }
  if (Platform.OS === 'ios') {
    return !!module?.checkFocusStatus;
  }
  return false;
}

