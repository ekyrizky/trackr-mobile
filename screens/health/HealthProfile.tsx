import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../contexts/ThemeContext';
import { useHealth } from '../../contexts/HealthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { calculateBMI, getBMICategory, calculateBMR } from '../../services/calculations';

const profileSchema = z.object({
  age: z.string().min(1, 'Age is required'),
  height: z.string().optional(),
  gender: z.enum(['male', 'female']),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
  targetWeight: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', description: 'Little or no exercise' },
  { value: 'light', label: 'Light', description: 'Light exercise 1-3 days/week' },
  { value: 'moderate', label: 'Moderate', description: 'Moderate exercise 3-5 days/week' },
  { value: 'active', label: 'Active', description: 'Hard exercise 6-7 days/week' },
  { value: 'very_active', label: 'Very Active', description: 'Very hard exercise, physical job' },
];

export default function HealthProfile() {
  const { theme } = useTheme();
  const { userProfile, updateUserProfile, getLatestWeight, getLatestHeight } = useHealth();
  const { settings } = useSettings();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      age: '',
      height: '',
      gender: 'male',
      activityLevel: 'moderate',
      targetWeight: '',
    },
  });

  const watchedGender = watch('gender');
  const watchedActivityLevel = watch('activityLevel');

  useEffect(() => {
    if (userProfile) {
      // Only set form values if the profile has actual data, not just nulls
      if (userProfile.age) setValue('age', userProfile.age.toString());
      if (userProfile.height) setValue('height', userProfile.height.toString());
      if (userProfile.gender) setValue('gender', userProfile.gender);
      if (userProfile.activityLevel) setValue('activityLevel', userProfile.activityLevel);
      if (userProfile.targetWeight) setValue('targetWeight', userProfile.targetWeight.toString());
    }
  }, [userProfile, setValue]);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setIsLoading(true);
      
      // Validate that required fields have values
      if (!data.age) {
        Alert.alert('Error', 'Age is required');
        return;
      }
      
      // Parse and validate numeric values
      const age = parseInt(data.age);
      const height = data.height ? parseFloat(data.height) : undefined;
      const targetWeight = data.targetWeight ? parseFloat(data.targetWeight) : undefined;

      if (isNaN(age) || age <= 0 || age > 150) {
        Alert.alert('Error', 'Please enter a valid age (1-150)');
        return;
      }

      if (height !== undefined && (isNaN(height) || height <= 0)) {
        Alert.alert('Error', 'Please enter a valid height');
        return;
      }

      if (targetWeight !== undefined && (isNaN(targetWeight) || targetWeight <= 0)) {
        Alert.alert('Error', 'Please enter a valid target weight');
        return;
      }
      
      const profileData = {
        age,
        height,
        gender: data.gender,
        activityLevel: data.activityLevel,
        targetWeight,
      };

      await updateUserProfile(profileData);
      
      // Show success message and navigate back
      Alert.alert(
        'Success', 
        'Profile updated successfully',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', `Failed to update profile: ${error.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatHeight = (height: number) => {
    if (settings.measurementUnit === 'metric') {
      return `${height} cm`;
    } else {
      const totalInches = height / 2.54;
      const feet = Math.floor(totalInches / 12);
      const inches = Math.round(totalInches % 12);
      return `${feet}'${inches}"`;
    }
  };

  const formatWeight = (weight: number) => {
    return settings.measurementUnit === 'metric' 
      ? `${weight} kg` 
      : `${(weight * 2.20462).toFixed(1)} lbs`;
  };

  const getHealthStats = () => {
    const latestWeight = getLatestWeight();
    if (!userProfile || !latestWeight || !userProfile.height || !userProfile.age || !userProfile.gender) return null;

    const bmi = calculateBMI(latestWeight.weight, userProfile.height, settings.measurementUnit);
    const bmr = calculateBMR(
      latestWeight.weight,
      userProfile.height,
      userProfile.age,
      userProfile.gender,
      settings.measurementUnit
    );

    return { bmi, bmr, currentWeight: latestWeight.weight };
  };

  const healthStats = getHealthStats();
  const selectedActivityLevel = ACTIVITY_LEVELS.find(level => level.value === watchedActivityLevel);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Current Stats Card */}
      {healthStats && (
        <Card style={[styles.statsCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>Current Health Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>BMI</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {healthStats.bmi.toFixed(1)}
              </Text>
              <Text style={[styles.statCategory, { color: theme.textSecondary }]}>
                {getBMICategory(healthStats.bmi)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>BMR</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {Math.round(healthStats.bmr)}
              </Text>
              <Text style={[styles.statCategory, { color: theme.textSecondary }]}>
                cal/day
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Weight</Text>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {formatWeight(healthStats.currentWeight)}
              </Text>
            </View>
          </View>
        </Card>
      )}

      {/* Profile Form */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>

        {/* Age */}
        <Controller
          control={control}
          name="age"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Age"
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^0-9]/g, ''))}
              placeholder="0"
              keyboardType="number-pad"
              error={errors.age?.message}
              required
            />
          )}
        />

        {/* Height */}
        <Controller
          control={control}
          name="height"
          render={({ field: { onChange, value } }) => (
            <Input
              label={`Height (${settings.measurementUnit === 'metric' ? 'cm' : 'in'})`}
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
              error={errors.height?.message}
            />
          )}
        />

        {/* Gender */}
        <View style={styles.fieldContainer}>
          <Text style={[styles.fieldLabel, { color: theme.text }]}>Gender *</Text>
          <View style={styles.genderButtons}>
            {(['male', 'female'] as const).map((gender) => (
              <TouchableOpacity
                key={gender}
                style={[
                  styles.genderButton,
                  {
                    backgroundColor: watchedGender === gender ? theme.healthAccent : theme.surface,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setValue('gender', gender)}
              >
                <Text style={[
                  styles.genderButtonText,
                  { color: watchedGender === gender ? 'white' : theme.text }
                ]}>
                  {gender.charAt(0).toUpperCase() + gender.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Target Weight */}
        <Controller
          control={control}
          name="targetWeight"
          render={({ field: { onChange, value } }) => (
            <Input
              label={`Target Weight (${settings.measurementUnit === 'metric' ? 'kg' : 'lbs'}) - Optional`}
              value={value}
              onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
              placeholder="0"
              keyboardType="decimal-pad"
            />
          )}
        />
      </Card>

      {/* Activity Level */}
      <Card style={styles.card}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity Level</Text>
        
        <TouchableOpacity
          style={[styles.activitySelector, { borderColor: theme.border }]}
          onPress={() => setShowActivityModal(true)}
        >
          <View style={styles.activitySelectorContent}>
            <Text style={[styles.activitySelectorLabel, { color: theme.text }]}>
              {selectedActivityLevel?.label}
            </Text>
            <Text style={[styles.activitySelectorDescription, { color: theme.textSecondary }]}>
              {selectedActivityLevel?.description}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Activity Level Options */}
        {showActivityModal && (
          <View style={[styles.activityOptions, { backgroundColor: theme.surface }]}>
            {ACTIVITY_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.activityOption,
                  {
                    backgroundColor: watchedActivityLevel === level.value ? theme.healthAccent : 'transparent',
                    borderBottomColor: theme.border,
                  },
                ]}
                onPress={() => {
                  setValue('activityLevel', level.value as any);
                  setShowActivityModal(false);
                }}
              >
                <View style={styles.activityOptionContent}>
                  <Text style={[
                    styles.activityOptionLabel,
                    { color: watchedActivityLevel === level.value ? 'white' : theme.text }
                  ]}>
                    {level.label}
                  </Text>
                  <Text style={[
                    styles.activityOptionDescription,
                    { color: watchedActivityLevel === level.value ? 'rgba(255,255,255,0.8)' : theme.textSecondary }
                  ]}>
                    {level.description}
                  </Text>
                </View>
                {watchedActivityLevel === level.value && (
                  <Ionicons name="checkmark" size={20} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Card>

      {/* Submit Button */}
      <View style={styles.submitContainer}>
        <Button
          title="Save Profile"
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </View>

      {/* Health Tips */}
      <Card style={[styles.tipsSection, { backgroundColor: theme.surface }]}>
        <Text style={[styles.tipsTitle, { color: theme.text }]}>Health Profile Tips</Text>
        <View style={styles.tipsList}>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • BMI is a general indicator - muscle mass affects the calculation
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • BMR shows calories needed for basic body functions at rest
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Activity level affects your daily calorie needs
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Regular health check-ups are important for overall wellness
          </Text>
          <Text style={[styles.tipItem, { color: theme.textSecondary }]}>
            • Height is used for BMI and BMR calculations
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
  statsCard: {
    margin: spacing.md,
    padding: spacing.md,
  },
  statsTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  statCategory: {
    fontSize: fontSize.xs,
  },
  card: {
    margin: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  fieldContainer: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
    marginBottom: spacing.md,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  genderButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  genderButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  activitySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  activitySelectorContent: {
    flex: 1,
  },
  activitySelectorLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  activitySelectorDescription: {
    fontSize: fontSize.sm,
  },
  activityOptions: {
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  activityOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  activityOptionContent: {
    flex: 1,
  },
  activityOptionLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  activityOptionDescription: {
    fontSize: fontSize.sm,
  },
  submitContainer: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginTop: spacing.md,
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
});