import { Platform, Linking, Alert, PermissionsAndroid, NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import { getDNDNativeModule, isNativeDNDAvailable } from './dndNativeModule';

/**
 * System-level Do Not Disturb service
 * Handles system-level DND access for Android and iOS
 */

export interface DNDSystemStatus {
  isAvailable: boolean;
  isActive: boolean;
  canControl: boolean;
  platform: 'android' | 'ios' | 'web';
}

/**
 * Check if system-level DND is available on this platform
 */
export async function checkDNDSystemAvailability(): Promise<DNDSystemStatus> {
  if (Platform.OS === 'web') {
    return {
      isAvailable: false,
      isActive: false,
      canControl: false,
      platform: 'web',
    };
  }

  if (Platform.OS === 'android') {
    try {
      // Check if we can access notification policy
      const hasPermission = await checkAndroidDNDPermission();
      
      // Check if native DND control is available
      const canControlDirectly = isNativeDNDAvailable() && hasPermission;

      // Check current DND status
      const isActive = await getSystemDNDStatus();

      return {
        isAvailable: true,
        isActive,
        canControl: canControlDirectly || hasPermission, // Can control if we have permission
        platform: 'android',
      };
    } catch (error) {
      return {
        isAvailable: true,
        isActive: false,
        canControl: false,
        platform: 'android',
      };
    }
  }

  if (Platform.OS === 'ios') {
    // iOS doesn't allow apps to control system DND directly
    // But we can check if Focus modes are available (iOS 15+)
    const isActive = false; // Can't check on iOS without native module
    return {
      isAvailable: true,
      isActive,
      canControl: false, // iOS security restriction
      platform: 'ios',
    };
  }

  return {
    isAvailable: false,
    isActive: false,
    canControl: false,
    platform: Platform.OS as 'android' | 'ios' | 'web',
  };
}

/**
 * Request Android DND permission
 */
async function checkAndroidDNDPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // Check if we have notification policy access
    // This requires WRITE_SETTINGS permission or notification policy access
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch (error) {
    return false;
  }
}

/**
 * Request Android system settings permission
 */
export async function requestAndroidDNDPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  try {
    // First request notification permission
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      return false;
    }

    // For Android 6.0+, we need ACCESS_NOTIFICATION_POLICY permission
    // This is a special permission that requires user action in system settings
    if (Platform.Version >= 23) {
      try {
        // Try to check if we already have notification policy access
        const nativeModule = getDNDNativeModule();
        if (nativeModule?.isNotificationPolicyAccessGranted) {
          const granted = await nativeModule.isNotificationPolicyAccessGranted();
          if (granted) {
            return true;
          }
        }

        // Try to request notification policy access
        // This opens a system dialog
        if (nativeModule?.requestNotificationPolicyAccess) {
          const granted = await nativeModule.requestNotificationPolicyAccess();
          return granted;
        }
      } catch (error) {
        console.log('[DNDService] NotificationManager not available:', error);
      }

      // If NotificationManager is not available, we need to guide user to settings
      // Note: ACCESS_NOTIFICATION_POLICY requires opening system settings manually
      // This is a security feature of Android
      return false; // Will guide user to settings
    }

    return true;
  } catch (error) {
    console.error('[DNDService] Error requesting DND permission:', error);
    return false;
  }
}

/**
 * Open system DND settings
 * Uses platform-specific intents/URLs to open DND settings directly
 */
export async function openSystemDNDSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // Try Android-specific DND settings intent
      // This opens the notification policy access settings directly
      const dndSettingsIntent = 'android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS';
      const canOpen = await Linking.canOpenURL(dndSettingsIntent);
      
      if (canOpen) {
        try {
          await Linking.openURL(dndSettingsIntent);
          return;
        } catch (error) {
          console.log('[DNDService] Could not open DND settings intent, trying fallback');
        }
      }

      // Fallback: Try to open sound settings (where DND is usually located)
      const soundSettingsIntent = 'android.settings.SOUND_SETTINGS';
      const canOpenSound = await Linking.canOpenURL(soundSettingsIntent);
      if (canOpenSound) {
        try {
          await Linking.openURL(soundSettingsIntent);
          return;
        } catch (error) {
          console.log('[DNDService] Could not open sound settings, using general settings');
        }
      }

      // Final fallback: Open general settings
      await Linking.openSettings();
    } catch (error) {
      console.error('[DNDService] Error opening DND settings:', error);
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Sound & vibration > Do Not Disturb to configure system-level DND.',
        [{ text: 'OK' }]
      );
    }
  } else if (Platform.OS === 'ios') {
    try {
      // iOS: Try to open Focus settings (iOS 15+)
      // For older iOS, this will open general settings
      const focusSettingsURL = 'app-settings:';
      const canOpen = await Linking.canOpenURL(focusSettingsURL);
      if (canOpen) {
        await Linking.openURL(focusSettingsURL);
      } else {
        // Fallback: open general settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('[DNDService] Error opening iOS DND settings:', error);
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Focus > Do Not Disturb to configure system-level DND.',
        [{ text: 'OK' }]
      );
    }
  }
}

/**
 * Enable system-level DND (Android only)
 * Attempts to enable DND using available APIs
 */
export async function enableSystemDND(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    // First, request permission
    const hasPermission = await requestAndroidDNDPermission();
    
    if (!hasPermission) {
      // Try to request notification policy access
      try {
        // For Android 6.0+, we need to request notification policy access
        // This opens a system dialog
        const nativeModule = getDNDNativeModule();
        if (nativeModule?.requestNotificationPolicyAccess) {
          const granted = await nativeModule.requestNotificationPolicyAccess();
          if (granted) {
            // Permission granted, try to enable DND
            return await tryEnableDNDDirectly();
          }
        }
      } catch (error) {
        console.log('[DNDService] Could not request policy access:', error);
      }

      // Guide user to settings
      Alert.alert(
        'Permission Required',
        'To enable system-level Do Not Disturb, please grant notification policy access in system settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => openSystemDNDSettings(),
          },
        ]
      );
      return false;
    }

    // Try to enable DND directly
    return await tryEnableDNDDirectly();
  } catch (error) {
    console.error('[DNDService] Error enabling system DND:', error);
    return false;
  }
}

/**
 * Try to enable DND directly using NotificationManager
 */
async function tryEnableDNDDirectly(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const nativeModule = getDNDNativeModule();
    
    if (nativeModule?.setInterruptionFilter) {
      // INTERRUPTION_FILTER_PRIORITY = 3 (priority only mode)
      // This is a common DND mode that allows priority notifications
      const result = await nativeModule.setInterruptionFilter(3);
      if (result) {
        return true;
      }
    }

    // If direct control doesn't work, try using Android Intent
    try {
      // Try to open DND settings with intent to enable
      const intent = 'android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS';
      const canOpen = await Linking.canOpenURL(intent);
      if (canOpen) {
        await Linking.openURL(intent);
        // Return false because we're opening settings, not directly enabling
        return false;
      }
    } catch (error) {
      console.log('[DNDService] Could not open DND settings intent:', error);
    }

    // Fallback: Guide user to settings
    Alert.alert(
      'Enable Do Not Disturb',
      'To enable system-level Do Not Disturb, please use the system settings. We\'ll open it for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => openSystemDNDSettings(),
        },
      ]
    );

    return false;
  } catch (error) {
    console.error('[DNDService] Error trying to enable DND directly:', error);
    return false;
  }
}

/**
 * Disable system-level DND (Android only)
 * Attempts to disable DND using available APIs
 */
export async function disableSystemDND(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const hasPermission = await checkAndroidDNDPermission();
    if (!hasPermission) {
      return false;
    }

    // Try to disable DND directly
    try {
      const nativeModule = getDNDNativeModule();
      
      if (nativeModule?.setInterruptionFilter) {
        // INTERRUPTION_FILTER_ALL = 1 (disable DND, allow all notifications)
        const result = await nativeModule.setInterruptionFilter(1);
        if (result) {
          return true;
        }
      }
    } catch (error) {
      console.log('[DNDService] Could not disable DND directly:', error);
    }

    // Fallback: Guide user to settings
    Alert.alert(
      'Disable Do Not Disturb',
      'To disable system-level Do Not Disturb, please use the system settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => openSystemDNDSettings(),
        },
      ]
    );

    return false;
  } catch (error) {
    console.error('[DNDService] Error disabling system DND:', error);
    return false;
  }
}

/**
 * Check current system DND status
 * Attempts to check DND status using available APIs
 */
export async function getSystemDNDStatus(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Platform.OS === 'android') {
    try {
      // Try to check DND status using native module
      const nativeModule = getDNDNativeModule();
      
      if (nativeModule?.getCurrentInterruptionFilter) {
        try {
          // Try to get current interruption filter
          // INTERRUPTION_FILTER_ALL = 1 (not in DND)
          // INTERRUPTION_FILTER_NONE = 2 (total silence)
          // INTERRUPTION_FILTER_PRIORITY = 3 (priority only)
          // INTERRUPTION_FILTER_ALARMS = 4 (alarms only)
          // INTERRUPTION_FILTER_UNKNOWN = 0
          const filter = await nativeModule.getCurrentInterruptionFilter();
          if (filter !== undefined && filter !== null) {
            // If filter is not ALL (1), then DND is active
            return filter !== 1;
          }
        } catch (error) {
          console.log('[DNDService] Could not check DND status via native module:', error);
        }
      }

      // Fallback: Check if we can access notification policy
      // If we have permission, we can try to infer status
      const hasPermission = await checkAndroidDNDPermission();
      if (hasPermission) {
        // We have permission but can't check status directly
        // Return false as default (assume not active)
        return false;
      }
    } catch (error) {
      console.error('[DNDService] Error checking DND status:', error);
    }
  }

  if (Platform.OS === 'ios') {
    // iOS doesn't provide a direct API to check Focus/DND status
    // We can only guide users to settings
    return false;
  }

  return false;
}

/**
 * Get instructions for enabling system DND based on platform
 */
export function getSystemDNDInstructions(): string {
  if (Platform.OS === 'android') {
    return 'To enable system-level Do Not Disturb:\n\n1. Open Settings\n2. Go to Sound & vibration\n3. Tap Do Not Disturb\n4. Enable it and configure your preferences\n\nNote: System-level DND requires special permissions that may need to be granted manually.';
  } else if (Platform.OS === 'ios') {
    return 'To enable system-level Do Not Disturb:\n\n1. Open Settings\n2. Go to Focus\n3. Tap Do Not Disturb\n4. Enable it and configure your preferences\n\nNote: iOS does not allow apps to control system DND directly for privacy reasons.';
  }
  return 'System-level Do Not Disturb is not available on this platform.';
}

/**
 * Get installed apps that can be whitelisted (Android only)
 * Note: This requires QUERY_ALL_PACKAGES permission or specific package queries
 */
export async function getInstalledApps(): Promise<Array<{ packageName: string; appName: string }>> {
  if (Platform.OS !== 'android') {
    return [];
  }

  // Note: Getting installed apps requires special permissions
  // For Expo, we'll return common apps that users can manually configure
  // In a bare React Native app, you could use:
  // - react-native-installed-apps
  // - Custom native module using PackageManager
  
  return [];
}

/**
 * Open system app notification settings for whitelisting
 */
export async function openAppNotificationSettings(packageName?: string): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      if (packageName) {
        // Try to open specific app's notification settings
        const url = `android.settings.APP_NOTIFICATION_SETTINGS`;
        const intent = `android.settings.APP_NOTIFICATION_SETTINGS`;
        // Note: This requires the package name to be passed
        // For Expo, we'll open general notification settings
        await Linking.openSettings();
      } else {
        // Open general notification settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Error opening app notification settings:', error);
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Apps > [App Name] > Notifications to configure app-specific notification settings.',
        [{ text: 'OK' }]
      );
    }
  } else if (Platform.OS === 'ios') {
    try {
      // iOS: Open notification settings
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening iOS notification settings:', error);
      Alert.alert(
        'Open Settings',
        'Please go to Settings > Focus > Do Not Disturb > Apps to configure which apps can send notifications.',
        [{ text: 'OK' }]
      );
    }
  }
}

/**
 * Get instructions for whitelisting apps at system level
 */
export function getAppWhitelistInstructions(): string {
  if (Platform.OS === 'android') {
    return 'To whitelist apps at system level:\n\n1. Open Settings\n2. Go to Apps & notifications\n3. Tap Do Not Disturb\n4. Tap "Apps" or "Allowed apps"\n5. Select apps that can send notifications during DND\n\nAlternatively:\n1. Go to Settings > Apps\n2. Select an app\n3. Tap Notifications\n4. Enable "Allow during Do Not Disturb"';
  } else if (Platform.OS === 'ios') {
    return 'To whitelist apps at system level:\n\n1. Open Settings\n2. Go to Focus\n3. Tap Do Not Disturb\n4. Scroll to "Apps"\n5. Tap "Add Apps" or "Allow Notifications From"\n6. Select apps that can send notifications during DND\n\nNote: iOS allows you to configure which apps can break through Focus modes.';
  }
  return 'App whitelisting is not available on this platform.';
}

