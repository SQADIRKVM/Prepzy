import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { Exam } from '../types';
import { getCategoryColor, getCategoryName } from '../utils/categoryHelpers';

type Props = NativeStackScreenProps<any, 'Schedule'>;

export default function ScheduleScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const exams = useStore((state) => state.exams);
  const customCategories = useStore((state) => state.customCategories);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

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
  };

  const getExamsForDate = (date: Date) => {
    return exams.filter(exam => {
      const examDate = new Date(exam.date);
      return examDate.getDate() === date.getDate() &&
        examDate.getMonth() === date.getMonth() &&
        examDate.getFullYear() === date.getFullYear();
    });
  };

  const getUpcomingExams = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return exams
      .filter(exam => new Date(exam.date) >= today)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  };

  const formatExamTime = (exam: Exam) => {
    const examDate = new Date(exam.date);
    const hours = examDate.getHours();
    const minutes = examDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  const changeMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbrev = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const upcomingExams = getUpcomingExams();
  const totalUpcoming = upcomingExams.length;
  const selectedDateExams = selectedDate ? getExamsForDate(selectedDate) : [];
  const displayExams = selectedDate ? selectedDateExams : upcomingExams;

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
      >
        {/* Reminders & Alerts Card */}
        <Pressable
          style={[styles.alertCard, { backgroundColor: theme.colors.card }]}
          onPress={() => navigation.navigate('StudyReminders')}
        >
          <View style={styles.alertCardLeft}>
            <View style={[styles.alertIcon, { backgroundColor: `${theme.colors.primary}20` }]}>
              <Ionicons name="notifications" size={24} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={[styles.alertTitle, { color: theme.colors.text.primary }]}>
                Reminders & Alerts
              </Text>
              <Text style={[styles.alertSubtitle, { color: theme.colors.text.secondary }]}>
                {totalUpcoming} Upcoming
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
        </Pressable>

        {/* Calendar */}
        <View style={[styles.calendarCard, { backgroundColor: theme.colors.card }]}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <Text style={[styles.calendarTitle, { color: theme.colors.text.primary }]}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </Text>
            <View style={styles.calendarNav}>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => changeMonth(-1)}
              >
                <Ionicons name="chevron-back" size={20} color={theme.colors.text.primary} />
              </Pressable>
              <Pressable
                style={styles.calendarNavButton}
                onPress={() => changeMonth(1)}
              >
                <Ionicons name="chevron-forward" size={20} color={theme.colors.text.primary} />
              </Pressable>
            </View>
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

          {/* Calendar Days */}
          <View style={styles.calendarGrid}>
            {getCalendarDays().map((dayInfo, index) => {
              const dayExams = getExamsForDate(dayInfo.date);
              const hasExams = dayExams.length > 0;
              const isTodayDate = isToday(dayInfo.date);
              const isSelected = selectedDate &&
                dayInfo.date.getDate() === selectedDate.getDate() &&
                dayInfo.date.getMonth() === selectedDate.getMonth() &&
                dayInfo.date.getFullYear() === selectedDate.getFullYear();

              // Get the color from the first exam on this date
              const examColor = hasExams 
                ? (dayExams[0].customColor || getCategoryColor(dayExams[0].subjectCategory, customCategories, theme.colors.subjects[dayExams[0].subjectCategory] || theme.colors.subjects.Other))
                : theme.colors.primary;

              return (
                <Pressable
                  key={index}
                  style={styles.dayCell}
                  onPress={() => setSelectedDate(dayInfo.date)}
                >
                  <View style={styles.dayContent}>
                    <Text
                      style={[
                        styles.dayText,
                        !dayInfo.isCurrentMonth && {
                          color: theme.colors.text.tertiary,
                        },
                        (isTodayDate || isSelected) && styles.todayText,
                        {
                          color: (isTodayDate || isSelected)
                            ? theme.colors.background
                            : theme.colors.text.primary
                        },
                      ]}
                    >
                      {dayInfo.day}
                    </Text>
                    {(isTodayDate || isSelected) && (
                      <View
                        style={[
                          styles.todayCircle,
                          { backgroundColor: isSelected && !isTodayDate ? theme.colors.secondary : (hasExams ? examColor : theme.colors.primary) },
                        ]}
                      />
                    )}
                    {hasExams && !isTodayDate && !isSelected && (
                      <View
                        style={[
                          styles.examIndicator,
                          { backgroundColor: examColor },
                        ]}
                      />
                    )}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Upcoming Exams or Selected Date Exams */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              {selectedDate
                ? `Exams on ${selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : 'Upcoming'}
            </Text>
            {selectedDate && (
              <Pressable onPress={() => setSelectedDate(null)}>
                <Text style={[styles.clearButton, { color: theme.colors.primary }]}>
                  Clear
                </Text>
              </Pressable>
            )}
          </View>

          {displayExams.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.card }]}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.text.tertiary} />
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                {selectedDate ? 'No exams on this date' : 'No upcoming exams'}
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                {selectedDate ? 'Select another date to view exams' : 'Add your first exam to see it here'}
              </Text>
            </View>
          ) : (
            <View style={styles.upcomingList}>
              {displayExams.map((exam) => {
                const examDate = new Date(exam.date);
                const subjectColor = exam.customColor || getCategoryColor(exam.subjectCategory, customCategories, theme.colors.subjects[exam.subjectCategory] || theme.colors.subjects.Other);
                const categoryName = getCategoryName(exam.subjectCategory, customCategories);

                return (
                  <Pressable
                    key={exam.id}
                    style={[styles.examCard, { backgroundColor: theme.colors.card }]}
                    onPress={() => navigation.navigate('ExamDetail', { examId: exam.id })}
                  >
                    <View style={styles.examDate}>
                      <Text style={[styles.examMonth, { color: subjectColor }]}>
                        {monthAbbrev[examDate.getMonth()]}
                      </Text>
                      <Text style={[styles.examDay, { color: subjectColor }]}>
                        {examDate.getDate()}
                      </Text>
                    </View>
                    <View style={[styles.examDivider, { backgroundColor: subjectColor }]} />
                    <View style={styles.examDetails}>
                      <Text style={[styles.examTitle, { color: theme.colors.text.primary }]}>
                        {exam.title}
                      </Text>
                      <Text style={[styles.examSubject, { color: theme.colors.text.secondary }]}>
                        {categoryName} • {exam.examType}
                      </Text>
                      <Text style={[styles.examTime, { color: theme.colors.text.secondary }]}>
                        {formatExamTime(exam)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  alertCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  alertSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  calendarCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  calendarNav: {
    flexDirection: 'row',
    gap: 8,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
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
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  dayText: {
    fontSize: 16,
    fontWeight: '400',
  },
  todayText: {
    fontWeight: '600',
  },
  todayCircle: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    zIndex: -1,
  },
  examIndicator: {
    position: 'absolute',
    bottom: 2,
    left: 8,
    right: 8,
    height: 3,
    borderRadius: 1.5,
  },
  upcomingSection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  clearButton: {
    fontSize: 15,
    fontWeight: '600',
  },
  upcomingList: {
    gap: 12,
  },
  examCard: {
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 16,
    borderRadius: 12,
    gap: 16,
  },
  examDate: {
    alignItems: 'center',
    minWidth: 60,
  },
  examMonth: {
    fontSize: 14,
    fontWeight: '500',
  },
  examDay: {
    fontSize: 28,
    fontWeight: '700',
  },
  examDivider: {
    width: 4,
    borderRadius: 2,
  },
  examDetails: {
    flex: 1,
    justifyContent: 'center',
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
  examTime: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
});
