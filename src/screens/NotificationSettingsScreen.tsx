import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { requestNotificationPermissions } from '../services/notificationService';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'NotificationSettings'>;

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

interface NotificationSettings {
  examReminders: boolean;
  studyReminders: boolean;
  milestoneAlerts: boolean;
  goalCompletionAlerts: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  examReminders: true,
  studyReminders: true,
  milestoneAlerts: true,
  goalCompletionAlerts: true,
  soundEnabled: true,
  vibrationEnabled: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00',
};

export default function NotificationSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error saving notification settings:', error);
    }
  };

  const checkPermissions = async () => {
    const hasPerm = await requestNotificationPermissions();
    setHasPermission(hasPerm);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermissions();
    setHasPermission(granted);
    if (granted) {
      showAlert({
        title: 'Permission Granted',
        message: 'You will now receive notifications for exams and reminders.',
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } else {
      showAlert({
        title: 'Permission Denied',
        message: 'Please enable notifications in your device settings to receive reminders.',
        icon: 'alert-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const updateSetting = (key: keyof NotificationSettings, value: boolean | string) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    subtitle: string,
    value: boolean,
    onValueChange: (value: boolean) => void,
    disabled?: boolean
  ) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: `${theme.colors.primary}20` },
          ]}
        >
          <Ionicons name={icon as any} size={24} color={theme.colors.primary} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.primary,
        }}
        thumbColor={theme.colors.text.inverse}
      />
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && ({ height: '100vh', overflow: 'hidden' } as any)
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Notification Settings
        </Text>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && ({
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          } as any)
        ]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Permission Status */}
        {!hasPermission && (
          <View style={styles.section}>
            <View style={[styles.warningCard, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="alert-circle" size={24} color={theme.colors.primary} />
              <View style={styles.warningText}>
                <Text style={[styles.warningTitle, { color: theme.colors.text.primary }]}>
                  Notifications Disabled
                </Text>
                <Text style={[styles.warningSubtitle, { color: theme.colors.text.secondary }]}>
                  Enable notifications to receive exam reminders and alerts.
                </Text>
              </View>
              <Pressable
                style={[styles.enableButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleRequestPermission}
              >
                <Text style={[styles.enableButtonText, { color: theme.colors.text.inverse }]}>
                  Enable
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            NOTIFICATION TYPES
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingRow(
              'calendar',
              'Exam Reminders',
              'Get notified before exams',
              settings.examReminders,
              (value) => updateSetting('examReminders', value),
              !hasPermission
            )}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {renderSettingRow(
              'time',
              'Study Reminders',
              'Daily study session alerts',
              settings.studyReminders,
              (value) => updateSetting('studyReminders', value),
              !hasPermission
            )}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {renderSettingRow(
              'trophy',
              'Milestone Alerts',
              'Celebrate your achievements',
              settings.milestoneAlerts,
              (value) => updateSetting('milestoneAlerts', value),
              !hasPermission
            )}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {renderSettingRow(
              'flag',
              'Goal Completion',
              'Notifications when goals are met',
              settings.goalCompletionAlerts,
              (value) => updateSetting('goalCompletionAlerts', value),
              !hasPermission
            )}
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            PREFERENCES
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingRow(
              'volume-high',
              'Sound',
              'Play sound with notifications',
              settings.soundEnabled,
              (value) => updateSetting('soundEnabled', value),
              !hasPermission
            )}
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            {renderSettingRow(
              'phone-portrait',
              'Vibration',
              'Vibrate on notifications',
              settings.vibrationEnabled,
              (value) => updateSetting('vibrationEnabled', value),
              !hasPermission
            )}
          </View>
        </View>

        {/* Quiet Hours */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            QUIET HOURS
          </Text>
          <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
            {renderSettingRow(
              'moon',
              'Enable Quiet Hours',
              'Silence notifications during sleep',
              settings.quietHoursEnabled,
              (value) => updateSetting('quietHoursEnabled', value),
              !hasPermission
            )}
            {settings.quietHoursEnabled && (
              <>
                <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
                <View style={styles.quietHoursInfo}>
                  <Text style={[styles.quietHoursText, { color: theme.colors.text.secondary }]}>
                    Quiet hours: {settings.quietHoursStart} - {settings.quietHoursEnd}
                  </Text>
                  <Text style={[styles.quietHoursNote, { color: theme.colors.text.tertiary }]}>
                    Configure quiet hours in DND Settings
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Alert */}
      {visible && alertConfig && (
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
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
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
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  warningCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  warningText: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 13,
  },
  enableButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  enableButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  quietHoursInfo: {
    marginTop: 12,
    paddingTop: 12,
  },
  quietHoursText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  quietHoursNote: {
    fontSize: 12,
  },
});

