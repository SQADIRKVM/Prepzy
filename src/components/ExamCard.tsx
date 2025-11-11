import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Exam } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { isUpcoming } from '../utils/dateHelpers';
import { getCategoryColor, getCategoryName } from '../utils/categoryHelpers';

interface ExamCardProps {
  exam: Exam;
  onPress: () => void;
}

export default function ExamCard({ exam, onPress }: ExamCardProps) {
  const { theme, isDark } = useTheme();
  const { customCategories } = useStore();
  const isPast = !isUpcoming(exam.date);
  
  // Get category color from custom categories or fallback
  const subjectColor = exam.customColor || getCategoryColor(exam.subjectCategory, customCategories, theme.colors.subjects[exam.subjectCategory] || theme.colors.subjects.Other);
  const categoryName = getCategoryName(exam.subjectCategory, customCategories);

  // Calculate days left
  const getDaysLeft = () => {
    const now = new Date();
    const examDate = new Date(exam.date);
    const diffTime = examDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysLeft = getDaysLeft();

  // Format date
  const formatDate = () => {
    const date = new Date(exam.date);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Format time
  const formatTime = () => {
    const date = new Date(exam.date);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get color with opacity for header background
  const getHeaderColor = () => {
    // Convert hex to rgba with 50% opacity (0.5)
    const hex = subjectColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0.5)`;
  };

  // Get accent color (lighter version)
  const getAccentColor = () => {
    const hex = subjectColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    // Lighten by 20%
    const lightR = Math.min(255, Math.round(r + (255 - r) * 0.2));
    const lightG = Math.min(255, Math.round(g + (255 - g) * 0.2));
    const lightB = Math.min(255, Math.round(b + (255 - b) * 0.2));
    return `rgba(${lightR}, ${lightG}, ${lightB}, 0.8)`;
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cardWrapper,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.card }, theme.shadows.md]}>
        {/* Colored Header Section */}
        <View style={[styles.header, { backgroundColor: getHeaderColor() }]}>
          <LinearGradient
            colors={['transparent', `${theme.colors.card}CC`]}
            locations={[0, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <Text 
                style={[styles.examTitle, { color: '#FFFFFF' }]} 
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {exam.examType}: {exam.title}
              </Text>
              <Text 
                style={[styles.subjectCode, { color: 'rgba(255, 255, 255, 0.9)' }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {categoryName}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          {/* Days Counter */}
          <View style={styles.daysContainer}>
            <Text style={[styles.daysNumber, { color: getAccentColor() }]}>
              {isPast ? 'Past' : daysLeft === 0 ? '0' : daysLeft.toString()}
            </Text>
            <Text style={[styles.daysLabel, { color: `${getAccentColor()}CC` }]}>
              {isPast ? 'PAST' : daysLeft === 0 ? 'TODAY' : daysLeft === 1 ? 'DAY LEFT' : 'DAYS LEFT'}
            </Text>
          </View>

          {/* Date and Time */}
          <View style={styles.dateTimeContainer}>
            <View style={styles.dateTimeContent}>
              <Text style={[styles.dateText, { color: theme.colors.text.primary }]}>
                {formatDate()}
              </Text>
              <Text style={[styles.timeText, { color: theme.colors.text.secondary }]}>
                {formatTime()}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text.secondary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 16,
    marginHorizontal: 0,
  },
  cardPressed: {
    opacity: 0.9,
  },
  card: {
    borderRadius: 16, // rounded-2xl equivalent
    overflow: 'hidden',
  },
  header: {
    height: 96, // h-24 equivalent
    position: 'relative',
  },
  headerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 12,
    paddingLeft: 16,
    paddingRight: 16,
  },
  headerContent: {
    gap: 4,
  },
  examTitle: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  subjectCode: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 16,
  },
  daysContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  daysNumber: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -1,
  },
  daysLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dateTimeContent: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    marginTop: 2,
  },
});
