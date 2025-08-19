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

const weightSchema = z.object({
  weight: z.string().min(1, 'Weight is required'),
  notes: z.string().optional(),
});

type WeightForm = z.infer<typeof weightSchema>;

export default function WeightEntry() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { addWeightEntry, updateWeightEntry, deleteWeightEntry, weightEntries } = useHealth();
  const { settings } = useSettings();
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [showTips, setShowTips] = useState(false);
  
  const entryId = params.entryId as string | undefined;
  const showForm = params.showForm === 'true';
  const isEditing = !!entryId;
  
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<WeightForm>({
    resolver: zodResolver(weightSchema),
    defaultValues: {
      notes: '',
    },
  });

  useEffect(() => {
    if (isEditing && entryId) {
      const entry = weightEntries.find(e => e.id === entryId);
      if (entry) {
        setValue('weight', entry.weight.toString());
        setValue('notes', entry.notes || '');
        setSelectedDate(entry.date);
      }
    }
  }, [isEditing, entryId, weightEntries, setValue]);

  const onSubmit = async (data: WeightForm) => {
    try {
      setIsLoading(true);
      
      const entryData = {
        weight: parseFloat(data.weight),
        notes: data.notes || undefined,
        date: selectedDate,
      };

      if (isEditing && entryId) {
        await updateWeightEntry(entryId, entryData);
      } else {
        await addWeightEntry(entryData);
      }
      
      // Navigate back to list view
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save weight entry');
    } finally {
      setIsLoading(false);
    }
  };

  const formatWeight = (weight: number) => {
    return settings.measurementUnit === 'metric' 
      ? `${weight} kg` 
      : `${(weight * 2.20462).toFixed(1)} lbs`;
  };

  const deleteEntry = async (id: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this weight entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWeightEntry(id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete weight entry');
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
          <Text style={[styles.title, { color: theme.text }]}>Weight Tracking</Text>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.healthAccent }]}
            onPress={() => router.push('/health/weight-entry?showForm=true')}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Recent Weight Entries */}
        {weightEntries.length === 0 ? (
          <Card style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="fitness" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No weight entries yet
            </Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Start tracking your weight to monitor your progress
            </Text>
            <Button
              title="Add First Entry"
              onPress={() => router.push('/health/weight-entry?showForm=true')}
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          weightEntries
            .sort((a, b) => b.date.getTime() - a.date.getTime())
            .map((entry) => (
            <Card key={entry.id} style={[styles.weightCard, { backgroundColor: theme.surface }]}>
              <View style={styles.weightHeader}>
                <View>
                  <Text style={[styles.weightValue, { color: theme.text }]}>
                    {formatWeight(entry.weight)}
                  </Text>
                  <Text style={[styles.weightDate, { color: theme.textSecondary }]}>
                    {format(entry.date, 'MMM dd, yyyy')}
                  </Text>
                  {entry.notes && (
                    <Text style={[styles.weightNotes, { color: theme.textSecondary }]}>
                      {entry.notes}
                    </Text>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/health/weight-entry?entryId=${entry.id}&showForm=true`)}
                >
                  <Ionicons name="pencil" size={20} color={theme.healthAccent} />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}

        {/* Tips Section */}
        <Card style={[styles.tipsSection, { backgroundColor: theme.surface }]}>
          <TouchableOpacity
            style={[styles.tipsHeader, { marginBottom: showTips ? spacing.md : 0 }]}
            onPress={() => setShowTips(!showTips)}
          >
            <Text style={[styles.tipsTitle, { color: theme.text }]}>Weight Tracking Tips</Text>
            <Ionicons
              name={showTips ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
          
          {showTips && (
            <View style={styles.tipsList}>
              <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
                • Weigh yourself at the same time each day for consistency
              </Text>
              <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
                • Use the same scale and wear similar clothing
              </Text>
              <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
                • Track trends over time rather than daily fluctuations
              </Text>
              <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
                • Consider factors like hydration, meals, and exercise
              </Text>
              <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
                • Body fat percentage is calculated from body measurements using Navy formula
              </Text>
            </View>
          )}
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={styles.card}>
        {/* Date Selection */}
        <TouchableOpacity
          style={[styles.dateButton, { borderColor: theme.border }]}
        >
          <Text style={[styles.dateLabel, { color: theme.text }]}>Date</Text>
          <Text style={[styles.dateValue, { color: theme.healthAccent }]}>
            {format(selectedDate, 'MMM dd, yyyy')}
          </Text>
        </TouchableOpacity>

        {/* Weight Input */}
        <Controller
          control={control}
          name="weight"
          render={({ field: { onChange, value } }) => (
            <Input
              label={`Weight (${settings.measurementUnit === 'metric' ? 'kg' : 'lbs'})`}
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
              placeholder="0.0"
              keyboardType="decimal-pad"
              error={errors.weight?.message}
              required
            />
          )}
        />

        {/* Notes Input */}
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Notes"
              value={value}
              onChangeText={onChange}
              placeholder="Optional notes about your weight..."
              multiline
              numberOfLines={3}
            />
          )}
        />

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Update Entry' : 'Save Entry'}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={styles.submitButton}
        />

        {/* Delete Button for Editing */}
        {isEditing && (
          <Button
            title="Delete Entry"
            onPress={() => deleteEntry(entryId)}
            variant="outline"
            style={[styles.deleteButton, { borderColor: theme.error }]}
            textStyle={{ color: theme.error }}
          />
        )}
      </Card>

      {/* Tips Section */}
      <Card style={[styles.tipsSection, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.tipsHeader, { marginBottom: showTips ? spacing.md : 0 }]}
          onPress={() => setShowTips(!showTips)}
        >
          <Text style={[styles.tipsTitle, { color: theme.text }]}>Weight Tracking Tips</Text>
          <Ionicons
            name={showTips ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </TouchableOpacity>
        
        {showTips && (
          <View style={styles.tipsList}>
            <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
              • Weigh yourself at the same time each day for consistency
            </Text>
            <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
              • Use the same scale and wear similar clothing
            </Text>
            <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
              • Track trends over time rather than daily fluctuations
            </Text>
            <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
              • Consider factors like hydration, meals, and exercise
            </Text>
            <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
              • Body fat percentage is calculated from body measurements using Navy formula
            </Text>
          </View>
        )}
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
  weightCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  weightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weightValue: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  weightDate: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  weightNotes: {
    fontSize: fontSize.sm,
    fontStyle: 'italic',
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
  submitButton: {
    marginTop: spacing.md,
  },
  deleteButton: {
    marginTop: spacing.sm,
  },
  tipsSection: {
    margin: spacing.md,
    padding: spacing.md,
  },
  tipsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  tipsList: {
    gap: spacing.sm,
  },
  tipItem: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});