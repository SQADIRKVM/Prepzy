import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'SearchSettings'>;

const RECENT_SEARCHES_KEY = '@recent_searches';
const SEARCH_HISTORY_KEY = '@search_history';
const SAVED_SEARCHES_KEY = '@saved_searches';
const SEARCH_SETTINGS_KEY = '@search_settings';

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

interface SearchSettings {
  saveHistory: boolean;
  maxHistoryItems: number;
  maxSavedSearches: number;
  autoSaveHistory: boolean;
}

export default function SearchSettingsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const isWeb = Platform.OS === 'web';
  const isSmallScreen = width < 375;
  const maxContentWidth = isWeb ? Math.min(800, width * 0.9) : width;
  
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [settings, setSettings] = useState<SearchSettings>({
    saveHistory: true,
    maxHistoryItems: 100,
    maxSavedSearches: 50,
    autoSaveHistory: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [historyData, savedData, recentData, settingsData] = await Promise.all([
        AsyncStorage.getItem(SEARCH_HISTORY_KEY),
        AsyncStorage.getItem(SAVED_SEARCHES_KEY),
        AsyncStorage.getItem(RECENT_SEARCHES_KEY),
        AsyncStorage.getItem(SEARCH_SETTINGS_KEY),
      ]);

      if (historyData) {
        setSearchHistory(JSON.parse(historyData));
      }
      if (savedData) {
        setSavedSearches(JSON.parse(savedData));
      }
      if (recentData) {
        setRecentSearches(JSON.parse(recentData));
      }
      if (settingsData) {
        setSettings(JSON.parse(settingsData));
      }
    } catch (error) {
      console.error('Failed to load search data:', error);
    }
  };

  const saveSettings = async (newSettings: SearchSettings) => {
    try {
      setSettings(newSettings);
      await AsyncStorage.setItem(SEARCH_SETTINGS_KEY, JSON.stringify(newSettings));
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error('Failed to save search settings:', error);
    }
  };

  const clearSearchHistory = async () => {
    showAlert({
      title: 'Clear Search History',
      message: `Are you sure you want to clear all search history? This will remove ${searchHistory.length} items. This action cannot be undone.`,
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setSearchHistory([]);
              await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              showAlert({
                title: 'Cleared',
                message: 'Search history has been cleared.',
                icon: 'checkmark-circle',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } catch (error) {
              console.error('Failed to clear search history:', error);
            }
          },
        },
      ],
    });
  };

  const clearRecentSearches = async () => {
    showAlert({
      title: 'Clear Recent Searches',
      message: `Are you sure you want to clear all recent searches? This will remove ${recentSearches.length} items.`,
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              setRecentSearches([]);
              await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              showAlert({
                title: 'Cleared',
                message: 'Recent searches have been cleared.',
                icon: 'checkmark-circle',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } catch (error) {
              console.error('Failed to clear recent searches:', error);
            }
          },
        },
      ],
    });
  };

  const deleteSavedSearch = async (id: string, name: string) => {
    showAlert({
      title: 'Delete Saved Search',
      message: `Are you sure you want to delete "${name}"? This action cannot be undone.`,
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
          },
        },
      ],
    });
  };

  const clearAllSavedSearches = async () => {
    showAlert({
      title: 'Clear All Saved Searches',
      message: `Are you sure you want to delete all ${savedSearches.length} saved searches? This action cannot be undone.`,
      icon: 'alert-circle',
      buttons: [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setSavedSearches([]);
              await AsyncStorage.removeItem(SAVED_SEARCHES_KEY);
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
              showAlert({
                title: 'Cleared',
                message: 'All saved searches have been deleted.',
                icon: 'checkmark-circle',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } catch (error) {
              console.error('Failed to clear saved searches:', error);
            }
          },
        },
      ],
    });
  };

  const renderSettingItem = (
    icon: string,
    title: string,
    subtitle: string,
    onPress?: () => void,
    rightElement?: React.ReactNode,
    showChevron = true
  ) => (
    <Pressable
      style={({ pressed }) => [
        styles.settingItem,
        {
          backgroundColor: theme.colors.card,
          opacity: pressed ? 0.7 : 1,
          padding: isSmallScreen ? 12 : isTablet ? 20 : 16,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.settingItemLeft}>
        <View
          style={[
            styles.settingIcon,
            { 
              backgroundColor: `${theme.colors.primary}20`,
              width: isSmallScreen ? 36 : isTablet ? 52 : 44,
              height: isSmallScreen ? 36 : isTablet ? 52 : 44,
            },
          ]}
        >
          <Ionicons 
            name={icon as any} 
            size={isSmallScreen ? 18 : isTablet ? 26 : 22} 
            color={theme.colors.primary} 
          />
        </View>
        <View style={styles.settingContent}>
          <Text style={[
            styles.settingTitle, 
            { color: theme.colors.text.primary },
            isSmallScreen && { fontSize: 14 },
            isTablet && { fontSize: 18 },
          ]}>
            {title}
          </Text>
          <Text style={[
            styles.settingSubtitle, 
            { color: theme.colors.text.secondary },
            isSmallScreen && { fontSize: 12 },
            isTablet && { fontSize: 16 },
          ]}>
            {subtitle}
          </Text>
        </View>
      </View>
      {rightElement || (showChevron && (
        <Ionicons 
          name="chevron-forward" 
          size={isSmallScreen ? 18 : isTablet ? 24 : 20} 
          color={theme.colors.text.tertiary} 
        />
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
      edges={['top', 'left', 'right']}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons 
            name="chevron-back" 
            size={isSmallScreen ? 24 : isTablet ? 32 : 28} 
            color={theme.colors.text.primary} 
          />
        </Pressable>
        <Text style={[
          styles.headerTitle, 
          { color: theme.colors.text.primary },
          isSmallScreen && { fontSize: 20 },
          isTablet && { fontSize: 28 },
        ]}>
          Search Settings
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          isWeb && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%' },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Search Preferences */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle, 
            { color: theme.colors.text.secondary },
            isSmallScreen && { fontSize: 11 },
            isTablet && { fontSize: 15 },
          ]}>
            SEARCH PREFERENCES
          </Text>
          <View style={styles.settingsGroup}>
            {renderSettingItem(
              'time-outline',
              'Save Search History',
              'Automatically save your search queries',
              undefined,
              <Pressable
                onPress={() => {
                  saveSettings({ ...settings, saveHistory: !settings.saveHistory });
                }}
              >
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: settings.saveHistory
                        ? theme.colors.primary
                        : theme.colors.border,
                      width: isSmallScreen ? 44 : isTablet ? 60 : 50,
                      height: isSmallScreen ? 26 : isTablet ? 36 : 30,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: theme.colors.background,
                        width: isSmallScreen ? 22 : isTablet ? 32 : 26,
                        height: isSmallScreen ? 22 : isTablet ? 32 : 26,
                        transform: [{ 
                          translateX: settings.saveHistory 
                            ? (isSmallScreen ? 18 : isTablet ? 24 : 20) 
                            : 0 
                        }],
                      },
                    ]}
                  />
                </View>
              </Pressable>,
              false
            )}
            {renderSettingItem(
              'refresh-outline',
              'Auto-Save History',
              'Save searches to history automatically',
              undefined,
              <Pressable
                onPress={() => {
                  saveSettings({ ...settings, autoSaveHistory: !settings.autoSaveHistory });
                }}
              >
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: settings.autoSaveHistory
                        ? theme.colors.primary
                        : theme.colors.border,
                      width: isSmallScreen ? 44 : isTablet ? 60 : 50,
                      height: isSmallScreen ? 26 : isTablet ? 36 : 30,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        backgroundColor: theme.colors.background,
                        width: isSmallScreen ? 22 : isTablet ? 32 : 26,
                        height: isSmallScreen ? 22 : isTablet ? 32 : 26,
                        transform: [{ 
                          translateX: settings.autoSaveHistory 
                            ? (isSmallScreen ? 18 : isTablet ? 24 : 20) 
                            : 0 
                        }],
                      },
                    ]}
                  />
                </View>
              </Pressable>,
              false
            )}
          </View>
        </View>

        {/* Search History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle, 
              { color: theme.colors.text.secondary },
              isSmallScreen && { fontSize: 11 },
              isTablet && { fontSize: 15 },
            ]}>
              SEARCH HISTORY
            </Text>
            {searchHistory.length > 0 && (
              <Pressable onPress={clearSearchHistory} hitSlop={8}>
                <Text style={[
                  styles.clearButton, 
                  { color: theme.colors.status.error },
                  isSmallScreen && { fontSize: 13 },
                  isTablet && { fontSize: 17 },
                ]}>
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.settingsGroup}>
            {renderSettingItem(
              'time',
              'History Items',
              `${searchHistory.length} searches saved`,
              undefined,
              <Text style={[
                styles.countText, 
                { color: theme.colors.text.secondary },
                isSmallScreen && { fontSize: 14 },
                isTablet && { fontSize: 18 },
              ]}>
                {searchHistory.length}
              </Text>,
              false
            )}
            {searchHistory.length > 0 && (
              <View style={styles.historyPreview}>
                {searchHistory.slice(0, 5).map((item) => (
                  <View 
                    key={item.id} 
                    style={[
                      styles.historyItem, 
                      { 
                        backgroundColor: theme.colors.background,
                        padding: isSmallScreen ? 10 : isTablet ? 16 : 12,
                      }
                    ]}
                  >
                    <Ionicons 
                      name="search" 
                      size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                      color={theme.colors.text.tertiary} 
                    />
                    <Text style={[
                      styles.historyQuery, 
                      { color: theme.colors.text.primary },
                      isSmallScreen && { fontSize: 12 },
                      isTablet && { fontSize: 16 },
                    ]} numberOfLines={1}>
                      {item.query}
                    </Text>
                    <Text style={[
                      styles.historyMeta, 
                      { color: theme.colors.text.tertiary },
                      isSmallScreen && { fontSize: 10 },
                      isTablet && { fontSize: 14 },
                    ]}>
                      {new Date(item.timestamp).toLocaleDateString()} • {item.resultCount} results
                    </Text>
                  </View>
                ))}
                {searchHistory.length > 5 && (
                  <Text style={[
                    styles.moreText, 
                    { color: theme.colors.text.tertiary },
                    isSmallScreen && { fontSize: 11 },
                    isTablet && { fontSize: 14 },
                  ]}>
                    +{searchHistory.length - 5} more
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Recent Searches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle, 
              { color: theme.colors.text.secondary },
              isSmallScreen && { fontSize: 11 },
              isTablet && { fontSize: 15 },
            ]}>
              RECENT SEARCHES
            </Text>
            {recentSearches.length > 0 && (
              <Pressable onPress={clearRecentSearches} hitSlop={8}>
                <Text style={[
                  styles.clearButton, 
                  { color: theme.colors.status.error },
                  isSmallScreen && { fontSize: 13 },
                  isTablet && { fontSize: 17 },
                ]}>
                  Clear
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.settingsGroup}>
            {renderSettingItem(
              'clock-outline',
              'Recent Items',
              `${recentSearches.length} recent searches`,
              undefined,
              <Text style={[styles.countText, { color: theme.colors.text.secondary }]}>
                {recentSearches.length}
              </Text>,
              false
            )}
            {recentSearches.length > 0 && (
              <View style={styles.recentPreview}>
                {recentSearches.slice(0, 5).map((query, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.recentItem, 
                      { 
                        backgroundColor: theme.colors.background,
                        padding: isSmallScreen ? 10 : isTablet ? 16 : 12,
                      }
                    ]}
                  >
                    <Ionicons 
                      name="time-outline" 
                      size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                      color={theme.colors.text.tertiary} 
                    />
                    <Text style={[
                      styles.recentQuery, 
                      { color: theme.colors.text.primary },
                      isSmallScreen && { fontSize: 12 },
                      isTablet && { fontSize: 16 },
                    ]} numberOfLines={1}>
                      {query}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Saved Searches */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[
              styles.sectionTitle, 
              { color: theme.colors.text.secondary },
              isSmallScreen && { fontSize: 11 },
              isTablet && { fontSize: 15 },
            ]}>
              SAVED SEARCHES
            </Text>
            {savedSearches.length > 0 && (
              <Pressable onPress={clearAllSavedSearches} hitSlop={8}>
                <Text style={[
                  styles.clearButton, 
                  { color: theme.colors.status.error },
                  isSmallScreen && { fontSize: 13 },
                  isTablet && { fontSize: 17 },
                ]}>
                  Clear All
                </Text>
              </Pressable>
            )}
          </View>
          <View style={styles.settingsGroup}>
            {renderSettingItem(
              'bookmark',
              'Saved Items',
              `${savedSearches.length} searches saved`,
              undefined,
              <Text style={[styles.countText, { color: theme.colors.text.secondary }]}>
                {savedSearches.length}
              </Text>,
              false
            )}
            {savedSearches.length > 0 ? (
              <View style={styles.savedPreview}>
                {savedSearches.map((saved) => (
                  <View 
                    key={saved.id} 
                    style={[
                      styles.savedItem, 
                      { 
                        backgroundColor: theme.colors.background,
                        padding: isSmallScreen ? 12 : isTablet ? 18 : 14,
                      }
                    ]}
                  >
                    <View style={styles.savedItemLeft}>
                      <Ionicons 
                        name="bookmark" 
                        size={isSmallScreen ? 16 : isTablet ? 22 : 18} 
                        color={theme.colors.primary} 
                      />
                      <View style={styles.savedItemContent}>
                        <Text style={[
                          styles.savedName, 
                          { color: theme.colors.text.primary },
                          isSmallScreen && { fontSize: 13 },
                          isTablet && { fontSize: 17 },
                        ]} numberOfLines={1}>
                          {saved.name}
                        </Text>
                        <Text style={[
                          styles.savedQuery, 
                          { color: theme.colors.text.secondary },
                          isSmallScreen && { fontSize: 11 },
                          isTablet && { fontSize: 15 },
                        ]} numberOfLines={1}>
                          {saved.query}
                        </Text>
                        {saved.filters && Object.keys(saved.filters).length > 0 && (
                          <View style={styles.filterTags}>
                            {saved.filters.subject && (
                              <View style={[styles.filterTag, { backgroundColor: `${theme.colors.primary}20` }]}>
                                <Text style={[
                                  styles.filterTagText, 
                                  { color: theme.colors.primary },
                                  isSmallScreen && { fontSize: 9 },
                                  isTablet && { fontSize: 13 },
                                ]}>
                                  {saved.filters.subject}
                                </Text>
                              </View>
                            )}
                            {saved.filters.examType && (
                              <View style={[styles.filterTag, { backgroundColor: `${theme.colors.primary}20` }]}>
                                <Text style={[
                                  styles.filterTagText, 
                                  { color: theme.colors.primary },
                                  isSmallScreen && { fontSize: 9 },
                                  isTablet && { fontSize: 13 },
                                ]}>
                                  {saved.filters.examType}
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => deleteSavedSearch(saved.id, saved.name)}
                      style={styles.deleteButton}
                    >
                      <Ionicons 
                        name="trash-outline" 
                        size={isSmallScreen ? 16 : isTablet ? 22 : 18} 
                        color={theme.colors.status.error} 
                      />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons 
                  name="bookmark-outline" 
                  size={isSmallScreen ? 40 : isTablet ? 64 : 48} 
                  color={theme.colors.text.tertiary} 
                />
                <Text style={[
                  styles.emptyText, 
                  { color: theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 14 },
                  isTablet && { fontSize: 20 },
                ]}>
                  No saved searches
                </Text>
                <Text style={[
                  styles.emptySubtext, 
                  { color: theme.colors.text.tertiary },
                  isSmallScreen && { fontSize: 12 },
                  isTablet && { fontSize: 16 },
                ]}>
                  Save searches from the search screen to access them here
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Advanced Filters Info */}
        <View style={styles.section}>
          <Text style={[
            styles.sectionTitle, 
            { color: theme.colors.text.secondary },
            isSmallScreen && { fontSize: 11 },
            isTablet && { fontSize: 15 },
          ]}>
            ADVANCED FILTERS
          </Text>
          <View style={[
            styles.infoCard, 
            { 
              backgroundColor: theme.colors.card,
              padding: isSmallScreen ? 16 : isTablet ? 28 : 20,
            }
          ]}>
            <View style={styles.infoHeader}>
              <Ionicons 
                name="options-outline" 
                size={isSmallScreen ? 20 : isTablet ? 32 : 24} 
                color={theme.colors.primary} 
              />
              <Text style={[
                styles.infoTitle, 
                { color: theme.colors.text.primary },
                isSmallScreen && { fontSize: 16 },
                isTablet && { fontSize: 22 },
              ]}>
                Filter Options
              </Text>
            </View>
            <View style={styles.infoList}>
              <View style={styles.infoItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                  color={theme.colors.primary} 
                />
                <Text style={[
                  styles.infoText, 
                  { color: theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 12 },
                  isTablet && { fontSize: 16 },
                ]}>
                  Filter by Subject Category
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                  color={theme.colors.primary} 
                />
                <Text style={[
                  styles.infoText, 
                  { color: theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 12 },
                  isTablet && { fontSize: 16 },
                ]}>
                  Filter by Exam Type (Final, Midterm, Quiz, etc.)
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                  color={theme.colors.primary} 
                />
                <Text style={[
                  styles.infoText, 
                  { color: theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 12 },
                  isTablet && { fontSize: 16 },
                ]}>
                  Filter by Date Range (Upcoming, Past, All)
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={isSmallScreen ? 14 : isTablet ? 20 : 16} 
                  color={theme.colors.primary} 
                />
                <Text style={[
                  styles.infoText, 
                  { color: theme.colors.text.secondary },
                  isSmallScreen && { fontSize: 12 },
                  isTablet && { fontSize: 16 },
                ]}>
                  Filter by Resource Type (YouTube, PDF, Link, etc.)
                </Text>
              </View>
            </View>
            <Text style={[
              styles.infoNote, 
              { color: theme.colors.text.tertiary },
              isSmallScreen && { fontSize: 10 },
              isTablet && { fontSize: 14 },
            ]}>
              Access filters from the search screen using the filter button
            </Text>
          </View>
        </View>
      </ScrollView>

      <CustomAlert
        visible={visible}
        title={alertConfig?.title || ''}
        message={alertConfig?.message || ''}
        icon={alertConfig?.icon}
        buttons={alertConfig?.buttons || []}
        onClose={hideAlert}
      />
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 32,
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
  clearButton: {
    fontSize: 15,
    fontWeight: '600',
  },
  settingsGroup: {
    paddingHorizontal: 20,
    gap: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  settingIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
  },
  historyPreview: {
    marginTop: 12,
    gap: 8,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  historyQuery: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  historyMeta: {
    fontSize: 12,
  },
  moreText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  recentPreview: {
    marginTop: 12,
    gap: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  recentQuery: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  savedPreview: {
    marginTop: 12,
    gap: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  savedItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  savedItemContent: {
    flex: 1,
  },
  savedName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  savedQuery: {
    fontSize: 13,
    marginBottom: 6,
  },
  filterTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  filterTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  filterTagText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  infoCard: {
    marginHorizontal: 20,
    padding: 20,
    borderRadius: 16,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoList: {
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  infoNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
  },
});

