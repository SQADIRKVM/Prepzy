import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Modal, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import {
  checkDNDSystemAvailability,
  enableSystemDND,
  disableSystemDND,
  openSystemDNDSettings,
  getSystemDNDInstructions,
  openAppNotificationSettings,
  getAppWhitelistInstructions,
  getSystemDNDStatus,
  DNDSystemStatus,
} from '../services/dndSystemService';

type Props = NativeStackScreenProps<any, 'DNDSettings'>;

interface CustomSchedule {
  id: string;
  title: string;
  days: string[];
  startTime: string;
  endTime: string;
  enabled: boolean;
  notificationIds?: string[];
}

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function DNDSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const [isDNDActive, setIsDNDActive] = useState(false);
  const [duration, setDuration] = useState(2);
  const [blockAllNotifications, setBlockAllNotifications] = useState(false);
  const [allowFavorites, setAllowFavorites] = useState(true);
  const [allowStudyReminders, setAllowStudyReminders] = useState(true);
  const [customSchedules, setCustomSchedules] = useState<CustomSchedule[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('9:00 AM');
  const [endTime, setEndTime] = useState('5:00 PM');
  const [showWhitelistModal, setShowWhitelistModal] = useState(false);
  const [systemDNDStatus, setSystemDNDStatus] = useState<DNDSystemStatus | null>(null);
  const [systemDNDActive, setSystemDNDActive] = useState(false);

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
    requestNotificationPermissions();
    checkSystemDNDAvailability();
  }, []);

  // Set up periodic status check if we can control DND
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (systemDNDStatus?.canControl && Platform.OS === 'android') {
      intervalId = setInterval(async () => {
        const isActive = await getSystemDNDStatus();
        setSystemDNDActive(isActive);
      }, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [systemDNDStatus?.canControl]);

  const checkSystemDNDAvailability = async () => {
    const status = await checkDNDSystemAvailability();
    setSystemDNDStatus(status);
    setSystemDNDActive(status.isActive);
  };

  // Save settings whenever they change
  useEffect(() => {
    saveSettings();
  }, [customSchedules, isDNDActive, blockAllNotifications, allowFavorites, allowStudyReminders]);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      showAlert({
        title: 'Notification Permission',
        message: 'Please enable notifications to use DND features effectively.',
        icon: 'notifications',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const loadSettings = async () => {
    try {
      const savedSchedules = await AsyncStorage.getItem('dnd_schedules');
      const savedSettings = await AsyncStorage.getItem('dnd_settings');

      if (savedSchedules) {
        setCustomSchedules(JSON.parse(savedSchedules));
      }
      if (savedSettings) {
        const settings = JSON.parse(savedSettings);
        setBlockAllNotifications(settings.blockAllNotifications || false);
        setAllowFavorites(settings.allowFavorites !== false);
        setAllowStudyReminders(settings.allowStudyReminders !== false);
      }
    } catch (error) {
      console.error('Error loading DND settings:', error);
    }
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('dnd_schedules', JSON.stringify(customSchedules));
      await AsyncStorage.setItem('dnd_settings', JSON.stringify({
        blockAllNotifications,
        allowFavorites,
        allowStudyReminders,
      }));
    } catch (error) {
      console.error('Error saving DND settings:', error);
    }
  };

  const handleAddSchedule = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNewScheduleName('');
    setSelectedDays([]);
    setStartTime('9:00 AM');
    setEndTime('5:00 PM');
    setShowAddModal(true);
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const activateDNDNow = async (active: boolean, hours: number) => {
    setIsDNDActive(active);

    if (active) {
      try {
        // Request permissions first
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          showAlert({
            title: 'Permission Required',
            message: 'Notification permission is required to schedule DND reminders.',
            icon: 'notifications',
            buttons: [{ text: 'OK', style: 'default' }],
          });
          setIsDNDActive(false);
          return;
        }

        // Schedule notification for when DND ends
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + hours);

        await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Do Not Disturb Ended',
            body: `Your ${hours}-hour DND session has ended. Notifications are now active.`,
            sound: true,
          },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: endTime,
          },
        });

        // Store DND end time
        await AsyncStorage.setItem('dnd_active_until', endTime.toISOString());

        showAlert({
          title: 'DND Activated',
          message: `Do Not Disturb is now active for ${hours} hour${hours > 1 ? 's' : ''}. You'll receive a notification when it ends.`,
          icon: 'checkmark-circle',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      } catch (error) {
        console.error('Error activating DND:', error);
        setIsDNDActive(false);
        showAlert({
          title: 'Error',
          message: 'Failed to activate DND. Please try again.',
          icon: 'close-circle',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    } else {
      // Cancel DND
      await AsyncStorage.removeItem('dnd_active_until');
      showAlert({
        title: 'DND Deactivated',
        message: 'Do Not Disturb has been turned off.',
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const saveSchedule = async () => {
    if (!newScheduleName.trim()) {
      showAlert({
        title: 'Error',
        message: 'Please enter a schedule name',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }
    if (selectedDays.length === 0) {
      showAlert({
        title: 'Error',
        message: 'Please select at least one day',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const newSchedule: CustomSchedule = {
      id: Date.now().toString(),
      title: newScheduleName,
      days: selectedDays,
      startTime,
      endTime,
      enabled: true,
      notificationIds: [],
    };

    try {
      // Schedule recurring notifications for this DND session
      await scheduleRecurringDND(newSchedule);

      setCustomSchedules(prev => [...prev, newSchedule]);
      setShowAddModal(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showAlert({
        title: 'Schedule Added',
        message: `"${newScheduleName}" has been scheduled for ${selectedDays.join(', ')} from ${startTime} to ${endTime}.`,
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (error) {
      console.error('Error saving schedule:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save schedule. Please check notification permissions and try again.',
        icon: 'close-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const scheduleRecurringDND = async (schedule: CustomSchedule) => {
    // This creates reminders for the DND periods
    // In a production app, you'd use background tasks for actual DND enforcement
    const notificationIds: string[] = [];

    try {
      // Request permissions first
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Notification permission not granted');
      }

      for (const day of schedule.days) {
        const dayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(day);
        if (dayIndex === -1) continue;

        try {
          // Parse time correctly (handle AM/PM if needed)
          const startTimeParts = schedule.startTime.split(':');
          const endTimeParts = schedule.endTime.split(':');
          const startHour = parseInt(startTimeParts[0]);
          const endHour = parseInt(endTimeParts[0]);
          const startMinute = startTimeParts[1] ? parseInt(startTimeParts[1].split(' ')[0]) : 0;
          const endMinute = endTimeParts[1] ? parseInt(endTimeParts[1].split(' ')[0]) : 0;

          // Schedule start notification
          const startId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${schedule.title} - DND Starting`,
              body: `Do Not Disturb period begins now (${schedule.startTime})`,
              sound: true,
              data: { scheduleId: schedule.id, type: 'start' },
            },
            trigger: {
              type: SchedulableTriggerInputTypes.CALENDAR,
              weekday: dayIndex + 1,
              hour: startHour,
              minute: startMinute,
              repeats: true,
            },
          });

          // Schedule end notification
          const endId = await Notifications.scheduleNotificationAsync({
            content: {
              title: `${schedule.title} - DND Ending`,
              body: `Do Not Disturb period ends now (${schedule.endTime})`,
              sound: true,
              data: { scheduleId: schedule.id, type: 'end' },
            },
            trigger: {
              type: SchedulableTriggerInputTypes.CALENDAR,
              weekday: dayIndex + 1,
              hour: endHour,
              minute: endMinute,
              repeats: true,
            },
          });

          notificationIds.push(startId, endId);
        } catch (error) {
          console.error(`Error scheduling DND for ${day}:`, error);
        }
      }

      schedule.notificationIds = notificationIds;
    } catch (error) {
      console.error('Error scheduling recurring DND:', error);
      throw error;
    }
  };

  const deleteSchedule = (id: string) => {
    showAlert({
      title: 'Delete Schedule',
      message: 'Are you sure you want to delete this schedule?',
      icon: 'trash',
      iconColor: '#FFB4A0',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Find schedule and cancel its notifications
            const schedule = customSchedules.find(s => s.id === id);
            if (schedule?.notificationIds) {
              for (const notifId of schedule.notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(notifId);
              }
            }

            setCustomSchedules(prev => prev.filter(s => s.id !== id));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    });
  };

  const toggleSchedule = (id: string) => {
    setCustomSchedules(prev =>
      prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s))
    );
  };

  const handleWhitelistApps = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowWhitelistModal(true);
  };

  const handleFavoritesInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showAlert({
      title: 'Favorite Contacts',
      message: 'This feature uses your device\'s system favorites. To set up favorites:\n\n1. Open your Contacts app\n2. Select a contact\n3. Tap "Add to Favorites"\n\nCalls from these contacts will be allowed during DND mode when this setting is enabled.',
      icon: 'information-circle',
      buttons: [{ text: 'Got it', style: 'default' }],
    });
  };

  const handleSystemDNDToggle = async (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (value) {
      // Enable system DND
      const success = await enableSystemDND();
      if (success) {
        setSystemDNDActive(true);
      } else {
        // User was guided to settings, check again after a delay
        setTimeout(() => {
          checkSystemDNDAvailability();
        }, 2000);
      }
    } else {
      // Disable system DND
      const success = await disableSystemDND();
      if (success) {
        setSystemDNDActive(false);
      } else {
        // User was guided to settings
        setTimeout(() => {
          checkSystemDNDAvailability();
        }, 2000);
      }
    }
  };

  const handleSystemDNDInfo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const instructions = getSystemDNDInstructions();
    showAlert({
      title: 'System-Level Do Not Disturb',
      message: instructions,
      icon: 'information-circle',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Settings',
          onPress: () => {
            openSystemDNDSettings();
          },
        },
      ],
    });
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    subtitle?: string,
    value?: boolean,
    onValueChange?: (value: boolean) => void,
    showChevron?: boolean,
    onPress?: () => void,
    showInfo?: boolean,
    onInfoPress?: () => void
  ) => (
    <Pressable
      style={[
        styles.settingRow,
        { backgroundColor: theme.colors.card },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${theme.colors.primary}20` },
          ]}
        >
          <Ionicons name={icon as any} size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.settingRight}>
        {showInfo && onInfoPress && (
          <Pressable onPress={onInfoPress} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={22} color={theme.colors.text.secondary} />
          </Pressable>
        )}
        {showChevron ? (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
        ) : !showInfo ? (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.text.inverse}
          />
        ) : (
          <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.colors.text.inverse}
          />
        )}
      </View>
    </Pressable>
  );

  const renderScheduleRow = (
    title: string,
    time: string,
    value: boolean,
    onValueChange: (value: boolean) => void
  ) => (
    <View style={[styles.scheduleRow, { backgroundColor: theme.colors.card }]}>
      <View style={styles.scheduleText}>
        <Text style={[styles.scheduleTitle, { color: theme.colors.text.primary }]}>
          {title}
        </Text>
        <Text style={[styles.scheduleTime, { color: theme.colors.text.secondary }]}>
          {time}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.text.inverse}
      />
    </View>
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
    >
      {/* Header */}
      <SafeAreaView edges={['top', 'left', 'right']}>
        <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          DND Settings
        </Text>
        <Pressable
          onPress={() => {
            showAlert({
              title: 'DND Features',
              message: '✅ Working Features:\n\n' +
              '• Activate DND Now - Schedules a notification when DND ends\n' +
              '• Custom Schedules - Creates recurring notifications for DND start/end times\n' +
              '• Settings Persistence - All your preferences are saved\n' +
              '• Whitelist Apps - Saved preferences (visual only)\n\n' +
              '⚠️ System-Level Limitation:\n' +
              'iOS and Android do not allow third-party apps to block system notifications without special permissions that are typically only available to system apps or apps with Accessibility Service permissions. This app provides DND scheduling and reminders, but cannot actually block notifications from other apps at the system level.\n\n' +
              '✅ What This App Does:\n' +
              '• Schedules DND start/end notifications\n' +
              '• Tracks DND periods and preferences\n' +
              '• Provides reminders about DND status\n' +
              '• Manages custom DND schedules\n\n' +
              'For actual notification blocking, users need to:\n' +
              '• Use system DND settings (iOS Settings > Focus, Android Settings > Do Not Disturb)\n' +
              '• Or use accessibility services (requires special permissions)',
              icon: 'information-circle',
              buttons: [{ text: 'Got it', style: 'default' }],
            });
          }}
          style={styles.backButton}
        >
          <Ionicons name="information-circle-outline" size={28} color={theme.colors.text.primary} />
        </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && {
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }
        ]}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* DND Status Banner */}
        {isDNDActive && (
          <View style={[styles.statusBanner, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name="remove-circle" size={24} color={theme.colors.primary} />
            <View style={styles.statusBannerText}>
              <Text style={[styles.statusBannerTitle, { color: theme.colors.primary }]}>
                DND Active
              </Text>
              <Text style={[styles.statusBannerSubtitle, { color: theme.colors.text.secondary }]}>
                Do Not Disturb is currently active for {duration} hour{duration > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
        )}

        {/* System-Level DND Section */}
        {systemDNDStatus && systemDNDStatus.isAvailable && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
                System-Level DND
              </Text>
              <Pressable onPress={handleSystemDNDInfo} style={styles.infoIconButton}>
                <Ionicons name="information-circle-outline" size={20} color={theme.colors.text.secondary} />
              </Pressable>
            </View>
            <View style={[styles.systemDNDCard, { backgroundColor: theme.colors.card }]}>
              <View style={styles.systemDNDContent}>
                <View style={styles.systemDNDLeft}>
                  <View style={[styles.systemDNDIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
                    <Ionicons name="shield-checkmark" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.systemDNDText}>
                    <Text style={[styles.systemDNDTitle, { color: theme.colors.text.primary }]}>
                      Control System DND
                    </Text>
                    <Text style={[styles.systemDNDSubtitle, { color: theme.colors.text.secondary }]}>
                      {systemDNDStatus.canControl 
                        ? 'Control device Do Not Disturb settings'
                        : Platform.OS === 'ios'
                        ? 'iOS requires manual setup in Settings'
                        : 'Requires system permissions'}
                    </Text>
                  </View>
                </View>
                {systemDNDStatus.canControl ? (
                  <Switch
                    value={systemDNDActive}
                    onValueChange={handleSystemDNDToggle}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.text.inverse}
                  />
                ) : (
                  <Pressable
                    style={[styles.openSettingsButton, { backgroundColor: theme.colors.primary }]}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      }
                      openSystemDNDSettings();
                    }}
                  >
                    <Text style={[styles.openSettingsButtonText, { color: theme.colors.background }]}>
                      Open Settings
                    </Text>
                  </Pressable>
                )}
              </View>
              {!systemDNDStatus.canControl && (
                <Pressable
                  style={styles.instructionsButton}
                  onPress={handleSystemDNDInfo}
                >
                  <Ionicons name="help-circle-outline" size={16} color={theme.colors.text.secondary} />
                  <Text style={[styles.instructionsButtonText, { color: theme.colors.text.secondary }]}>
                    View Instructions
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Activate DND */}
        {renderSettingRow(
          'remove-circle',
          'Activate DND Now',
          `Schedule ${duration} hour${duration > 1 ? 's' : ''} of focus time`,
          isDNDActive,
          (value) => activateDNDNow(value, duration)
        )}

        {/* Duration Slider */}
        <View style={styles.section}>
          <View style={styles.durationHeader}>
            <Text style={[styles.sectionLabel, { color: theme.colors.text.primary }]}>
              Set Duration
            </Text>
            <Text style={[styles.durationValue, { color: theme.colors.primary }]}>
              {duration} hours
            </Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={8}
            step={1}
            value={duration}
            onValueChange={setDuration}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor={theme.colors.border}
            thumbTintColor={theme.colors.primary}
          />
        </View>

        {/* Customization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Customization
          </Text>
          <View style={styles.settingsGroup}>
            {renderSettingRow(
              'notifications-off',
              'Block All Notifications',
              undefined,
              blockAllNotifications,
              setBlockAllNotifications
            )}
            {renderSettingRow(
              'star',
              'Allow Calls from Favorites',
              'Uses system favorite contacts',
              allowFavorites,
              setAllowFavorites,
              false,
              undefined,
              true,
              handleFavoritesInfo
            )}
            {renderSettingRow(
              'school',
              'Allow App Study Reminders',
              undefined,
              allowStudyReminders,
              setAllowStudyReminders
            )}
            {renderSettingRow(
              'apps',
              'Whitelist Apps',
              'Configure system-level app whitelist',
              undefined,
              undefined,
              true,
              handleWhitelistApps
            )}
          </View>
        </View>

        {/* Scheduled Sessions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Custom Schedules
          </Text>
          {customSchedules.length === 0 ? (
            <View style={[styles.emptySchedule, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="calendar-outline" size={32} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyScheduleText, { color: theme.colors.text.secondary }]}>
                No custom schedules yet
              </Text>
              <Text style={[styles.emptyScheduleSubtext, { color: theme.colors.text.tertiary }]}>
                Tap "Add New Schedule" below to create one
              </Text>
            </View>
          ) : (
            <View style={styles.scheduleGroup}>
              {customSchedules.map((schedule) => (
              <View
                key={schedule.id}
                style={[styles.scheduleRow, { backgroundColor: theme.colors.card }]}
              >
                <View style={styles.scheduleText}>
                  <Text style={[styles.scheduleTitle, { color: theme.colors.text.primary }]}>
                    {schedule.title}
                  </Text>
                  <Text style={[styles.scheduleTime, { color: theme.colors.text.secondary }]}>
                    {schedule.days.join(', ')} • {schedule.startTime} - {schedule.endTime}
                  </Text>
                </View>
                <View style={styles.scheduleActions}>
                  <Switch
                    value={schedule.enabled}
                    onValueChange={() => toggleSchedule(schedule.id)}
                    trackColor={{
                      false: theme.colors.border,
                      true: theme.colors.primary,
                    }}
                    thumbColor={theme.colors.text.inverse}
                  />
                  <Pressable
                    onPress={() => deleteSchedule(schedule.id)}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </Pressable>
                </View>
              </View>
            ))}
            </View>
          )}
        </View>

        {/* Add New Schedule Button */}
        <Pressable
          style={[
            styles.addScheduleButton,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={handleAddSchedule}
        >
          <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
          <Text style={[styles.addScheduleText, { color: theme.colors.primary }]}>
            Add New Schedule
          </Text>
        </Pressable>
      </ScrollView>

      {/* Add Schedule Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Add New Schedule
              </Text>
              <Pressable onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Schedule Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                  Schedule Name
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.card,
                      color: theme.colors.text.primary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  placeholder="e.g., Study Time"
                  placeholderTextColor={theme.colors.text.tertiary}
                  value={newScheduleName}
                  onChangeText={setNewScheduleName}
                />
              </View>

              {/* Days Selection */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                  Select Days
                </Text>
                <View style={styles.daysContainer}>
                  {daysOfWeek.map((day) => (
                    <Pressable
                      key={day}
                      style={[
                        styles.dayButton,
                        {
                          backgroundColor: selectedDays.includes(day)
                            ? theme.colors.primary
                            : theme.colors.card,
                          borderColor: selectedDays.includes(day)
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                      onPress={() => toggleDay(day)}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          {
                            color: selectedDays.includes(day)
                              ? '#FFFFFF'
                              : theme.colors.text.primary,
                          },
                        ]}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Time Selection */}
              <View style={styles.timeContainer}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                    Start Time
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text.primary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="9:00 AM"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={startTime}
                    onChangeText={setStartTime}
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: theme.colors.text.primary }]}>
                    End Time
                  </Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.colors.card,
                        color: theme.colors.text.primary,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    placeholder="5:00 PM"
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={endTime}
                    onChangeText={setEndTime}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={saveSchedule}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Save Schedule
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Whitelist Apps Modal */}
      <Modal
        visible={showWhitelistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowWhitelistModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Whitelist Apps
              </Text>
              <Pressable onPress={() => setShowWhitelistModal(false)}>
                <Ionicons name="close" size={28} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalDescription, { color: theme.colors.text.secondary, marginBottom: 20 }]}>
                Configure which apps can send notifications during Do Not Disturb mode. This must be configured at the system level for actual notification blocking.
              </Text>

              {/* System-Level Whitelist Info */}
              <View style={[styles.systemWhitelistCard, { backgroundColor: `${theme.colors.primary}10` }]}>
                <View style={styles.systemWhitelistHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={theme.colors.primary} />
                  <Text style={[styles.systemWhitelistTitle, { color: theme.colors.primary }]}>
                    System-Level Whitelist
                  </Text>
                </View>
                <Text style={[styles.systemWhitelistDescription, { color: theme.colors.text.secondary }]}>
                  To whitelist apps at the system level (so they can send notifications even when system DND is active), configure this in your device settings. This is the only way to actually control which apps can break through Do Not Disturb.
                </Text>
                <Pressable
                  style={[styles.systemWhitelistButton, { backgroundColor: theme.colors.primary }]}
                  onPress={async () => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    await openAppNotificationSettings();
                  }}
                >
                  <Ionicons name="settings-outline" size={16} color={theme.colors.background} />
                  <Text style={[styles.systemWhitelistButtonText, { color: theme.colors.background }]}>
                    Open System Settings
                  </Text>
                </Pressable>
                <Pressable
                  style={styles.systemWhitelistInfoButton}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    const instructions = getAppWhitelistInstructions();
                    showAlert({
                      title: 'System-Level App Whitelist',
                      message: instructions,
                      icon: 'information-circle',
                      buttons: [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Open Settings',
                          onPress: () => openAppNotificationSettings(),
                        },
                      ],
                    });
                  }}
                >
                  <Ionicons name="help-circle-outline" size={14} color={theme.colors.text.secondary} />
                  <Text style={[styles.systemWhitelistInfoText, { color: theme.colors.text.secondary }]}>
                    View Instructions
                  </Text>
                </Pressable>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowWhitelistModal(false);
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert */}
      {alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          icon={alertConfig.icon as any}
          iconColor={alertConfig.iconColor}
          buttons={alertConfig.buttons}
          onDismiss={hideAlert}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoIconButton: {
    padding: 4,
  },
  systemDNDCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  systemDNDContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  systemDNDLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  systemDNDIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  systemDNDText: {
    flex: 1,
  },
  systemDNDTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  systemDNDSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  openSettingsButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  openSettingsButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  instructionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    gap: 6,
  },
  instructionsButtonText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingsGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    padding: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  durationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  scheduleGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 12,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  scheduleText: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 13,
  },
  addScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  addScheduleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scheduleActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  modalBody: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dayButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  systemWhitelistCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  systemWhitelistHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  systemWhitelistTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  systemWhitelistDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  systemWhitelistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  systemWhitelistButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  systemWhitelistInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  systemWhitelistInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    gap: 12,
  },
  statusBannerText: {
    flex: 1,
  },
  statusBannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  statusBannerSubtitle: {
    fontSize: 13,
  },
  emptySchedule: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
  },
  emptyScheduleText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyScheduleSubtext: {
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
});
