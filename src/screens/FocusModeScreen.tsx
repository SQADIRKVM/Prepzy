import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  StatusBar,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<any, 'FocusMode'>;

const POMODORO_DURATION = 25 * 60; // 25 minutes
const SHORT_BREAK = 5 * 60; // 5 minutes
const LONG_BREAK = 15 * 60; // 15 minutes

type SessionType = 'focus' | 'shortBreak' | 'longBreak';

const { width } = Dimensions.get('window');
const isTablet = width >= 768;
const CIRCLE_SIZE = isTablet ? 320 : 256; // md:w-80 md:h-80 or w-64 h-64

export default function FocusModeScreen({ navigation, route }: Props) {
  const { theme } = useTheme();
  const { examId } = route.params;
  const {
    getExamById,
    getResourcesByExamId,
    startFocusSession,
    endFocusSession,
  } = useStore();

  const exam = getExamById(examId);
  const resources = getResourcesByExamId(examId);

  const [sessionType, setSessionType] = useState<SessionType>('focus');
  const [timeRemaining, setTimeRemaining] = useState(POMODORO_DURATION);
  const [isRunning, setIsRunning] = useState(false);
  const [completedResources, setCompletedResources] = useState<string[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [resourcesExpanded, setResourcesExpanded] = useState(true);
  const [completedSessionsCount, setCompletedSessionsCount] = useState(0);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getDuration = (type: SessionType) => {
    switch (type) {
      case 'focus':
        return POMODORO_DURATION;
      case 'shortBreak':
        return SHORT_BREAK;
      case 'longBreak':
        return LONG_BREAK;
    }
  };

  useEffect(() => {
    if (isRunning && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSessionComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeRemaining]);

  const handleSessionComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRunning(false);

    if (sessionType === 'focus' && currentSessionId) {
      endFocusSession(currentSessionId, completedResources);
      setCurrentSessionId(null);
      setCompletedSessionsCount((prev) => prev + 1);
    }
  };

  const handleStart = () => {
    if (sessionType === 'focus' && !currentSessionId) {
      const sessionId = startFocusSession(examId);
      setCurrentSessionId(sessionId);
    }
    setIsRunning(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handlePause = () => {
    setIsRunning(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeRemaining(getDuration(sessionType));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (currentSessionId) {
      endFocusSession(currentSessionId, completedResources);
      setCurrentSessionId(null);
    }
    // Auto switch to next session type
    if (sessionType === 'focus') {
      handleChangeSession('shortBreak');
    } else {
      handleChangeSession('focus');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleChangeSession = (type: SessionType) => {
    if (isRunning) {
      handlePause();
    }
    if (currentSessionId) {
      endFocusSession(currentSessionId, completedResources);
      setCurrentSessionId(null);
    }
    setSessionType(type);
    setTimeRemaining(getDuration(type));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleResourceCompletion = (resourceId: string) => {
    setCompletedResources((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleClose = () => {
    if (currentSessionId) {
      endFocusSession(currentSessionId, completedResources);
    }
    navigation.goBack();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - timeRemaining / getDuration(sessionType);
  const totalSessions = 4; // Example: 4 pomodoro sessions
  const sessionProgress = completedSessionsCount / totalSessions;

  // SVG circle calculations (matching HTML viewBox="0 0 120 120" with r="56")
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  if (!exam) {
    return null;
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={handleClose}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.examTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
          {exam.title}
        </Text>
        <Pressable
          style={styles.menuButton}
          onPress={() => navigation.navigate('FocusModePreferences')}
        >
          <Ionicons name="ellipsis-vertical" size={28} color={theme.colors.text.primary} />
        </Pressable>
      </View>

      {/* Scrollable Content */}
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
          styles.scrollContent,
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Center Content - Grows to fill space */}
        <View style={styles.centerContent}>
          {/* Circular Timer with SVG Progress */}
          <View style={styles.timerContainer}>
            <View style={[styles.progressCircleWrapper, { width: CIRCLE_SIZE, height: CIRCLE_SIZE }]}>
              <Svg
                width={CIRCLE_SIZE}
                height={CIRCLE_SIZE}
                viewBox="0 0 120 120"
                style={styles.progressSvg}
              >
                {/* Background Circle */}
                <Circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="rgba(255, 255, 255, 0.15)"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Progress Circle */}
                <Circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke={theme.colors.primary}
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin="60, 60"
                />
              </Svg>

              {/* Timer Text */}
              <View style={styles.timerTextContainer}>
                <Text style={[styles.timerText, { color: theme.colors.text.primary }]}>
                  {formatTime(timeRemaining)}
                </Text>
              </View>
            </View>
          </View>

          {/* Session Type Pills */}
          <View style={styles.sessionSelector}>
            <View style={[styles.pillContainer, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
              <Pressable
                style={[
                  styles.pill,
                  sessionType === 'focus' && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => handleChangeSession('focus')}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: sessionType === 'focus' ? '#000' : 'rgba(156, 163, 175, 1)',
                      fontWeight: sessionType === 'focus' ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  Focus
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pill,
                  sessionType === 'shortBreak' && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => handleChangeSession('shortBreak')}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: sessionType === 'shortBreak' ? '#000' : 'rgba(156, 163, 175, 1)',
                      fontWeight: sessionType === 'shortBreak' ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  Short Break
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.pill,
                  sessionType === 'longBreak' && { backgroundColor: theme.colors.primary },
                ]}
                onPress={() => handleChangeSession('longBreak')}
              >
                <Text
                  style={[
                    styles.pillText,
                    {
                      color: sessionType === 'longBreak' ? '#000' : 'rgba(156, 163, 175, 1)',
                      fontWeight: sessionType === 'longBreak' ? '700' : '500',
                    },
                  ]}
                  numberOfLines={1}
                >
                  Long Break
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Message */}
          <Text style={[styles.messageText, { color: 'rgba(156, 163, 175, 1)' }]}>
            {isRunning ? "You've got this! Stay focused" : "Let's get started!"}
          </Text>

          {/* Control Buttons */}
          <View style={styles.controls}>
            <Pressable
              style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
              onPress={handleReset}
            >
              <Ionicons name="reload" size={36} color={theme.colors.text.primary} />
            </Pressable>

            <Pressable
              style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
              onPress={isRunning ? handlePause : handleStart}
            >
              <Ionicons
                name={isRunning ? "pause" : "play"}
                size={48}
                color="#000"
                style={isRunning ? {} : { marginLeft: 4 }}
              />
            </Pressable>

            <Pressable
              style={[styles.controlButton, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
              onPress={handleSkip}
            >
              <Ionicons name="play-skip-forward" size={36} color={theme.colors.text.primary} />
            </Pressable>
          </View>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          {/* Resources Section */}
          <View style={[styles.resourcesCard, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
            <Pressable
              style={styles.resourcesHeader}
              onPress={() => setResourcesExpanded(!resourcesExpanded)}
            >
              <Text style={[styles.resourcesTitle, { color: theme.colors.text.primary }]}>
                My Resources
              </Text>
              <Ionicons
                name={resourcesExpanded ? "chevron-up" : "chevron-down"}
                size={24}
                color="rgba(156, 163, 175, 1)"
              />
            </Pressable>

            {resourcesExpanded && resources.length > 0 && (
              <View style={styles.resourcesList}>
                {resources.map((resource) => {
                  const isCompleted = completedResources.includes(resource.id);
                  return (
                    <Pressable
                      key={resource.id}
                      style={styles.resourceItem}
                      onPress={() => toggleResourceCompletion(resource.id)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            borderColor: isCompleted ? theme.colors.primary : 'rgba(75, 85, 99, 1)',
                            backgroundColor: isCompleted ? theme.colors.primary : 'transparent',
                          },
                        ]}
                      >
                        {isCompleted && (
                          <Ionicons name="checkmark" size={16} color="#000" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.resourceText,
                          {
                            color: 'rgba(209, 213, 219, 1)',
                            textDecorationLine: isCompleted ? 'line-through' : 'none',
                          },
                        ]}
                      >
                        {resource.title}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* DND Settings Link */}
          <Pressable
            style={[styles.dndCard, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('DNDSettings');
            }}
          >
            <View style={styles.dndLeft}>
              <Ionicons name="moon" size={24} color={theme.colors.primary} />
              <Text style={[styles.dndTitle, { color: theme.colors.text.primary }]}>
                DND Settings
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="rgba(156, 163, 175, 1)" />
          </Pressable>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarBg, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]}>
            <View
              style={[
                styles.progressBarFill,
                {
                  backgroundColor: theme.colors.primary,
                  width: `${sessionProgress * 100}%`,
                },
              ]}
            />
          </View>
        </View>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
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
  examTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'left', // Left-align for consistency
    marginLeft: 8,
    letterSpacing: -0.27,
    lineHeight: 24,
  },
  menuButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  centerContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 32,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleWrapper: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSvg: {
    position: 'absolute',
  },
  timerTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 60,
    fontWeight: '700',
    letterSpacing: -1.5,
    lineHeight: 60,
  },
  sessionSelector: {
    width: '100%',
    maxWidth: 448,
    paddingHorizontal: 16,
  },
  pillContainer: {
    flexDirection: 'row',
    height: 48,
    borderRadius: 12,
    padding: 6,
    gap: 0,
  },
  pill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  resourcesCard: {
    width: '100%',
    maxWidth: 448,
    marginHorizontal: 'auto',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  resourcesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resourcesTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  resourcesList: {
    marginTop: 16,
    gap: 12,
  },
  resourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resourceText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '400',
  },
  dndCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 448,
    marginHorizontal: 'auto',
    borderRadius: 12,
    padding: 16,
  },
  dndLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dndTitle: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  progressBarContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    width: '100%',
    maxWidth: 448,
    marginHorizontal: 'auto',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 9999,
  },
});
