import React, { useMemo, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { LinearGradient } from 'expo-linear-gradient';

type Props = NativeStackScreenProps<any, 'StreakManagement'>;

export default function StreakManagementScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { focusSessions } = useStore();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Calculate current streak
  const streakData = useMemo(() => {
    const sortedSessions = [...focusSessions].sort((a, b) => 
      new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    
    let currentStreak = 0;
    let longestStreak = 0;
    const streakHistory: { date: Date; hasSession: boolean }[] = [];
    
    if (sortedSessions.length > 0) {
      // Calculate current streak
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < sortedSessions.length; i++) {
        const sessionDate = new Date(sortedSessions[i].startTime);
        sessionDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((currentDate.getTime() - sessionDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === currentStreak) {
          currentStreak++;
          currentDate.setDate(currentDate.getDate() - 1);
        } else if (daysDiff > currentStreak) {
          break;
        }
      }
      
      // Calculate longest streak
      let tempStreak = 0;
      let maxStreak = 0;
      const uniqueDates = new Set<string>();
      
      sortedSessions.forEach(session => {
        const sessionDate = new Date(session.startTime);
        sessionDate.setHours(0, 0, 0, 0);
        uniqueDates.add(sessionDate.toISOString());
      });
      
      const sortedDates = Array.from(uniqueDates)
        .map(d => new Date(d))
        .sort((a, b) => b.getTime() - a.getTime());
      
      for (let i = 0; i < sortedDates.length; i++) {
        if (i === 0) {
          tempStreak = 1;
        } else {
          const prevDate = sortedDates[i - 1];
          const currDate = sortedDates[i];
          const daysDiff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDiff === 1) {
            tempStreak++;
          } else {
            maxStreak = Math.max(maxStreak, tempStreak);
            tempStreak = 1;
          }
        }
        maxStreak = Math.max(maxStreak, tempStreak);
      }
      
      longestStreak = maxStreak;
      
      // Generate streak history for last 30 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const hasSession = uniqueDates.has(date.toISOString().split('T')[0] + 'T00:00:00.000Z');
        streakHistory.push({ date, hasSession });
      }
    }
    
    return {
      currentStreak,
      longestStreak,
      streakHistory,
    };
  }, [focusSessions]);

  // Get calendar days for selected month
  const calendarDays = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth;
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthLastDay - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, prevMonthLastDay - i),
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    
    return days;
  }, [selectedMonth, selectedYear]);

  // Check if date has study session
  const hasSessionOnDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return focusSessions.some(session => {
      const sessionDate = new Date(session.startTime);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.toISOString().split('T')[0] === dateStr;
    });
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

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

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Calculate achievements
  const achievements = useMemo(() => {
    const totalHours = focusSessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
    const totalSessions = focusSessions.length;
    const currentStreak = streakData.currentStreak;
    const longestStreak = streakData.longestStreak;

    // Calculate weekly sessions
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const weeklySessions = focusSessions.filter(s => {
      const sessionDate = new Date(s.startTime);
      return sessionDate >= startOfWeek;
    });

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

    // Perfect week
    const uniqueWeeklyDates = new Set(
      weeklySessions.map(s => {
        const d = new Date(s.startTime);
        d.setHours(0, 0, 0, 0);
        return d.toISOString();
      })
    );
    const perfectWeek = uniqueWeeklyDates.size >= 7;

    // Marathon session (longest single session)
    const longestSession = focusSessions.length > 0
      ? Math.max(...focusSessions.map(s => s.duration)) / 3600
      : 0;

    return [
      // Streak Achievements
      {
        id: 'streak-5',
        category: 'Streak',
        icon: 'flame',
        title: 'On Fire',
        description: 'Maintain a 5-day streak',
        unlocked: currentStreak >= 5,
        progress: Math.min((currentStreak / 5) * 100, 100),
        rarity: 'common',
      },
      {
        id: 'streak-10',
        category: 'Streak',
        icon: 'flame',
        title: 'Hot Streak',
        description: 'Maintain a 10-day streak',
        unlocked: currentStreak >= 10,
        progress: Math.min((currentStreak / 10) * 100, 100),
        rarity: 'uncommon',
      },
      {
        id: 'streak-30',
        category: 'Streak',
        icon: 'flame',
        title: 'Streak Master',
        description: 'Maintain a 30-day streak',
        unlocked: currentStreak >= 30,
        progress: Math.min((currentStreak / 30) * 100, 100),
        rarity: 'rare',
      },
      {
        id: 'streak-100',
        category: 'Streak',
        icon: 'flame',
        title: 'Legendary Streak',
        description: 'Maintain a 100-day streak',
        unlocked: currentStreak >= 100,
        progress: Math.min((currentStreak / 100) * 100, 100),
        rarity: 'epic',
      },
      {
        id: 'longest-50',
        category: 'Streak',
        icon: 'trophy',
        title: 'Consistency King',
        description: 'Achieve a 50-day longest streak',
        unlocked: longestStreak >= 50,
        progress: Math.min((longestStreak / 50) * 100, 100),
        rarity: 'rare',
      },
      // Study Hours Achievements
      {
        id: 'hours-10',
        category: 'Study',
        icon: 'school',
        title: 'Getting Started',
        description: 'Study for 10 hours total',
        unlocked: totalHours >= 10,
        progress: Math.min((totalHours / 10) * 100, 100),
        rarity: 'common',
      },
      {
        id: 'hours-50',
        category: 'Study',
        icon: 'school',
        title: 'Dedicated Learner',
        description: 'Study for 50 hours total',
        unlocked: totalHours >= 50,
        progress: Math.min((totalHours / 50) * 100, 100),
        rarity: 'uncommon',
      },
      {
        id: 'hours-100',
        category: 'Study',
        icon: 'school',
        title: 'Century Club',
        description: 'Study for 100 hours total',
        unlocked: totalHours >= 100,
        progress: Math.min((totalHours / 100) * 100, 100),
        rarity: 'rare',
      },
      {
        id: 'hours-500',
        category: 'Study',
        icon: 'school',
        title: 'Master Scholar',
        description: 'Study for 500 hours total',
        unlocked: totalHours >= 500,
        progress: Math.min((totalHours / 500) * 100, 100),
        rarity: 'epic',
      },
      {
        id: 'hours-1000',
        category: 'Study',
        icon: 'school',
        title: 'Grand Master',
        description: 'Study for 1000 hours total',
        unlocked: totalHours >= 1000,
        progress: Math.min((totalHours / 1000) * 100, 100),
        rarity: 'legendary',
      },
      // Session Count Achievements
      {
        id: 'sessions-10',
        category: 'Sessions',
        icon: 'play-circle',
        title: 'First Steps',
        description: 'Complete 10 focus sessions',
        unlocked: totalSessions >= 10,
        progress: Math.min((totalSessions / 10) * 100, 100),
        rarity: 'common',
      },
      {
        id: 'sessions-50',
        category: 'Sessions',
        icon: 'play-circle',
        title: 'Focused',
        description: 'Complete 50 focus sessions',
        unlocked: totalSessions >= 50,
        progress: Math.min((totalSessions / 50) * 100, 100),
        rarity: 'uncommon',
      },
      {
        id: 'sessions-100',
        category: 'Sessions',
        icon: 'play-circle',
        title: 'Centurion',
        description: 'Complete 100 focus sessions',
        unlocked: totalSessions >= 100,
        progress: Math.min((totalSessions / 100) * 100, 100),
        rarity: 'rare',
      },
      // Consistency Achievements
      {
        id: 'early-bird',
        category: 'Consistency',
        icon: 'sunny',
        title: 'Early Bird',
        description: 'Study mostly in the morning',
        unlocked: earlyBird,
        progress: earlyBird ? 100 : 0,
        rarity: 'uncommon',
      },
      {
        id: 'night-owl',
        category: 'Consistency',
        icon: 'moon',
        title: 'Night Owl',
        description: 'Study mostly at night',
        unlocked: nightOwl,
        progress: nightOwl ? 100 : 0,
        rarity: 'uncommon',
      },
      {
        id: 'perfect-week',
        category: 'Consistency',
        icon: 'calendar',
        title: 'Perfect Week',
        description: 'Study every day for a week',
        unlocked: perfectWeek,
        progress: perfectWeek ? 100 : (uniqueWeeklyDates.size / 7) * 100,
        rarity: 'rare',
      },
      // Special Achievements
      {
        id: 'marathon-3',
        category: 'Special',
        icon: 'fitness',
        title: 'Marathon Session',
        description: 'Complete a 3-hour focus session',
        unlocked: longestSession >= 3,
        progress: Math.min((longestSession / 3) * 100, 100),
        rarity: 'rare',
      },
      {
        id: 'first-session',
        category: 'Special',
        icon: 'star',
        title: 'First Session',
        description: 'Complete your first focus session',
        unlocked: totalSessions >= 1,
        progress: totalSessions >= 1 ? 100 : 0,
        rarity: 'common',
      },
    ];
  }, [focusSessions, streakData]);

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common':
        return theme.colors.text.secondary;
      case 'uncommon':
        return '#4CAF50';
      case 'rare':
        return '#2196F3';
      case 'epic':
        return '#9C27B0';
      case 'legendary':
        return '#FF9800';
      default:
        return theme.colors.text.secondary;
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
      <View style={[styles.header, { backgroundColor: theme.colors.background }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Streak Management
        </Text>
        <View style={styles.headerSpacer} />
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
          Platform.OS === 'web' && { minHeight: '100%' }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Streak Card */}
        <View style={[styles.streakCard, { backgroundColor: theme.colors.card }]}>
          <LinearGradient
            colors={[theme.colors.primaryLight, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.streakGradient}
          >
            <View style={styles.streakContent}>
              <Ionicons name="flame" size={48} color={theme.colors.text.inverse} />
              <Text style={[styles.streakNumber, { color: theme.colors.text.inverse }]}>
                {streakData.currentStreak}
              </Text>
              <Text style={[styles.streakLabel, { color: theme.colors.text.inverse }]}>
                Day Streak
              </Text>
              {streakData.currentStreak === 0 && (
                <Text style={[styles.streakHint, { color: theme.colors.text.inverse }]}>
                  Start a focus session to begin your streak!
                </Text>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="trophy" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {streakData.longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Longest Streak
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.colors.card }]}>
            <Ionicons name="calendar" size={24} color={theme.colors.primary} />
            <Text style={[styles.statValue, { color: theme.colors.text.primary }]}>
              {streakData.streakHistory.filter(d => d.hasSession).length}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.text.secondary }]}>
              Days This Month
            </Text>
          </View>
        </View>

        {/* Streak Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: theme.colors.card }]}>
          <View style={styles.calendarHeader}>
            <Pressable onPress={handlePreviousMonth} style={styles.calendarNavButton}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.text.primary} />
            </Pressable>
            <Text style={[styles.calendarTitle, { color: theme.colors.text.primary }]}>
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
            <Pressable onPress={handleNextMonth} style={styles.calendarNavButton}>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text.primary} />
            </Pressable>
          </View>

          {/* Weekday Headers */}
          <View style={styles.weekdayRow}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
              <Text
                key={index}
                style={[styles.weekdayText, { color: theme.colors.text.secondary }]}
              >
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((dayInfo, index) => {
              const hasSession = hasSessionOnDate(dayInfo.date);
              const isTodayDate = isToday(dayInfo.date);
              
              return (
                <View key={index} style={styles.dayCell}>
                  <View style={styles.dayContent}>
                    <View
                      style={[
                        styles.dayCircle,
                        {
                          backgroundColor: hasSession
                            ? theme.colors.primary
                            : 'transparent',
                          borderColor: isTodayDate
                            ? theme.colors.primary
                            : 'transparent',
                          borderWidth: isTodayDate ? 2 : 0,
                        },
                        !dayInfo.isCurrentMonth && { opacity: 0.3 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dayText,
                          {
                            color: hasSession
                              ? theme.colors.text.inverse
                              : isTodayDate
                              ? theme.colors.primary
                              : theme.colors.text.primary,
                          },
                          !dayInfo.isCurrentMonth && { color: theme.colors.text.tertiary },
                        ]}
                      >
                        {dayInfo.day}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Streak History (Last 30 Days) */}
        <View style={[styles.historyCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Last 30 Days
          </Text>
          <View style={styles.historyGrid}>
            {streakData.streakHistory.map((day, index) => (
              <View
                key={index}
                style={[
                  styles.historyDay,
                  {
                    backgroundColor: day.hasSession
                      ? theme.colors.primary
                      : theme.colors.surface,
                  },
                ]}
              />
            ))}
          </View>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
              <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>
                Studied
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.surface }]} />
              <Text style={[styles.legendText, { color: theme.colors.text.secondary }]}>
                No Session
              </Text>
            </View>
          </View>
        </View>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}20` }]}>
          <Ionicons name="bulb" size={24} color={theme.colors.primary} />
          <View style={styles.tipsContent}>
            <Text style={[styles.tipsTitle, { color: theme.colors.text.primary }]}>
              Keep Your Streak Going!
            </Text>
            <Text style={[styles.tipsText, { color: theme.colors.text.secondary }]}>
              • Study at least 5 minutes each day to maintain your streak{'\n'}
              • Set a daily reminder to help you stay consistent{'\n'}
              • Track your progress in the calendar above
            </Text>
          </View>
        </View>

        {/* Achievements Section */}
        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <View>
              <Text style={[styles.achievementsTitle, { color: theme.colors.text.primary }]}>
                Achievements
              </Text>
              <Text style={[styles.achievementsSubtitle, { color: theme.colors.text.secondary }]}>
                {unlockedCount} of {totalCount} unlocked
              </Text>
            </View>
            <View style={[styles.achievementsProgressBar, { backgroundColor: theme.colors.border }]}>
              <View
                style={[
                  styles.achievementsProgressFill,
                  {
                    backgroundColor: theme.colors.primary,
                    width: `${(unlockedCount / totalCount) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          {/* Achievement Categories */}
          {['Streak', 'Study', 'Sessions', 'Consistency', 'Special'].map((category) => {
            const categoryAchievements = achievements.filter(a => a.category === category);
            if (categoryAchievements.length === 0) return null;

            return (
              <View key={category} style={styles.achievementCategory}>
                <Text style={[styles.categoryTitle, { color: theme.colors.text.primary }]}>
                  {category}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.achievementsScrollContent}
                >
                  {categoryAchievements.map((achievement) => (
                    <View
                      key={achievement.id}
                      style={[
                        styles.achievementCard,
                        {
                          backgroundColor: achievement.unlocked
                            ? theme.colors.card
                            : theme.colors.surface,
                          borderColor: achievement.unlocked
                            ? getRarityColor(achievement.rarity)
                            : theme.colors.border,
                          borderWidth: achievement.unlocked ? 2 : 1,
                          opacity: achievement.unlocked ? 1 : 0.6,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.achievementIconContainer,
                          {
                            backgroundColor: achievement.unlocked
                              ? `${getRarityColor(achievement.rarity)}20`
                              : theme.colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={achievement.icon as any}
                          size={32}
                          color={
                            achievement.unlocked
                              ? getRarityColor(achievement.rarity)
                              : theme.colors.text.tertiary
                          }
                        />
                        {achievement.unlocked && (
                          <View
                            style={[
                              styles.unlockedBadge,
                              { backgroundColor: getRarityColor(achievement.rarity) },
                            ]}
                          >
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          </View>
                        )}
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
                      <Text
                        style={[
                          styles.achievementDescription,
                          { color: theme.colors.text.secondary },
                        ]}
                      >
                        {achievement.description}
                      </Text>
                      {!achievement.unlocked && (
                        <View style={styles.progressContainer}>
                          <View
                            style={[
                              styles.progressBar,
                              { backgroundColor: theme.colors.border },
                            ]}
                          >
                            <View
                              style={[
                                styles.progressFill,
                                {
                                  backgroundColor: getRarityColor(achievement.rarity),
                                  width: `${achievement.progress}%`,
                                },
                              ]}
                            />
                          </View>
                          <Text
                            style={[
                              styles.progressText,
                              { color: theme.colors.text.tertiary },
                            ]}
                          >
                            {Math.round(achievement.progress)}%
                          </Text>
                        </View>
                      )}
                      {achievement.unlocked && (
                        <View
                          style={[
                            styles.rarityBadge,
                            { backgroundColor: `${getRarityColor(achievement.rarity)}20` },
                          ]}
                        >
                          <Text
                            style={[
                              styles.rarityText,
                              { color: getRarityColor(achievement.rarity) },
                            ]}
                          >
                            {achievement.rarity.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </ScrollView>
              </View>
            );
          })}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'left', // Left-align for consistency
    marginLeft: 8,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  streakCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  streakGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakContent: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 64,
    fontWeight: '700',
    marginTop: 8,
  },
  streakLabel: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },
  streakHint: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.9,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  calendarCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    paddingVertical: 8,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayContent: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  historyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 12,
  },
  historyDay: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
  },
  tipsCard: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Achievements
  achievementsSection: {
    marginTop: 8,
  },
  achievementsHeader: {
    marginBottom: 16,
  },
  achievementsTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  achievementsSubtitle: {
    fontSize: 14,
    marginBottom: 12,
  },
  achievementsProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  achievementsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  achievementCategory: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  achievementsScrollContent: {
    paddingRight: 16,
    gap: 12,
  },
  achievementCard: {
    width: 140,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 8,
    marginRight: 12,
  },
  achievementIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  unlockedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementDescription: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  progressContainer: {
    width: '100%',
    gap: 4,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 4,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

