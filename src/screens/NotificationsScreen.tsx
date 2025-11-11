import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useStore } from '../store';
import { getAllScheduledNotifications } from '../services/notificationService';
import { isUpcoming } from '../utils/dateHelpers';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAlert } from '../hooks/useAlert';
import CustomAlert from '../components/CustomAlert';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<any, 'Notifications'>;

interface Notification {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  message: string;
  time: string;
  isUnread: boolean;
  examId?: string;
  type: 'exam-reminder' | 'upcoming-exam' | 'study-session' | 'milestone' | 'task';
  pinned?: boolean;
}

const NOTIFICATION_STATE_KEY = '@notification_states';

// Separate component for notification item to properly use hooks
interface NotificationItemProps {
  notification: Notification;
  theme: any;
  navigation: any;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem = ({ notification, theme, navigation, onPin, onDelete }: NotificationItemProps) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = () => (
    <View style={styles.swipeActions}>
      <Pressable
        style={[styles.swipeAction, styles.pinAction, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onPin(notification.id);
          swipeableRef.current?.close();
        }}
      >
        <Ionicons
          name={notification.pinned ? 'pin' : 'pin-outline'}
          size={20}
          color={theme.colors.text.inverse}
        />
      </Pressable>
      <Pressable
        style={[styles.swipeAction, styles.deleteAction, { backgroundColor: theme.colors.status.error }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onDelete(notification.id);
          swipeableRef.current?.close();
        }}
      >
        <Ionicons name="trash-outline" size={20} color={theme.colors.text.inverse} />
      </Pressable>
    </View>
  );

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        style={({ pressed }) => [
          styles.notificationItem,
          { backgroundColor: theme.colors.card },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => {
          if (notification.examId) {
            navigation.navigate('ExamDetail', { examId: notification.examId });
          }
        }}
      >
        {/* Unread Dot */}
        <View style={styles.dotContainer}>
          {notification.isUnread && (
            <View style={[styles.unreadDot, { backgroundColor: theme.colors.primary }]} />
          )}
        </View>

        {/* Icon */}
        <View
          style={[
            styles.notificationIcon,
            { backgroundColor: `${theme.colors.primary}20` },
          ]}
        >
          <Ionicons name={notification.icon} size={28} color={theme.colors.primary} />
        </View>

        {/* Content */}
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: theme.colors.text.primary }]} numberOfLines={1}>
            {notification.title}
          </Text>
          <Text
            style={[styles.notificationMessage, { color: theme.colors.text.secondary }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
        </View>

        {/* Time */}
        <Text style={[styles.notificationTime, { color: theme.colors.text.secondary }]}>
          {notification.time}
        </Text>
      </Pressable>
    </Swipeable>
  );
};

export default function NotificationsScreen({ navigation }: Props) {
  const { theme } = useTheme();
  const { exams, focusSessions } = useStore();
  const { alertConfig, visible, showAlert, hideAlert } = useAlert();
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [notificationStates, setNotificationStates] = useState<Record<string, { pinned: boolean; deleted: boolean }>>({});

  useEffect(() => {
    loadNotifications();
    loadNotificationStates();
  }, []);

  const loadNotifications = async () => {
    try {
      const notifications = await getAllScheduledNotifications();
      setScheduledNotifications(notifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadNotificationStates = async () => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_STATE_KEY);
      if (saved) {
        setNotificationStates(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading notification states:', error);
    }
  };

  const saveNotificationState = async (id: string, updates: { pinned?: boolean; deleted?: boolean }) => {
    try {
      const updated = {
        ...notificationStates,
        [id]: {
          ...notificationStates[id],
          pinned: updates.pinned ?? notificationStates[id]?.pinned ?? false,
          deleted: updates.deleted ?? notificationStates[id]?.deleted ?? false,
        },
      };
      setNotificationStates(updated);
      await AsyncStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving notification state:', error);
    }
  };

  const handlePin = async (id: string) => {
    const isPinned = notificationStates[id]?.pinned ?? false;
    await saveNotificationState(id, { pinned: !isPinned });
  };

  const handleDelete = async (id: string) => {
    await saveNotificationState(id, { deleted: true });
  };

  const handleDeleteAll = () => {
    showAlert({
      title: 'Clear All Notifications',
      message: 'Are you sure you want to delete all notifications? This action cannot be undone.',
      icon: 'trash',
      iconColor: theme.colors.status.error,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            const allIds = displayNotifications.today
              .concat(displayNotifications.yesterday)
              .concat(displayNotifications.older)
              .map(n => n.id);
            
            const updated = { ...notificationStates };
            allIds.forEach(id => {
              updated[id] = { ...updated[id], deleted: true };
            });
            setNotificationStates(updated);
            await AsyncStorage.setItem(NOTIFICATION_STATE_KEY, JSON.stringify(updated));
          },
        },
      ],
    });
  };

  // Helper functions
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const parseTimeToDate = (timeStr: string): Date => {
    const now = new Date();
    if (timeStr.includes('m ago') || timeStr.includes('h ago') || timeStr.includes('d ago') || timeStr === 'Just now' || timeStr === 'Today' || timeStr === 'Tomorrow') {
      return now;
    }
    const parsed = new Date(timeStr);
    return isNaN(parsed.getTime()) ? now : parsed;
  };

  const isSameDay = (date1: Date, date2: Date): boolean => {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  };

  // Convert scheduled notifications to display format
  const displayNotifications = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const notifications: Notification[] = [];

    // Add scheduled exam reminders
    scheduledNotifications.forEach((notif) => {
      if (notif.content?.data?.type === 'exam-reminder') {
        const examId = notif.content.data.examId;
        const exam = exams.find(e => e.id === examId);
        if (exam && !notificationStates[notif.identifier]?.deleted) {
          const triggerDate = notif.trigger?.date ? new Date(notif.trigger.date) : null;
          const timeAgo = triggerDate ? getTimeAgo(triggerDate) : 'Scheduled';
          
          notifications.push({
            id: notif.identifier,
            icon: 'calendar',
            title: 'Upcoming Exam',
            message: notif.content.body || `${exam.title} is coming up!`,
            time: timeAgo,
            isUnread: triggerDate ? triggerDate <= now : false,
            examId: exam.id,
            type: 'exam-reminder',
            pinned: notificationStates[notif.identifier]?.pinned ?? false,
          });
        }
      }
    });

    // Add upcoming exam notifications
    const upcomingExams = exams.filter(exam => {
      if (!isUpcoming(exam.date)) return false;
      const examDate = new Date(exam.date);
      const daysUntil = Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntil <= 7 && daysUntil >= 0;
    });

    upcomingExams.forEach(exam => {
      const id = `upcoming-${exam.id}`;
      if (!notificationStates[id]?.deleted) {
        const examDate = new Date(exam.date);
        const daysUntil = Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const timeText = daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`;
        
        notifications.push({
          id,
      icon: 'calendar',
      title: 'Upcoming Exam',
          message: `${exam.title} is ${timeText === 'Today' ? 'today' : timeText === 'Tomorrow' ? 'tomorrow' : timeText.toLowerCase()}.`,
          time: daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil}d`,
      isUnread: true,
          examId: exam.id,
          type: 'upcoming-exam',
          pinned: notificationStates[id]?.pinned ?? false,
        });
      }
    });

    // Add study milestone notifications
    const totalHours = focusSessions.reduce((sum, s) => sum + s.duration, 0) / 3600;
    if (totalHours >= 10 && totalHours < 11) {
      const id = 'milestone-10';
      if (!notificationStates[id]?.deleted) {
        notifications.push({
          id,
      icon: 'trophy',
      title: 'New Milestone!',
          message: `You've studied for ${Math.floor(totalHours)} hours this week!`,
          time: 'Today',
          isUnread: true,
          type: 'milestone',
          pinned: notificationStates[id]?.pinned ?? false,
        });
      }
    }

    // Sort: pinned first, then by time
    notifications.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const aTime = parseTimeToDate(a.time);
      const bTime = parseTimeToDate(b.time);
      return bTime.getTime() - aTime.getTime();
    });

    // Group by today/yesterday/older
    const todayList: Notification[] = [];
    const yesterdayList: Notification[] = [];
    const olderList: Notification[] = [];

    notifications.forEach(notif => {
      const notifDate = parseTimeToDate(notif.time);
      if (isSameDay(notifDate, today)) {
        todayList.push(notif);
      } else if (isSameDay(notifDate, yesterday)) {
        yesterdayList.push(notif);
      } else {
        olderList.push(notif);
      }
    });

    return { today: todayList, yesterday: yesterdayList, older: olderList };
  }, [scheduledNotifications, exams, focusSessions, notificationStates]);

  const renderNotificationItem = (notification: Notification) => (
    <NotificationItem
      key={notification.id}
      notification={notification}
      theme={theme}
      navigation={navigation}
      onPin={handlePin}
      onDelete={handleDelete}
    />
  );

  const totalNotifications = displayNotifications.today.length + 
                            displayNotifications.yesterday.length + 
                            displayNotifications.older.length;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background },
        Platform.OS === 'web' && ({ height: '100vh', overflow: 'hidden' } as any)
      ]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: `${theme.colors.background}CC` }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color={theme.colors.text.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
          Notifications
        </Text>
        <Pressable 
          style={styles.settingsButton}
          onPress={() => navigation.navigate('NotificationSettings')}
        >
          <Ionicons name="settings-outline" size={24} color={theme.colors.text.primary} />
        </Pressable>
      </View>

      <ScrollView
        style={[
          styles.scrollView,
          Platform.OS === 'web' && ({
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
          } as any)
        ]}
        contentContainerStyle={[
          styles.content,
          Platform.OS === 'web' && { minHeight: '100%', paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Today Section */}
        {displayNotifications.today.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Today
          </Text>
          <View style={styles.notificationsList}>
              {displayNotifications.today.map(renderNotificationItem)}
            </View>
          </View>
        )}

        {/* Yesterday Section */}
        {displayNotifications.yesterday.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
            Yesterday
          </Text>
          <View style={styles.notificationsList}>
              {displayNotifications.yesterday.map(renderNotificationItem)}
            </View>
          </View>
        )}

        {/* Older Section */}
        {displayNotifications.older.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Earlier
            </Text>
            <View style={styles.notificationsList}>
              {displayNotifications.older.map(renderNotificationItem)}
          </View>
        </View>
        )}

        {/* Empty State */}
        {totalNotifications === 0 && (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconContainer,
                { backgroundColor: theme.colors.card },
            ]}
          >
              <Ionicons name="notifications-off" size={40} color={theme.colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
            You're all caught up!
          </Text>
          <Text style={[styles.emptyMessage, { color: theme.colors.text.secondary }]}>
            New notifications will appear here.
          </Text>
        </View>
        )}
      </ScrollView>

      {/* Floating Action Button */}
      {totalNotifications > 0 && (
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
          },
        ]}
          onPress={handleDeleteAll}
      >
          <Ionicons name="trash-outline" size={28} color={theme.colors.text.inverse} />
      </Pressable>
      )}

      {/* Alert */}
      {visible && alertConfig && (
        <CustomAlert
          visible={visible}
          title={alertConfig.title}
          message={alertConfig.message}
          icon={alertConfig.icon as any}
          iconColor={alertConfig.iconColor}
          buttons={alertConfig.buttons}
          onDismiss={hideAlert}
        />
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 100,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  notificationsList: {
    gap: 2,
  },
  notificationWrapper: {
    marginBottom: 2,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 72,
    gap: 16,
  },
  dotContainer: {
    width: 8,
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 14,
    fontWeight: '400',
    minWidth: 60,
    textAlign: 'right',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinAction: {
    backgroundColor: '#19e65e',
  },
  deleteAction: {
    backgroundColor: '#FFB4A0',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
});
