import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View, Pressable } from 'react-native';
import { RootStackParamList, MainTabParamList } from './types';
import { useTheme } from '../context/ThemeContext';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AddExamScreen from '../screens/AddExamScreen';
import ExamDetailScreen from '../screens/ExamDetailScreen';
import AddResourceScreen from '../screens/AddResourceScreen';
import FocusModeScreen from '../screens/FocusModeScreen';
import TimetableExtractorScreen from '../screens/TimetableExtractorScreen';
import DNDSettingsScreen from '../screens/DNDSettingsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SearchScreen from '../screens/SearchScreen';
import SetGoalsScreen from '../screens/SetGoalsScreen';
import RemindersScreen from '../screens/RemindersScreen';
import StudyRemindersScreen from '../screens/StudyRemindersScreen';
import FocusModePreferencesScreen from '../screens/FocusModePreferencesScreen';
import StreakManagementScreen from '../screens/StreakManagementScreen';
import ThemeSettingsScreen from '../screens/ThemeSettingsScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import SubjectCategoriesScreen from '../screens/SubjectCategoriesScreen';
import SearchSettingsScreen from '../screens/SearchSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.background : theme.colors.card,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 68 + Math.max(insets.bottom, 8),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        tabBarIconStyle: {
          marginTop: route.name === 'AddExamTab' ? 0 : 4,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text.primary,
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: 'My Exams',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: '700',
            textAlign: 'left',
          },
          headerTitleAlign: 'left', // Left-align title on all platforms (fixes iOS centering)
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => navigation.navigate('Search')}
                style={{ marginRight: 16 }}
              >
              <Ionicons
                name="search-outline"
                size={24}
                color={theme.colors.text.secondary}
                />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate('Notifications')}
                style={{ marginRight: 16 }}
              >
              <Ionicons
                name="notifications-outline"
                size={24}
                color={theme.colors.text.secondary}
              />
              </Pressable>
            </View>
          ),
        })}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          headerTitle: 'Schedule',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: '700',
            textAlign: 'left',
          },
          headerTitleAlign: 'left', // Left-align title on all platforms
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerRight: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                onPress={() => navigation.navigate('Search')}
                style={{ marginRight: 16 }}
              >
                <Ionicons
                  name="search-outline"
                  size={24}
                  color={theme.colors.text.secondary}
                />
              </Pressable>
            </View>
          ),
        })}
      />
      <Tab.Screen
        name="AddExamTab"
        component={DashboardScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('AddExam');
          },
        })}
        options={{
          tabBarIcon: () => (
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                backgroundColor: theme.colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: -32,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <Ionicons name="add" size={32} color={theme.colors.text.inverse} />
            </View>
          ),
          tabBarLabel: '',
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={({ navigation }) => ({
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
          headerTitle: 'Settings',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: '700',
            textAlign: 'left',
          },
          headerTitleAlign: 'left', // Left-align title on all platforms
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerRight: () => (
            <Pressable
              onPress={() => navigation.navigate('Search')}
              style={{ marginRight: 16 }}
            >
              <Ionicons
                name="search-outline"
                size={24}
                color={theme.colors.text.secondary}
              />
            </Pressable>
          ),
        })}
      />
    </Tab.Navigator>
  );
}

function NavigatorContent() {
  const { theme } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerShadowVisible: false,
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: {
            fontWeight: '600',
            fontSize: 18,
            textAlign: 'left',
          },
          headerTitleAlign: 'left', // Left-align all stack screen titles
        }}
      >
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddExam"
          component={AddExamScreen}
          options={({ route }) => ({
            title: route.params?.examId ? 'Edit Exam' : 'Add Exam',
            presentation: 'modal',
            headerShown: false,
          })}
        />
        <Stack.Screen
          name="ExamDetail"
          component={ExamDetailScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="AddResource"
          component={AddResourceScreen}
          options={({ route }) => ({
            title: route.params?.resourceId ? 'Edit Resource' : 'Add Resource',
            presentation: 'modal',
          })}
        />
        <Stack.Screen
          name="FocusMode"
          component={FocusModeScreen}
          options={{
            title: 'Focus Session',
            presentation: 'fullScreenModal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="TimetableExtractor"
          component={TimetableExtractorScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="DNDSettings"
          component={DNDSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SetGoals"
          component={SetGoalsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Search"
          component={SearchScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="Reminders"
          component={RemindersScreen}
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="StudyReminders"
          component={StudyRemindersScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="FocusModePreferences"
          component={FocusModePreferencesScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="StreakManagement"
          component={StreakManagementScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ThemeSettings"
          component={ThemeSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="NotificationSettings"
          component={NotificationSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SubjectCategories"
          component={SubjectCategoriesScreen}
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="SearchSettings"
          component={SearchSettingsScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function AppNavigator() {
  return (
    <SafeAreaProvider>
      <NavigatorContent />
    </SafeAreaProvider>
  );
}
