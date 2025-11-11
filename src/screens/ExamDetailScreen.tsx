import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useStore } from '../store';
import { useTheme } from '../context/ThemeContext';
import { getCategoryColor, getCategoryName } from '../utils/categoryHelpers';
import {
  getCountdownText,
  getCountdownDetails,
  formatExamDateTime,
} from '../utils/dateHelpers';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';

type Props = NativeStackScreenProps<any, 'ExamDetail'>;

type TabType = 'overview' | 'resources' | 'notes';

interface CountdownTimer {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

export default function ExamDetailScreen({ navigation, route }: Props) {
  const { theme, isDark } = useTheme();
  const { examId } = route.params;
  const { getExamById, getResourcesByExamId, getFocusSessionsByExamId, updateExam, customCategories } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [examNotes, setExamNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [countdown, setCountdown] = useState<CountdownTimer>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const exam = getExamById(examId);
  const resources = getResourcesByExamId(examId);
  const focusSessions = getFocusSessionsByExamId(examId);

  // Calculate countdown timer
  const calculateCountdown = (): CountdownTimer => {
    const now = new Date().getTime();
    const examTime = new Date(exam?.date || '').getTime();
    const difference = examTime - now;

    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isExpired: false };
  };

  // Update countdown every second
  useEffect(() => {
    if (!exam) return;

    // Initial calculation
    setCountdown(calculateCountdown());

    // Update every second
    const interval = setInterval(() => {
      setCountdown(calculateCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, [exam]);

  // Load exam notes
  useEffect(() => {
    if (exam) {
      setExamNotes(exam.notes || '');
    }
  }, [exam]);

  const handleSaveNotes = async () => {
    if (!exam) return;
    setIsSavingNotes(true);
    try {
      await updateExam(examId, { notes: examNotes });
      showAlert({
        title: 'Saved',
        message: 'Notes have been saved successfully!',
        icon: 'checkmark-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } catch (error) {
      showAlert({
        title: 'Error',
        message: 'Failed to save notes. Please try again.',
        icon: 'close-circle',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  if (!exam) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <Text style={[styles.errorText, { color: theme.colors.status.error }]}>Exam not found</Text>
      </SafeAreaView>
    );
  }

  const subjectColor = exam.customColor || getCategoryColor(exam.subjectCategory, customCategories, theme.colors.subjects[exam.subjectCategory] || theme.colors.subjects.Other);
  const categoryName = getCategoryName(exam.subjectCategory, customCategories);

  const handleEdit = () => {
    navigation.navigate('AddExam', { examId });
  };

  const handleStartFocus = () => {
    navigation.navigate('FocusMode', { examId });
  };

  const handleAddResource = () => {
    navigation.navigate('AddResource', { examId });
  };

  const totalStudyTime = focusSessions.reduce((acc, session) => acc + session.duration, 0);
  const totalStudyHours = Math.floor(totalStudyTime / 3600);
  const totalStudyMinutes = Math.floor((totalStudyTime % 3600) / 60);

  // Format exam date and time
  const examDate = new Date(exam.date);
  const formattedDate = examDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = examDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  const renderTab = (tab: TabType, label: string) => {
    const isActive = activeTab === tab;
    return (
      <Pressable
        style={[
          styles.tab,
          { borderBottomColor: isActive ? theme.colors.primary : 'transparent' },
        ]}
        onPress={() => setActiveTab(tab)}
      >
        <Text
          style={[
            styles.tabText,
            {
              color: isActive ? theme.colors.text.primary : theme.colors.text.secondary,
              fontWeight: isActive ? '700' : '600',
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      {/* Exam Details */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Exam Details
        </Text>
        <View style={[styles.detailsCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
          {/* Date Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text.primary }]}>
                {formattedDate}
              </Text>
            </View>
            <Pressable onPress={handleEdit}>
              <Text style={[styles.editButton, { color: theme.colors.primary }]}>Edit</Text>
            </Pressable>
          </View>

          {/* Time Row */}
          <View style={styles.detailRow}>
            <View style={styles.detailLeft}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text.primary }]}>
                {formattedTime}
              </Text>
            </View>
          </View>

          {/* Location Row */}
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <View style={styles.detailLeft}>
              <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.detailText, { color: theme.colors.text.primary }]}>
                {exam.notes || 'No location specified'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Study Statistics */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
          Study Statistics
        </Text>
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Total Study Time
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {totalStudyHours}h {totalStudyMinutes}m
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card, borderColor: theme.colors.border }]}>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Sessions Completed
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {focusSessions.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Start Focus Session Button */}
      <Pressable onPress={handleStartFocus}>
        <LinearGradient
          colors={[theme.colors.primaryLight, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.focusButton, theme.shadows.lg]}
        >
          <Ionicons name="bulb" size={20} color={theme.colors.text.inverse} />
          <Text style={[styles.focusButtonText, { color: theme.colors.text.inverse }]}>
            Start Focus Session
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  );

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'youtube':
        return 'logo-youtube';
      case 'pdf':
        return 'document-text';
      case 'link':
        return 'link';
      case 'note':
        return 'create';
      case 'file':
        return 'folder';
      default:
        return 'document';
    }
  };

  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'youtube':
        return 'YouTube';
      case 'pdf':
        return 'PDF';
      case 'link':
        return 'Link';
      case 'note':
        return 'Note';
      case 'file':
        return 'File';
      default:
        return 'Resource';
    }
  };

  const renderResourcesTab = () => (
    <View style={styles.tabContent}>
      {resources.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={[styles.emptyIconWrapper, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="folder-open-outline" size={40} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyStateTitle, { color: theme.colors.text.primary }]}>
            No Resources Yet
          </Text>
          <Text style={[styles.emptyStateSubtitle, { color: theme.colors.text.secondary }]}>
            Add study materials, links, or notes to help you prepare for this exam
          </Text>
          <Pressable onPress={handleAddResource} style={styles.emptyActionButton}>
            <LinearGradient
              colors={[theme.colors.primaryLight, theme.colors.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.emptyActionGradient}
            >
              <Ionicons name="add" size={20} color={theme.colors.text.inverse} />
              <Text style={[styles.emptyActionText, { color: theme.colors.text.inverse }]}>
                Add Your First Resource
              </Text>
            </LinearGradient>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.resourcesList}>
            {resources.map((resource, index) => (
              <View
                key={resource.id}
                style={[
                  styles.resourceCard,
                  {
                    backgroundColor: theme.colors.card,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {/* Resource Icon and Content */}
                <Pressable
                  style={styles.resourceMain}
                  onPress={() => navigation.navigate('AddResource', { examId, resourceId: resource.id })}
                >
                  <View
                    style={[
                      styles.resourceIconContainer,
                      { backgroundColor: `${theme.colors.primary}15` },
                    ]}
                  >
                    <Ionicons
                      name={getResourceIcon(resource.type) as any}
                      size={18}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.resourceContent}>
                    <View style={styles.resourceHeader}>
                      <Text style={[styles.resourceTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {resource.title}
                      </Text>
                      <View style={[styles.resourceTypeBadge, { backgroundColor: `${theme.colors.primary}10` }]}>
                        <Text style={[styles.resourceTypeText, { color: theme.colors.primary }]}>
                          {getResourceTypeLabel(resource.type)}
                        </Text>
                      </View>
                    </View>
                    {resource.notes && (
                      <Text
                        style={[styles.resourceNotes, { color: theme.colors.text.secondary }]}
                        numberOfLines={2}
                      >
                        {resource.notes}
                      </Text>
                    )}
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={theme.colors.text.tertiary}
                  />
                </Pressable>
              </View>
            ))}
          </View>

          {/* Add Resource Button */}
          <Pressable
            onPress={handleAddResource}
            style={[styles.addResourceButton, { backgroundColor: `${theme.colors.primary}10` }]}
          >
            <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.addResourceButtonText, { color: theme.colors.primary }]}>
              Add Resource
            </Text>
          </Pressable>
        </>
      )}
    </View>
  );

  const renderNotesTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.notesContainer, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.notesLabel, { color: theme.colors.text.secondary }]}>
          Exam Notes
        </Text>
        <TextInput
          style={[
            styles.notesInput,
            {
              backgroundColor: theme.colors.surface,
              color: theme.colors.text.primary,
              borderColor: theme.colors.border,
            },
          ]}
          value={examNotes}
          onChangeText={setExamNotes}
          placeholder="Add your notes here..."
          placeholderTextColor={theme.colors.text.tertiary}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          style={[
            styles.saveNotesButton,
            {
              backgroundColor: theme.colors.primary,
              opacity: isSavingNotes ? 0.7 : 1,
            },
          ]}
          onPress={handleSaveNotes}
          disabled={isSavingNotes}
        >
          <Text style={[styles.saveNotesButtonText, { color: theme.colors.text.inverse }]}>
            {isSavingNotes ? 'Saving...' : 'Save Notes'}
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <View style={styles.headerTop}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
          </Pressable>
          <View style={styles.headerSpacer} />
          <Pressable
            style={styles.menuButton}
            onPress={() => {
              if (!exam) return;
              showAlert({
                title: 'Exam Options',
                message: 'Choose an action',
                icon: 'ellipsis-vertical',
                buttons: [
                  {
                    text: 'Edit Exam',
                    onPress: () => navigation.navigate('AddExam', { examId: exam.id }),
                    style: 'default',
                  },
                  {
                    text: 'Delete Exam',
                    onPress: () => {
                      showAlert({
                        title: 'Delete Exam',
                        message: `Are you sure you want to delete "${exam.title}"? This action cannot be undone.`,
                        icon: 'trash',
                        iconColor: '#FFB4A0',
                        buttons: [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                              const { deleteExam } = useStore.getState();
                              await deleteExam(exam.id);
                              navigation.goBack();
                            },
                          },
                        ],
                      });
                    },
                    style: 'destructive',
                  },
                  { text: 'Cancel', style: 'cancel' },
                ],
              });
            }}
          >
            <Ionicons name="ellipsis-vertical" size={24} color={theme.colors.text.primary} />
          </Pressable>
        </View>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          {exam.title}
        </Text>
        <View style={styles.headerSubjectBadge}>
          <View style={[styles.subjectDot, { backgroundColor: subjectColor }]} />
          <Text style={[styles.headerSubject, { color: theme.colors.text.secondary }]}>
            {categoryName}
          </Text>
        </View>
      </View>

      {/* Countdown Circle */}
      <View style={styles.countdownContainer}>
        <View style={styles.progressCircleWrapper}>
          {/* SVG Progress Circle */}
          <Svg width={120} height={120} style={styles.progressSvg}>
            {/* Background Circle */}
            <Circle
              cx="60"
              cy="60"
              r="52"
              stroke={theme.colors.border}
              strokeWidth="7"
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx="60"
              cy="60"
              r="52"
              stroke={subjectColor}
              strokeWidth="7"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (countdown.isExpired ? 1 : (1 - Math.min(countdown.days / 30, 1)))}`}
              strokeLinecap="round"
              rotation="-90"
              origin="60, 60"
            />
          </Svg>

          {/* Content Over Circle */}
          <View style={styles.circleContentWrapper}>
            <View style={[styles.circleInner, { backgroundColor: theme.colors.card }]}>
              <View style={styles.circleContent}>
                <Text style={[styles.daysNumber, { color: theme.colors.text.primary }]}>
                  {countdown.days}
                </Text>
                <Text style={[styles.daysLabel, { color: theme.colors.text.secondary }]}>
                  Days
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Time Badge */}
        {!countdown.isExpired && (
          <View style={[styles.timeBadge, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="timer-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.timeBadgeText, { color: theme.colors.text.primary }]}>
              {String(countdown.hours).padStart(2, '0')}h {String(countdown.minutes).padStart(2, '0')}m {String(countdown.seconds).padStart(2, '0')}s
            </Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: theme.colors.border }]}>
        {renderTab('overview', 'Overview')}
        {renderTab('resources', 'Resources')}
        {renderTab('notes', 'Notes')}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'resources' && renderResourcesTab()}
        {activeTab === 'notes' && renderNotesTab()}
      </ScrollView>

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
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 6,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerSpacer: {
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  headerSubjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 6,
  },
  subjectDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerSubject: {
    fontSize: 13,
    fontWeight: '500',
  },
  countdownContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  progressCircleWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  circleContentWrapper: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleInner: {
    width: 98,
    height: 98,
    borderRadius: 49,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleContent: {
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 36,
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  timeBadgeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderBottomWidth: 3,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  detailsCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editButton: {
    fontSize: 13,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'column',
    gap: 10,
  },
  statCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
    letterSpacing: -0.5,
  },
  focusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 2,
  },
  focusButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyActionButton: {
    width: '100%',
    maxWidth: 280,
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  resourcesList: {
    gap: 8,
  },
  resourceCard: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resourceMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  resourceIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceContent: {
    flex: 1,
    gap: 3,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resourceTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  resourceTypeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  resourceTypeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resourceNotes: {
    fontSize: 12,
    lineHeight: 16,
  },
  addResourceButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    gap: 8,
  },
  addResourceButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 20,
    textAlign: 'center',
    marginTop: 32,
  },
  notesContainer: {
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notesInput: {
    minHeight: 200,
    maxHeight: 400,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  saveNotesButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveNotesButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
