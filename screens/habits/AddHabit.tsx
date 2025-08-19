import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useTheme } from '../../contexts/ThemeContext';
import { useHabits } from '../../contexts/HabitsContext';
import { HABIT_CATEGORIES } from '../../types/habits';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';

const habitSchema = z.object({
  name: z.string().min(1, 'Habit name is required').max(50, 'Name too long'),
  category: z.string().min(1, 'Category is required'),
  frequency: z.enum(['daily']),
  targetCount: z.number().min(1, 'Target count must be at least 1').max(20, 'Target count too high'),
  color: z.string().min(1, 'Color is required'),
  icon: z.string().min(1, 'Icon is required'),
});

type HabitForm = z.infer<typeof habitSchema>;

const HABIT_COLORS = [
  '#FF3B30', '#FF9500', '#FFCC02', '#34C759',
  '#30D158', '#40C8E0', '#007AFF', '#5856D6',
  '#AF52DE', '#FF2D55', '#8E8E93', '#636366',
];

const HABIT_ICONS = [
  'heart', 'fitness', 'book', 'time', 'medkit',
  'bicycle', 'nutrition', 'bed', 'water',
  'walk', 'musical-notes', 'camera', 'leaf',
  'brush', 'code', 'calculator', 'call',
  'mail', 'chatbubble', 'game-controller',
];

export default function AddHabit() {
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const { theme } = useTheme();
  const { addHabit, updateHabit, habits } = useHabits();
  
  const [isLoading, setIsLoading] = useState(false);
  
  const isEditing = !!habitId;
  
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HabitForm>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      frequency: 'daily',
      targetCount: 1,
      color: HABIT_COLORS[0],
      icon: HABIT_ICONS[0],
    },
  });

  const watchedValues = watch();

  useEffect(() => {
    if (isEditing && habitId) {
      const habit = habits.find(h => h.id === habitId);
      if (habit) {
        setValue('name', habit.name);
        setValue('category', habit.category);
        setValue('frequency', habit.frequency);
        setValue('targetCount', habit.targetCount);
        setValue('color', habit.color);
        setValue('icon', habit.icon);
      }
    }
  }, [isEditing, habitId, habits, setValue]);

  const onSubmit = async (data: HabitForm) => {
    try {
      setIsLoading(true);
      
      if (isEditing && habitId) {
        await updateHabit(habitId, data);
      } else {
        await addHabit(data);
      }
      
      router.back();
    } catch (error) {
      console.error('Error saving habit:', error);
      Alert.alert('Error', `Failed to save habit: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (habitId) {
              try {
                await useHabits().deleteHabit(habitId);
                router.back();
              } catch (error) {
                Alert.alert('Error', 'Failed to delete habit');
              }
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={styles.card}>
        {/* Habit Name */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Habit Name"
              value={value}
              onChangeText={onChange}
              placeholder="e.g., Drink water, Exercise, Read"
              error={errors.name?.message}
              required
            />
          )}
        />

        {/* Category Selection */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          Category <Text style={{ color: theme.error }}>*</Text>
        </Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoriesGrid}>
              {HABIT_CATEGORIES.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: value === category.id ? category.color : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => onChange(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={value === category.id ? 'white' : theme.text}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: value === category.id ? 'white' : theme.text },
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        />
        {errors.category && (
          <Text style={[styles.error, { color: theme.error }]}>
            {errors.category.message}
          </Text>
        )}

        {/* Frequency - Currently only daily habits are supported */}
        <Controller
          control={control}
          name="frequency"
          render={({ field: { value } }) => {
            // Hidden field - always set to 'daily'
            return null;
          }}
        />

        {/* Target Count */}
        <Controller
          control={control}
          name="targetCount"
          render={({ field: { onChange, value } }) => (
            <View>
              <Text style={[styles.sectionLabel, { color: theme.text }]}>Target Count</Text>
              <View style={styles.targetCountContainer}>
                <TouchableOpacity
                  style={[styles.countButton, { borderColor: theme.border }]}
                  onPress={() => onChange(Math.max(1, value - 1))}
                >
                  <Ionicons name="remove" size={20} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.countValue, { color: theme.text }]}>{value}</Text>
                <TouchableOpacity
                  style={[styles.countButton, { borderColor: theme.border }]}
                  onPress={() => onChange(Math.min(20, value + 1))}
                >
                  <Ionicons name="add" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.targetHint, { color: theme.textSecondary }]}>Reps per day</Text>
            </View>
          )}
        />

        {/* Color Selection */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>Color</Text>
        <Controller
          control={control}
          name="color"
          render={({ field: { onChange, value } }) => (
            <View style={styles.colorsGrid}>
              {HABIT_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorItem,
                    { backgroundColor: color },
                    value === color && { borderWidth: 3, borderColor: theme.text },
                  ]}
                  onPress={() => onChange(color)}
                >
                  {value === color && (
                    <Ionicons name="checkmark" size={20} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {/* Icon Selection */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>Icon</Text>
        <Controller
          control={control}
          name="icon"
          render={({ field: { onChange, value } }) => (
            <View style={styles.iconsGrid}>
              {HABIT_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconItem,
                    {
                      backgroundColor: value === icon ? watchedValues.color : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => onChange(icon)}
                >
                  <Ionicons
                    name={icon as any}
                    size={24}
                    color={value === icon ? 'white' : theme.text}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        />

        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Preview</Text>
          <View style={styles.previewHabit}>
            <View
              style={[
                styles.previewIcon,
                { backgroundColor: watchedValues.color },
              ]}
            >
              <Ionicons
                name={watchedValues.icon as any}
                size={20}
                color="white"
              />
            </View>
            <View style={styles.previewInfo}>
              <Text style={[styles.previewName, { color: theme.text }]}>
                {watchedValues.name || 'Habit Name'}
              </Text>
              <Text style={[styles.previewDetails, { color: theme.textSecondary }]}>
                {watchedValues.category} • {watchedValues.frequency}
                {watchedValues.targetCount > 1 && ` • Target: ${watchedValues.targetCount}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <Button
          title={isEditing ? 'Update Habit' : 'Create Habit'}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={styles.submitButton}
        />

        {isEditing && (
          <Button
            title="Delete Habit"
            onPress={handleDelete}
            variant="outline"
            style={[styles.deleteButton, { borderColor: theme.error }]}
            textStyle={{ color: theme.error }}
          />
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  categoryItem: {
    width: '31%',
    padding: spacing.sm,
    margin: '1%',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70,
  },
  categoryText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  frequencyToggle: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
  },
  frequencyButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  targetCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  countButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginHorizontal: spacing.lg,
    minWidth: 40,
    textAlign: 'center',
  },
  targetHint: {
    fontSize: fontSize.xs,
    textAlign: 'center',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  iconItem: {
    width: 50,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    margin: spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: spacing.md,
  },
  previewLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  previewHabit: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  previewDetails: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  error: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
});