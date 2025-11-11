import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { Exam, ViewFilter } from '../types';
import ExamCard from '../components/ExamCard';
import { useTheme } from '../context/ThemeContext';
import { isUpcoming } from '../utils/dateHelpers';

type Props = NativeStackScreenProps<any, 'Dashboard'>;

export default function DashboardScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const {
    exams,
    viewFilter,
    sortOption,
    setViewFilter,
    isLoading,
    loadData,
  } = useStore();

  useEffect(() => {
    loadData();
  }, []);

  const getFilteredExams = (): Exam[] => {
    let filtered = [...exams];

    // Apply view filter
    if (viewFilter === 'upcoming') {
      filtered = filtered.filter((exam) => isUpcoming(exam.date));
    } else if (viewFilter === 'past') {
      filtered = filtered.filter((exam) => !isUpcoming(exam.date));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'subject':
          return a.subjectCategory.localeCompare(b.subjectCategory);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredExams = getFilteredExams();

  const handleAddExam = () => {
    navigation.navigate('AddExam');
  };

  const handleImportTimetable = () => {
    navigation.navigate('TimetableExtractor');
  };

  const handleExamPress = (examId: string) => {
    navigation.navigate('ExamDetail', { examId });
  };

  const renderFilterButton = (
    label: string,
    value: ViewFilter,
    isActive: boolean,
    onPress: () => void
  ) => {
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.filterPill,
          {
            backgroundColor: isActive ? theme.colors.primary : theme.colors.card,
          },
        ]}
      >
        <Text
          style={[
            styles.filterPillText,
            {
              color: isActive ? theme.colors.text.inverse : theme.colors.text.secondary,
              fontWeight: isActive ? '600' : '500',
            },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderHeader = () => {
    if (filteredExams.length === 0) return null;

    return (
      <Pressable
        style={[styles.importCard, { backgroundColor: theme.colors.card }]}
        onPress={handleImportTimetable}
      >
        <View style={styles.importLeft}>
          <View style={[styles.importIconContainer, { backgroundColor: `${theme.colors.primary}20` }]}>
            <Ionicons name="arrow-up-outline" size={20} color={theme.colors.primary} />
          </View>
          <View>
            <Text style={[styles.importTitle, { color: theme.colors.text.primary }]}>
              Import from timetable
            </Text>
            <Text style={[styles.importSubtitle, { color: theme.colors.text.secondary }]}>
              Automatically add your exams
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={24} color={theme.colors.text.secondary} />
      </Pressable>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.card }]}>
        <Ionicons name="calendar-outline" size={64} color={theme.colors.primary} />
        <View style={styles.emptyIconPlus}>
          <Ionicons name="add" size={32} color={theme.colors.primary} />
        </View>
      </View>

      <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
        No Exams Added Yet
      </Text>

      <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
        Get started by adding your exam schedule. You can import your timetable or add them one by one.
      </Text>

      <Pressable onPress={handleImportTimetable} style={styles.emptyButtonWrapper}>
        <LinearGradient
          colors={[theme.colors.primaryLight, theme.colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyButton}
        >
          <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text.inverse} />
          <Text style={[styles.emptyButtonText, { color: theme.colors.text.inverse }]}>
            Import Timetable
          </Text>
        </LinearGradient>
      </Pressable>

      <Pressable onPress={handleAddExam} style={styles.emptyLinkButton}>
        <Text style={[styles.emptyLinkText, { color: theme.colors.text.primary }]}>
          Add Exam Manually
        </Text>
      </Pressable>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={[]}
    >
      {/* Filter Pills */}
      <View style={styles.filterPillsContainer}>
        {renderFilterButton('Upcoming', 'upcoming', viewFilter === 'upcoming', () =>
          setViewFilter('upcoming')
        )}
        {renderFilterButton('Past', 'past', viewFilter === 'past', () => setViewFilter('past'))}
        {renderFilterButton('All', 'all', viewFilter === 'all', () => setViewFilter('all'))}
      </View>

      {/* Exam List */}
      <FlatList
        data={filteredExams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExamCard exam={item} onPress={() => handleExamPress(item.id)} />
        )}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          filteredExams.length === 0 && styles.listContentEmpty,
          Platform.OS === 'web' && { paddingBottom: 100 },
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        style={Platform.OS === 'web' && {
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPillsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 9999,
  },
  filterPillText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 100,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  // Import Card
  importCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    marginHorizontal: 0,
    marginBottom: 16,
    borderRadius: 12,
  },
  importLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  importIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  importSubtitle: {
    fontSize: 13,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 20,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  emptyIconPlus: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
    maxWidth: 340,
  },
  emptyButtonWrapper: {
    width: '100%',
    maxWidth: 340,
    marginBottom: 16,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyLinkButton: {
    paddingVertical: 12,
  },
  emptyLinkText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
