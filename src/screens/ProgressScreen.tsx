import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { checkAndNotifyGoalAchievements } from '../services/goalAchievementService';

type Timeframe = 'This Week' | 'This Month' | 'All Time';

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { focusSessions, exams, getExamById, getGoals } = useStore();
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('This Week');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Load goals from store
  const goals = getGoals();

  // Helper function to get start/end dates based on timeframe
  const getTimeframeDates = (timeframe: Timeframe) => {
    const now = new Date();
    const start = new Date();
    
    switch (timeframe) {
      case 'This Week':
        start.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        start.setHours(0, 0, 0, 0);
        break;
      case 'This Month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'All Time':
        start.setFullYear(2020, 0, 1); // Arbitrary old date
        break;
    }
    
    return { start, end: now };
  };

  // Filter sessions by timeframe
  const filteredSessions = useMemo(() => {
    const { start, end } = getTimeframeDates(selectedTimeframe);
    return focusSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= start && sessionDate <= end;
    });
  }, [focusSessions, selectedTimeframe]);

  // Calculate study hours from filtered sessions
  const totalHours = useMemo(() => {
    const totalSeconds = filteredSessions.reduce((sum, session) => sum + session.duration, 0);
    return (totalSeconds / 3600).toFixed(1);
  }, [filteredSessions]);

  const totalSessions = filteredSessions.length;
  const averageSessionMinutes = totalSessions > 0
    ? Math.round(filteredSessions.reduce((sum, s) => sum + s.duration, 0) / totalSessions / 60)
    : 0;

  // Weekly goal progress - calculate from this week's sessions
  // Use goals from store if available, otherwise use default
  const weeklyGoalHours = goals?.weeklyHours || 20; // Default to 20 if no goal set
  const weeklySessions = useMemo(() => {
    const { start } = getTimeframeDates('This Week');
    return focusSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= start;
    });
  }, [focusSessions]);
  
  const weeklyCurrentHours = useMemo(() => {
    const totalSeconds = weeklySessions.reduce((sum, session) => sum + session.duration, 0);
    return parseFloat((totalSeconds / 3600).toFixed(1));
  }, [weeklySessions]);
  
  const weeklyProgress = weeklyGoalHours > 0 
    ? Math.min((weeklyCurrentHours / weeklyGoalHours) * 360, 360)
    : 0;
  const weeklyProgressPercent = weeklyGoalHours > 0
    ? Math.min((weeklyCurrentHours / weeklyGoalHours) * 100, 100)
    : 0;
  
  // Grade-based progress tracking (if goals include grades)
  const gradeProgress = useMemo(() => {
    if (!goals || goals.goalType !== 'grades' || !goals.grades || goals.grades.length === 0) {
      return null;
    }
    
    // Calculate average progress across all subjects
    const validGrades = goals.grades.filter(g => g.targetGrade > 0);
    if (validGrades.length === 0) return null;
    
    const totalProgress = validGrades.reduce((sum, g) => {
      const progress = g.targetGrade > 0 
        ? Math.min(100, Math.max(0, (g.currentGrade / g.targetGrade) * 100))
        : 0;
      return sum + progress;
    }, 0);
    
    const averageProgress = totalProgress / validGrades.length;
    
    return {
      averageProgress: Math.round(averageProgress),
      totalSubjects: validGrades.length,
      completedSubjects: validGrades.filter(g => {
        const progress = g.targetGrade > 0 
          ? Math.min(100, Math.max(0, (g.currentGrade / g.targetGrade) * 100))
          : 0;
        return progress >= 100;
      }).length,
      subjects: validGrades.map(g => ({
        subject: g.subject,
        currentGrade: g.gradeType === 'letter' ? g.currentLetter : `${Math.round(g.currentGrade)}%`,
        targetGrade: g.gradeType === 'letter' ? g.targetLetter : `${Math.round(g.targetGrade)}%`,
        progress: Math.round(g.targetGrade > 0 
          ? Math.min(100, Math.max(0, (g.currentGrade / g.targetGrade) * 100))
          : 0),
      })),
    };
  }, [goals]);

  // Check goal achievements when progress changes
  useEffect(() => {
    if (!goals) return;

    const checkGoals = async () => {
      try {
        if (goals.goalType === 'hours') {
          await checkAndNotifyGoalAchievements(goals, weeklyCurrentHours);
        } else if (goals.goalType === 'grades' && gradeProgress) {
          // Build current grades map
          const currentGrades: { [subject: string]: number } = {};
          if (goals.grades) {
            goals.grades.forEach(g => {
              currentGrades[g.subject] = g.currentGrade || 0;
            });
          }
          await checkAndNotifyGoalAchievements(goals, 0, currentGrades);
        }
      } catch (error) {
        console.error('Error checking goal achievements:', error);
      }
    };

    // Debounce to avoid checking too frequently
    const timeoutId = setTimeout(checkGoals, 2000);
    return () => clearTimeout(timeoutId);
  }, [goals, weeklyCurrentHours, gradeProgress]);

  // Weekly study trend - last 7 days
  const weeklyTrendData = useMemo(() => {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const last7Days = focusSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= sevenDaysAgo;
    });
    
    const previous7Days = focusSessions.filter(session => {
      const sessionDate = new Date(session.startTime);
      const twoWeeksAgo = new Date(now);
      twoWeeksAgo.setDate(now.getDate() - 14);
      twoWeeksAgo.setHours(0, 0, 0, 0);
      return sessionDate >= twoWeeksAgo && sessionDate < sevenDaysAgo;
    });
    
    const last7Hours = last7Days.reduce((sum, s) => sum + s.duration, 0) / 3600;
    const previous7Hours = previous7Days.reduce((sum, s) => sum + s.duration, 0) / 3600;
    
    const trendPercent = previous7Hours > 0 
      ? ((last7Hours - previous7Hours) / previous7Hours) * 100 
      : (last7Hours > 0 ? 100 : 0);
    
    // Calculate daily data for chart
    const dailyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const daySessions = last7Days.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= date && sessionDate < nextDate;
      });
      
      const dayHours = daySessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
      dailyData.push(dayHours);
    }
    
    return {
      hours: parseFloat(last7Hours.toFixed(1)),
      percent: parseFloat(trendPercent.toFixed(1)),
      dailyData,
    };
  }, [focusSessions]);

  // Subject breakdown - calculate from sessions grouped by exam subject
  const subjectBreakdown = useMemo(() => {
    const subjectMap = new Map<string, number>();
    
    filteredSessions.forEach(session => {
      const exam = getExamById(session.examId);
      if (exam) {
        const subject = exam.subjectCategory;
        const currentHours = subjectMap.get(subject) || 0;
        subjectMap.set(subject, currentHours + (session.duration / 3600));
      }
    });
    
    const totalHours = Array.from(subjectMap.values()).reduce((sum, hours) => sum + hours, 0);
    
    return Array.from(subjectMap.entries())
      .map(([name, hours]) => ({
        name,
        hours: parseFloat(hours.toFixed(1)),
        percentage: totalHours > 0 ? Math.round((hours / totalHours) * 100) : 0,
      }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10); // Top 10 subjects
  }, [filteredSessions, getExamById]);

  // Calendar heatmap data - real data from sessions
  const currentDate = new Date();
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(selectedYear, selectedMonth, 1).getDay();

  const calendarDays = useMemo(() => {
    const days = [];
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Calculate intensity for each day based on session hours
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const daySessions = focusSessions.filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= date && sessionDate < nextDate;
      });
      
      const dayHours = daySessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
      
      // Map hours to intensity (0-4)
      // 0 = no study, 1 = < 0.5h, 2 = 0.5-1h, 3 = 1-2h, 4 = > 2h
      let intensity = 0;
      if (dayHours > 2) intensity = 4;
      else if (dayHours > 1) intensity = 3;
      else if (dayHours > 0.5) intensity = 2;
      else if (dayHours > 0) intensity = 1;
      
      days.push({ day, intensity, hours: dayHours });
    }
    
    return days;
  }, [firstDayOfMonth, daysInMonth, selectedMonth, selectedYear, focusSessions]);

  // Achievements - calculate from real data
  const achievements = useMemo(() => {
    const totalHoursStudied = focusSessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
    
    // Calculate streak
    const sortedSessions = [...focusSessions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    let streak = 0;
    if (sortedSessions.length > 0) {
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].startTime);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === streak) {
          streak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (daysDiff > streak) {
          break;
        }
      }
    }
    
    // Early bird / Night owl
    let earlyBird = false;
    let nightOwl = false;
    if (focusSessions.length > 0) {
      const morningSessions = focusSessions.filter(s => {
        const hour = new Date(s.startTime).getHours();
        return hour >= 5 && hour < 12;
      }).length;
      const nightSessions = focusSessions.filter(s => {
        const hour = new Date(s.startTime).getHours();
        return hour >= 20 || hour < 5;
      }).length;
      
      earlyBird = morningSessions > focusSessions.length * 0.5;
      nightOwl = nightSessions > focusSessions.length * 0.5;
    }
    
    // Perfect week - study every day for a week
    const perfectWeek = weeklySessions.length > 0 && streak >= 7;
    
    return [
      { icon: 'flame', title: `${streak}-Day Streak`, unlocked: streak >= 5 },
      { icon: 'school', title: `${Math.floor(totalHoursStudied)} Hours Studied`, unlocked: totalHoursStudied >= 100 },
      { icon: 'time', title: 'Early Bird', unlocked: earlyBird },
      { icon: 'moon', title: 'Night Owl', unlocked: nightOwl },
      { icon: 'rocket', title: 'Perfect Week', unlocked: perfectWeek },
    ];
  }, [focusSessions, weeklySessions]);

  const getIntensityColor = (intensity: number) => {
    const opacity = intensity === 0 ? 0 : intensity === 1 ? 0.2 : intensity === 2 ? 0.4 : intensity === 3 ? 0.7 : 1;
    return `${theme.colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonthName = monthNames[selectedMonth];

  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    const now = new Date();
    if (selectedMonth === 11) {
      if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      }
    } else {
      if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // Generate chart path from daily data
  const generateChartPath = (data: number[]) => {
    if (data.length === 0) return { linePath: '', fillPath: '' };
    
    const maxValue = Math.max(...data, 1); // Avoid division by zero
    const width = 475;
    const height = 150;
    const step = data.length > 1 ? width / (data.length - 1) : width;
    
    const points = data.map((value, index) => {
      const x = index * step;
      const y = height - (value / maxValue) * height;
      return { x, y };
    });
    
    if (points.length === 0) return { linePath: '', fillPath: '' };
    
    // Create smooth curve using quadratic bezier
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2;
      path += ` Q ${prev.x} ${prev.y} ${midX} ${(prev.y + curr.y) / 2}`;
      path += ` L ${curr.x} ${curr.y}`;
    }
    
    // Close path for gradient fill
    const fillPath = path + ` L ${width} ${height} L 0 ${height} Z`;
    
    return { linePath: path, fillPath };
  };

  const chartPaths = generateChartPath(weeklyTrendData.dailyData);

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
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          My Progress
        </Text>
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
          Platform.OS === 'web' && { 
            paddingBottom: 100,
            flexGrow: 1,
          }
        ]}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {/* Timeframe Selector */}
        <View style={styles.timeframeContainer}>
          <View style={[styles.timeframeSelector, { backgroundColor: theme.colors.card }]}>
            {(['This Week', 'This Month', 'All Time'] as Timeframe[]).map((timeframe) => (
              <Pressable
                key={timeframe}
                style={[
                  styles.timeframeButton,
                  selectedTimeframe === timeframe && {
                    backgroundColor: theme.colors.primary,
                  },
                ]}
                onPress={() => setSelectedTimeframe(timeframe)}
              >
                <Text
                  style={[
                    styles.timeframeText,
                    {
                      color:
                        selectedTimeframe === timeframe
                          ? '#000'
                          : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {timeframe}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Weekly Goal Progress */}
        {goals && goals.goalType === 'hours' && (
          <View style={[styles.goalCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.goalTitle, { color: theme.colors.text.primary }]}>
              Weekly Goal Progress
            </Text>
            <View style={styles.circularProgressContainer}>
              <Svg width={112} height={112} style={styles.circularProgressSvg}>
                {/* Background circle */}
                <Circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke={theme.colors.border}
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke={theme.colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 50 * (weeklyProgress / 360)} ${2 * Math.PI * 50}`}
                  strokeDashoffset={2 * Math.PI * 50 * 0.25}
                  strokeLinecap="round"
                  transform="rotate(-90 56 56)"
                />
              </Svg>
              <View style={[styles.circularProgressInner, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.goalHours, { color: theme.colors.text.primary }]}>
                  {weeklyCurrentHours}
                </Text>
                <Text style={[styles.goalTotal, { color: theme.colors.text.secondary }]}>
                  / {weeklyGoalHours} hrs
                </Text>
              </View>
            </View>
            <Text style={[styles.goalProgressText, { color: theme.colors.text.secondary }]}>
              {weeklyProgressPercent.toFixed(0)}% of weekly goal
            </Text>
          </View>
        )}

        {/* Grade Goal Progress */}
        {gradeProgress && (
          <View style={[styles.goalCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.goalTitle, { color: theme.colors.text.primary }]}>
              Grade Goal Progress
            </Text>
            <View style={styles.circularProgressContainer}>
              <Svg width={112} height={112} style={styles.circularProgressSvg}>
                {/* Background circle */}
                <Circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke={theme.colors.border}
                  strokeWidth="8"
                  fill="none"
                />
                {/* Progress circle */}
                <Circle
                  cx="56"
                  cy="56"
                  r="50"
                  stroke={theme.colors.primary}
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 50 * (gradeProgress.averageProgress / 100)} ${2 * Math.PI * 50}`}
                  strokeDashoffset={2 * Math.PI * 50 * 0.25}
                  strokeLinecap="round"
                  transform="rotate(-90 56 56)"
                />
              </Svg>
              <View style={[styles.circularProgressInner, { backgroundColor: theme.colors.card }]}>
                <Text style={[styles.goalHours, { color: theme.colors.text.primary }]}>
                  {gradeProgress.averageProgress}%
                </Text>
                <Text style={[styles.goalTotal, { color: theme.colors.text.secondary }]}>
                  Average
                </Text>
              </View>
            </View>
            <Text style={[styles.goalProgressText, { color: theme.colors.text.secondary }]}>
              {gradeProgress.completedSubjects} of {gradeProgress.totalSubjects} subjects completed
            </Text>
            {/* Subject breakdown */}
            <View style={styles.gradeSubjectsList}>
              {gradeProgress.subjects.slice(0, 3).map((subject, index) => (
                <View key={index} style={styles.gradeSubjectItem}>
                  <Text style={[styles.gradeSubjectName, { color: theme.colors.text.primary }]} numberOfLines={1}>
                    {subject.subject}
                  </Text>
                  <View style={styles.gradeSubjectProgress}>
                    <View style={[styles.gradeProgressBar, { backgroundColor: theme.colors.border }]}>
                      <View 
                        style={[
                          styles.gradeProgressFill, 
                          { 
                            width: `${subject.progress}%`,
                            backgroundColor: theme.colors.primary,
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.gradeSubjectPercent, { color: theme.colors.text.secondary }]}>
                      {subject.progress}%
                    </Text>
                  </View>
                  <Text style={[styles.gradeSubjectGrades, { color: theme.colors.text.tertiary }]}>
                    {subject.currentGrade} → {subject.targetGrade}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Total Hours Studied
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {totalHours}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Sessions
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {totalSessions}
            </Text>
          </View>
          <View style={[styles.statCard, styles.statCardFull, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Average Session
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {averageSessionMinutes} min
            </Text>
          </View>
        </View>

        {/* Study Heatmap */}
        <View style={[styles.heatmapCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Study Heatmap
          </Text>
          
          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <Pressable 
              style={styles.monthNavButton}
              onPress={handlePreviousMonth}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text.secondary} />
            </Pressable>
            <Text style={[styles.monthTitle, { color: theme.colors.text.primary }]}>
              {currentMonthName} {selectedYear}
            </Text>
            <Pressable 
              style={styles.monthNavButton}
              onPress={handleNextMonth}
              disabled={selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth()}
            >
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color={
                  selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth()
                    ? theme.colors.text.tertiary
                    : theme.colors.text.secondary
                } 
              />
            </Pressable>
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {/* Day headers */}
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <View key={index} style={styles.calendarDayHeader}>
                <Text style={[styles.calendarDayHeaderText, { color: theme.colors.text.secondary }]}>
                  {day}
                </Text>
              </View>
            ))}
            
            {/* Calendar days */}
            {calendarDays.map((dayData, index) => (
              <View key={index} style={styles.calendarDay}>
                {dayData ? (
                  <View
                    style={[
                      styles.calendarDayCell,
                      { backgroundColor: getIntensityColor(dayData.intensity) || theme.colors.background },
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        {
                          color:
                            dayData.intensity > 0
                              ? theme.colors.text.primary
                              : theme.colors.text.secondary,
                        },
                      ]}
                    >
                      {dayData.day}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.calendarDayEmpty} />
                )}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>Less</Text>
            <View style={styles.legendColors}>
              {[0.2, 0.4, 0.7, 1].map((opacity, index) => (
                <View
                  key={index}
                  style={[
                    styles.legendColor,
                    {
                      backgroundColor: `${theme.colors.primary}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`,
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>More</Text>
          </View>
        </View>

        {/* Weekly Study Trend */}
        <View style={[styles.trendCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Weekly Study Trend
          </Text>
          <Text style={[styles.trendValue, { color: theme.colors.text.primary }]}>
            {weeklyTrendData.hours} hrs
          </Text>
          <View style={styles.trendInfo}>
            <Text style={[styles.trendLabel, { color: theme.colors.text.secondary }]}>
              Last 7 days
            </Text>
            {weeklyTrendData.percent !== 0 && (
              <Text style={[
                styles.trendPercent, 
                { color: weeklyTrendData.percent >= 0 ? theme.colors.primary : theme.colors.status.error }
              ]}>
                {weeklyTrendData.percent >= 0 ? '+' : ''}{weeklyTrendData.percent}%
              </Text>
            )}
          </View>
          
          {/* Line Chart */}
          <View style={styles.chartContainer}>
            {weeklyTrendData.dailyData.length > 0 ? (
              <Svg width="100%" height={150} viewBox="0 0 475 150" preserveAspectRatio="none">
                <Defs>
                  <LinearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor={theme.colors.primary} stopOpacity="0.3" />
                    <Stop offset="100%" stopColor={theme.colors.primary} stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                {/* Gradient fill */}
                <Path
                  d={chartPaths.fillPath}
                  fill="url(#chartGradient)"
                />
                {/* Line */}
                <Path
                  d={chartPaths.linePath}
                  stroke={theme.colors.primary}
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                />
              </Svg>
            ) : (
              <View style={styles.emptyChart}>
                <Text style={[styles.emptyChartText, { color: theme.colors.text.tertiary }]}>
                  No study data for the last 7 days
                </Text>
              </View>
            )}
            <View style={styles.chartLabels}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <Text key={index} style={[styles.chartLabel, { color: theme.colors.text.secondary }]}>
                  {day}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Achievements */}
        <View style={styles.achievementsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Achievements
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.achievementsList}
          >
            {achievements.map((achievement, index) => (
              <View key={index} style={styles.achievementItem}>
                <View
                  style={[
                    styles.achievementIcon,
                    {
                      backgroundColor: achievement.unlocked
                        ? `${theme.colors.primary}20`
                        : theme.colors.card,
                    },
                  ]}
                >
                  <Ionicons
                    name={achievement.icon as any}
                    size={32}
                    color={
                      achievement.unlocked
                        ? theme.colors.primary
                        : theme.colors.text.secondary
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.achievementTitle,
                    {
                      color: achievement.unlocked
                        ? theme.colors.text.primary
                        : theme.colors.text.secondary,
                    },
                  ]}
                >
                  {achievement.title}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Subject Breakdown */}
        <View style={[styles.subjectCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Subject Breakdown
          </Text>
          {subjectBreakdown.length > 0 ? (
            subjectBreakdown.map((subject, index) => (
              <View key={index} style={styles.subjectRow}>
                <View style={styles.subjectHeader}>
                  <Text style={[styles.subjectName, { color: theme.colors.text.primary }]}>
                    {subject.name}
                  </Text>
                  <Text style={[styles.subjectHours, { color: theme.colors.text.secondary }]}>
                    {subject.hours} hrs
                  </Text>
                </View>
                <View style={[styles.progressBarContainer, { backgroundColor: theme.colors.background }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${subject.percentage}%`,
                        backgroundColor: theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="school-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyStateText, { color: theme.colors.text.secondary }]}>
                No study sessions yet
              </Text>
              <Text style={[styles.emptyStateSubtext, { color: theme.colors.text.tertiary }]}>
                Start a focus session to see your subject breakdown
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  // Timeframe Selector
  timeframeContainer: {
    marginBottom: 12,
  },
  timeframeSelector: {
    flexDirection: 'row',
    height: 44,
    borderRadius: 8,
    padding: 2,
  },
  timeframeButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
  },
  timeframeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  // Goal Card
  goalCard: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  circularProgressContainer: {
    width: 112,
    height: 112,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  circularProgressSvg: {
    position: 'absolute',
  },
  circularProgressInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalHours: {
    fontSize: 24,
    fontWeight: '700',
  },
  goalTotal: {
    fontSize: 14,
    fontWeight: '500',
  },
  goalProgressText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
  },
  gradeSubjectsList: {
    marginTop: 16,
    gap: 12,
  },
  gradeSubjectItem: {
    paddingVertical: 8,
  },
  gradeSubjectName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  gradeSubjectProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  gradeProgressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  gradeProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  gradeSubjectPercent: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 35,
  },
  gradeSubjectGrades: {
    fontSize: 12,
    fontWeight: '400',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    gap: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '48%',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  statCardFull: {
    width: '100%',
    minWidth: '100%',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  // Heatmap
  heatmapCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
  },
  monthNavButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarDayHeader: {
    flex: 1,
    minWidth: '14.28%',
    maxWidth: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayHeaderText: {
    fontSize: 13,
    fontWeight: '700',
  },
  calendarDay: {
    flex: 1,
    minWidth: '14.28%',
    maxWidth: '14.28%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 2,
  },
  calendarDayCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  calendarDayEmpty: {
    width: 32,
    height: 32,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    paddingTop: 8,
  },
  legendText: {
    fontSize: 12,
  },
  legendColors: {
    flexDirection: 'row',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  // Trend Card
  trendCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  trendValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  trendInfo: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  trendLabel: {
    fontSize: 14,
  },
  trendPercent: {
    fontSize: 14,
    fontWeight: '500',
  },
  chartContainer: {
    marginTop: 16,
    minHeight: 180,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyChart: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Achievements
  achievementsSection: {
    marginBottom: 24,
  },
  achievementsList: {
    flexDirection: 'row',
    gap: 16,
    paddingRight: 16,
  },
  achievementItem: {
    width: 96,
    alignItems: 'center',
    gap: 8,
  },
  achievementIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTitle: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  // Subject Breakdown
  subjectCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  subjectRow: {
    marginBottom: 16,
    gap: 8,
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectName: {
    fontSize: 14,
    fontWeight: '500',
  },
  subjectHours: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
