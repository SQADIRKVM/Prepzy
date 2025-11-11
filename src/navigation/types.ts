import { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  AddExam: { examId?: string } | undefined;
  ExamDetail: { examId: string };
  AddResource: { examId: string; resourceId?: string };
  FocusMode: { examId: string };
  TimetableExtractor: undefined;
  DNDSettings: undefined;
  SetGoals: undefined;
  Notifications: undefined;
  Search: undefined;
  Reminders: { examId?: string } | undefined;
  StudyReminders: undefined;
  FocusModePreferences: undefined;
  StreakManagement: undefined;
  ThemeSettings: undefined;
  NotificationSettings: undefined;
  SubjectCategories: undefined;
  SearchSettings: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Schedule: undefined;
  AddExamTab: undefined; // Placeholder for center button
  Progress: undefined;
  Settings: undefined;
};
