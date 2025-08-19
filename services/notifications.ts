import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { database } from './database';

export interface NotificationPermissionStatus {
  granted: boolean;
  canAskAgain: boolean;
  status: Notifications.PermissionStatus;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  trigger: Notifications.NotificationTriggerInput;
  categoryId?: string;
}

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      await this.requestPermissions();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  }

  async requestPermissions(): Promise<NotificationPermissionStatus> {
    let finalStatus: Notifications.PermissionStatus;

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    finalStatus = existingStatus;

    // Ask for permissions if not granted
    if (existingStatus !== 'granted') {
      const { status, canAskAgain } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      
      return {
        granted: status === 'granted',
        canAskAgain,
        status: finalStatus,
      };
    }

    return {
      granted: true,
      canAskAgain: true,
      status: finalStatus,
    };
  }

  async getPermissionStatus(): Promise<NotificationPermissionStatus> {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    return {
      granted: status === 'granted',
      canAskAgain,
      status,
    };
  }

  async scheduleNotification(notification: ScheduledNotification): Promise<string> {
    const permissions = await this.getPermissionStatus();
    if (!permissions.granted) {
      throw new Error('Notification permissions not granted');
    }

    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          sound: true,
        },
        trigger: notification.trigger,
      });

      // Store notification ID for later cancellation
      await this.storeNotificationId(notification.id, notificationId);
      
      return notificationId;
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      throw error;
    }
  }

  async cancelNotification(customId: string): Promise<void> {
    try {
      const notificationId = await this.getStoredNotificationId(customId);
      if (notificationId) {
        await Notifications.cancelScheduledNotificationAsync(notificationId);
        await this.removeStoredNotificationId(customId);
      }
    } catch (error) {
      console.error('Failed to cancel notification:', error);
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem('@notification_ids');
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
    }
  }

  async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    try {
      return await Notifications.getAllScheduledNotificationsAsync();
    } catch (error) {
      console.error('Failed to get scheduled notifications:', error);
      return [];
    }
  }

  // Check if notifications are enabled for a specific type
  private async areNotificationsEnabled(type: 'habits' | 'budgets' | 'goals'): Promise<boolean> {
    try {
      const db = database.getDatabase();
      const result = await db.getFirstAsync<{ notifications: string }>(
        'SELECT notifications FROM settings WHERE id = ?',
        ['default']
      );
      
      if (result?.notifications) {
        const notifications = JSON.parse(result.notifications);
        return notifications[type] ?? true; // Default to true if not set
      }
      return true; // Default to enabled if no settings found
    } catch (error) {
      console.error('Failed to check notification settings:', error);
      return true; // Default to enabled if we can't check
    }
  }

  // Habit reminder notifications
  async scheduleHabitReminder(habitId: string, habitName: string, hour: number = 9, minute: number = 0): Promise<void> {
    const enabled = await this.areNotificationsEnabled('habits');
    if (!enabled) {
      console.log('Habit notifications disabled, skipping reminder for:', habitName);
      return;
    }

    const customId = `habit_reminder_${habitId}`;
    
    try {
      await this.scheduleNotification({
        id: customId,
        title: 'Habit Reminder',
        body: `Time to complete your habit: ${habitName}`,
        trigger: {
          type: 'calendar',
          hour,
          minute,
          repeats: true,
        },
      });
    } catch (error) {
      console.error('Failed to schedule habit reminder:', error);
      throw error;
    }
  }

  async cancelHabitReminder(habitId: string): Promise<void> {
    const customId = `habit_reminder_${habitId}`;
    await this.cancelNotification(customId);
  }

  // Budget alert notifications
  async scheduleBudgetAlert(budgetId: string, categoryName: string, percentage: number): Promise<void> {
    const enabled = await this.areNotificationsEnabled('budgets');
    if (!enabled) {
      console.log('Budget notifications disabled, skipping alert for:', categoryName);
      return;
    }

    const customId = `budget_alert_${budgetId}`;
    
    let message: string;
    if (percentage >= 100) {
      message = `You've exceeded your ${categoryName} budget!`;
    } else if (percentage >= 90) {
      message = `You've used ${percentage.toFixed(0)}% of your ${categoryName} budget`;
    } else {
      message = `Warning: You've used ${percentage.toFixed(0)}% of your ${categoryName} budget`;
    }

    try {
      // Schedule immediate notification for budget alerts
      await this.scheduleNotification({
        id: customId,
        title: 'Budget Alert',
        body: message,
        trigger: null, // Immediate
      });
    } catch (error) {
      console.error('Failed to schedule budget alert:', error);
      throw error;
    }
  }

  // Goal reminder notifications
  async scheduleGoalReminder(goalId: string, goalName: string, daysUntilDeadline?: number): Promise<void> {
    const enabled = await this.areNotificationsEnabled('goals');
    if (!enabled) {
      console.log('Goal notifications disabled, skipping reminder for:', goalName);
      return;
    }

    const customId = `goal_reminder_${goalId}`;
    
    let message: string;
    let triggerDate: Date;

    if (daysUntilDeadline !== undefined) {
      if (daysUntilDeadline <= 0) {
        message = `Your goal "${goalName}" deadline is today!`;
        triggerDate = new Date();
      } else if (daysUntilDeadline <= 7) {
        message = `Your goal "${goalName}" deadline is in ${daysUntilDeadline} days`;
        triggerDate = new Date();
        triggerDate.setHours(9, 0, 0, 0); // 9 AM today
      } else {
        message = `Don't forget about your goal: ${goalName}`;
        triggerDate = new Date();
        triggerDate.setDate(triggerDate.getDate() + 7); // Weekly reminder
        triggerDate.setHours(9, 0, 0, 0);
      }
    } else {
      message = `Check your progress on: ${goalName}`;
      triggerDate = new Date();
      triggerDate.setDate(triggerDate.getDate() + 7); // Weekly reminder
      triggerDate.setHours(9, 0, 0, 0);
    }

    try {
      await this.scheduleNotification({
        id: customId,
        title: 'Goal Reminder',
        body: message,
        trigger: {
          type: 'date',
          date: triggerDate,
        },
      });
    } catch (error) {
      console.error('Failed to schedule goal reminder:', error);
      throw error;
    }
  }

  async cancelGoalReminder(goalId: string): Promise<void> {
    const customId = `goal_reminder_${goalId}`;
    await this.cancelNotification(customId);
  }

  // Helper methods for storing notification IDs
  private async storeNotificationId(customId: string, notificationId: string): Promise<void> {
    try {
      const storedIds = await AsyncStorage.getItem('@notification_ids');
      const ids = storedIds ? JSON.parse(storedIds) : {};
      ids[customId] = notificationId;
      await AsyncStorage.setItem('@notification_ids', JSON.stringify(ids));
    } catch (error) {
      console.error('Failed to store notification ID:', error);
    }
  }

  private async getStoredNotificationId(customId: string): Promise<string | null> {
    try {
      const storedIds = await AsyncStorage.getItem('@notification_ids');
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        return ids[customId] || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored notification ID:', error);
      return null;
    }
  }

  private async removeStoredNotificationId(customId: string): Promise<void> {
    try {
      const storedIds = await AsyncStorage.getItem('@notification_ids');
      if (storedIds) {
        const ids = JSON.parse(storedIds);
        delete ids[customId];
        await AsyncStorage.setItem('@notification_ids', JSON.stringify(ids));
      }
    } catch (error) {
      console.error('Failed to remove stored notification ID:', error);
    }
  }
}

export const notificationService = NotificationService.getInstance();