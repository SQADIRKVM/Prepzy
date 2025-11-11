import AsyncStorage from '@react-native-async-storage/async-storage';
import { Goals, SubjectGrade } from '../types';
import { requestNotificationPermissions, scheduleNotification } from './notificationService';
import { Platform } from 'react-native';

const GOAL_ACHIEVEMENTS_KEY = '@goal_achievements';
const GOAL_NOTIFICATIONS_ENABLED_KEY = '@goal_notifications_enabled';

export interface GoalAchievement {
  id: string;
  type: 'hours' | 'grade' | 'subject';
  achievedAt: string;
  message: string;
  goalValue: number | string;
  actualValue: number | string;
  subject?: string;
}

export interface GoalAchievementHistory {
  achievements: GoalAchievement[];
  lastChecked: string;
}

/**
 * Check if goal notifications are enabled
 */
export async function areGoalNotificationsEnabled(): Promise<boolean> {
  try {
    const enabled = await AsyncStorage.getItem(GOAL_NOTIFICATIONS_ENABLED_KEY);
    return enabled !== 'false'; // Default to true
  } catch (error) {
    return true; // Default to enabled
  }
}

/**
 * Set goal notifications enabled/disabled
 */
export async function setGoalNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(GOAL_NOTIFICATIONS_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error('Failed to save goal notifications setting:', error);
  }
}

/**
 * Get goal achievement history
 */
export async function getGoalAchievementHistory(): Promise<GoalAchievementHistory> {
  try {
    const data = await AsyncStorage.getItem(GOAL_ACHIEVEMENTS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load goal achievement history:', error);
  }
  return { achievements: [], lastChecked: new Date().toISOString() };
}

/**
 * Save goal achievement to history
 */
export async function saveGoalAchievement(achievement: GoalAchievement): Promise<void> {
  try {
    const history = await getGoalAchievementHistory();
    history.achievements.unshift(achievement);
    // Keep only last 50 achievements
    if (history.achievements.length > 50) {
      history.achievements = history.achievements.slice(0, 50);
    }
    history.lastChecked = new Date().toISOString();
    await AsyncStorage.setItem(GOAL_ACHIEVEMENTS_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to save goal achievement:', error);
  }
}

/**
 * Check if an achievement already exists (to avoid duplicates)
 */
export async function hasAchievement(achievementId: string): Promise<boolean> {
  try {
    const history = await getGoalAchievementHistory();
    return history.achievements.some(a => a.id === achievementId);
  } catch (error) {
    return false;
  }
}

/**
 * Check weekly hours goal achievement
 */
export async function checkWeeklyHoursGoal(
  goals: Goals | null,
  currentHours: number
): Promise<GoalAchievement | null> {
  if (!goals || goals.goalType !== 'hours' || !goals.weeklyHours) {
    return null;
  }

  const goalHours = goals.weeklyHours;
  const achievementId = `hours-${goals.updatedAt}-${Math.floor(currentHours)}`;

  // Check if already achieved
  const alreadyAchieved = await hasAchievement(achievementId);
  if (alreadyAchieved) {
    return null;
  }

  // Check if goal is reached (100% or more)
  if (currentHours >= goalHours) {
    const achievement: GoalAchievement = {
      id: achievementId,
      type: 'hours',
      achievedAt: new Date().toISOString(),
      message: `🎉 Weekly Goal Achieved! You've studied ${currentHours.toFixed(1)} hours this week!`,
      goalValue: goalHours,
      actualValue: currentHours.toFixed(1),
    };

    await saveGoalAchievement(achievement);
    return achievement;
  }

  return null;
}

/**
 * Check grade goal achievements
 */
export async function checkGradeGoals(
  goals: Goals | null,
  currentGrades: { [subject: string]: number } // subject -> current grade percentage
): Promise<GoalAchievement[]> {
  if (!goals || goals.goalType !== 'grades' || !goals.grades || goals.grades.length === 0) {
    return [];
  }

  const achievements: GoalAchievement[] = [];

  for (const gradeGoal of goals.grades) {
    if (!gradeGoal.targetGrade || gradeGoal.targetGrade <= 0) {
      continue;
    }

    const currentGrade = currentGrades[gradeGoal.subject] || gradeGoal.currentGrade || 0;
    const achievementId = `grade-${gradeGoal.subject}-${goals.updatedAt}-${Math.floor(currentGrade)}`;

    // Check if already achieved
    const alreadyAchieved = await hasAchievement(achievementId);
    if (alreadyAchieved) {
      continue;
    }

    // Check if goal is reached (100% or more of target)
    const progress = (currentGrade / gradeGoal.targetGrade) * 100;
    if (progress >= 100) {
      const achievement: GoalAchievement = {
        id: achievementId,
        type: 'subject',
        achievedAt: new Date().toISOString(),
        message: `🎯 Goal Achieved! ${gradeGoal.subject}: ${gradeGoal.gradeType === 'letter' ? gradeGoal.currentLetter : `${Math.round(currentGrade)}%`} (Target: ${gradeGoal.gradeType === 'letter' ? gradeGoal.targetLetter : `${Math.round(gradeGoal.targetGrade)}%`})`,
        goalValue: gradeGoal.gradeType === 'letter' ? gradeGoal.targetLetter : `${Math.round(gradeGoal.targetGrade)}%`,
        actualValue: gradeGoal.gradeType === 'letter' ? gradeGoal.currentLetter : `${Math.round(currentGrade)}%`,
        subject: gradeGoal.subject,
      };

      await saveGoalAchievement(achievement);
      achievements.push(achievement);
    }
  }

  return achievements;
}

/**
 * Send notification for goal achievement
 */
export async function notifyGoalAchievement(achievement: GoalAchievement): Promise<void> {
  const enabled = await areGoalNotificationsEnabled();
  if (!enabled) {
    return;
  }

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) {
    return;
  }

  try {
    // Schedule immediate notification
    const notificationDate = new Date();
    notificationDate.setSeconds(notificationDate.getSeconds() + 1);

    await scheduleNotification({
      title: 'Goal Achieved! 🎉',
      body: achievement.message,
      data: {
        type: 'goal_achievement',
        achievementId: achievement.id,
      },
    }, notificationDate);
  } catch (error) {
    console.error('Failed to send goal achievement notification:', error);
  }
}

/**
 * Check all goals and send notifications for new achievements
 */
export async function checkAndNotifyGoalAchievements(
  goals: Goals | null,
  weeklyHours: number,
  currentGrades?: { [subject: string]: number }
): Promise<GoalAchievement[]> {
  const allAchievements: GoalAchievement[] = [];

  if (!goals) {
    return allAchievements;
  }

  // Check hours goal
  if (goals.goalType === 'hours') {
    const hoursAchievement = await checkWeeklyHoursGoal(goals, weeklyHours);
    if (hoursAchievement) {
      allAchievements.push(hoursAchievement);
      await notifyGoalAchievement(hoursAchievement);
    }
  }

  // Check grade goals
  if (goals.goalType === 'grades' && currentGrades) {
    const gradeAchievements = await checkGradeGoals(goals, currentGrades);
    for (const achievement of gradeAchievements) {
      allAchievements.push(achievement);
      await notifyGoalAchievement(achievement);
    }
  }

  return allAchievements;
}

