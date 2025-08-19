import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useHealth } from '../../contexts/HealthContext';
import { useSettings } from '../../contexts/SettingsContext';
import { calculateBMI, getBMICategory } from '../../services/calculations';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';


export default function HealthDashboard() {
  const { theme } = useTheme();
  const { weightEntries, exercises, userProfile, bodyMeasurements, getLatestWeight, getWeightTrend, calculateBodyFatFromMeasurements } = useHealth();
  const { settings } = useSettings();
  
  const latestWeight = getLatestWeight();
  const weightTrend = getWeightTrend(7); // Last 7 days
  const recentExercises = exercises.slice(0, 3);
  const recentWeights = weightEntries.slice(0, 3);

  const formatWeight = (weight: number) => {
    return settings.measurementUnit === 'metric' 
      ? `${weight} kg` 
      : `${(weight * 2.20462).toFixed(1)} lbs`;
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

  const getBMI = () => {
    if (!latestWeight || !userProfile?.height) return null;
    return calculateBMI(latestWeight.weight, userProfile.height, settings.measurementUnit);
  };

  const getBodyFat = () => {
    if (!userProfile?.height || !userProfile?.gender || bodyMeasurements.length === 0) return null;
    
    // Find the latest body measurement entry
    const latestMeasurement = bodyMeasurements[0];
    if (!latestMeasurement) return null;
    
    // Create measurements object with height from profile and other measurements from the latest entry
    const measurementsWithHeight = {
      ...latestMeasurement.measurements,
      height: userProfile.height
    };
    
    // Check if we have the required measurements
    const { height, waist, neck, hip } = measurementsWithHeight;
    
    // Basic measurements required for all
    if (!height || !waist || !neck) return null;
    
    // Hip measurement required for females
    if (userProfile.gender === 'female' && !hip) return null;
    
    return calculateBodyFatFromMeasurements(measurementsWithHeight);
  };

  const bmi = getBMI();
  const bodyFat = getBodyFat();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Stats Overview */}
      <View style={styles.statsContainer}>
        {/* Current Weight - Top Row */}
        <Card style={[styles.statCardFull, { backgroundColor: theme.surface }]}>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Current Weight</Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            {latestWeight ? formatWeight(latestWeight.weight) : '--'}
          </Text>
          {weightTrend.trend !== 'stable' && (
            <View style={styles.trendContainer}>
              <Ionicons 
                name={weightTrend.trend === 'up' ? 'trending-up' : 'trending-down'} 
                size={16} 
                color={weightTrend.trend === 'up' ? theme.error : theme.success} 
              />
              <Text style={[styles.trendText, { 
                color: weightTrend.trend === 'up' ? theme.error : theme.success 
              }]}>
                {formatWeight(weightTrend.change)} (7d)
              </Text>
            </View>
          )}
        </Card>

        {/* BMI and Body Fat - Bottom Row */}
        <View style={styles.statsGrid}>
          <Card style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Body Fat</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {bodyFat ? `${bodyFat.toFixed(1)}%` : '--'}
            </Text>
            {!bodyFat && (
              <Text style={[styles.bmiCategory, { color: theme.textSecondary }]}>
                {!userProfile?.height ? 'Need height' :
                 !userProfile?.gender ? 'Need gender' :
                 bodyMeasurements.length === 0 ? 'Need measurements' :
                 // Check if we have all required measurements but still no result
                 (() => {
                   if (bodyMeasurements.length > 0) {
                     const latest = bodyMeasurements[0].measurements;
                     const hasRequired = userProfile.gender === 'female' 
                       ? latest.waist && latest.neck && latest.hip 
                       : latest.waist && latest.neck;
                     if (hasRequired) return 'Calculation unavailable';
                   }
                   return userProfile.gender === 'female' ? 'Need waist, neck, hip' : 'Need waist, neck';
                 })()}
              </Text>
            )}
          </Card>

          <Card style={[styles.statCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>BMI</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {bmi ? bmi.toFixed(1) : '--'}
            </Text>
            {bmi && (
              <Text style={[styles.bmiCategory, { color: theme.textSecondary }]}>
                {getBMICategory(bmi)}
              </Text>
            )}
          </Card>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.healthAccent }]}
          onPress={() => router.push('/health/weight-entry')}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.quickActionText}>Log Weight</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <Card style={[styles.menuSection, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/health/weight-entry?showForm=false')}
        >
          <Ionicons name="fitness" size={24} color={theme.healthAccent} />
          <Text style={[styles.menuText, { color: theme.text }]}>Weight Tracking</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/health/measurements')}
        >
          <Ionicons name="body" size={24} color={theme.healthAccent} />
          <Text style={[styles.menuText, { color: theme.text }]}>Body Measurements</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/health/exercise-log')}
        >
          <Ionicons name="barbell" size={24} color={theme.healthAccent} />
          <Text style={[styles.menuText, { color: theme.text }]}>Exercise Log</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/health/profile')}
        >
          <Ionicons name="person" size={24} color={theme.healthAccent} />
          <Text style={[styles.menuText, { color: theme.text }]}>Health Profile</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </Card>

      {/* Recent Weight Entries */}
      {recentWeights.length > 0 && (
        <Card style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Recent Weight Entries
            </Text>
            <TouchableOpacity onPress={() => router.push('/health/weight-entry')}>
              <Text style={[styles.seeAllText, { color: theme.healthAccent }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentWeights.map((weight, index) => (
            <View
              key={weight.id}
              style={[styles.weightEntry, { 
                borderBottomColor: theme.border,
                borderBottomWidth: index < recentWeights.length - 1 ? 1 : 0
              }]}
            >
              <View style={styles.weightInfo}>
                <Text style={[styles.weightValue, { color: theme.text }]}>
                  {formatWeight(weight.weight)}
                </Text>
                <Text style={[styles.weightDate, { color: theme.textSecondary }]}>
                  {format(weight.date, 'MMM dd, yyyy')}
                </Text>
                {weight.notes && (
                  <Text style={[styles.weightNotes, { color: theme.textSecondary }]}>
                    {weight.notes}
                  </Text>
                )}
              </View>
              <Ionicons 
                name="fitness" 
                size={24} 
                color={theme.healthAccent} 
              />
            </View>
          ))}
        </Card>
      )}

      {/* Recent Exercises */}
      {recentExercises.length > 0 && (
        <Card style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Recent Workouts
            </Text>
            <TouchableOpacity onPress={() => router.push('/health/exercise-log')}>
              <Text style={[styles.seeAllText, { color: theme.healthAccent }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentExercises.map((exercise, index) => (
            <View
              key={exercise.id}
              style={[styles.exerciseEntry, { 
                borderBottomColor: theme.border,
                borderBottomWidth: index < recentExercises.length - 1 ? 1 : 0
              }]}
            >
              <View style={styles.exerciseInfo}>
                <Text style={[styles.exerciseName, { color: theme.text }]}>
                  {exercise.type === 'cardio' 
                    ? exercise.name 
                    : `Strength Training (${exercise.exercises?.length || 0} exercises)`
                  }
                </Text>
                <Text style={[styles.exerciseDetails, { color: theme.textSecondary }]}>
                  {exercise.type === 'cardio' 
                    ? `${exercise.duration} min${exercise.distance ? ` • ${exercise.distance} mi/km` : ''}` 
                    : `${exercise.exercises?.length || 0} exercises`
                  }
                </Text>
                <Text style={[styles.exerciseDate, { color: theme.textSecondary }]}>
                  {format(exercise.date, 'MMM dd, yyyy')}
                </Text>
              </View>
              <Ionicons 
                name={exercise.type === 'cardio' ? 'heart' : 'barbell'} 
                size={24} 
                color={theme.healthAccent} 
              />
            </View>
          ))}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    padding: spacing.md,
    alignItems: 'center',
  },
  statCardFull: {
    padding: spacing.md,
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
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendText: {
    fontSize: fontSize.xs,
    marginLeft: spacing.xs,
  },
  bmiCategory: {
    fontSize: fontSize.xs,
  },
  quickActions: {
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
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
  menuSection: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    fontSize: fontSize.md,
    marginLeft: spacing.md,
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: fontSize.sm,
  },
  exerciseEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  exerciseDetails: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  exerciseDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  weightEntry: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  weightInfo: {
    flex: 1,
  },
  weightValue: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  weightDate: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  weightNotes: {
    fontSize: fontSize.xs,
    marginTop: 2,
    fontStyle: 'italic',
  },
});