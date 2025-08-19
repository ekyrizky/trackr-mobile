import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Share, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useHealth } from '../../contexts/HealthContext';
import { useHabits } from '../../contexts/HabitsContext';
import { database } from '../../services/database';
import { notificationService } from '../../services/notifications';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { getCurrencySymbol } from '../../utils/currency';

export default function SettingsScreen() {
  const { theme, isDark, themeMode, setThemeMode } = useTheme();
  const { settings, updateSettings, loadSettings } = useSettings();
  const { transactions, budgets, goals, loadFinanceData } = useFinance();
  const { weightEntries, bodyMeasurements, exercises, userProfile, loadHealthData } = useHealth();
  const { habits, habitEntries, loadHabitsData } = useHabits();

  const [isExporting, setIsExporting] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showMeasurementModal, setShowMeasurementModal] = useState(false);

  const themeOptions = [
    { key: 'light', label: 'Light', icon: 'sunny' },
    { key: 'dark', label: 'Dark', icon: 'moon' },
    { key: 'system', label: 'System', icon: 'phone-portrait' },
  ];

  const currencyOptions = [
    { key: 'USD', label: 'US Dollar ($)', symbol: '$' },
    { key: 'EUR', label: 'Euro (€)', symbol: '€' },
    { key: 'IDR', label: 'Indonesian Rupiah (Rp)', symbol: 'Rp' },
  ];

  const measurementOptions = [
    { key: 'metric', label: 'Metric (kg, cm)', description: 'Kilograms and centimeters' },
    { key: 'imperial', label: 'Imperial (lbs, ft)', description: 'Pounds and feet/inches' },
  ];

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setThemeMode(newTheme);
  };

  const handleCurrencyChange = (currency: string) => {
    updateSettings({ currency });
  };

  const handleMeasurementChange = (measurementUnit: 'metric' | 'imperial') => {
    updateSettings({ measurementUnit });
  };

  const handleNotificationToggle = async (type: 'habits' | 'budgets' | 'goals') => {
    const newNotifications = {
      ...settings.notifications,
      [type]: !settings.notifications[type],
    };
    
    try {
      // Update settings first (this should work even if DB fails)
      await updateSettings({ notifications: newNotifications });
      
      // Handle notification scheduling/canceling
      try {
        if (!newNotifications[type]) {
          // If disabling notifications, cancel existing ones
          if (type === 'habits') {
            // Cancel all habit reminders
            for (const habit of habits) {
              try {
                await notificationService.cancelHabitReminder(habit.id);
              } catch (error) {
                console.warn(`Failed to cancel habit reminder for ${habit.id}:`, error);
              }
            }
          } else if (type === 'goals') {
            // Cancel all goal reminders
            for (const goal of goals) {
              try {
                await notificationService.cancelGoalReminder(goal.id);
              } catch (error) {
                console.warn(`Failed to cancel goal reminder for ${goal.id}:`, error);
              }
            }
          }
          // Budget alerts are immediate, so no need to cancel them
        } else {
          // If enabling notifications, reschedule them
          if (type === 'habits') {
            // Reschedule all habit reminders
            for (const habit of habits) {
              try {
                await notificationService.scheduleHabitReminder(habit.id, habit.name);
              } catch (error) {
                console.warn(`Failed to schedule habit reminder for ${habit.id}:`, error);
              }
            }
          } else if (type === 'goals') {
            // Reschedule all goal reminders
            for (const goal of goals) {
              try {
                const daysUntilDeadline = goal.deadline 
                  ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : undefined;
                await notificationService.scheduleGoalReminder(goal.id, goal.name, daysUntilDeadline);
              } catch (error) {
                console.warn(`Failed to schedule goal reminder for ${goal.id}:`, error);
              }
            }
          }
        }
      } catch (notificationError) {
        console.warn('Some notification operations failed:', notificationError);
        // Don't show error to user for notification failures, toggle still works
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      // Only show error if the settings update completely failed
      Alert.alert(
        'Settings Update', 
        'Settings updated but may not persist until next app restart'
      );
    }
  };

  const exportData = async () => {
    try {
      setIsExporting(true);
      
      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        finance: {
          transactions,
          budgets,
          goals,
        },
        health: {
          weightEntries,
          bodyMeasurements,
          exercises,
          userProfile,
        },
        habits: {
          habits,
          habitEntries,
        },
        settings,
      };

      const dataString = JSON.stringify(exportData, null, 2);
      const filename = `trackr-backup-${format(new Date(), 'yyyy-MM-dd')}.json`;
      
      await Share.share({
        message: dataString,
        title: 'Trackr Data Export',
      });
    } catch (error) {
      Alert.alert('Export Failed', 'Could not export your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const clearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your data including transactions, habits, and health records. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await database.clearAllData();
              
              // Reload all data in contexts
              await Promise.all([
                loadFinanceData?.(),
                loadHealthData?.(),
                loadHabitsData?.(),
                loadSettings?.()
              ]);
              
              Alert.alert('Success', 'All data has been cleared successfully.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
    );
  };


  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* App Info */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.appHeader}>
          <View style={[styles.appIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="analytics" size={32} color="white" />
          </View>
          <View style={styles.appInfo}>
            <Text style={[styles.appName, { color: theme.text }]}>Trackr</Text>
            <Text style={[styles.appVersion, { color: theme.textSecondary }]}>Version 1.0.0</Text>
          </View>
        </View>
      </Card>

      {/* Theme Settings */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
        <View style={styles.themeGrid}>
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.themeOption,
                {
                  backgroundColor: themeMode === option.key ? theme.primary : theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => handleThemeChange(option.key as any)}
            >
              <Ionicons
                name={option.icon as any}
                size={24}
                color={themeMode === option.key ? 'white' : theme.text}
              />
              <Text
                style={[
                  styles.themeOptionText,
                  { color: themeMode === option.key ? 'white' : theme.text },
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Preferences Settings */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
        
        <TouchableOpacity
          style={[styles.settingItem, { borderBottomColor: theme.border }]}
          activeOpacity={0.7}
          onPress={() => setShowCurrencyModal(true)}
        >
          <Text style={[styles.settingLabel, { color: theme.text }]}>Currency</Text>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.textSecondary }]}>
              {getCurrencySymbol(settings.currency)} {settings.currency}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.settingItem}
          activeOpacity={0.7}
          onPress={() => setShowMeasurementModal(true)}
        >
          <Text style={[styles.settingLabel, { color: theme.text }]}>Measurement</Text>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.textSecondary }]}>
              {measurementOptions.find(opt => opt.key === settings.measurementUnit)?.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Notifications */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Notifications</Text>
        
        <TouchableOpacity
          style={[styles.notificationItem, { borderBottomColor: theme.border }]}
          activeOpacity={0.7}
          onPress={() => handleNotificationToggle('habits')}
        >
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationLabel, { color: theme.text }]}>
              Habit Reminders
            </Text>
            <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
              Daily reminders to complete your habits
            </Text>
          </View>
          <View style={[styles.toggleContainer, { backgroundColor: settings.notifications.habits ? theme.success : theme.border }]}>
            <View style={[
              styles.toggleCircle, 
              { 
                backgroundColor: 'white',
                transform: [{ translateX: settings.notifications.habits ? 20 : 2 }]
              }
            ]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.notificationItem, { borderBottomColor: theme.border }]}
          activeOpacity={0.7}
          onPress={() => handleNotificationToggle('budgets')}
        >
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationLabel, { color: theme.text }]}>
              Budget Alerts
            </Text>
            <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
              Alerts when approaching budget limits
            </Text>
          </View>
          <View style={[styles.toggleContainer, { backgroundColor: settings.notifications.budgets ? theme.success : theme.border }]}>
            <View style={[
              styles.toggleCircle, 
              { 
                backgroundColor: 'white',
                transform: [{ translateX: settings.notifications.budgets ? 20 : 2 }]
              }
            ]} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.notificationItem}
          activeOpacity={0.7}
          onPress={() => handleNotificationToggle('goals')}
        >
          <View style={styles.notificationContent}>
            <Text style={[styles.notificationLabel, { color: theme.text }]}>
              Goal Reminders
            </Text>
            <Text style={[styles.notificationDescription, { color: theme.textSecondary }]}>
              Progress updates on your savings goals
            </Text>
          </View>
          <View style={[styles.toggleContainer, { backgroundColor: settings.notifications.goals ? theme.success : theme.border }]}>
            <View style={[
              styles.toggleCircle, 
              { 
                backgroundColor: 'white',
                transform: [{ translateX: settings.notifications.goals ? 20 : 2 }]
              }
            ]} />
          </View>
        </TouchableOpacity>
      </Card>


      {/* Data Management */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Management</Text>
        
        <TouchableOpacity
          style={[styles.actionItem, { borderBottomColor: theme.border }]}
          activeOpacity={0.7}
          onPress={exportData}
          disabled={isExporting}
        >
          <Ionicons name="download" size={24} color={theme.primary} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionLabel, { color: theme.text }]}>
              Export Data
            </Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Download all your data as a backup file
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          activeOpacity={0.7}
          onPress={clearAllData}
        >
          <Ionicons name="trash" size={24} color={theme.error} />
          <View style={styles.actionContent}>
            <Text style={[styles.actionLabel, { color: theme.error }]}>
              Clear All Data
            </Text>
            <Text style={[styles.actionDescription, { color: theme.textSecondary }]}>
              Permanently delete all app data
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </Card>

      {/* About */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>
        <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
          Trackr is a personal productivity suite that helps you manage your finances, 
          track your health metrics, and build positive habits. All your data is stored 
          locally on your device for complete privacy.
        </Text>
      </Card>

      {/* Currency Selection Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Currency</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Choose your preferred currency
              </Text>
              
              {currencyOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    settings.currency === option.key && { backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => {
                    handleCurrencyChange(option.key);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText, 
                    { color: theme.text },
                    settings.currency === option.key && { color: theme.primary, fontWeight: '600' }
                  ]}>
                    {option.label}
                  </Text>
                  {settings.currency === option.key && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Measurement Selection Modal */}
      <Modal
        visible={showMeasurementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMeasurementModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowMeasurementModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Select Measurement Unit</Text>
              <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                Choose your preferred measurement system
              </Text>
              
              {measurementOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.modalOption,
                    { borderBottomColor: theme.border },
                    settings.measurementUnit === option.key && { backgroundColor: theme.primary + '20' }
                  ]}
                  onPress={() => {
                    handleMeasurementChange(option.key as any);
                    setShowMeasurementModal(false);
                  }}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={[
                      styles.modalOptionText, 
                      { color: theme.text },
                      settings.measurementUnit === option.key && { color: theme.primary, fontWeight: '600' }
                    ]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.modalOptionDescription, { color: theme.textSecondary }]}>
                      {option.description}
                    </Text>
                  </View>
                  {settings.measurementUnit === option.key && (
                    <Ionicons name="checkmark" size={20} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: spacing.sm,
    padding: spacing.sm,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  appVersion: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  themeGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  themeOption: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  themeOptionText: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontSize: fontSize.sm,
  },
  optionDescription: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  settingValueText: {
    fontSize: fontSize.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  notificationContent: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: fontSize.sm,
  },
  notificationDescription: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  actionContent: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  actionLabel: {
    fontSize: fontSize.sm,
  },
  actionDescription: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  aboutText: {
    fontSize: fontSize.xs,
    lineHeight: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: fontSize.md,
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionDescription: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
});