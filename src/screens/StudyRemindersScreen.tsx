import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { LinearGradient } from 'expo-linear-gradient';
import { getCategoryName } from '../utils/categoryHelpers';
import * as Haptics from 'expo-haptics';
import { requestNotificationPermissions } from '../services/notificationService';
import { showWebNotification, isWebNotificationSupported } from '../services/webNotificationService';
import { SchedulableTriggerInputTypes } from 'expo-notifications';

type Props = NativeStackScreenProps<any, 'StudyReminders'>;

export default function StudyRemindersScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { exams, customCategories } = useStore();

  // Global reminder settings
  const [enableGlobalReminders, setEnableGlobalReminders] = useState(true);
  const [defaultDayBefore, setDefaultDayBefore] = useState(true);
  const [defaultHoursBefore, setDefaultHoursBefore] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [showSoundModal, setShowSoundModal] = useState(false);
  const [selectedSound, setSelectedSound] = useState('Default');

  const upcomingExams = exams.filter(exam => new Date(exam.date) > new Date());
  const examsWithReminders = exams.filter(exam => exam.reminders && exam.reminders.length > 0);

  const handleEditExam = (examId: string) => {
    navigation.navigate('AddExam', { examId });
  };

  // Preview sound when tapped (same as RemindersScreen)
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
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
            enableVibrate: true,
          });
        } catch (error) {
          console.log('[SoundPreview] Channel setup error:', error);
        }
      }

      // Schedule preview notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: soundName,
          body: 'Sound preview',
          sound: soundSetting,
          data: { preview: true },
        },
        trigger: {
          type: SchedulableTriggerInputTypes.DATE,
          date: previewDate,
        },
      });

      // Haptic feedback
      if (Platform.OS !== 'web') {
        try {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Haptics not available, ignore
        }
      }
    } catch (error) {
      console.error('[SoundPreview] Error:', error);
      // Still update selection even if preview fails
      setSelectedSound(soundName);
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
          Study Reminders
        </Text>
        <View style={{ width: 40 }} />
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
        {/* Stats Card */}
        <LinearGradient
          colors={[`${theme.colors.primary}30`, `${theme.colors.primary}15`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {examsWithReminders.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Exams with Reminders
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {upcomingExams.length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Upcoming Exams
            </Text>
          </View>
        </LinearGradient>

        {/* Global Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            GLOBAL SETTINGS
          </Text>

          <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications" size={22} color={theme.colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                    Enable All Reminders
                  </Text>
                  <Text style={[styles.settingSubtext, { color: theme.colors.text.tertiary }]}>
                    Master switch for all notifications
                  </Text>
                </View>
              </View>
              <Switch
                value={enableGlobalReminders}
                onValueChange={setEnableGlobalReminders}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <Pressable 
              style={styles.settingRow}
              onPress={() => enableGlobalReminders && setShowSoundModal(true)}
              disabled={!enableGlobalReminders}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="volume-high" size={22} color={theme.colors.text.secondary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary, opacity: enableGlobalReminders ? 1 : 0.5 }]}>
                    Notification Sound
                  </Text>
                  <Text style={[styles.settingSubtext, { color: enableGlobalReminders ? theme.colors.primary : theme.colors.text.tertiary }]}>
                    {enableGlobalReminders ? selectedSound : 'Disabled'}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
            </Pressable>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="phone-portrait" size={22} color={theme.colors.text.secondary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                    Vibration
                  </Text>
                  <Text style={[styles.settingSubtext, { color: theme.colors.text.tertiary }]}>
                    Vibrate on notification
                  </Text>
                </View>
              </View>
              <Switch
                value={vibrationEnabled}
                onValueChange={setVibrationEnabled}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
                disabled={!enableGlobalReminders}
              />
            </View>
          </View>
        </View>

        {/* Default Reminder Times */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            DEFAULT REMINDERS FOR NEW EXAMS
          </Text>

          <View style={[styles.settingsCard, { backgroundColor: theme.colors.card }]}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="calendar" size={22} color={theme.colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                    1 Day Before
                  </Text>
                  <Text style={[styles.settingSubtext, { color: theme.colors.text.tertiary }]}>
                    Remind at 9:00 AM
                  </Text>
                </View>
              </View>
              <Switch
                value={defaultDayBefore}
                onValueChange={setDefaultDayBefore}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />

            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons name="time" size={22} color={theme.colors.primary} />
                <View style={styles.settingTextContainer}>
                  <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
                    3 Hours Before
                  </Text>
                  <Text style={[styles.settingSubtext, { color: theme.colors.text.tertiary }]}>
                    Quick reminder
                  </Text>
                </View>
              </View>
              <Switch
                value={defaultHoursBefore}
                onValueChange={setDefaultHoursBefore}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.surface}
                ios_backgroundColor={theme.colors.border}
              />
            </View>
          </View>
        </View>

        {/* Exams with Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              YOUR EXAM REMINDERS
            </Text>
            <View style={[styles.countBadge, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Text style={[styles.countText, { color: theme.colors.primary }]}>
                {examsWithReminders.length}
              </Text>
            </View>
          </View>

          {examsWithReminders.length > 0 ? (
            <View style={styles.examsList}>
              {examsWithReminders.map((exam, index) => (
                <Pressable
                  key={exam.id}
                  style={[styles.examCard, { backgroundColor: theme.colors.card }]}
                  onPress={() => handleEditExam(exam.id)}
                >
                  <View style={styles.examCardLeft}>
                    <View style={[styles.examIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
                      <Ionicons name="school" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.examInfo}>
                      <Text style={[styles.examTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {exam.title}
                      </Text>
                      <Text style={[styles.examSubject, { color: theme.colors.text.secondary }]}>
                        {getCategoryName(exam.subjectCategory, customCategories)} • {exam.examType}
                      </Text>
                      <View style={styles.remindersCountContainer}>
                        <Ionicons name="notifications" size={14} color={theme.colors.primary} />
                        <Text style={[styles.remindersCount, { color: theme.colors.primary }]}>
                          {exam.reminders?.length || 0} reminder{exam.reminders?.length !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                No Reminders Set
              </Text>
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Edit any exam to add reminders
              </Text>
            </View>
          )}
        </View>

        {/* All Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
              UPCOMING EXAMS WITHOUT REMINDERS
            </Text>

            <View style={styles.examsList}>
              {upcomingExams
                .filter(exam => !exam.reminders || exam.reminders.length === 0)
                .map((exam) => (
                  <Pressable
                    key={exam.id}
                    style={[styles.examCard, { backgroundColor: theme.colors.card }]}
                    onPress={() => handleEditExam(exam.id)}
                  >
                    <View style={styles.examCardLeft}>
                      <View style={[styles.examIcon, { backgroundColor: theme.colors.background }]}>
                        <Ionicons name="school-outline" size={20} color={theme.colors.text.tertiary} />
                      </View>
                      <View style={styles.examInfo}>
                        <Text style={[styles.examTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                          {exam.title}
                        </Text>
                        <Text style={[styles.examSubject, { color: theme.colors.text.secondary }]}>
                          {getCategoryName(exam.subjectCategory, customCategories)} • {exam.examType}
                        </Text>
                        <Text style={[styles.noReminders, { color: theme.colors.text.tertiary }]}>
                          Tap to add reminders
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
                  </Pressable>
                ))}
            </View>
          </View>
        )}

        {/* Info Card */}
        <View style={[styles.infoCard, { 
          backgroundColor: `${theme.colors.primary}10`,
          borderColor: `${theme.colors.primary}30`
        }]}>
          <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
          <Text style={[styles.infoText, { color: theme.colors.text.secondary }]}>
            Reminders are set individually for each exam. Tap any exam to customize its notifications.
          </Text>
        </View>
      </ScrollView>

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
          </View>
        </View>
      </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  // Stats Card
  statsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    marginHorizontal: 16,
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
    marginBottom: 12,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Settings Card
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
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtext: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    marginLeft: 50,
  },
  // Exams List
  examsList: {
    gap: 12,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  examCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  examIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  examInfo: {
    flex: 1,
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  examSubject: {
    fontSize: 13,
    marginBottom: 4,
  },
  remindersCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  remindersCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  noReminders: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  // Empty State
  emptyState: {
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Info Card
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  // Sound Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  soundModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  soundList: {
    marginTop: 8,
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
});

