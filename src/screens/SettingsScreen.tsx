import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import ThemeToggle from '../components/ThemeToggle';
import { isUpcoming } from '../utils/dateHelpers';
import CustomAlert from '../components/CustomAlert';
import { useAlert } from '../hooks/useAlert';
import { RootStackParamList } from '../navigation/types';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { theme, isDark } = useTheme();
  const { exams, resources, focusSessions, clearAllData } = useStore();
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [goalCompletionAlerts, setGoalCompletionAlerts] = useState(true);
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();

  const handleClearAllData = () => {
    setShowClearDialog(true);
  };

  const confirmClearData = async () => {
    setShowClearDialog(false);
    await clearAllData();
    showAlert({
      title: 'Success',
      message: 'All data has been cleared successfully!',
      icon: 'checkmark-circle',
      buttons: [{ text: 'OK', style: 'default' }],
    });
  };

  // Calculate progress statistics from real data
  const upcomingExams = exams.filter(exam => isUpcoming(exam.date));
  const completedExams = exams.filter(exam => !isUpcoming(exam.date));
  const totalExams = exams.length;
  const completedExamsCount = completedExams.length;
  const examsCompletionRate = totalExams > 0 ? (completedExamsCount / totalExams) * 100 : 0;

  // Resources: count total resources and mark as "used" if they have notes or are marked complete
  const totalResources = resources.length;
  const usedResources = resources.filter(res => 
    (res.notes && res.notes.length > 0) || res.completed
  ).length;
  const resourcesRate = totalResources > 0 ? (usedResources / totalResources) * 100 : 0;

  // Focus sessions: all logged sessions are considered completed
  const totalSessions = focusSessions.length;
  const loggedSessions = focusSessions.filter(session => session.duration >= 300).length; // Sessions > 5 min
  const sessionsRate = totalSessions > 0 ? (loggedSessions / totalSessions) * 100 : 0;

  // Weekly Goals: Load from goals store
  const { goals } = useStore();
  
  // Calculate current week's study hours
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const currentWeekSessions = focusSessions.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= startOfWeek && sessionDate <= now;
  });
  
  const currentHoursLogged = currentWeekSessions.reduce((sum, session) => sum + session.duration, 0) / 3600;
  
  const totalWeeklyGoals = goals ? 1 : 0; // 1 goal if goals are set
  const completedWeeklyGoals = goals && goals.weeklyHours > 0 ? 
    (currentHoursLogged >= goals.weeklyHours ? 1 : 0) : 0;
  const weeklyGoalsRate = totalWeeklyGoals > 0 ? (completedWeeklyGoals / totalWeeklyGoals) * 100 : 0;

  const renderMenuItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress?: () => void,
    showChevron = true,
    rightElement?: React.ReactNode
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.menuItem,
        {
          backgroundColor: theme.colors.card,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View
          style={[
            styles.menuIconContainer,
            { backgroundColor: `${theme.colors.primary}20` },
          ]}
        >
          <Ionicons name={icon as any} size={22} color={theme.colors.primary} />
        </View>
        <View style={styles.menuTextContainer}>
          <Text style={[styles.menuTitle, { color: theme.colors.text.primary }]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.menuSubtitle, { color: theme.colors.text.secondary }]}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightElement || (showChevron && (
        <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
      ))}
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={[]}
    >
      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && { 
            height: '100%', 
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }
        ]}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && { minHeight: '100%' }
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Progress Overview */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            PROGRESS OVERVIEW
          </Text>
          <View style={[styles.progressCard, { backgroundColor: theme.colors.card }]}>
            {/* Exams Completed */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarHeader}>
                <Text style={[styles.progressBarLabel, { color: theme.colors.text.primary }]}>
                  Exams Completed
                </Text>
                <Text style={[styles.progressBarValue, { color: theme.colors.text.secondary }]}>
                  {completedExamsCount}/{totalExams}
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${examsCompletionRate}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressBarPercent, { color: theme.colors.text.tertiary }]}>
                {totalExams > 0 ? `${Math.round(examsCompletionRate)}%` : 'No exams added yet'}
              </Text>
            </View>

            {/* Resources Used */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarHeader}>
                <Text style={[styles.progressBarLabel, { color: theme.colors.text.primary }]}>
                  Resources Used
                </Text>
                <Text style={[styles.progressBarValue, { color: theme.colors.text.secondary }]}>
                  {usedResources}/{totalResources}
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${resourcesRate}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressBarPercent, { color: theme.colors.text.tertiary }]}>
                {totalResources > 0 ? `${Math.round(resourcesRate)}%` : 'No resources added yet'}
              </Text>
            </View>

            {/* Sessions Logged */}
            <View style={styles.progressBarSection}>
              <View style={styles.progressBarHeader}>
                <Text style={[styles.progressBarLabel, { color: theme.colors.text.primary }]}>
                  Focus Sessions
                </Text>
                <Text style={[styles.progressBarValue, { color: theme.colors.text.secondary }]}>
                  {loggedSessions}/{totalSessions} completed
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${sessionsRate}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressBarPercent, { color: theme.colors.text.tertiary }]}>
                {totalSessions > 0 ? `${Math.round(sessionsRate)}%` : 'No sessions logged yet'}
              </Text>
            </View>

            {/* Weekly Goals */}
            <View style={[styles.progressBarSection, { marginBottom: 0 }]}>
              <View style={styles.progressBarHeader}>
                <Text style={[styles.progressBarLabel, { color: theme.colors.text.primary }]}>
                  Weekly Goals
                </Text>
                <Text style={[styles.progressBarValue, { color: theme.colors.text.secondary }]}>
                  {completedWeeklyGoals}/{totalWeeklyGoals}
                </Text>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: theme.colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      backgroundColor: theme.colors.primary,
                      width: `${weeklyGoalsRate}%`,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.progressBarPercent, { color: theme.colors.text.tertiary }]}>
                {totalWeeklyGoals > 0 ? `${Math.round(weeklyGoalsRate)}%` : 'Set goals to track progress'}
              </Text>
            </View>
          </View>
        </View>

        {/* General Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            GENERAL SETTINGS
          </Text>
          <View style={styles.menuGroup}>
            {renderMenuItem(
              'color-palette',
              'Theme Settings',
              'Change app appearance',
              () => navigation.navigate('ThemeSettings')
            )}
            {renderMenuItem(
              'notifications',
              'Notification Settings',
              'Manage alerts and reminders',
              () => navigation.navigate('NotificationSettings')
            )}
            {renderMenuItem(
              'book',
              'Subject Categories',
              'Manage subjects',
              () => navigation.navigate('SubjectCategories')
            )}
            {renderMenuItem(
              'search',
              'Search Settings',
              'Manage search history and saved searches',
              () => navigation.navigate('SearchSettings')
            )}
          </View>
        </View>

        {/* Goal Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            GOAL SETTINGS
          </Text>
          <View style={styles.menuGroup}>
            {renderMenuItem(
              'flag',
              'Set Weekly Goals',
              'Define your study targets',
              () => navigation.navigate('SetGoals')
            )}
            {renderMenuItem(
              'checkmark-circle',
              'Goal Completion Alerts',
              'Get notified on achievements',
              undefined,
              false,
              <Switch
                value={goalCompletionAlerts}
                onValueChange={setGoalCompletionAlerts}
                trackColor={{
                  false: theme.colors.border,
                  true: theme.colors.primary,
                }}
                thumbColor={theme.colors.text.inverse}
              />
            )}
            {renderMenuItem(
              'flame',
              'Streak Management',
              'Track and manage your study streaks',
              () => navigation.navigate('StreakManagement')
            )}
          </View>
        </View>

        {/* Exam & Study Tools */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            EXAM & STUDY TOOLS
          </Text>
          <View style={styles.menuGroup}>
            {renderMenuItem(
              'notifications',
              'Study Reminders',
              'Manage your exam notifications',
              () => navigation.navigate('StudyReminders')
            )}
            {renderMenuItem(
              'timer',
              'Focus Mode Preferences',
              'Customize focus session settings',
              () => navigation.navigate('FocusModePreferences')
            )}
            {renderMenuItem(
              'moon',
              'DND Settings',
              'Manage Do Not Disturb preferences',
              () => navigation.navigate('DNDSettings')
            )}
            {renderMenuItem(
              'calendar',
              'Timetable Extractor',
              'Import exams from images',
              () => navigation.navigate('TimetableExtractor')
            )}
          </View>
        </View>

        {/* App Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.secondary }]}>
            APP INFORMATION
          </Text>
          <View style={styles.menuGroup}>
            {renderMenuItem(
              'help-circle',
              'Help and Support',
              'Get help using the app',
              () => showAlert({
                title: 'Help & Support',
                message: 'For support, please contact: support@prepzy.com',
                icon: 'help-circle',
                buttons: [{ text: 'OK', style: 'default' }],
              })
            )}
            {renderMenuItem(
              'information-circle',
              'About App',
              'Version 1.0.2',
              () => showAlert({
                title: 'About Prepzy',
                message: 'Prepzy v1.0.2\n\nYour calm companion for confident studying.',
                icon: 'information-circle',
                buttons: [{ text: 'OK', style: 'default' }],
              })
            )}
            {renderMenuItem(
              'trash-outline',
              'Clear All Data',
              'Remove all app data',
              handleClearAllData,
              true
            )}
          </View>
        </View>

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={[styles.versionText, { color: theme.colors.text.tertiary }]}>
            Version 1.0.2
          </Text>
        </View>
      </ScrollView>

      {/* Clear All Data Dialog */}
      <Modal
        visible={showClearDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowClearDialog(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${theme.colors.status.error}20` }]}>
              <Ionicons name="warning" size={48} color={theme.colors.status.error} />
            </View>
            <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
              Clear All Data?
            </Text>
            <Text style={[styles.modalMessage, { color: theme.colors.text.secondary }]}>
              This will permanently delete all your exams, resources, and focus sessions. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setShowClearDialog(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: theme.colors.status.error }]}
                onPress={confirmClearData}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.inverse }]}>
                  Confirm
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  progressCard: {
    borderRadius: 16,
    padding: 20,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarSection: {
    marginBottom: 16,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressBarValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressBarPercent: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  menuGroup: {
    borderRadius: 16,
    overflow: 'hidden',
    gap: 1,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  dangerButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  dangerButtonText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
