import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  Animated,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfDay } from 'date-fns';
import { PanGestureHandler, State, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';

import { useTheme } from '../../contexts/ThemeContext';
import { useHabits } from '../../contexts/HabitsContext';
import { Habit, HABIT_CATEGORIES } from '../../types/habits';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';

interface HabitItemProps {
  habit: Habit;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  isCompleted: boolean;
  currentCount: number;
  streak: number;
  showTodayToggle?: boolean;
}

function HabitItem({ habit, onPress, onEdit, onDelete, onToggle, isCompleted, currentCount, streak, showTodayToggle = false }: HabitItemProps) {
  const { theme } = useTheme();
  const [showActions, setShowActions] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const category = HABIT_CATEGORIES.find(c => c.id === habit.category);

  const showActionOverlay = () => {
    setShowActions(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideActionOverlay = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowActions(false);
    });
  };

  const handleDropdownPress = (e: any) => {
    e.stopPropagation();
    if (showActions) {
      hideActionOverlay();
    } else {
      showActionOverlay();
    }
  };

  return (
    <View style={styles.habitItemContainer}>
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          style={[
            styles.habitItem,
            { 
              backgroundColor: theme.surface, 
              borderColor: theme.border,
              opacity: showActions ? 0.8 : 1,
            },
          ]}
          onPress={onPress}
          activeOpacity={0.7}
        >
          {/* Prominent Checkbox */}
          {showTodayToggle && (
            <TouchableOpacity
              style={[
                styles.habitCheckbox,
                {
                  backgroundColor: isCompleted ? theme.success : theme.surface,
                  borderColor: isCompleted ? theme.success : theme.border,
                }
              ]}
              onPress={(e) => {
                e.stopPropagation();
                onToggle();
              }}
            >
              {isCompleted && (
                <Ionicons
                  name="checkmark"
                  size={16}
                  color="white"
                />
              )}
            </TouchableOpacity>
          )}
          
          <View
            style={[
              styles.habitIcon,
              { backgroundColor: habit.color },
            ]}
          >
            <Ionicons
              name={habit.icon as any}
              size={20}
              color="white"
            />
          </View>
          
          <View style={styles.habitInfo}>
            <Text style={[
              styles.habitName,
              { 
                color: isCompleted && showTodayToggle ? theme.textSecondary : theme.text,
                textDecorationLine: isCompleted && showTodayToggle ? 'line-through' : 'none'
              }
            ]}>
              {habit.name}
            </Text>
            <Text style={[styles.habitDetails, { color: theme.textSecondary }]}>
              {category?.name}
              {habit.targetCount > 1 && ` • ${currentCount}/${habit.targetCount} completed`}
            </Text>
          </View>
          
          <View style={styles.habitStats}>
            {isCompleted && !showTodayToggle && (
              <View style={styles.completedBadge}>
                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
              </View>
            )}
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={14} color={theme.warning} />
                <Text style={[styles.streakText, { color: theme.warning }]}>
                  {streak}
                </Text>
              </View>
            )}
            <TouchableOpacity
              onPress={handleDropdownPress}
              style={styles.dropdownButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons 
                name={showActions ? "chevron-up" : "chevron-down"} 
                size={20} 
                color={theme.textSecondary} 
              />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
      
      {/* Action Overlay */}
      {showActions && (
        <Animated.View
          style={[
            styles.actionOverlay,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
              opacity: fadeAnim,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionOverlayButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              hideActionOverlay();
              onEdit();
            }}
          >
            <Ionicons name="pencil" size={16} color="white" />
            <Text style={styles.actionOverlayText}>Edit</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionOverlayButton, { backgroundColor: theme.error }]}
            onPress={() => {
              hideActionOverlay();
              onDelete();
            }}
          >
            <Ionicons name="trash" size={16} color="white" />
            <Text style={styles.actionOverlayText}>Delete</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

export default function HabitsDashboard() {
  const { theme } = useTheme();
  const { habits, markHabitComplete, markHabitIncomplete, getTodaysHabits, calculateHabitStreak, getHabitEntry, deleteHabit } = useHabits();
  
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'streak'>('name');
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const todaysHabits = getTodaysHabits();
  
  // Calculate progress giving equal weight to each habit regardless of rep count
  const habitProgressList = todaysHabits.map(h => (h.count / h.habit.targetCount) * 100);
  const completionPercentage = todaysHabits.length > 0 
    ? habitProgressList.reduce((sum, progress) => sum + progress, 0) / todaysHabits.length 
    : 0;
    
  const completedHabits = todaysHabits.filter(h => h.completed).length;
  const totalHabits = todaysHabits.length;
  const today = startOfDay(new Date());

  const handleHabitToggle = async (habitId: string, isCompleted: boolean, currentCount: number, targetCount: number) => {
    try {
      if (targetCount === 1) {
        // Simple toggle for single-target habits
        if (isCompleted) {
          await markHabitIncomplete(habitId, today);
        } else {
          await markHabitComplete(habitId, today, 1);
        }
      } else {
        // Multi-rep habits: complete all reps or reset to 0
        if (isCompleted) {
          // If already completed, reset to 0
          await markHabitIncomplete(habitId, today);
        } else {
          // Complete all remaining reps instantly
          await markHabitComplete(habitId, today, targetCount);
        }
      }
    } catch (error) {
      console.error('Error toggling habit:', error);
    }
  };

  const getStreakInfo = (habitId: string) => {
    return calculateHabitStreak(habitId);
  };

  const filteredAndSortedHabits = useMemo(() => {
    let filtered = habits.filter(habit => {
      const matchesSearch = habit.name.toLowerCase().includes(searchText.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || habit.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'streak':
          const streakA = calculateHabitStreak(a.id).currentStreak;
          const streakB = calculateHabitStreak(b.id).currentStreak;
          return streakB - streakA;
        default:
          return 0;
      }
    });
  }, [habits, searchText, selectedCategory, sortBy, calculateHabitStreak]);

  const handleHabitPress = (habitId: string) => {
    router.push(`/habits/details?habitId=${habitId}`);
  };
  
  const handleEditHabit = (habitId: string) => {
    router.push(`/habits/add-habit?habitId=${habitId}`);
  };
  
  const handleDeleteHabit = (habit: Habit) => {
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
              await deleteHabit(habit.id);
            } catch (error) {
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  const renderHabitItem = ({ item: habit }: { item: Habit }) => {
    const entry = getHabitEntry(habit.id, today);
    const isCompleted = entry?.completed || false;
    const currentCount = entry?.count || 0;
    const streak = calculateHabitStreak(habit.id).currentStreak;
    
    return (
      <HabitItem
        habit={habit}
        onPress={() => handleHabitPress(habit.id)}
        onEdit={() => handleEditHabit(habit.id)}
        onDelete={() => handleDeleteHabit(habit)}
        onToggle={() => handleHabitToggle(habit.id, isCompleted, currentCount, habit.targetCount)}
        isCompleted={isCompleted}
        currentCount={currentCount}
        streak={streak}
        showTodayToggle={true}
      />
    );
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
        {/* Today's Progress */}
        <Card style={[styles.progressCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.progressTitle, { color: theme.text }]}>Today's Progress</Text>
          <View style={styles.progressStats}>
            <View style={styles.progressCircle}>
              <Text style={[styles.progressPercentage, { color: theme.habitsAccent }]}>
                {Math.round(completionPercentage)}%
              </Text>
              <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                {completedHabits} of {totalHabits} habits
              </Text>
            </View>
            <View style={styles.progressDetails}>
              <View style={styles.progressItem}>
                <Text style={[styles.progressValue, { color: theme.success }]}>
                  {completedHabits}
                </Text>
                <Text style={[styles.progressItemLabel, { color: theme.textSecondary }]}>
                  Habits Done
                </Text>
              </View>
              <View style={styles.progressItem}>
                <Text style={[styles.progressValue, { color: theme.textSecondary }]}>
                  {totalHabits - completedHabits}
                </Text>
                <Text style={[styles.progressItemLabel, { color: theme.textSecondary }]}>
                  Remaining
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Quick Stats */}
        {habits.length > 0 && (
          <View style={styles.statsGrid}>
            <Card style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {habits.length}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Total Habits
              </Text>
            </Card>
            
            <Card style={[styles.statCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {Math.max(...habits.map(h => calculateHabitStreak(h.id).longestStreak), 0)}
              </Text>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                Best Streak
              </Text>
            </Card>
          </View>
        )}

        {/* Quick Actions */}
        {habits.length > 0 && (
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickActionButton, { backgroundColor: theme.habitsAccent }]}
              onPress={() => router.push('/habits/add-habit')}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.quickActionText}>New Habit</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search and Filters */}
        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="search" size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search habits..."
              placeholderTextColor={theme.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setShowFilterModal(true)}
          >
            <Ionicons 
              name="filter" 
              size={20} 
              color={selectedCategory !== 'all' || sortBy !== 'name' ? theme.habitsAccent : theme.textSecondary} 
            />
            {(selectedCategory !== 'all' || sortBy !== 'name') && (
              <View style={[styles.filterDot, { backgroundColor: theme.habitsAccent }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Results Count */}
        {habits.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={[styles.resultsText, { color: theme.textSecondary }]}>
              {filteredAndSortedHabits.length} of {habits.length} habits
            </Text>
          </View>
        )}

        {/* Habits List */}
        {filteredAndSortedHabits.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="list-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>
              {searchText || selectedCategory !== 'all' ? 'No matching habits' : 'No habits yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchText || selectedCategory !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first habit to get started'}
            </Text>
            {!searchText && selectedCategory === 'all' && (
              <TouchableOpacity
                style={[styles.createButton, { backgroundColor: theme.habitsAccent }]}
                onPress={() => router.push('/habits/add-habit')}
              >
                <Text style={styles.createButtonText}>Create Habit</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.habitsList}>
            {filteredAndSortedHabits.map((habit) => {
              const entry = getHabitEntry(habit.id, today);
              const isCompleted = entry?.completed || false;
              const currentCount = entry?.count || 0;
              const streak = calculateHabitStreak(habit.id).currentStreak;
              
              return (
                <HabitItem
                  key={habit.id}
                  habit={habit}
                  onPress={() => handleHabitPress(habit.id)}
                  onEdit={() => handleEditHabit(habit.id)}
                  onDelete={() => handleDeleteHabit(habit)}
                  onToggle={() => handleHabitToggle(habit.id, isCompleted, currentCount, habit.targetCount)}
                  isCompleted={isCompleted}
                  currentCount={currentCount}
                  streak={streak}
                  showTodayToggle={true}
                />
              );
            })}
          </View>
        )}

        {/* Filter Modal */}
        <Modal
          visible={showFilterModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowFilterModal(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          >
            <View 
              style={[styles.modalContent, { backgroundColor: theme.surface }]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Filters & Sort</Text>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Category Filter */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Category</Text>
                <View style={styles.modalCategoryGrid}>
                  <TouchableOpacity
                    style={[
                      styles.modalCategoryItem,
                      {
                        backgroundColor: selectedCategory === 'all' ? theme.habitsAccent : theme.background,
                        borderColor: selectedCategory === 'all' ? theme.habitsAccent : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory('all')}
                  >
                    <Text
                      style={[
                        styles.modalCategoryText,
                        { color: selectedCategory === 'all' ? 'white' : theme.text },
                      ]}
                    >
                      All Categories
                    </Text>
                  </TouchableOpacity>
                  {HABIT_CATEGORIES.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.modalCategoryItem,
                        {
                          backgroundColor: selectedCategory === category.id ? category.color : theme.background,
                          borderColor: selectedCategory === category.id ? category.color : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedCategory(category.id)}
                    >
                      <Ionicons
                        name={category.icon as any}
                        size={20}
                        color={selectedCategory === category.id ? 'white' : theme.text}
                      />
                      <Text
                        style={[
                          styles.modalCategoryText,
                          { color: selectedCategory === category.id ? 'white' : theme.text },
                        ]}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sort Options */}
              <View style={styles.modalSection}>
                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>Sort by</Text>
                <View style={styles.modalSortOptions}>
                  {[
                    { key: 'name', label: 'Name', icon: 'text' },
                    { key: 'category', label: 'Category', icon: 'folder' },
                    { key: 'streak', label: 'Streak', icon: 'flame' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.modalSortItem,
                        {
                          backgroundColor: sortBy === option.key ? theme.habitsAccent : theme.background,
                          borderColor: sortBy === option.key ? theme.habitsAccent : theme.border,
                        },
                      ]}
                      onPress={() => setSortBy(option.key as any)}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={sortBy === option.key ? 'white' : theme.text}
                      />
                      <Text
                        style={[
                          styles.modalSortText,
                          { color: sortBy === option.key ? 'white' : theme.text },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={() => {
                    setSelectedCategory('all');
                    setSortBy('name');
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: theme.text }]}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.habitsAccent }]}
                  onPress={() => setShowFilterModal(false)}
                >
                  <Text style={[styles.modalButtonText, { color: 'white' }]}>Apply</Text>
                </TouchableOpacity>
              </View>
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
  progressCard: {
    margin: spacing.md,
    padding: spacing.lg,
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  progressStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCircle: {
    alignItems: 'center',
    flex: 1,
  },
  progressPercentage: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  progressDetails: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  progressItem: {
    alignItems: 'center',
  },
  progressValue: {
    fontSize: fontSize.xl,
    fontWeight: '600',
  },
  progressItemLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  quickActions: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  searchSection: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalCategoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
  },
  modalCategoryText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  modalSortOptions: {
    gap: spacing.sm,
  },
  modalSortItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.sm,
  },
  modalSortText: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  resultsHeader: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  resultsText: {
    fontSize: fontSize.sm,
  },
  habitItemContainer: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    position: 'relative',
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  habitCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  habitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  habitDetails: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  habitStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  completedBadge: {
    marginRight: spacing.sm,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  streakText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    marginLeft: 2,
  },
  actionOverlay: {
    position: 'absolute',
    top: '50%',
    right: 50,
    transform: [{ translateY: -20 }],
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'white',
    gap: spacing.sm,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  actionOverlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
    minWidth: 70,
    justifyContent: 'center',
  },
  actionOverlayText: {
    color: 'white',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  habitsList: {
    paddingBottom: spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    paddingTop: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    textAlign: 'center',
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
});