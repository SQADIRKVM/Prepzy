import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';

type Props = NativeStackScreenProps<any, 'FocusModePreferences'>;

interface FocusPreferences {
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // number of focus sessions before long break
  autoStartBreaks: boolean;
  autoStartNextSession: boolean;
  soundEnabled: boolean;
  hapticFeedback: boolean;
  showNotifications: boolean;
}

const DEFAULT_PREFERENCES: FocusPreferences = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartNextSession: false,
  soundEnabled: true,
  hapticFeedback: true,
  showNotifications: true,
};

const STORAGE_KEY = '@focus_mode_preferences';

export default function FocusModePreferencesScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const [preferences, setPreferences] = useState<FocusPreferences>(DEFAULT_PREFERENCES);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showAlert({
        title: 'Saved',
        message: 'Focus mode preferences have been saved successfully!',
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save preferences. Please try again.',
        icon: 'close-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }
  };

  const resetToDefaults = () => {
    showAlert({
      title: 'Reset to Defaults',
      message: 'Are you sure you want to reset all preferences to default values?',
      icon: 'refresh',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            setPreferences(DEFAULT_PREFERENCES);
            setHasChanges(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          },
        },
      ],
    });
  };

  const updatePreference = <K extends keyof FocusPreferences>(
    key: K,
    value: FocusPreferences[K]
  ) => {
    setPreferences((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderSettingRow = (
    icon: string,
    title: string,
    subtitle: string,
    rightElement: React.ReactNode
  ) => (
    <View style={[styles.settingRow, { backgroundColor: theme.colors.card }]}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.settingIconContainer,
            { backgroundColor: `${theme.colors.primary}20` },
          ]}
        >
          <Ionicons name={icon as any} size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[styles.settingTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          <Text style={[styles.settingSubtitle, { color: theme.colors.text.secondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      {rightElement}
    </View>
  );

  const renderDurationInput = (
    label: string,
    value: number,
    onChange: (value: number) => void,
    min: number = 1,
    max: number = 120
  ) => (
    <View style={styles.durationInputContainer}>
      <Text style={[styles.durationLabel, { color: theme.colors.text.secondary }]}>
        {label}
      </Text>
      <View style={styles.durationInputRow}>
        <Pressable
          style={[
            styles.durationButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => {
            if (value > min) {
              onChange(value - 1);
            }
          }}
        >
          <Ionicons name="remove" size={20} color={theme.colors.text.primary} />
        </Pressable>
        <View style={[styles.durationValueContainer, { backgroundColor: theme.colors.surface }]}>
          <TextInput
            style={[styles.durationValue, { color: theme.colors.text.primary }]}
            value={value.toString()}
            onChangeText={(text) => {
              const num = parseInt(text) || min;
              onChange(Math.min(max, Math.max(min, num)));
            }}
            keyboardType="number-pad"
            selectTextOnFocus
          />
          <Text style={[styles.durationUnit, { color: theme.colors.text.secondary }]}>min</Text>
        </View>
        <Pressable
          style={[
            styles.durationButton,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
          onPress={() => {
            if (value < max) {
              onChange(value + 1);
            }
          }}
        >
          <Ionicons name="add" size={20} color={theme.colors.text.primary} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' },
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (hasChanges) {
              showAlert({
                title: 'Unsaved Changes',
                message: 'You have unsaved changes. Do you want to save before leaving?',
                icon: 'warning',
                buttons: [
                  { text: 'Discard', style: 'cancel', onPress: () => navigation.goBack() },
                  {
                    text: 'Save',
                    style: 'default',
                    onPress: async () => {
                      await savePreferences();
                      navigation.goBack();
                    },
                  },
                ],
              });
            } else {
              navigation.goBack();
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Focus Mode Preferences
        </Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && {
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          },
        ]}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && { flexGrow: 1, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Session Durations */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            SESSION DURATIONS
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
            {renderDurationInput(
              'Focus Session',
              preferences.focusDuration,
              (value) => updatePreference('focusDuration', value),
              1,
              120
            )}
            {renderDurationInput(
              'Short Break',
              preferences.shortBreakDuration,
              (value) => updatePreference('shortBreakDuration', value),
              1,
              30
            )}
            {renderDurationInput(
              'Long Break',
              preferences.longBreakDuration,
              (value) => updatePreference('longBreakDuration', value),
              5,
              60
            )}
          </View>
        </View>

        {/* Break Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            BREAK SETTINGS
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
            {renderSettingRow(
              'repeat',
              'Long Break Interval',
              `Every ${preferences.longBreakInterval} focus session${preferences.longBreakInterval !== 1 ? 's' : ''}`,
              <View style={styles.intervalSelector}>
                <Pressable
                  style={[
                    styles.intervalButton,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    if (preferences.longBreakInterval > 2) {
                      updatePreference('longBreakInterval', preferences.longBreakInterval - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={16} color={theme.colors.text.primary} />
                </Pressable>
                <Text style={[styles.intervalValue, { color: theme.colors.text.primary }]}>
                  {preferences.longBreakInterval}
                </Text>
                <Pressable
                  style={[
                    styles.intervalButton,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                  onPress={() => {
                    if (preferences.longBreakInterval < 10) {
                      updatePreference('longBreakInterval', preferences.longBreakInterval + 1);
                    }
                  }}
                >
                  <Ionicons name="add" size={16} color={theme.colors.text.primary} />
                </Pressable>
              </View>
            )}
            {renderSettingRow(
              'play-circle',
              'Auto-start Breaks',
              'Automatically start break timer after focus session',
              <Switch
                value={preferences.autoStartBreaks}
                onValueChange={(value) => updatePreference('autoStartBreaks', value)}
                trackColor={{
                  false: theme.colors.border,
                  true: `${theme.colors.primary}80`,
                }}
                thumbColor={preferences.autoStartBreaks ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
            {renderSettingRow(
              'refresh',
              'Auto-start Next Session',
              'Automatically start next focus session after break',
              <Switch
                value={preferences.autoStartNextSession}
                onValueChange={(value) => updatePreference('autoStartNextSession', value)}
                trackColor={{
                  false: theme.colors.border,
                  true: `${theme.colors.primary}80`,
                }}
                thumbColor={preferences.autoStartNextSession ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
          </View>
        </View>

        {/* Notifications & Feedback */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            NOTIFICATIONS & FEEDBACK
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.colors.card }]}>
            {renderSettingRow(
              'notifications',
              'Show Notifications',
              'Get notified when sessions start and end',
              <Switch
                value={preferences.showNotifications}
                onValueChange={(value) => updatePreference('showNotifications', value)}
                trackColor={{
                  false: theme.colors.border,
                  true: `${theme.colors.primary}80`,
                }}
                thumbColor={preferences.showNotifications ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
            {renderSettingRow(
              'volume-high',
              'Sound Alerts',
              'Play sound when sessions start and end',
              <Switch
                value={preferences.soundEnabled}
                onValueChange={(value) => updatePreference('soundEnabled', value)}
                trackColor={{
                  false: theme.colors.border,
                  true: `${theme.colors.primary}80`,
                }}
                thumbColor={preferences.soundEnabled ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
            {renderSettingRow(
              'phone-portrait',
              'Haptic Feedback',
              'Vibrate on session events',
              <Switch
                value={preferences.hapticFeedback}
                onValueChange={(value) => updatePreference('hapticFeedback', value)}
                trackColor={{
                  false: theme.colors.border,
                  true: `${theme.colors.primary}80`,
                }}
                thumbColor={preferences.hapticFeedback ? theme.colors.primary : theme.colors.text.tertiary}
              />
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Pressable
            style={[styles.resetButton, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}
            onPress={resetToDefaults}
          >
            <Ionicons name="refresh" size={20} color={theme.colors.status.warning} />
            <Text style={[styles.resetButtonText, { color: theme.colors.status.warning }]}>
              Reset to Defaults
            </Text>
          </Pressable>
        </View>

        {/* Spacer */}
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Save Button */}
      {hasChanges && (
        <View style={[styles.footer, { backgroundColor: `${theme.colors.background}CC` }]}>
          <Pressable
            style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
            onPress={savePreferences}
          >
            <Text style={[styles.saveButtonText, { color: theme.colors.text.inverse }]}>
              Save Changes
            </Text>
          </Pressable>
        </View>
      )}

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
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionCard: {
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  durationInputContainer: {
    marginBottom: 16,
  },
  durationLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  durationInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  durationButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationValueContainer: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 40,
  },
  durationUnit: {
    fontSize: 14,
    fontWeight: '500',
  },
  intervalSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  intervalButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intervalValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
  },
  saveButton: {
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

