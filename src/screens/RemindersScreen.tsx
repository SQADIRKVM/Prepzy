import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { LinearGradient } from 'expo-linear-gradient';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';
import { requestNotificationPermissions } from '../services/notificationService';
import { showWebNotification, isWebNotificationSupported } from '../services/webNotificationService';
import { Audio } from 'expo-av';

type Props = NativeStackScreenProps<any, 'Reminders'>;

interface Reminder {
  id: string;
  label: string;
  time: string;
  days: number;
  hours: number;
  minutes: number;
  enabled: boolean;
}

// Helper function to parse reminder string (e.g., '1d9h' -> {days: 1, hours: 9, minutes: 0})
const parseReminderString = (str: string): { days: number; hours: number; minutes: number } => {
  const daysMatch = str.match(/(\d+)d/);
  const hoursMatch = str.match(/(\d+)h/);
  const minutesMatch = str.match(/(\d+)m/);
  
  return {
    days: daysMatch ? parseInt(daysMatch[1]) : 0,
    hours: hoursMatch ? parseInt(hoursMatch[1]) : 0,
    minutes: minutesMatch ? parseInt(minutesMatch[1]) : 0,
  };
};

// Helper function to create reminder string (e.g., {days: 1, hours: 9} -> '1d9h')
const createReminderString = (days: number, hours: number, minutes: number): string => {
  let result = '';
  if (days > 0) result += `${days}d`;
  if (hours > 0) result += `${hours}h`;
  if (minutes > 0) result += `${minutes}m`;
  return result || '0m';
};

// Helper function to create label from time values
const createLabel = (days: number, hours: number, minutes: number): string => {
  const parts: string[] = [];
  if (days > 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes > 1 ? 's' : ''}`);
  return parts.join(', ') + ' before';
};

export default function RemindersScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { examId } = route.params || {};
  const { getExamById, updateExam } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  
  const defaultReminders: Reminder[] = [
    {
      id: '1',
      label: '1 day before',
      time: '1 day',
      days: 1,
      hours: 0,
      minutes: 0,
      enabled: false,
    },
    {
      id: '2',
      label: '3 hours before',
      time: '3 hours',
      days: 0,
      hours: 3,
      minutes: 0,
      enabled: false,
    },
    {
      id: '3',
      label: '1 hour before',
      time: '1 hour',
      days: 0,
      hours: 1,
      minutes: 0,
      enabled: false,
    },
  ];

  const [reminders, setReminders] = useState<Reminder[]>(defaultReminders);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDays, setCustomDays] = useState('0');
  const [customHours, setCustomHours] = useState('0');
  const [customMinutes, setCustomMinutes] = useState('0');
  const [forceUpdate, setForceUpdate] = useState(0);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Default');

  // Load exam reminders if editing
  useEffect(() => {
    if (examId) {
      const exam = getExamById(examId);
      if (exam) {
        // Load notification sound
        if (exam.notificationSound) {
          setSelectedSound(exam.notificationSound);
        }
        
        if (exam.reminders && exam.reminders.length > 0) {
          // Convert saved reminder strings to Reminder objects
          const loadedReminders = exam.reminders.map((reminderStr, index) => {
            const { days, hours, minutes } = parseReminderString(reminderStr);
            return {
              id: `loaded-${index}`,
              label: createLabel(days, hours, minutes),
              time: createLabel(days, hours, minutes).replace(' before', ''),
              days,
              hours,
              minutes,
              enabled: true,
            };
          });
          setReminders(loadedReminders);
        }
      }
    }
  }, [examId, getExamById]);

  const toggleReminder = (id: string) => {
    console.log('Toggling reminder:', id);
    setReminders(prevReminders => {
      const updated = prevReminders.map(reminder =>
        reminder.id === id ? { ...reminder, enabled: !reminder.enabled } : reminder
      );
      console.log('Updated reminders after toggle:', updated);
      return updated;
    });
  };

  const deleteReminder = (id: string) => {
    showAlert({
      title: 'Delete Reminder',
      message: 'Are you sure you want to delete this reminder?',
      icon: 'trash',
      iconColor: '#FFB4A0',
      buttons: [
        { text: 'Cancel', style: 'cancel', onPress: () => {} },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // IMMEDIATE state update with brand new array
            setReminders(prev => {
              const filtered = prev.filter(r => r.id !== id);
              console.log('DELETING - Before:', prev.length, 'After:', filtered.length);
              return [...filtered]; // Force new array reference
            });
            
            // Force component re-render
            setForceUpdate(prev => prev + 1);
          },
        },
      ],
    });
  };

  const addCustomReminder = () => {
    setShowCustomModal(true);
  };

  const saveCustomReminder = () => {
    const days = parseInt(customDays) || 0;
    const hours = parseInt(customHours) || 0;
    const minutes = parseInt(customMinutes) || 0;

    if (days === 0 && hours === 0 && minutes === 0) {
      showAlert({
        title: 'Invalid Reminder',
        message: 'Please set at least one time value',
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const label = createLabel(days, hours, minutes);
    const timeDisplay = label.replace(' before', '');

    const newReminder: Reminder = {
      id: Date.now().toString(),
      label,
      time: timeDisplay,
      days,
      hours,
      minutes,
      enabled: true,
    };

    setReminders(prevReminders => [...prevReminders, newReminder]);
    setShowCustomModal(false);
    setCustomDays('0');
    setCustomHours('0');
    setCustomMinutes('0');
  };

  const addPreset = (preset: { label: string; days?: number; hours?: number; minutes?: number }) => {
    const days = preset.days || 0;
    const hours = preset.hours || 0;
    const minutes = preset.minutes || 0;

    const label = createLabel(days, hours, minutes);
    const timeDisplay = preset.label;

    const newReminder: Reminder = {
      id: Date.now().toString(),
      label,
      time: timeDisplay,
      days,
      hours,
      minutes,
      enabled: true,
    };

    setReminders(prevReminders => [...prevReminders, newReminder]);
  };

  // Map sound names to system sound identifiers
  const getSystemSound = (soundName: string): { previewUri?: string; notificationSound?: any } => {
    if (soundName === 'None (Silent)' || soundName === 'None') {
      return { notificationSound: false };
    }

    // System sound mappings
    // For Android: Use system notification sound URIs
    // For iOS: Use system sound IDs (via expo-av for preview, default for notifications)
    const systemSounds: { [key: string]: { android?: string; ios?: number } } = {
      'Default': { android: 'default', ios: 1000 }, // Default notification sound
      'Chime': { android: 'content://settings/system/notification_sound', ios: 1005 }, // Chime-like
      'Bell': { android: 'content://settings/system/notification_sound', ios: 1006 }, // Bell-like
      'Ding': { android: 'content://settings/system/notification_sound', ios: 1007 }, // Ding-like
      'Alert': { android: 'content://settings/system/notification_sound', ios: 1000 }, // Alert
      'Gentle': { android: 'content://settings/system/notification_sound', ios: 1005 }, // Gentle
      'Digital': { android: 'content://settings/system/notification_sound', ios: 1007 }, // Digital
      'Classic': { android: 'content://settings/system/notification_sound', ios: 1000 }, // Classic
    };

    const sound = systemSounds[soundName] || systemSounds['Default'];
    
    return {
      // For notifications, we'll use default (system sounds in notifications require custom files)
      // But we can use expo-av to play system sounds for preview
      notificationSound: 'default',
      previewUri: Platform.OS === 'android' ? sound.android : undefined,
      iosSoundId: Platform.OS === 'ios' ? sound.ios : undefined,
    };
  };

  // Play system sound preview using expo-av (for iOS system sounds)
  const playSystemSoundPreview = async (soundName: string) => {
    if (Platform.OS === 'web') return false;

    try {
      // For iOS, we can try to use expo-av with system sound files
      // But this is limited - we'll use notification preview instead which is more reliable
      return false;
    } catch (error) {
      console.log('System sound preview not available:', error);
      return false;
    }
  };

  const previewSound = async (soundName: string) => {
    // Notifications don't work on web
    if (Platform.OS === 'web') {
      setSelectedSound(soundName);
      return;
    }

    // Update selection immediately for better UX
    setSelectedSound(soundName);

    // Don't preview silent sounds
    if (soundName === 'None (Silent)' || soundName === 'None') {
      // Haptic feedback for silent selection
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics not available, ignore
        }
      }
      return;
    }

    try {
      // Request permissions first
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        // Haptic feedback even without permission
        if (Platform.OS !== 'web') {
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } catch (error) {
            // Haptics not available, ignore
          }
        }
        return;
      }

      // Handle web notifications
      if (Platform.OS === 'web') {
        if (isWebNotificationSupported()) {
          await showWebNotification({
            title: soundName,
            body: 'Sound preview',
            tag: 'sound-preview',
            silent: soundName === 'None (Silent)' || soundName === 'None',
          });
        }
        setSelectedSound(soundName);
        return;
      }

      // Import Notifications dynamically
      let Notifications: any = null;
      try {
        Notifications = require('expo-notifications');
      } catch (error) {
        console.log('[SoundPreview] Notifications not available');
        return;
      }

      // According to Expo docs: https://docs.expo.dev/versions/latest/sdk/notifications/
      // - iOS: sound can be 'default', false, or custom sound file name
      // - Android: sound can be true (use channel default), false (no sound), or custom sound URI
      // Since we set channel sound to 'default', using true on Android will use that
      const soundSetting = Platform.OS === 'android' 
        ? true // Android: true = use channel sound (which is 'default')
        : 'default'; // iOS: 'default' string

      // Schedule a preview notification immediately (1 second for reliability)
      const previewDate = new Date();
      previewDate.setSeconds(previewDate.getSeconds() + 1);

      // Ensure notification channel exists for Android (required for Android 8.0+)
      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('exam-reminders', {
            name: 'Exam Reminders',
            description: 'Notifications for exam reminders',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#6366F1',
            sound: 'default', // Channel default sound
            enableVibrate: true,
            showBadge: true,
            enableLights: true,
          });
          console.log('[SoundPreview] Android channel configured');
        } catch (error) {
          console.log('[SoundPreview] Channel already exists or error:', error);
        }
      }

      const triggerConfig = Platform.OS === 'android' 
        ? { date: previewDate, channelId: 'exam-reminders' }
        : { date: previewDate };

      // Get vibration pattern based on sound (to differentiate sounds)
      const getVibrationPattern = (sound: string): number[] | undefined => {
        if (Platform.OS !== 'android') return undefined;
        const patterns: { [key: string]: number[] } = {
          'Default': [0, 250],
          'Chime': [0, 200, 100, 200],
          'Bell': [0, 300, 200, 300],
          'Ding': [0, 150, 50, 150],
          'Alert': [0, 400],
          'Gentle': [0, 100, 50, 100],
          'Digital': [0, 100, 100, 100, 100],
          'Classic': [0, 250, 250, 250],
        };
        return patterns[soundName] || [0, 250];
      };

      const vibrationPattern = getVibrationPattern(soundName);

      // Schedule preview notification with sound
      // According to Expo docs, Android uses true for channel default, iOS uses 'default' string
      const notificationContent: any = {
        title: soundName,
        body: 'Sound preview',
        sound: soundSetting, // true for Android (uses channel sound), 'default' for iOS
        data: { type: 'preview', soundName },
        priority: Notifications.AndroidNotificationPriority.HIGH,
      };

      // Add vibration pattern for Android to differentiate sounds
      if (Platform.OS === 'android' && vibrationPattern) {
        notificationContent.vibrationPattern = vibrationPattern;
      }

      console.log('[SoundPreview] Scheduling preview notification:', {
        sound: soundSetting,
        soundName,
        date: previewDate.toISOString(),
        platform: Platform.OS,
        hasPermission,
      });

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: triggerConfig,
      });

      console.log('[SoundPreview] ✅ Preview notification scheduled successfully:', notificationId);

      // Haptic feedback
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics not available, ignore
        }
      }
    } catch (error) {
      console.error('[SoundPreview] ❌ Error previewing sound:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[SoundPreview] Error details:', errorMessage);
      
      // Show user-friendly error
      showAlert({
        title: 'Preview Failed',
        message: `Could not preview sound. ${errorMessage.includes('permission') ? 'Please grant notification permissions.' : 'Please try again.'}`,
        icon: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const saveReminders = async () => {
    try {
      console.log('=== SAVE REMINDERS START ===');
      console.log('Current reminders state:', reminders);
      console.log('Exam ID:', examId);
      
      // Convert enabled reminders to string format for storage
      const enabledReminders = reminders.filter(r => r.enabled);
      console.log('Enabled reminders:', enabledReminders);
      
      if (enabledReminders.length === 0) {
        showAlert({
          title: 'No Reminders',
          message: 'Please enable at least one reminder before saving.',
          icon: 'warning',
          buttons: [{ text: 'OK', style: 'default' }],
        });
        return;
      }
      
      const reminderStrings = enabledReminders.map(r => {
        const str = createReminderString(r.days, r.hours, r.minutes);
        console.log(`Converting reminder: ${r.label} -> ${str}`);
        return str;
      });

      console.log('Final reminder strings to save:', reminderStrings);

      if (examId) {
        console.log('Calling updateExam with examId:', examId);
        
        // Save reminders and notification sound to existing exam
        const result = await updateExam(examId, { 
          reminders: reminderStrings,
          notificationSound: selectedSound 
        });
        console.log('updateExam result:', result);
        
        // Verify the save
        const updatedExam = getExamById(examId);
        console.log('Exam after update:', updatedExam?.reminders);
        console.log('Notification IDs:', updatedExam?.notificationIds);
        
        console.log('=== SAVE SUCCESSFUL ===');
        
        // Show success message with notification count
        const notificationCount = updatedExam?.notificationIds?.length || 0;
        showAlert({
          title: 'Reminders Saved',
          message: `${enabledReminders.length} reminder${enabledReminders.length > 1 ? 's' : ''} saved.\n${notificationCount} notification${notificationCount !== 1 ? 's' : ''} scheduled.\n\nYou will receive notifications before your exam.`,
          icon: 'checkmark-circle',
          buttons: [
            {
              text: 'OK',
              style: 'default',
              onPress: () => navigation.goBack(),
            },
          ],
        });
      } else {
        // For new exams, just go back
        console.log('No exam ID, just going back');
        navigation.goBack();
      }
    } catch (error) {
      console.error('=== SAVE ERROR ===');
      console.error('Error saving reminders:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showAlert({
        title: 'Error',
        message: `Failed to save reminders.\n\nError: ${errorMessage}\n\nPlease try again.`,
        icon: 'close-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Exam Reminders
        </Text>
        <Pressable 
          onPress={saveReminders} 
          style={({ pressed }) => [
            styles.saveButton,
            { opacity: pressed ? 0.5 : 1 }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.saveText, { color: theme.colors.primary }]}>Save</Text>
        </Pressable>
      </View>

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
        {/* Info Card */}
        <View style={[styles.infoCard, { 
          backgroundColor: `${theme.colors.primary}1A`,
          borderColor: `${theme.colors.primary}40`
        }]}>
          <Ionicons name="notifications" size={28} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: theme.colors.text.primary }]}>
              Stay on Track
            </Text>
            <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
              Set reminders to prepare for your upcoming exams
            </Text>
          </View>
        </View>

         {/* Reminders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              YOUR REMINDERS
            </Text>
            <View style={[styles.countBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Text style={[styles.countText, { color: theme.colors.primary }]}>
                {reminders.filter(r => r.enabled).length} active
              </Text>
            </View>
          </View>

          {reminders.length > 0 ? (
            <View style={[styles.remindersList, { backgroundColor: theme.colors.card }]} key={`list-${forceUpdate}`}>
              {reminders.map((reminder, index) => (
                <View key={`${reminder.id}-${forceUpdate}`}>
                  <View style={styles.reminderItem}>
                    <Pressable 
                      style={styles.reminderLeft}
                      onPress={() => toggleReminder(reminder.id)}
                    >
                      <View style={[styles.reminderIconContainer, { 
                        backgroundColor: reminder.enabled 
                          ? `${theme.colors.primary}20` 
                          : theme.colors.background 
                      }]}>
                        <Ionicons 
                          name={reminder.days > 0 ? "calendar" : "time"} 
                          size={20} 
                          color={reminder.enabled ? theme.colors.primary : theme.colors.text.tertiary} 
                        />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text style={[styles.reminderLabel, { 
                          color: theme.colors.text.primary,
                          opacity: reminder.enabled ? 1 : 0.5
                        }]}>
                          {reminder.label}
                        </Text>
                        <Text style={[styles.reminderTime, { 
                          color: reminder.enabled ? theme.colors.text.secondary : theme.colors.text.tertiary 
                        }]}>
                          {reminder.time}
                        </Text>
                      </View>
                    </Pressable>
                    <View style={styles.reminderRight}>
                      <Switch
                        value={reminder.enabled}
                        onValueChange={() => toggleReminder(reminder.id)}
                        trackColor={{
                          false: theme.colors.border,
                          true: theme.colors.primary,
                        }}
                        thumbColor={theme.colors.surface}
                        ios_backgroundColor={theme.colors.border}
                      />
                      <Pressable 
                        onPress={() => deleteReminder(reminder.id)}
                        style={({ pressed }) => [
                          styles.deleteButton, 
                          { 
                            backgroundColor: `${theme.colors.error}15`,
                            opacity: pressed ? 0.5 : 1,
                          }
                        ]}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </Pressable>
                    </View>
                  </View>
                  {index < reminders.length - 1 && (
                    <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                No reminders set
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                Add a custom reminder or choose a preset below
              </Text>
            </View>
          )}
        </View>

        {/* Add Custom Reminder Button */}
        <Pressable
          onPress={addCustomReminder}
          style={[styles.addButton, { borderColor: theme.colors.primary }]}
        >
          <Ionicons name="add-circle-outline" size={24} color={theme.colors.primary} />
          <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>
            Add Custom Reminder
          </Text>
        </Pressable>

        {/* Quick Presets Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            QUICK PRESETS
          </Text>

          <View style={styles.presetsGrid}>
            {[
              { label: '1 Week', icon: 'calendar', days: 7 },
              { label: '3 Days', icon: 'calendar', days: 3 },
              { label: '12 Hours', icon: 'time', hours: 12 },
              { label: '30 Min', icon: 'time', minutes: 30 },
            ].map((preset, index) => (
              <Pressable
                key={index}
                style={[styles.presetCard, { backgroundColor: theme.colors.card }]}
                onPress={() => addPreset(preset)}
              >
                <View style={[styles.presetIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                  <Ionicons name={preset.icon as any} size={20} color={theme.colors.primary} />
                </View>
                <Text style={[styles.presetLabel, { color: theme.colors.text.primary }]}>
                  {preset.label}
                </Text>
                <Text style={[styles.presetSubtext, { color: theme.colors.text.tertiary }]}>
                  before
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Notification Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            NOTIFICATION SETTINGS
          </Text>

          <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
            <Pressable
              style={styles.settingRow}
              onPress={() => setShowSoundModal(true)}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="volume-high" size={22} color={theme.colors.text.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                    Notification Sound
                  </Text>
                  <Text style={[styles.settingValue, { color: theme.colors.primary }]}>
                    {selectedSound}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Custom Reminder Modal */}
      <Modal
        visible={showCustomModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Custom Reminder
              </Text>
              <Pressable
                onPress={() => setShowCustomModal(false)}
                style={[styles.closeButton, { backgroundColor: theme.colors.card }]}
              >
                <Ionicons name="close" size={22} color={theme.colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalLabel, { color: theme.colors.text.secondary }]}>
                Set reminder time before exam
              </Text>

              {/* Days Input */}
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeInputLabel, { color: theme.colors.text.primary }]}>Days</Text>
                <View style={[styles.timeInputWrapper, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border
                }]}>
                  <TextInput
                    style={[styles.timeInput, {
                      color: theme.colors.text.primary,
                    }]}
                    value={customDays}
                    onChangeText={setCustomDays}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={3}
                  />
                </View>
              </View>

              {/* Hours Input */}
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeInputLabel, { color: theme.colors.text.primary }]}>Hours</Text>
                <View style={[styles.timeInputWrapper, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border
                }]}>
                  <TextInput
                    style={[styles.timeInput, {
                      color: theme.colors.text.primary,
                    }]}
                    value={customHours}
                    onChangeText={setCustomHours}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={2}
                  />
                </View>
              </View>

              {/* Minutes Input */}
              <View style={styles.timeInputContainer}>
                <Text style={[styles.timeInputLabel, { color: theme.colors.text.primary }]}>Minutes</Text>
                <View style={[styles.timeInputWrapper, {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border
                }]}>
                  <TextInput
                    style={[styles.timeInput, {
                      color: theme.colors.text.primary,
                    }]}
                    value={customMinutes}
                    onChangeText={setCustomMinutes}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={theme.colors.text.tertiary}
                    maxLength={2}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.card }]}
                onPress={() => setShowCustomModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={saveCustomReminder}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.primary]}
                  style={styles.modalButtonGradient}
                >
                  <Text style={[styles.modalButtonText, { color: '#000' }]}>
                    Add Reminder
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Sound Selection Modal */}
      <Modal
        visible={showSoundModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSoundModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.soundModalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                Notification Sound
              </Text>
              <Pressable onPress={() => setShowSoundModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text.secondary} />
              </Pressable>
            </View>

            <ScrollView style={styles.soundList}>
              {[
                { name: 'Default', icon: 'volume-high' },
                { name: 'Chime', icon: 'musical-notes' },
                { name: 'Bell', icon: 'notifications' },
                { name: 'Ding', icon: 'radio-button-on' },
                { name: 'Alert', icon: 'warning' },
                { name: 'Gentle', icon: 'flower' },
                { name: 'Digital', icon: 'apps' },
                { name: 'Classic', icon: 'timer' },
                { name: 'None (Silent)', icon: 'volume-mute' },
              ].map((sound, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.soundOption,
                    selectedSound === sound.name && { backgroundColor: `${theme.colors.primary}15` }
                  ]}
                  onPress={() => {
                    // Play sound preview immediately when tapped
                    previewSound(sound.name);
                  }}
                >
                  <View style={styles.soundOptionLeft}>
                    <View style={[
                      styles.soundIcon,
                      { 
                        backgroundColor: selectedSound === sound.name 
                          ? `${theme.colors.primary}20` 
                          : theme.colors.background 
                      }
                    ]}>
                      <Ionicons 
                        name={sound.icon as any} 
                        size={20} 
                        color={selectedSound === sound.name ? theme.colors.primary : theme.colors.text.secondary} 
                      />
                    </View>
                    <Text style={[
                      styles.soundName,
                      { 
                        color: theme.colors.text.primary,
                        fontWeight: selectedSound === sound.name ? '600' : '400'
                      }
                    ]}>
                      {sound.name}
                    </Text>
                  </View>
                  {selectedSound === sound.name && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            
            {/* Close Button */}
            <Pressable
              style={[styles.closeSoundButton, { backgroundColor: theme.colors.card }]}
              onPress={() => setShowSoundModal(false)}
            >
              <Text style={[styles.closeSoundButtonText, { color: theme.colors.text.primary }]}>
                Done
              </Text>
            </Pressable>
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
    </SafeAreaView>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left', // Left-align for consistency
    marginLeft: 8,
  },
  saveButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 18,
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // Reminders List
  remindersList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  reminderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  reminderIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reminderInfo: {
    flex: 1,
  },
  reminderLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  reminderTime: {
    fontSize: 13,
  },
  reminderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginLeft: 68,
  },
  // Empty State
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: 6,
    fontSize: 14,
    textAlign: 'center',
  },
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  // Presets Grid
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  presetCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  presetIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  presetSubtext: {
    fontSize: 12,
  },
  // Notification Settings
  settingsCard: {
    borderRadius: 12,
    overflow: 'hidden',
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
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    marginBottom: 20,
    maxHeight: 400,
  },
  modalLabel: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  timeInputContainer: {
    marginBottom: 20,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  timeInputWrapper: {
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timeInput: {
    padding: 16,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    minHeight: 70,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 4,
  },
  modalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalButtonGradient: {
    padding: 16,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    padding: 16,
  },
  // Sound Modal
  soundModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  soundList: {
    marginTop: 16,
  },
  soundOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  soundOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  soundIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundName: {
    fontSize: 16,
  },
  // Test Button
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  closeSoundButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  closeSoundButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
