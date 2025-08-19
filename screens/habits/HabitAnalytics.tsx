import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useHabits } from '../../contexts/HabitsContext';
import { HABIT_CATEGORIES } from '../../types/habits';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - spacing.md * 4;

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  maxValue: number;
  height?: number;
}

function BarChart({ data, maxValue, height = 120 }: BarChartProps) {
  const { theme } = useTheme();
  const barWidth = chartWidth / data.length - spacing.xs;
  
  return (
    <View style={[styles.chart, { height }]}>
      {data.map((item, index) => {
        const barHeight = maxValue > 0 ? (item.value / maxValue) * (height - 40) : 0;
        return (
          <View key={index} style={styles.barContainer}>
            <View style={styles.barWrapper}>
              <View
                style={[
                  styles.bar,
                  {
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: item.color || theme.habitsAccent,
                  },
                ]}
              />
              <Text style={[styles.barValue, { color: theme.text }]}>
                {item.value > 0 ? Math.round(item.value) : ''}
              </Text>
            </View>
            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>
              {item.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface ProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
}

function ProgressRing({ progress, size, strokeWidth, color, backgroundColor }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = `${circumference} ${circumference}`;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: backgroundColor,
          },
        ]}
      >
        <View
          style={[
            styles.progressRingFill,
            {
              width: size - strokeWidth * 2,
              height: size - strokeWidth * 2,
              borderRadius: (size - strokeWidth * 2) / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderTopColor: 'transparent',
              borderRightColor: progress < 25 ? 'transparent' : color,
              borderBottomColor: progress < 50 ? 'transparent' : color,
              borderLeftColor: progress < 75 ? 'transparent' : color,
              transform: [{ rotate: `${(progress / 100) * 360}deg` }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export default function HabitAnalytics() {
  const { theme } = useTheme();
  const { habits, habitEntries, calculateHabitStreak, getHabitCompletionRate } = useHabits();
  
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  
  // Overall statistics
  const overallStats = useMemo(() => {
    const totalHabits = habits.length;
    const activeHabits = habits.filter(h => {
      const streak = calculateHabitStreak(h.id);
      return streak.currentStreak > 0;
    }).length;
    
    const completionRates = habits.map(h => getHabitCompletionRate(h.id, 30));
    const avgCompletionRate = completionRates.length > 0 
      ? completionRates.reduce((sum, rate) => sum + rate, 0) / completionRates.length 
      : 0;
    
    const bestStreak = Math.max(
      ...habits.map(h => calculateHabitStreak(h.id).longestStreak),
      0
    );
    
    return {
      totalHabits,
      activeHabits,
      avgCompletionRate,
      bestStreak,
    };
  }, [habits, calculateHabitStreak, getHabitCompletionRate]);
  
  // Category breakdown
  const categoryStats = useMemo(() => {
    const categoryData: Record<string, { count: number; completionRate: number }> = {};
    
    habits.forEach(habit => {
      if (!categoryData[habit.category]) {
        categoryData[habit.category] = { count: 0, completionRate: 0 };
      }
      categoryData[habit.category].count++;
      categoryData[habit.category].completionRate += getHabitCompletionRate(habit.id, 30);
    });
    
    return Object.entries(categoryData).map(([categoryId, data]) => {
      const category = HABIT_CATEGORIES.find(c => c.id === categoryId);
      return {
        id: categoryId,
        name: category?.name || categoryId,
        color: category?.color || theme.habitsAccent,
        count: data.count,
        avgCompletionRate: data.completionRate / data.count,
      };
    }).sort((a, b) => b.avgCompletionRate - a.avgCompletionRate);
  }, [habits, getHabitCompletionRate, theme.habitsAccent]);
  
  // Weekly completion data
  const weeklyData = useMemo(() => {
    const days = timeRange === 'week' ? 7 : 30;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const completedCount = habitEntries.filter(entry => 
        format(entry.date, 'yyyy-MM-dd') === dateStr && entry.completed
      ).length;
      
      const totalPossible = habits.length;
      const completionRate = totalPossible > 0 ? (completedCount / totalPossible) * 100 : 0;
      
      data.push({
        label: timeRange === 'week' ? format(date, 'EEE') : format(date, 'd'),
        value: completionRate,
        completedCount,
        totalPossible,
      });
    }
    
    return data;
  }, [habits, habitEntries, timeRange]);
  
  // Top performing habits
  const topHabits = useMemo(() => {
    return habits
      .map(habit => {
        const streak = calculateHabitStreak(habit.id);
        const completionRate = getHabitCompletionRate(habit.id, 30);
        const category = HABIT_CATEGORIES.find(c => c.id === habit.category);
        
        return {
          ...habit,
          streak: streak.currentStreak,
          longestStreak: streak.longestStreak,
          completionRate,
          categoryColor: category?.color || theme.habitsAccent,
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate)
      .slice(0, 5);
  }, [habits, calculateHabitStreak, getHabitCompletionRate, theme.habitsAccent]);
  
  if (habits.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
            No analytics yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            Create some habits to see your analytics
          </Text>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: theme.habitsAccent }]}
            onPress={() => router.push('/habits/add-habit')}
          >
            <Text style={styles.createButtonText}>Create First Habit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Overall Statistics */}
      <Card style={styles.statsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Overview</Text>
        <View style={styles.overallStats}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.habitsAccent }]}>
              {overallStats.totalHabits}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Habits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.success }]}>
              {overallStats.activeHabits}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Active Streaks</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {Math.round(overallStats.avgCompletionRate)}%
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Avg Completion</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.warning }]}>
              {overallStats.bestStreak}
            </Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Best Streak</Text>
          </View>
        </View>
      </Card>
      
      {/* Time Range Toggle */}
      <Card style={styles.timeRangeCard}>
        <View style={styles.timeRangeToggle}>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              {
                backgroundColor: timeRange === 'week' ? theme.habitsAccent : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setTimeRange('week')}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                { color: timeRange === 'week' ? 'white' : theme.text },
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.timeRangeButton,
              {
                backgroundColor: timeRange === 'month' ? theme.habitsAccent : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setTimeRange('month')}
          >
            <Text
              style={[
                styles.timeRangeButtonText,
                { color: timeRange === 'month' ? 'white' : theme.text },
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
      
      {/* Completion Rate Chart */}
      <Card style={styles.chartCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Daily Completion Rate ({timeRange === 'week' ? 'Last 7 Days' : 'Last 30 Days'})
        </Text>
        <BarChart
          data={weeklyData.map(item => ({
            label: item.label,
            value: item.value,
            color: theme.habitsAccent,
          }))}
          maxValue={100}
          height={150}
        />
        <View style={styles.chartLegend}>
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>
            Average: {Math.round(weeklyData.reduce((sum, item) => sum + item.value, 0) / weeklyData.length)}%
          </Text>
        </View>
      </Card>
      
      {/* Category Performance */}
      <Card style={styles.categoryCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Category Performance</Text>
        {categoryStats.map((category, index) => (
          <View key={category.id} style={styles.categoryItem}>
            <View style={styles.categoryInfo}>
              <View
                style={[
                  styles.categoryIndicator,
                  { backgroundColor: category.color },
                ]}
              />
              <View style={styles.categoryDetails}>
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.name}
                </Text>
                <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
                  {category.count} habit{category.count !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
            <View style={styles.categoryPerformance}>
              <ProgressRing
                progress={category.avgCompletionRate}
                size={40}
                strokeWidth={4}
                color={category.color}
                backgroundColor={theme.border}
              />
              <Text style={[styles.categoryRate, { color: theme.text }]}>
                {Math.round(category.avgCompletionRate)}%
              </Text>
            </View>
          </View>
        ))}
      </Card>
      
      {/* Top Habits */}
      <Card style={styles.topHabitsCard}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Top Performing Habits</Text>
        {topHabits.map((habit, index) => (
          <TouchableOpacity
            key={habit.id}
            style={[
              styles.topHabitItem,
              { borderBottomColor: theme.border },
              index === topHabits.length - 1 && { borderBottomWidth: 0 },
            ]}
            onPress={() => router.push(`/habits/details?habitId=${habit.id}`)}
          >
            <View style={styles.topHabitRank}>
              <Text style={[styles.rankNumber, { color: theme.textSecondary }]}>
                #{index + 1}
              </Text>
            </View>
            <View
              style={[
                styles.topHabitIcon,
                { backgroundColor: habit.color },
              ]}
            >
              <Ionicons
                name={habit.icon as any}
                size={20}
                color="white"
              />
            </View>
            <View style={styles.topHabitInfo}>
              <Text style={[styles.topHabitName, { color: theme.text }]}>
                {habit.name}
              </Text>
              <Text style={[styles.topHabitStats, { color: theme.textSecondary }]}>
                {Math.round(habit.completionRate)}% • Streak: {habit.streak}
              </Text>
            </View>
            <View style={styles.topHabitPerformance}>
              <Text style={[styles.completionRate, { color: theme.success }]}>
                {Math.round(habit.completionRate)}%
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </Card>
      
      {/* Quick Actions */}
      <Card style={styles.actionsCard}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.habitsAccent, borderColor: theme.border },
          ]}
          onPress={() => router.push('/habits')}
        >
          <Ionicons name="list" size={20} color="white" />
          <Text style={styles.actionButtonText}>View All Habits</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: theme.primary, borderColor: theme.border },
          ]}
          onPress={() => router.push('/habits/add-habit')}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.actionButtonText}>Add New Habit</Text>
        </TouchableOpacity>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  createButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 6,
  },
  createButtonText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statsCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  overallStats: {
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
  timeRangeCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  timeRangeToggle: {
    flexDirection: 'row',
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: spacing.xs,
    borderRadius: 6,
  },
  timeRangeButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  chartCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  barContainer: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingBottom: 20,
  },
  bar: {
    borderRadius: 2,
    marginBottom: spacing.xs,
  },
  barValue: {
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  barLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  chartLegend: {
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  categoryCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.md,
  },
  categoryDetails: {
    flex: 1,
  },
  categoryName: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  categoryPerformance: {
    alignItems: 'center',
  },
  categoryRate: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  progressRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRingFill: {
    position: 'absolute',
  },
  topHabitsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  topHabitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  topHabitRank: {
    width: 30,
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: fontSize.sm,
    fontWeight: 'bold',
  },
  topHabitIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  topHabitInfo: {
    flex: 1,
  },
  topHabitName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  topHabitStats: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  topHabitPerformance: {
    alignItems: 'center',
  },
  completionRate: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  actionsCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  actionButtonText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});