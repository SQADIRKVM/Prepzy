import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exam, Resource, FocusSession, ViewFilter, SortOption, Goals, CustomSubjectCategory } from '../types';
import { v4 as uuidv4 } from 'uuid';
import {
  scheduleExamNotifications,
  cancelExamNotifications,
  rescheduleExamNotifications,
  requestNotificationPermissions,
} from '../services/notificationService';

interface AppState {
  // Data
  exams: Exam[];
  resources: Resource[];
  focusSessions: FocusSession[];
  goals: Goals | null;
  customCategories: CustomSubjectCategory[];

  // UI State
  viewFilter: ViewFilter;
  sortOption: SortOption;
  isLoading: boolean;

  // Actions - Exams
  addExam: (exam: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExam: (id: string, exam: Partial<Exam>) => Promise<void>;
  deleteExam: (id: string) => Promise<void>;
  getExamById: (id: string) => Exam | undefined;

  // Actions - Resources
  addResource: (resource: Omit<Resource, 'id' | 'createdAt'>) => void;
  updateResource: (id: string, resource: Partial<Resource>) => void;
  deleteResource: (id: string) => void;
  getResourcesByExamId: (examId: string) => Resource[];
  reorderResources: (examId: string, newOrder: Resource[]) => void;

  // Actions - Focus Sessions
  startFocusSession: (examId: string) => string;
  endFocusSession: (sessionId: string, completedResources: string[], notes?: string) => void;
  getFocusSessionsByExamId: (examId: string) => FocusSession[];

  // Actions - UI
  setViewFilter: (filter: ViewFilter) => void;
  setSortOption: (option: SortOption) => void;

  // Actions - Goals
  setGoals: (goals: Goals) => Promise<void>;
  getGoals: () => Goals | null;

  // Actions - Custom Categories
  setCustomCategories: (categories: CustomSubjectCategory[]) => Promise<void>;
  getCustomCategories: () => CustomSubjectCategory[];

  // Actions - Persistence
  loadData: () => Promise<void>;
  saveData: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial State
  exams: [],
  resources: [],
  focusSessions: [],
  goals: null,
  customCategories: [],
  viewFilter: 'upcoming',
  sortOption: 'date',
  isLoading: false,

  // Exam Actions
  addExam: async (examData) => {
    const newExam: Exam = {
      ...examData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Schedule notifications if reminders are selected
    if (examData.reminders && examData.reminders.length > 0) {
      // Request permissions first if not already granted
      try {
        const hasPermission = await requestNotificationPermissions();
        if (hasPermission) {
      const notificationIds = await scheduleExamNotifications(
        newExam.id,
        newExam.title,
        newExam.date,
            examData.reminders,
            examData.notificationSound
      );
      newExam.notificationIds = notificationIds;
          if (notificationIds.length === 0 && examData.reminders.length > 0) {
            console.warn('No notifications were scheduled. Check if exam date is in the future.');
          }
        } else {
          console.warn('Notification permissions not granted. Reminders will not be sent.');
          newExam.notificationIds = [];
        }
      } catch (error) {
        console.error('Error scheduling notifications:', error);
        newExam.notificationIds = [];
      }
    }

    set((state) => ({ exams: [...state.exams, newExam] }));
    get().saveData();
  },

  updateExam: async (id, examData) => {
    const existingExam = get().exams.find((exam) => exam.id === id);
    if (!existingExam) return;

    // Reschedule notifications if reminders or date/title changed
    let notificationIds = existingExam.notificationIds;
    if (examData.reminders !== undefined || examData.date || examData.title) {
      const reminders = examData.reminders ?? existingExam.reminders ?? [];
      const title = examData.title ?? existingExam.title;
      const date = examData.date ?? existingExam.date;

      if (reminders.length > 0) {
        // Request permissions first if not already granted
        try {
          const hasPermission = await requestNotificationPermissions();
          if (hasPermission) {
            const sound = examData.notificationSound ?? existingExam.notificationSound;
        notificationIds = await rescheduleExamNotifications(
          existingExam.notificationIds,
          id,
          title,
          date,
              reminders,
              sound
        );
            if (notificationIds.length === 0 && reminders.length > 0) {
              console.warn('No notifications were scheduled. Check if exam date is in the future.');
            }
          } else {
            console.warn('Notification permissions not granted. Reminders will not be sent.');
            notificationIds = [];
          }
        } catch (error) {
          console.error('Error rescheduling notifications:', error);
          notificationIds = existingExam.notificationIds || [];
        }
      } else {
        // No reminders selected, cancel any existing notifications
        try {
        await cancelExamNotifications(existingExam.notificationIds);
        } catch (error) {
          console.error('Error cancelling notifications:', error);
        }
        notificationIds = [];
      }
    }

    set((state) => ({
      exams: state.exams.map((exam) =>
        exam.id === id
          ? {
              ...exam,
              ...examData,
              notificationIds,
              updatedAt: new Date().toISOString(),
            }
          : exam
      ),
    }));
    get().saveData();
  },

  deleteExam: async (id) => {
    const exam = get().exams.find((exam) => exam.id === id);

    // Cancel any scheduled notifications for this exam
    if (exam && exam.notificationIds) {
      await cancelExamNotifications(exam.notificationIds);
    }

    set((state) => ({
      exams: state.exams.filter((exam) => exam.id !== id),
      resources: state.resources.filter((resource) => resource.examId !== id),
      focusSessions: state.focusSessions.filter((session) => session.examId !== id),
    }));
    get().saveData();
  },

  getExamById: (id) => {
    return get().exams.find((exam) => exam.id === id);
  },

  // Resource Actions
  addResource: (resourceData) => {
    const newResource: Resource = {
      ...resourceData,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ resources: [...state.resources, newResource] }));
    get().saveData();
  },

  updateResource: (id, resourceData) => {
    set((state) => ({
      resources: state.resources.map((resource) =>
        resource.id === id ? { ...resource, ...resourceData } : resource
      ),
    }));
    get().saveData();
  },

  deleteResource: (id) => {
    set((state) => ({
      resources: state.resources.filter((resource) => resource.id !== id),
    }));
    get().saveData();
  },

  getResourcesByExamId: (examId) => {
    return get()
      .resources.filter((resource) => resource.examId === examId)
      .sort((a, b) => a.order - b.order);
  },

  reorderResources: (examId, newOrder) => {
    const updatedResources = newOrder.map((resource, index) => ({
      ...resource,
      order: index,
    }));

    set((state) => ({
      resources: [
        ...state.resources.filter((r) => r.examId !== examId),
        ...updatedResources,
      ],
    }));
    get().saveData();
  },

  // Focus Session Actions
  startFocusSession: (examId) => {
    const sessionId = uuidv4();
    const newSession: FocusSession = {
      id: sessionId,
      examId,
      startTime: new Date().toISOString(),
      duration: 0,
      completedResources: [],
    };
    set((state) => ({ focusSessions: [...state.focusSessions, newSession] }));
    get().saveData();
    return sessionId;
  },

  endFocusSession: (sessionId, completedResources, notes) => {
    set((state) => ({
      focusSessions: state.focusSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              endTime: new Date().toISOString(),
              duration: Math.floor(
                (new Date().getTime() - new Date(session.startTime).getTime()) / 1000
              ),
              completedResources,
              notes,
            }
          : session
      ),
    }));
    get().saveData();
  },

  getFocusSessionsByExamId: (examId) => {
    return get()
      .focusSessions.filter((session) => session.examId === examId)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  },

  // UI Actions
  setViewFilter: (filter) => set({ viewFilter: filter }),
  setSortOption: (option) => set({ sortOption: option }),

  // Goals Actions
  setGoals: async (goals) => {
    const goalsWithTimestamp = {
      ...goals,
      updatedAt: new Date().toISOString(),
    };
    set({ goals: goalsWithTimestamp });
    await AsyncStorage.setItem('goals', JSON.stringify(goalsWithTimestamp));
  },

  getGoals: () => {
    return get().goals;
  },

  // Custom Categories Actions
  setCustomCategories: async (categories) => {
    // Ensure all categories have required fields
    const normalizedCategories = categories.map(cat => ({
      ...cat,
      enabled: cat.enabled !== undefined ? cat.enabled : true,
      order: cat.order !== undefined ? cat.order : 1000,
    }));
    set({ customCategories: normalizedCategories });
    await AsyncStorage.setItem('customCategories', JSON.stringify(normalizedCategories));
  },

  getCustomCategories: () => {
    return get().customCategories;
  },

  // Persistence
  loadData: async () => {
    try {
      set({ isLoading: true });
      const [examsData, resourcesData, sessionsData, goalsData, customCategoriesData] = await Promise.all([
        AsyncStorage.getItem('exams'),
        AsyncStorage.getItem('resources'),
        AsyncStorage.getItem('focusSessions'),
        AsyncStorage.getItem('goals'),
        AsyncStorage.getItem('customCategories'),
      ]);

      const customCategoriesParsed = customCategoriesData ? JSON.parse(customCategoriesData) : [];
      // Normalize categories to ensure they have required fields
      const normalizedCategories = customCategoriesParsed.map((cat: CustomSubjectCategory) => ({
        ...cat,
        enabled: cat.enabled !== undefined ? cat.enabled : true,
        order: cat.order !== undefined ? cat.order : 1000,
      }));

      set({
        exams: examsData ? JSON.parse(examsData) : [],
        resources: resourcesData ? JSON.parse(resourcesData) : [],
        focusSessions: sessionsData ? JSON.parse(sessionsData) : [],
        goals: goalsData ? JSON.parse(goalsData) : null,
        customCategories: normalizedCategories,
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading data:', error);
      set({ isLoading: false });
    }
  },

  saveData: async () => {
    try {
      const { exams, resources, focusSessions, goals, customCategories } = get();
      const savePromises = [
        AsyncStorage.setItem('exams', JSON.stringify(exams)),
        AsyncStorage.setItem('resources', JSON.stringify(resources)),
        AsyncStorage.setItem('focusSessions', JSON.stringify(focusSessions)),
      ];
      if (goals) {
        savePromises.push(AsyncStorage.setItem('goals', JSON.stringify(goals)));
      }
      if (customCategories.length > 0) {
        savePromises.push(AsyncStorage.setItem('customCategories', JSON.stringify(customCategories)));
      }
      await Promise.all(savePromises);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  },

  clearAllData: async () => {
    try {
      // Clear AsyncStorage
      await AsyncStorage.clear();

      // Reset state to initial values
      set({
        exams: [],
        resources: [],
        focusSessions: [],
        goals: null,
        customCategories: [],
        viewFilter: 'upcoming',
        sortOption: 'date',
      });
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  },
}));
