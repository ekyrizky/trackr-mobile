import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay, subDays, isToday, isSameDay } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useHabits } from '../../contexts/HabitsContext';
import { HABIT_CATEGORIES } from '../../types/habits';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';


export default function HabitDetails() {
  const { habitId } = useLocalSearchParams<{ habitId: string }>();
  const { theme } = useTheme();
  const {
    habits,
    habitEntries,
    calculateHabitStreak,
    getHabitEntry,
    markHabitComplete,
    markHabitIncomplete,
    deleteHabit,
    getHabitCompletionRate,
  } = useHabits();
  
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()));
  
  const habit = habits.find(h => h.id === habitId);
  
  // Recent activity (last 7 days)
  const recentActivity = useMemo(() => {
    if (!habit || !habitId) return [];
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const entry = getHabitEntry(habitId, date);
      days.push({
        date,
        isCompleted: entry?.completed || false,
        dayName: format(date, 'EEE'),
      });
    }
    return days;
  }, [habitId, getHabitEntry, habit]);
  
  if (!habit) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={64} color={theme.error} />
          <Text style={[styles.errorTitle, { color: theme.text }]}>Habit not found</Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  const category = HABIT_CATEGORIES.find(c => c.id === habit.category);
  const streak = calculateHabitStreak(habitId);
  const completionRate7Days = getHabitCompletionRate(habitId, 7);
  const completionRate30Days = getHabitCompletionRate(habitId, 30);
  
  
  const handleEdit = () => {
    router.push(`/habits/add-habit?habitId=${habitId}`);
  };

  const handleIncrementCount = async () => {
    const today = startOfDay(new Date());
    const newCount = Math.min(todayCount + 1, habit.targetCount);
    
    try {
      await markHabitComplete(habitId, today, newCount);
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit count');
    }
  };

  const handleDecrementCount = async () => {
    const today = startOfDay(new Date());
    const newCount = Math.max(todayCount - 1, 0);
    
    try {
      if (newCount === 0) {
        await markHabitIncomplete(habitId, today);
      } else {
        await markHabitComplete(habitId, today, newCount);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit count');
    }
  };

  const handleToggleComplete = async () => {
    const today = startOfDay(new Date());
    
    try {
      if (isTodayCompleted) {
        await markHabitIncomplete(habitId, today);
      } else {
        await markHabitComplete(habitId, today, habit.targetCount);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update habit');
    }
  };
  
  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      `Are you sure you want to delete "${habit.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habitId);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };
  
  const todayEntry = getHabitEntry(habitId, selectedDate);
  const isTodayCompleted = todayEntry?.completed || false;
  const todayCount = todayEntry?.count || 0;
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <Card style={styles.headerCard}>
        <View style={styles.habitHeader}>
          <View
            style={[
              styles.habitIcon,
              { backgroundColor: habit.color },
            ]}
          >
            <Ionicons
              name={habit.icon as any}
              size={32}
              color="white"
            />
          </View>
          <View style={styles.habitInfo}>
            <Text style={[styles.habitName, { color: theme.text }]}>
              {habit.name}
            </Text>
            <Text style={[styles.habitCategory, { color: theme.textSecondary }]}>
              {category?.name}
              {habit.targetCount > 1 && ` • Target: ${habit.targetCount}`}
            </Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.primary }]}
              onPress={handleEdit}
            >
              <Ionicons name="pencil" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.error }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Card>
      
      {/* Today's Status */}
      {isToday(selectedDate) && (
        <Card style={styles.todayCard}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today</Text>
          
          {habit.targetCount === 1 ? (
            /* Simple Complete/Incomplete for single target */
            <TouchableOpacity
              style={[
                styles.completeButton,
                {
                  backgroundColor: isTodayCompleted ? theme.success : theme.surface,
                  borderColor: theme.border,
                },
              ]}
              onPress={handleToggleComplete}
            >
              <Ionicons
                name={isTodayCompleted ? 'checkmark-circle' : 'checkmark-circle-outline'}
                size={32}
                color={isTodayCompleted ? 'white' : theme.textSecondary}
              />
              <Text
                style={[
                  styles.completeButtonText,
                  { color: isTodayCompleted ? 'white' : theme.text },
                ]}
              >
                {isTodayCompleted ? 'Completed' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          ) : (
            /* Count-based habit with increment/decrement */
            <View style={styles.countContainer}>
              <View style={styles.countHeader}>
                <Text style={[styles.countProgress, { color: theme.text }]}>
                  {todayCount} / {habit.targetCount}
                </Text>
                <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { 
                        backgroundColor: theme.habitsAccent,
                        width: `${Math.min((todayCount / habit.targetCount) * 100, 100)}%`
                      }
                    ]} 
                  />
                </View>
              </View>
              
              <View style={styles.countControls}>
                <TouchableOpacity
                  style={[
                    styles.countButton,
                    { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: todayCount <= 0 ? 0.5 : 1
                    }
                  ]}
                  onPress={handleDecrementCount}
                  disabled={todayCount <= 0}
                >
                  <Ionicons name="remove" size={20} color={theme.text} />
                </TouchableOpacity>
                
                <View style={styles.countValueContainer}>
                  <Text style={[styles.countValueLarge, { color: theme.text }]}>
                    {todayCount}
                  </Text>
                  <Text style={[styles.countLabel, { color: theme.textSecondary }]}>
                    {todayCount === 1 ? 'time' : 'times'}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.countButton,
                    { 
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      opacity: todayCount >= habit.targetCount ? 0.5 : 1
                    }
                  ]}
                  onPress={handleIncrementCount}
                  disabled={todayCount >= habit.targetCount}
                >
                  <Ionicons name="add" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              {isTodayCompleted && (
                <View style={styles.completedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                  <Text style={[styles.completedText, { color: theme.success }]}>
                    Target reached!
                  </Text>
                </View>
              )}
            </View>
          )}
        </Card>
      )}
      
      {/* Statistics */}
      <Card style={styles.statsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Statistics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.habitsAccent }]}>
              {streak.currentStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.warning }]}>
              {streak.longestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success }]}>
              {Math.round(completionRate7Days)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>7-Day Rate</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {Math.round(completionRate30Days)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>30-Day Rate</Text>
          </View>
        </View>
      </Card>
      
      {/* Recent Activity */}
      <Card style={styles.activityCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity (7 Days)</Text>
        <View style={styles.recentActivity}>
          {recentActivity.map(({ date, isCompleted, dayName }) => (
            <View key={date.toISOString()} style={styles.activityDay}>
              <Text style={[styles.activityDayName, { color: theme.textSecondary }]}>
                {dayName}
              </Text>
              <View
                style={[
                  styles.activityDayCircle,
                  {
                    backgroundColor: isCompleted ? theme.success : theme.surface,
                    borderColor: isCompleted ? theme.success : theme.border,
                  },
                ]}
              >
                {isCompleted && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </View>
              <Text style={[styles.activityDate, { color: theme.textSecondary }]}>
                {format(date, 'd')}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  errorState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  headerCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  habitCategory: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  todayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: spacing.md,
  },
  completeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  countContainer: {
    gap: spacing.md,
  },
  countHeader: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  countProgress: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  countControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  countButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValueContainer: {
    alignItems: 'center',
    minWidth: 80,
  },
  countValueLarge: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  countLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  completedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  completedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  activityCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  recentActivity: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityDay: {
    alignItems: 'center',
    flex: 1,
  },
  activityDayName: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  activityDayCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  activityCount: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  activityDate: {
    fontSize: fontSize.xs,
  },
});