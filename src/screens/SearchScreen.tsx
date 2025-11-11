import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { ExamType, ResourceType } from '../types';
import { getAvailableCategories } from '../utils/categoryHelpers';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'Search'>;

interface SearchResult {
  id: string;
  type: 'exam' | 'note' | 'resource' | 'setting';
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

const SETTINGS_OPTIONS = [
  { id: 'theme', title: 'Theme Settings', subtitle: 'Change app appearance', screen: 'ThemeSettings', icon: 'color-palette' as const },
  { id: 'notifications', title: 'Notification Settings', subtitle: 'Manage alerts and reminders', screen: 'NotificationSettings', icon: 'notifications' as const },
  { id: 'dnd', title: 'Do Not Disturb', subtitle: 'Focus mode settings', screen: 'DNDSettings', icon: 'moon' as const },
  { id: 'study-reminders', title: 'Study Reminders', subtitle: 'Set up study alerts', screen: 'StudyReminders', icon: 'time' as const },
  { id: 'focus-mode', title: 'Focus Mode Preferences', subtitle: 'Customize focus mode', screen: 'FocusModePreferences', icon: 'fitness' as const },
  { id: 'subjects', title: 'Subject Categories', subtitle: 'Manage subjects', screen: 'SubjectCategories', icon: 'book' as const },
];

const RECENT_SEARCHES_KEY = '@recent_searches';
const SEARCH_HISTORY_KEY = '@search_history';
const SAVED_SEARCHES_KEY = '@saved_searches';
const SEARCH_SETTINGS_KEY = '@search_settings';

interface SearchSettings {
  saveHistory: boolean;
  maxHistoryItems: number;
  maxSavedSearches: number;
  autoSaveHistory: boolean;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
  filters?: {
    subject?: string;
    examType?: string;
    dateRange?: string;
    resourceType?: string;
  };
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters?: {
    subject?: string;
    examType?: string;
    dateRange?: string;
    resourceType?: string;
  };
  createdAt: string;
}

export default function SearchScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const exams = useStore((state) => state.exams);
  const resources = useStore((state) => state.resources);
  const customCategories = useStore((state) => state.customCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  const [filterSubject, setFilterSubject] = useState<string | null>(null);
  const [filterExamType, setFilterExamType] = useState<ExamType | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<'upcoming' | 'past' | 'all'>('all');
  const [filterResourceType, setFilterResourceType] = useState<ResourceType | null>(null);
  
  // Get available categories
  const availableCategories = getAvailableCategories(customCategories);
  const examTypes: ExamType[] = ['Final', 'Midterm', 'Quiz', 'Assignment', 'Lab'];
  const resourceTypes: { type: ResourceType; label: string; icon: string }[] = [
    { type: 'youtube', label: 'YouTube', icon: 'logo-youtube' },
    { type: 'pdf', label: 'PDF', icon: 'document' },
    { type: 'link', label: 'Link', icon: 'link' },
    { type: 'note', label: 'Note', icon: 'document-text' },
    { type: 'file', label: 'File', icon: 'folder' },
  ];
  
  // Check if any filters are active
  const hasActiveFilters = filterSubject !== null || filterExamType !== null || 
    filterDateRange !== 'all' || filterResourceType !== null;
  
  // Clear all filters
  const clearFilters = () => {
    setFilterSubject(null);
    setFilterExamType(null);
    setFilterDateRange('all');
    setFilterResourceType(null);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Load data from storage
  useEffect(() => {
    loadRecentSearches();
    loadSearchHistory();
    loadSavedSearches();
  }, []);

  const loadRecentSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load recent searches:', error);
    }
  };

  const loadSearchHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
      if (saved) {
        setSearchHistory(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load search history:', error);
    }
  };

  const loadSavedSearches = async () => {
    try {
      const saved = await AsyncStorage.getItem(SAVED_SEARCHES_KEY);
      if (saved) {
        setSavedSearches(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const saveRecentSearch = async (query: string) => {
    try {
      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      const updated = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 10);
      setRecentSearches(updated);
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save recent search:', error);
    }
  };

  const saveToSearchHistory = async (query: string, resultCount: number) => {
    try {
      // Check if history saving is enabled
      const settingsData = await AsyncStorage.getItem(SEARCH_SETTINGS_KEY);
      const settings: SearchSettings = settingsData 
        ? JSON.parse(settingsData)
        : { saveHistory: true, maxHistoryItems: 100, maxSavedSearches: 50, autoSaveHistory: true };
      
      if (!settings.saveHistory || !settings.autoSaveHistory) {
        return;
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) return;

      const historyItem: SearchHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        query: trimmedQuery,
        timestamp: new Date().toISOString(),
        resultCount,
        filters: hasActiveFilters ? {
          subject: filterSubject || undefined,
          examType: filterExamType || undefined,
          dateRange: filterDateRange !== 'all' ? filterDateRange : undefined,
          resourceType: filterResourceType || undefined,
        } : undefined,
      };

      const maxItems = settings.maxHistoryItems || 100;
      const updated = [historyItem, ...searchHistory.filter(h => h.query !== trimmedQuery)].slice(0, maxItems);
      setSearchHistory(updated);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save search history:', error);
    }
  };

  const saveSearch = async () => {
    try {
      const trimmedName = saveSearchName.trim();
      const trimmedQuery = searchQuery.trim();
      if (!trimmedName || !trimmedQuery) return;

      const savedSearch: SavedSearch = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: trimmedName,
        query: trimmedQuery,
        filters: hasActiveFilters ? {
          subject: filterSubject || undefined,
          examType: filterExamType || undefined,
          dateRange: filterDateRange !== 'all' ? filterDateRange : undefined,
          resourceType: filterResourceType || undefined,
        } : undefined,
        createdAt: new Date().toISOString(),
      };

      const updated = [...savedSearches, savedSearch];
      setSavedSearches(updated);
      await AsyncStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updated));
      setShowSaveSearchModal(false);
      setSaveSearchName('');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Failed to save search:', error);
    }
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const updated = savedSearches.filter(s => s.id !== id);
      setSavedSearches(updated);
      await AsyncStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(updated));
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to delete saved search:', error);
    }
  };

  const loadSavedSearch = (savedSearch: SavedSearch) => {
    setSearchQuery(savedSearch.query);
    if (savedSearch.filters) {
      setFilterSubject(savedSearch.filters.subject || null);
      setFilterExamType(savedSearch.filters.examType as ExamType || null);
      setFilterDateRange((savedSearch.filters.dateRange as 'upcoming' | 'past' | 'all') || 'all');
      setFilterResourceType(savedSearch.filters.resourceType as ResourceType || null);
    }
    setShowSavedSearches(false);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const clearRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error('Failed to clear recent searches:', error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  // Helper to check if exam is upcoming
  const isUpcoming = (dateString: string): boolean => {
    return new Date(dateString) > new Date();
  };

  // Comprehensive search function with filters
  const performSearch = (): SearchResult[] => {
    const query = searchQuery.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search exams
    exams.forEach(exam => {
      // Apply text search
      const matchesText = !query || 
        exam.title.toLowerCase().includes(query) ||
        exam.subjectCategory.toLowerCase().includes(query) ||
        exam.examType.toLowerCase().includes(query);
      
      // Apply filters
      const matchesSubject = !filterSubject || exam.subjectCategory === filterSubject;
      const matchesExamType = !filterExamType || exam.examType === filterExamType;
      const matchesDateRange = filterDateRange === 'all' || 
        (filterDateRange === 'upcoming' && isUpcoming(exam.date)) ||
        (filterDateRange === 'past' && !isUpcoming(exam.date));
      
      if (matchesText && matchesSubject && matchesExamType && matchesDateRange) {
        const examDate = new Date(exam.date);
        results.push({
          id: exam.id,
      type: 'exam',
          title: exam.title,
          subtitle: `${exam.subjectCategory} • ${exam.examType} • ${examDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
      icon: 'calendar',
          onPress: () => {
            saveRecentSearch(searchQuery);
            navigation.navigate('ExamDetail', { examId: exam.id });
          },
        });
      }
    });

    // Search resources/notes
    resources.forEach(resource => {
      // Apply text search
      const matchesText = !query || 
        resource.title.toLowerCase().includes(query) ||
        resource.subject.toLowerCase().includes(query) ||
        resource.content?.toLowerCase().includes(query);
      
      // Apply filters
      const matchesSubject = !filterSubject || resource.subject === filterSubject;
      const matchesResourceType = !filterResourceType || resource.type === filterResourceType;
      
      if (matchesText && matchesSubject && matchesResourceType) {
        results.push({
          id: resource.id,
          type: 'resource',
          title: resource.title,
          subtitle: `${resourceTypes.find(rt => rt.type === resource.type)?.label || resource.type} • ${resource.subject}`,
      icon: 'book',
          onPress: () => {
            saveRecentSearch(searchQuery);
            navigation.navigate('Resources');
          },
        });
      }
    });

    // Search settings (only if no filters applied)
    if (!hasActiveFilters) {
      SETTINGS_OPTIONS.forEach(setting => {
        if (
          setting.title.toLowerCase().includes(query) ||
          setting.subtitle.toLowerCase().includes(query)
        ) {
          results.push({
            id: setting.id,
            type: 'setting',
            title: setting.title,
            subtitle: setting.subtitle,
            icon: setting.icon,
            onPress: () => {
              saveRecentSearch(searchQuery);
              navigation.navigate(setting.screen as any);
            },
          });
        }
      });
    }

    return results;
  };

  const searchResults = performSearch();

  // Save to history when search is performed
  useEffect(() => {
    if (searchQuery.trim() && searchResults.length > 0) {
      saveToSearchHistory(searchQuery, searchResults.length);
    }
  }, [searchQuery, searchResults.length, hasActiveFilters]);

  const renderRecentSearch = (search: string, index: number) => (
    <Pressable
      key={index}
      style={({ pressed }) => [
        styles.recentSearchItem,
        pressed && { opacity: 0.7 },
      ]}
      onPress={() => {
        setSearchQuery(search);
      }}
    >
      <View style={styles.recentSearchLeft}>
        <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
        <Text style={[styles.recentSearchText, { color: theme.colors.text.primary }]}>
          {search}
        </Text>
      </View>
      <Pressable
        onPress={() => {
          setSearchQuery(search);
        }}
        hitSlop={8}
      >
      <Ionicons name="arrow-up-outline" size={20} color={theme.colors.text.tertiary} />
      </Pressable>
    </Pressable>
  );

  const renderSearchResult = (result: SearchResult) => (
    <Pressable
      key={result.id}
      style={({ pressed }) => [
        styles.resultItem,
        pressed && { opacity: 0.7 },
      ]}
      onPress={result.onPress}
    >
      <View
        style={[
          styles.resultIcon,
          { backgroundColor: `${theme.colors.primary}20` },
        ]}
      >
        <Ionicons name={result.icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: theme.colors.text.primary }]}>
          {result.title}
        </Text>
        <Text style={[styles.resultSubtitle, { color: theme.colors.text.secondary }]}>
          {result.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.text.tertiary} />
    </Pressable>
  );

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && { height: '100vh', overflow: 'hidden' }
      ]}
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Search
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchInputContainer,
            {
              backgroundColor: theme.colors.card,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={24} color={theme.colors.primary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Search exams, subjects, notes..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }
              setShowFilters(true);
            }}
            style={[
              styles.filterButton,
              hasActiveFilters && { backgroundColor: `${theme.colors.primary}20` },
            ]}
          >
            <Ionicons 
              name="options-outline" 
              size={20} 
              color={hasActiveFilters ? theme.colors.primary : theme.colors.text.secondary} 
            />
            {hasActiveFilters && (
              <View style={[styles.filterBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={[styles.filterBadgeText, { color: theme.colors.background }]}>
                  {[filterSubject, filterExamType, filterDateRange !== 'all' ? filterDateRange : null, filterResourceType].filter(Boolean).length}
                </Text>
              </View>
            )}
          </Pressable>
        </View>
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
            flexGrow: 1,
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Saved Searches */}
        {!searchQuery && savedSearches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                SAVED SEARCHES
              </Text>
              <Pressable 
                onPress={() => {
                  setShowSavedSearches(true);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                hitSlop={8}
              >
                <Text style={[styles.clearText, { color: theme.colors.primary }]}>
                  View All ({savedSearches.length})
                </Text>
              </Pressable>
            </View>
            <View style={styles.recentSearchesList}>
              {savedSearches.slice(0, 3).map((saved) => (
                <Pressable
                  key={saved.id}
                  style={({ pressed }) => [
                    styles.recentSearchItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => loadSavedSearch(saved)}
                >
                  <View style={styles.recentSearchLeft}>
                    <Ionicons name="bookmark" size={20} color={theme.colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentSearchText, { color: theme.colors.text.primary, fontWeight: '600' }]}>
                        {saved.name}
                      </Text>
                      <Text style={[styles.recentSearchText, { color: theme.colors.text.secondary, fontSize: 13 }]}>
                        {saved.query}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Recent Searches */}
        {!searchQuery && recentSearches.length > 0 && (
        <View style={styles.section}>
            <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
            RECENT SEARCHES
          </Text>
              {recentSearches.length > 0 && (
                <Pressable onPress={clearRecentSearches} hitSlop={8}>
                  <Text style={[styles.clearText, { color: theme.colors.text.secondary }]}>
                    Clear
                  </Text>
                </Pressable>
              )}
            </View>
          <View style={styles.recentSearchesList}>
            {recentSearches.map(renderRecentSearch)}
          </View>
        </View>
        )}

        {/* Results */}
        {searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                RESULTS ({searchResults.length})
            </Text>
              {searchQuery.trim() && (
                <Pressable
                  onPress={() => {
                    setShowSaveSearchModal(true);
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="bookmark-outline" size={20} color={theme.colors.primary} />
                </Pressable>
              )}
            </View>
            {searchResults.length > 0 ? (
            <View style={styles.resultsList}>
              {searchResults.map(renderSearchResult)}
            </View>
            ) : (
              <View style={styles.emptyResults}>
                <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                  No results found
                </Text>
                <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                  Try searching for exams, subjects, notes, or settings
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Search History */}
        {!searchQuery && searchHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.primary }]}>
                SEARCH HISTORY
              </Text>
              <Pressable onPress={clearSearchHistory} hitSlop={8}>
                <Text style={[styles.clearText, { color: theme.colors.text.secondary }]}>
                  Clear
                </Text>
              </Pressable>
            </View>
            <View style={styles.recentSearchesList}>
              {searchHistory.slice(0, 5).map((item) => (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.recentSearchItem,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => {
                    setSearchQuery(item.query);
                    if (item.filters) {
                      setFilterSubject(item.filters.subject || null);
                      setFilterExamType(item.filters.examType as ExamType || null);
                      setFilterDateRange((item.filters.dateRange as 'upcoming' | 'past' | 'all') || 'all');
                      setFilterResourceType(item.filters.resourceType as ResourceType || null);
                    }
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                  }}
                >
                  <View style={styles.recentSearchLeft}>
                    <Ionicons name="time-outline" size={20} color={theme.colors.text.secondary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recentSearchText, { color: theme.colors.text.primary }]}>
                        {item.query}
                      </Text>
                      <Text style={[styles.recentSearchText, { color: theme.colors.text.tertiary, fontSize: 12 }]}>
                        {new Date(item.timestamp).toLocaleDateString()} • {item.resultCount} results
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* Empty state when no recent searches and no query */}
        {!searchQuery && recentSearches.length === 0 && savedSearches.length === 0 && searchHistory.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color={theme.colors.text.tertiary} />
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Start searching
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
              Search for exams, subjects, notes, or settings
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filtersModal, { backgroundColor: theme.colors.background }]}>
            {/* Header */}
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: theme.colors.text.primary }]}>
                Search Filters
              </Text>
              <Pressable
                onPress={() => {
                  setShowFilters(false);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.filtersContent} showsVerticalScrollIndicator={false}>
              {/* Subject Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text.primary }]}>
                  Subject
                </Text>
                <View style={styles.filterChips}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { backgroundColor: theme.colors.card },
                      !filterSubject && { borderColor: theme.colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setFilterSubject(null);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: !filterSubject ? theme.colors.primary : theme.colors.text.secondary },
                      !filterSubject && { fontWeight: '600' },
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {availableCategories.map((category) => (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.colors.card },
                        filterSubject === category.id && { 
                          borderColor: category.color, 
                          borderWidth: 2,
                          backgroundColor: `${category.color}20`,
                        },
                      ]}
                      onPress={() => {
                        setFilterSubject(filterSubject === category.id ? null : category.id);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: filterSubject === category.id ? category.color : theme.colors.text.secondary },
                        filterSubject === category.id && { fontWeight: '600' },
                      ]}>
                        {category.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Exam Type Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text.primary }]}>
                  Exam Type
                </Text>
                <View style={styles.filterChips}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { backgroundColor: theme.colors.card },
                      !filterExamType && { borderColor: theme.colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setFilterExamType(null);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: !filterExamType ? theme.colors.primary : theme.colors.text.secondary },
                      !filterExamType && { fontWeight: '600' },
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {examTypes.map((type) => (
                    <Pressable
                      key={type}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.colors.card },
                        filterExamType === type && { 
                          borderColor: theme.colors.primary, 
                          borderWidth: 2,
                          backgroundColor: `${theme.colors.primary}20`,
                        },
                      ]}
                      onPress={() => {
                        setFilterExamType(filterExamType === type ? null : type);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: filterExamType === type ? theme.colors.primary : theme.colors.text.secondary },
                        filterExamType === type && { fontWeight: '600' },
                      ]}>
                        {type}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text.primary }]}>
                  Date Range
                </Text>
                <View style={styles.filterChips}>
                  {(['all', 'upcoming', 'past'] as const).map((range) => (
                    <Pressable
                      key={range}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.colors.card },
                        filterDateRange === range && { 
                          borderColor: theme.colors.primary, 
                          borderWidth: 2,
                          backgroundColor: `${theme.colors.primary}20`,
                        },
                      ]}
                      onPress={() => {
                        setFilterDateRange(range);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Text style={[
                        styles.filterChipText,
                        { color: filterDateRange === range ? theme.colors.primary : theme.colors.text.secondary },
                        filterDateRange === range && { fontWeight: '600' },
                      ]}>
                        {range === 'all' ? 'All' : range === 'upcoming' ? 'Upcoming' : 'Past'}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Resource Type Filter */}
              <View style={styles.filterSection}>
                <Text style={[styles.filterSectionTitle, { color: theme.colors.text.primary }]}>
                  Resource Type
                </Text>
                <View style={styles.filterChips}>
                  <Pressable
                    style={[
                      styles.filterChip,
                      { backgroundColor: theme.colors.card },
                      !filterResourceType && { borderColor: theme.colors.primary, borderWidth: 2 },
                    ]}
                    onPress={() => {
                      setFilterResourceType(null);
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                    }}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { color: !filterResourceType ? theme.colors.primary : theme.colors.text.secondary },
                      !filterResourceType && { fontWeight: '600' },
                    ]}>
                      All
                    </Text>
                  </Pressable>
                  {resourceTypes.map((rt) => (
                    <Pressable
                      key={rt.type}
                      style={[
                        styles.filterChip,
                        { backgroundColor: theme.colors.card },
                        filterResourceType === rt.type && { 
                          borderColor: theme.colors.primary, 
                          borderWidth: 2,
                          backgroundColor: `${theme.colors.primary}20`,
                        },
                      ]}
                      onPress={() => {
                        setFilterResourceType(filterResourceType === rt.type ? null : rt.type);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                      }}
                    >
                      <Ionicons 
                        name={rt.icon as any} 
                        size={16} 
                        color={filterResourceType === rt.type ? theme.colors.primary : theme.colors.text.secondary}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[
                        styles.filterChipText,
                        { color: filterResourceType === rt.type ? theme.colors.primary : theme.colors.text.secondary },
                        filterResourceType === rt.type && { fontWeight: '600' },
                      ]}>
                        {rt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.filtersFooter}>
              {hasActiveFilters && (
                <Pressable
                  style={[styles.clearFiltersButton, { backgroundColor: theme.colors.card }]}
                  onPress={clearFilters}
                >
                  <Ionicons name="close-circle" size={18} color={theme.colors.text.secondary} />
                  <Text style={[styles.clearFiltersText, { color: theme.colors.text.secondary }]}>
                    Clear All
                  </Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.applyFiltersButton, { backgroundColor: theme.colors.primary }]}
                onPress={() => {
                  setShowFilters(false);
                  if (Platform.OS !== 'web') {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  }
                }}
              >
                <Text style={[styles.applyFiltersText, { color: theme.colors.background }]}>
                  Apply Filters
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Saved Searches Modal */}
      <Modal
        visible={showSavedSearches}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSavedSearches(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.filtersModal, { backgroundColor: theme.colors.background }]}>
            <View style={styles.filtersHeader}>
              <Text style={[styles.filtersTitle, { color: theme.colors.text.primary }]}>
                Saved Searches
              </Text>
              <Pressable
                onPress={() => {
                  setShowSavedSearches(false);
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <ScrollView style={styles.filtersContent} showsVerticalScrollIndicator={false}>
              {savedSearches.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="bookmark-outline" size={64} color={theme.colors.text.tertiary} />
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    No saved searches
                  </Text>
                  <Text style={[styles.emptySubtext, { color: theme.colors.text.tertiary }]}>
                    Save searches to quickly access them later
                  </Text>
                </View>
              ) : (
                savedSearches.map((saved) => (
                  <Pressable
                    key={saved.id}
                    style={({ pressed }) => [
                      styles.savedSearchItem,
                      { backgroundColor: theme.colors.card },
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => {
                      loadSavedSearch(saved);
                      setShowSavedSearches(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                        <Ionicons name="bookmark" size={18} color={theme.colors.primary} />
                        <Text style={[styles.savedSearchName, { color: theme.colors.text.primary }]}>
                          {saved.name}
                        </Text>
                      </View>
                      <Text style={[styles.savedSearchQuery, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                        {saved.query}
                      </Text>
                      {saved.filters && Object.keys(saved.filters).length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 }}>
                          {saved.filters.subject && (
                            <View style={[styles.filterTag, { backgroundColor: `${theme.colors.primary}20` }]}>
                              <Text style={[styles.filterTagText, { color: theme.colors.primary }]}>
                                {saved.filters.subject}
                              </Text>
                            </View>
                          )}
                          {saved.filters.examType && (
                            <View style={[styles.filterTag, { backgroundColor: `${theme.colors.primary}20` }]}>
                              <Text style={[styles.filterTagText, { color: theme.colors.primary }]}>
                                {saved.filters.examType}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <Pressable
                      onPress={() => {
                        deleteSavedSearch(saved.id);
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        }
                      }}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.text.secondary} />
                    </Pressable>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Search Modal */}
      <Modal
        visible={showSaveSearchModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          setShowSaveSearchModal(false);
          setSaveSearchName('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.saveSearchModal, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.saveSearchTitle, { color: theme.colors.text.primary }]}>
              Save Search
            </Text>
            <Text style={[styles.saveSearchSubtitle, { color: theme.colors.text.secondary }]}>
              Give this search a name to save it for later
            </Text>
            <TextInput
              style={[
                styles.saveSearchInput,
                {
                  backgroundColor: theme.colors.background,
                  color: theme.colors.text.primary,
                  borderColor: theme.colors.border,
                },
              ]}
              placeholder="Search name..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={saveSearchName}
              onChangeText={setSaveSearchName}
              autoFocus
            />
            <View style={styles.saveSearchButtons}>
              <Pressable
                style={[styles.saveSearchButton, { backgroundColor: theme.colors.card }]}
                onPress={() => {
                  setShowSaveSearchModal(false);
                  setSaveSearchName('');
                }}
              >
                <Text style={[styles.saveSearchButtonText, { color: theme.colors.text.secondary }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={[styles.saveSearchButton, { backgroundColor: theme.colors.primary }]}
                onPress={saveSearch}
              >
                <Text style={[styles.saveSearchButtonText, { color: theme.colors.background }]}>
                  Save
                </Text>
              </Pressable>
            </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 0,
  },
  searchInput: {
    flex: 1,
    fontSize: 17,
    padding: 0,
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  filtersModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingTop: 20,
  },
  filtersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  filtersTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  filtersContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filtersFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 12,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  clearFiltersText: {
    fontSize: 15,
    fontWeight: '600',
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyFiltersText: {
    fontSize: 15,
    fontWeight: '700',
  },
  savedSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  savedSearchName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  savedSearchQuery: {
    fontSize: 14,
    marginTop: 4,
  },
  filterTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterTagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  saveSearchModal: {
    margin: 20,
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    alignSelf: 'center',
  },
  saveSearchTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  saveSearchSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  saveSearchInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 20,
  },
  saveSearchButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  saveSearchButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveSearchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
  },
  recentSearchesList: {
    gap: 0,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  recentSearchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  recentSearchText: {
    fontSize: 17,
    fontWeight: '400',
  },
  resultsList: {
    gap: 0,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
  },
  resultIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 3,
  },
  resultSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 15,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.7,
  },
});
