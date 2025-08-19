import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useHealth } from '../../contexts/HealthContext';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';

const strengthExerciseSchema = z.object({
  name: z.string().optional(),
  sets: z.string().optional(),
  reps: z.string().optional(),
  weight: z.string().optional(),
});

const exerciseSchema = z.object({
  type: z.enum(['cardio', 'strength']),
  // Cardio fields
  name: z.string().optional(),
  duration: z.string().optional(),
  distance: z.string().optional(),
  // Strength fields  
  exercises: z.array(strengthExerciseSchema).optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'cardio') {
    // Validate cardio fields
    if (!data.name || data.name.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Exercise name is required',
        path: ['name'],
      });
    }
    if (!data.duration || data.duration.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Duration is required',
        path: ['duration'],
      });
    }
  } else if (data.type === 'strength') {
    // Validate strength fields
    if (!data.exercises || data.exercises.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one exercise is required',
        path: ['exercises'],
      });
    } else {
      // Validate each exercise in the array
      data.exercises.forEach((exercise, index) => {
        if (!exercise.name || exercise.name.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Exercise name is required',
            path: ['exercises', index, 'name'],
          });
        }
        if (!exercise.sets || exercise.sets.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Sets required',
            path: ['exercises', index, 'sets'],
          });
        }
        if (!exercise.reps || exercise.reps.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Reps required',
            path: ['exercises', index, 'reps'],
          });
        }
      });
    }
  }
});

type ExerciseForm = z.infer<typeof exerciseSchema>;

export default function ExerciseLog() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { addExercise, updateExercise, deleteExercise, exercises } = useHealth();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const entryId = params.entryId as string | undefined;

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExerciseForm>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      type: 'strength',
      name: '',
      duration: '',
      distance: '',
      exercises: [{ name: '', sets: '', reps: '', weight: '' }],
      notes: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'exercises',
  });

  const watchedType = watch('type');

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  useEffect(() => {
    if (entryId) {
      const entry = exercises.find(e => e.id === entryId);
      if (entry) {
        setIsEditing(true);
        setShowForm(true);
        setValue('type', entry.type);
        setValue('notes', entry.notes || '');
        setSelectedDate(entry.date);
        
        if (entry.type === 'cardio') {
          setValue('name', entry.name);
          setValue('duration', entry.duration?.toString() || '');
          setValue('distance', entry.distance?.toString() || '');
        } else if (entry.type === 'strength' && entry.exercises) {
          setValue('exercises', entry.exercises.map(exercise => ({
            name: exercise.name,
            sets: exercise.sets.toString(),
            reps: exercise.reps.toString(),
            weight: exercise.weight?.toString() || '',
          })));
        }
      }
    }
  }, [entryId, exercises, setValue]);

  const onSubmit = async (data: ExerciseForm) => {
    try {
      setIsLoading(true);
      
      console.log('onSubmit called!');
      console.log('Form data:', data);
      console.log('Form errors:', errors);
      console.log('Selected date:', selectedDate);
      
      let entryData: any = {
        type: data.type,
        date: selectedDate,
        notes: data.notes || undefined,
      };

      if (data.type === 'cardio') {
        entryData.name = data.name;
        entryData.duration = data.duration ? parseInt(data.duration) : undefined;
        entryData.distance = data.distance ? parseFloat(data.distance) : undefined;
      } else {
        entryData.exercises = data.exercises?.map(exercise => ({
          name: exercise.name,
          sets: parseInt(exercise.sets),
          reps: parseInt(exercise.reps),
          weight: exercise.weight ? parseFloat(exercise.weight) : undefined,
        }));
      }

      console.log('Entry data to save:', entryData);

      if (isEditing && entryId) {
        await updateExercise(entryId, entryData);
      } else {
        await addExercise(entryData);
      }
      
      // Reset form and close modal
      reset();
      setShowForm(false);
      setIsEditing(false);
      
      // Clear URL params if editing
      if (entryId) {
        router.back();
      }
    } catch (error) {
      console.error('Exercise save error:', error);
      Alert.alert('Error', `Failed to save exercise: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExerciseEntry = async (id: string) => {
    Alert.alert(
      'Delete Exercise',
      'Are you sure you want to delete this exercise entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExercise(id);
              setShowForm(false);
              setIsEditing(false);
              if (entryId) {
                router.back();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete exercise');
            }
          },
        },
      ]
    );
  };

  return (
    <>
      {/* Main Exercise List View */}
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Exercise Log</Text>
        </View>

        {/* Exercise List */}
        {exercises.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="barbell" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No exercises logged yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start logging your workouts to track your fitness progress
            </Text>
          </Card>
        ) : (
          exercises.map((exercise) => (
            <Card key={exercise.id} style={[styles.exerciseCard, { backgroundColor: theme.surface }]}>
              <View style={styles.exerciseHeader}>
                <View style={styles.exerciseInfo}>
                  <Text style={[styles.exerciseName, { color: theme.text }]}>
                    {exercise.type === 'cardio' 
                      ? exercise.name 
                      : `Strength Training (${exercise.exercises?.length || 0} exercises)`
                    }
                  </Text>
                  <Text style={[styles.exerciseDate, { color: theme.textSecondary }]}>
                    {format(exercise.date, 'MMM dd, yyyy')}
                  </Text>
                </View>
                <View style={styles.exerciseActions}>
                  <Ionicons 
                    name={exercise.type === 'cardio' ? 'heart' : 'barbell'} 
                    size={24} 
                    color={theme.healthAccent} 
                    style={styles.exerciseIcon}
                  />
                  <TouchableOpacity
                    onPress={() => router.push(`/health/exercise-log?entryId=${exercise.id}`)}
                  >
                    <Ionicons name="pencil" size={20} color={theme.healthAccent} />
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.exerciseDetails}>
                {exercise.type === 'cardio' ? (
                  <View style={styles.cardioDetails}>
                    {exercise.duration && (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          Duration
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          {exercise.duration} min
                        </Text>
                      </View>
                    )}
                    {exercise.distance && (
                      <View style={styles.detailItem}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          Distance
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          {exercise.distance} mi/km
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.strengthDetails}>
                    {exercise.exercises?.map((strengthExercise, index) => (
                      <View key={index} style={styles.strengthExerciseItem}>
                        <Text style={[styles.strengthExerciseName, { color: theme.text }]}>
                          {strengthExercise.name}
                        </Text>
                        <View style={styles.strengthInfo}>
                          <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                              Sets
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.text }]}>
                              {strengthExercise.sets}
                            </Text>
                          </View>
                          <View style={styles.detailItem}>
                            <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                              Reps
                            </Text>
                            <Text style={[styles.detailValue, { color: theme.text }]}>
                              {strengthExercise.reps}
                            </Text>
                          </View>
                          {strengthExercise.weight && (
                            <View style={styles.detailItem}>
                              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                                Weight
                              </Text>
                              <Text style={[styles.detailValue, { color: theme.text }]}>
                                {strengthExercise.weight} lbs
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {exercise.notes && (
                <Text style={[styles.exerciseNotes, { color: theme.textSecondary }]}>
                  {exercise.notes}
                </Text>
              )}
            </Card>
          ))
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.healthAccent }]}
        onPress={() => setShowForm(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Exercise Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowForm(false);
          setIsEditing(false);
          if (entryId) {
            router.back();
          }
        }}
      >
        <ScrollView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {isEditing ? 'Edit Exercise' : 'Add Exercise'}
            </Text>
            <TouchableOpacity 
              onPress={() => {
                setShowForm(false);
                setIsEditing(false);
                if (entryId) {
                  router.back();
                }
              }}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Card style={styles.formCard}>
            {/* Date Selection */}
            <TouchableOpacity
              style={[styles.dateButton, { borderColor: theme.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateLabel, { color: theme.text }]}>Date</Text>
              <Text style={[styles.dateValue, { color: theme.healthAccent }]}>
                {format(selectedDate, 'MMM dd, yyyy')}
              </Text>
              <Ionicons name="calendar" size={20} color={theme.textSecondary} />
            </TouchableOpacity>

            {/* Exercise Type Toggle */}
            <View style={styles.typeToggle}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: watchedType === 'strength' ? theme.healthAccent : theme.surface },
                ]}
                onPress={() => setValue('type', 'strength')}
              >
                <Text style={[styles.typeButtonText, { 
                  color: watchedType === 'strength' ? 'white' : theme.text 
                }]}>
                  Strength
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  { backgroundColor: watchedType === 'cardio' ? theme.healthAccent : theme.surface },
                ]}
                onPress={() => setValue('type', 'cardio')}
              >
                <Text style={[styles.typeButtonText, { 
                  color: watchedType === 'cardio' ? 'white' : theme.text 
                }]}>
                  Cardio
                </Text>
              </TouchableOpacity>
            </View>

            {/* Exercise Name - Only for Cardio */}
            {watchedType === 'cardio' && (
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    label="Exercise Name"
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., Running, Cycling"
                    error={errors.name?.message}
                    required
                  />
                )}
              />
            )}

            {/* Cardio Fields */}
            {watchedType === 'cardio' && (
              <View style={styles.cardioInputs}>
                <Controller
                  control={control}
                  name="duration"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Duration (minutes)"
                      value={value}
                      onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      keyboardType="number-pad"
                      required
                    />
                  )}
                />
                
                <Controller
                  control={control}
                  name="distance"
                  render={({ field: { onChange, value } }) => (
                    <Input
                      label="Distance (miles/km)"
                      value={value}
                      onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                      placeholder="0.0"
                      keyboardType="decimal-pad"
                    />
                  )}
                />
              </View>
            )}

            {/* Strength Training Fields */}
            {watchedType === 'strength' && (
              <View style={styles.strengthInputs}>
                <Text style={[styles.exercisesTitle, { color: theme.text }]}>Exercises</Text>

                {fields.map((field, index) => (
                  <View key={field.id} style={styles.exerciseRow}>
                    {/* Exercise Name */}
                    <Controller
                      control={control}
                      name={`exercises.${index}.name`}
                      render={({ field: { onChange, value } }) => (
                        <Input
                          label="Exercise Name"
                          value={value}
                          onChangeText={onChange}
                          placeholder="e.g., Bench Press"
                          error={errors.exercises?.[index]?.name?.message}
                          required
                          style={styles.exerciseNameInput}
                        />
                      )}
                    />
                    
                    {/* Sets, Reps, Weight Row */}
                    <View style={styles.exerciseDetailsRow}>
                      <Controller
                        control={control}
                        name={`exercises.${index}.sets`}
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Sets"
                            value={value}
                            onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                            keyboardType="number-pad"
                            error={errors.exercises?.[index]?.sets?.message}
                            style={styles.setsInput}
                            required
                          />
                        )}
                      />
                      
                      <Controller
                        control={control}
                        name={`exercises.${index}.reps`}
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Reps"
                            value={value}
                            onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
                            placeholder="0"
                            keyboardType="number-pad"
                            error={errors.exercises?.[index]?.reps?.message}
                            style={styles.repsInput}
                            required
                          />
                        )}
                      />
                      
                      <Controller
                        control={control}
                        name={`exercises.${index}.weight`}
                        render={({ field: { onChange, value } }) => (
                          <Input
                            label="Weight (lbs/kg)"
                            value={value}
                            onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                            placeholder="0.0"
                            keyboardType="decimal-pad"
                            style={styles.weightInput}
                          />
                        )}
                      />
                    </View>
                    
                    {/* Remove Exercise Button */}
                    {fields.length > 1 && (
                      <TouchableOpacity
                        onPress={() => remove(index)}
                        style={styles.removeExerciseButton}
                      >
                        <Ionicons name="trash" size={16} color={theme.error} />
                        <Text style={[styles.removeExerciseText, { color: theme.error }]}>
                          Remove Exercise
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Add More Exercise Button */}
                <TouchableOpacity
                  onPress={() => append({ name: '', sets: '', reps: '', weight: '' })}
                  style={[styles.addMoreButton, { backgroundColor: theme.healthAccent }]}
                >
                  <Ionicons name="add" size={16} color="white" />
                  <Text style={styles.addMoreText}>Add More Exercise</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Notes */}
            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Notes"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Optional notes about your workout..."
                  multiline
                  numberOfLines={3}
                />
              )}
            />

            {/* Debug: Show form errors */}
            {Object.keys(errors).length > 0 && (
              <View style={{ padding: 10, backgroundColor: 'red', marginBottom: 10 }}>
                <Text style={{ color: 'white' }}>Form Errors:</Text>
                {Object.entries(errors).map(([key, error]) => (
                  <Text key={key} style={{ color: 'white' }}>
                    {key}: {error?.message || 'Error'}
                  </Text>
                ))}
              </View>
            )}

            {/* Submit Button */}
            <Button
              title={isEditing ? 'Update Exercise' : 'Save Exercise'}
              onPress={() => {
                console.log('Button pressed!');
                console.log('Current form values:', watch());
                console.log('Form errors before submit:', errors);
                handleSubmit(onSubmit)();
              }}
              disabled={isLoading}
              style={styles.submitButton}
            />

            {/* Delete Button for Editing */}
            {isEditing && (
              <Button
                title="Delete Exercise"
                onPress={() => deleteExerciseEntry(entryId)}
                variant="outline"
                style={[styles.deleteButton, { borderColor: theme.error }]}
                textStyle={{ color: theme.error }}
              />
            )}
          </Card>

          {/* Date Picker for Android */}
          {showDatePicker && Platform.OS === 'android' && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Date Picker for iOS */}
          {showDatePicker && Platform.OS === 'ios' && (
            <View style={styles.iosDatePickerContainer}>
              <View style={[styles.iosDatePickerHeader, { backgroundColor: theme.surface }]}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={[styles.iosDatePickerButton, { color: theme.healthAccent }]}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                maximumDate={new Date()}
                style={styles.iosDatePicker}
              />
            </View>
          )}
        </ScrollView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  emptyCard: {
    margin: spacing.md,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  exerciseCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  exerciseDate: {
    fontSize: fontSize.sm,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseIcon: {
    marginRight: spacing.md,
  },
  exerciseDetails: {
    marginBottom: spacing.md,
  },
  cardioDetails: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  detailValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  strengthDetails: {
    gap: spacing.sm,
  },
  strengthExerciseItem: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  strengthExerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  strengthInfo: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  exerciseNotes: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  formCard: {
    margin: spacing.md,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  typeButton: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  cardioInputs: {
    gap: spacing.md,
  },
  strengthInputs: {
    gap: spacing.md,
  },
  exercisesTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  exerciseRow: {
    padding: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  exerciseNameInput: {
    marginBottom: spacing.md,
  },
  exerciseDetailsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  setsInput: {
    width: 80,
  },
  repsInput: {
    width: 80,
  },
  weightInput: {
    flex: 1,
    minWidth: 120,
  },
  removeExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  removeExerciseText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  addMoreText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  iosDatePickerContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  iosDatePickerButton: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  iosDatePicker: {
    backgroundColor: 'white',
  },
});