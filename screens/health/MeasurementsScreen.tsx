import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useHealth } from '../../contexts/HealthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';

const measurementSchema = z.object({
  waist: z.string().optional(),
  chest: z.string().optional(),
  hip: z.string().optional(),
  neck: z.string().optional(),
  bicep: z.string().optional(),
  thigh: z.string().optional(),
}).refine((data) => {
  // At least one measurement is required
  return Object.values(data).some(value => value && value.trim() !== '');
}, {
  message: 'At least one measurement is required',
  path: ['root'], // This will put the error in errors.root
});

type MeasurementForm = z.infer<typeof measurementSchema>;

export default function MeasurementsScreen() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { addBodyMeasurement, updateBodyMeasurement, deleteBodyMeasurement, bodyMeasurements, refreshData, calculateBodyFatFromMeasurements, getLatestHeight, userProfile } = useHealth();
  const { settings } = useSettings();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const entryId = params.entryId as string | undefined;
  const showForm = params.showForm === 'true';

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<MeasurementForm>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      waist: '',
      chest: '',
      hip: '',
      neck: '',
      bicep: '',
      thigh: '',
    },
  });

  // Refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (entryId) {
      const entry = bodyMeasurements.find(m => m.id === entryId);
      if (entry) {
        setIsEditing(true);
        const m = entry.measurements;
        setValue('waist', m.waist?.toString() || '');
        setValue('chest', m.chest?.toString() || '');
        setValue('hip', m.hip?.toString() || '');
        setValue('neck', m.neck?.toString() || '');
        setValue('bicep', m.bicep?.toString() || '');
        setValue('thigh', m.thigh?.toString() || '');
        setSelectedDate(entry.date);
      }
    }
  }, [entryId, bodyMeasurements, setValue]);

  const onSubmit = async (data: MeasurementForm) => {
    try {
      setIsLoading(true);
      
      // Validate that at least one measurement is provided
      const hasAnyMeasurement = Object.values(data).some(value => value && value.trim() !== '');
      if (!hasAnyMeasurement) {
        Alert.alert('Error', 'Please enter at least one measurement');
        return;
      }
      
      const measurements = {
        waist: data.waist && data.waist.trim() !== '' ? parseFloat(data.waist) : undefined,
        chest: data.chest && data.chest.trim() !== '' ? parseFloat(data.chest) : undefined,
        hip: data.hip && data.hip.trim() !== '' ? parseFloat(data.hip) : undefined,
        neck: data.neck && data.neck.trim() !== '' ? parseFloat(data.neck) : undefined,
        bicep: data.bicep && data.bicep.trim() !== '' ? parseFloat(data.bicep) : undefined,
        thigh: data.thigh && data.thigh.trim() !== '' ? parseFloat(data.thigh) : undefined,
      };

      // Validate that parsed numbers are valid
      const invalidMeasurements = Object.entries(measurements)
        .filter(([key, value]) => value !== undefined && (isNaN(value) || value <= 0))
        .map(([key]) => key);

      if (invalidMeasurements.length > 0) {
        Alert.alert('Error', `Please enter valid positive numbers for: ${invalidMeasurements.join(', ')}`);
        return;
      }

      const entryData = {
        measurements,
        date: selectedDate,
      };

      if (isEditing && entryId) {
        await updateBodyMeasurement(entryId, entryData);
      } else {
        await addBodyMeasurement(entryData);
      }
      
      // Navigate back to list view
      router.back();
      
      // Show success message after navigation
      setTimeout(() => {
        Alert.alert(
          'Success',
          isEditing ? 'Measurements updated successfully' : 'Measurements saved successfully'
        );
      }, 100);
    } catch (error) {
      console.error('Failed to save measurements:', error);
      Alert.alert('Error', `Failed to save measurements: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  const formatMeasurement = (value: number) => {
    const unit = settings.measurementUnit === 'metric' ? 'cm' : 'in';
    return `${value.toFixed(1)} ${unit}`;
  };

  const deleteMeasurement = async (id: string) => {
    Alert.alert(
      'Delete Measurement',
      'Are you sure you want to delete this measurement entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteBodyMeasurement(id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete measurement');
            }
          },
        },
      ]
    );
  };

  if (!showForm) {
    return (
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header with Add Button */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Body Measurements</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.healthAccent }]}
            onPress={() => router.push('/health/measurements?showForm=true')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Measurements List */}
        {bodyMeasurements.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="body" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No measurements yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start tracking your body measurements to monitor your progress
            </Text>
            <Button
              title="Add First Measurement"
              onPress={() => router.push('/health/measurements?showForm=true')}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          bodyMeasurements
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((entry, index) => (
            <Card key={entry.id} style={[styles.measurementCard, { backgroundColor: theme.surface }]}>
              <View style={styles.measurementHeader}>
                <Text style={[styles.measurementDate, { color: theme.text }]}>
                  {format(entry.date, 'MMM dd, yyyy')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push(`/health/measurements?entryId=${entry.id}&showForm=true`)}
                >
                  <Ionicons name="pencil" size={20} color={theme.healthAccent} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.measurementGrid}>
                {entry.measurements.waist && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Waist
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.waist)}
                    </Text>
                  </View>
                )}
                {entry.measurements.chest && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Chest
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.chest)}
                    </Text>
                  </View>
                )}
                {entry.measurements.hip && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Hip
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.hip)}
                    </Text>
                  </View>
                )}
                {entry.measurements.neck && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Neck
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.neck)}
                    </Text>
                  </View>
                )}
                {entry.measurements.bicep && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Bicep
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.bicep)}
                    </Text>
                  </View>
                )}
                {entry.measurements.thigh && (
                  <View style={styles.measurementItem}>
                    <Text style={[styles.measurementLabel, { color: theme.textSecondary }]}>
                      Thigh
                    </Text>
                    <Text style={[styles.measurementValue, { color: theme.text }]}>
                      {formatMeasurement(entry.measurements.thigh)}
                    </Text>
                  </View>
                )}
              </View>
              
            </Card>
          ))
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={styles.card}>
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

        {/* Measurement Inputs */}
        <View style={styles.inputGrid}>
          <Controller
            control={control}
            name="waist"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Waist (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />

          <Controller
            control={control}
            name="chest"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Chest (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />
        </View>

        <View style={styles.inputGrid}>
          <Controller
            control={control}
            name="hip"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Hip (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />

          <Controller
            control={control}
            name="neck"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Neck (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />
        </View>

        <View style={styles.inputGrid}>
          <Controller
            control={control}
            name="bicep"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Bicep (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />

          <Controller
            control={control}
            name="thigh"
            render={({ field: { onChange, value } }) => (
              <Input
                label={`Thigh (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                placeholder="0.0"
                keyboardType="decimal-pad"
                style={styles.inputHalf}
              />
            )}
          />
        </View>

        {/* Error Messages */}
        {errors.root && (
          <Text style={[styles.errorText, { color: theme.error }]}>
            {errors.root.message}
          </Text>
        )}
        
        {/* Debug: Show all form errors */}
        {Object.keys(errors).length > 0 && (
          <View style={styles.debugErrors}>
            <Text style={[styles.debugText, { color: theme.error }]}>
              Form errors: {JSON.stringify(errors, null, 2)}
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Update Measurements' : 'Save Measurements'}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={styles.submitButton}
        />

        {/* Delete Button for Editing */}
        {isEditing && (
          <Button
            title="Delete Entry"
            onPress={() => deleteMeasurement(entryId)}
            variant="outline"
            style={[styles.deleteButton, { borderColor: theme.error }]}
            textStyle={{ color: theme.error }}
          />
        )}
      </Card>

      {/* Tips Section */}
      <Card style={[styles.tipsSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.tipsTitle, { color: theme.text }]}>Measurement Tips</Text>
        <View style={styles.tipsList}>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Take measurements at the same time of day for consistency
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Use a flexible measuring tape and avoid pulling too tight
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Measure over bare skin or thin clothing
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Stand relaxed with arms at your sides
          </Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
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
  },
  inputGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputHalf: {
    flex: 1,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
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
  emptyButton: {
    marginTop: spacing.md,
  },
  measurementCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  measurementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  measurementDate: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  measurementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  measurementItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing.sm,
  },
  measurementLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  measurementValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  tipsSection: {
    margin: spacing.md,
    padding: spacing.md,
  },
  tipsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipItem: {
    fontSize: fontSize.sm,
    lineHeight: 20,
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
  debugErrors: {
    marginVertical: spacing.sm,
    padding: spacing.sm,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 4,
  },
  debugText: {
    fontSize: fontSize.xs,
    fontFamily: 'monospace',
  },
});