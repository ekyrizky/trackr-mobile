import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WeightEntry, BodyMeasurement, Exercise, UserProfile } from '../types/health';
import { database } from '../services/database';
import { format } from 'date-fns';
import { calculateBodyFat } from '../services/calculations';

interface HealthContextType {
  weightEntries: WeightEntry[];
  bodyMeasurements: BodyMeasurement[];
  exercises: Exercise[];
  userProfile: UserProfile | null;
  isLoading: boolean;
  
  // Data loading
  loadHealthData: () => Promise<void>;
  
  // Weight entry methods
  addWeightEntry: (entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateWeightEntry: (id: string, entry: Partial<WeightEntry>) => Promise<void>;
  deleteWeightEntry: (id: string) => Promise<void>;
  
  // Body measurement methods
  addBodyMeasurement: (measurement: Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBodyMeasurement: (id: string, measurement: Partial<BodyMeasurement>) => Promise<void>;
  deleteBodyMeasurement: (id: string) => Promise<void>;
  
  // Exercise methods
  addExercise: (exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExercise: (id: string, exercise: Partial<Exercise>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  
  // Profile methods
  updateUserProfile: (profile: Partial<UserProfile>) => Promise<void>;
  
  // Analytics
  getLatestWeight: () => WeightEntry | null;
  getWeightTrend: (days: number) => { trend: 'up' | 'down' | 'stable'; change: number };
  
  // Body fat calculation
  calculateBodyFatFromMeasurements: (measurements: BodyMeasurement['measurements']) => number | null;
  
  // Get latest height for smart defaults
  getLatestHeight: () => number | null;
  
  // Refresh data
  refreshData: () => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

interface HealthProviderProps {
  children: ReactNode;
}

export const HealthProvider: React.FC<HealthProviderProps> = ({ children }) => {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data immediately since this context will only be mounted
    // after the database is ready (via DatabaseProvider)
    loadHealthData();
  }, []);

  const loadHealthData = async () => {
    try {
      const db = database.getDatabase();
      
      // Load weight entries
      const weightResult = await db.getAllAsync<any>(
        'SELECT * FROM weight_entries ORDER BY date DESC'
      );
      setWeightEntries(weightResult.map(w => ({
        ...w,
        date: new Date(w.date),
        createdAt: new Date(w.created_at),
        updatedAt: new Date(w.updated_at),
      })));

      // Load body measurements
      const measurementsResult = await db.getAllAsync<any>(
        'SELECT * FROM body_measurements ORDER BY date DESC'
      );
      setBodyMeasurements(measurementsResult.map(m => ({
        id: m.id,
        date: new Date(m.date),
        measurements: {
          height: m.height,
          waist: m.waist,
          chest: m.chest,
          hip: m.hip,
          neck: m.neck,
          bicep: m.bicep,
          thigh: m.thigh,
        },
        createdAt: new Date(m.created_at),
        updatedAt: new Date(m.updated_at),
      })));

      // Load exercises
      const exercisesResult = await db.getAllAsync<any>(
        'SELECT * FROM exercises ORDER BY date DESC'
      );
      setExercises(exercisesResult.map(e => ({
        ...e,
        sets: e.sets ? JSON.parse(e.sets) : undefined,
        exercises: e.exercises ? JSON.parse(e.exercises) : undefined,
        date: new Date(e.date),
        createdAt: new Date(e.created_at),
        updatedAt: new Date(e.updated_at),
      })));

      // Load user profile
      const profileResult = await db.getFirstAsync<any>(
        'SELECT * FROM user_profile WHERE id = ?',
        ['default']
      );
      
      if (profileResult) {
        setUserProfile({
          id: profileResult.id,
          age: profileResult.age,
          height: profileResult.height,
          gender: profileResult.gender,
          activityLevel: profileResult.activity_level,
          targetWeight: profileResult.target_weight,
          createdAt: new Date(profileResult.created_at),
          updatedAt: new Date(profileResult.updated_at),
        });
      }
    } catch (error) {
      console.error('Failed to load health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Weight entry methods
  const addWeightEntry = async (entry: Omit<WeightEntry, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = database.getDatabase();
    const id = Date.now().toString();
    const now = new Date();
    
    await db.runAsync(
      `INSERT INTO weight_entries (id, weight, date, notes, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        entry.weight,
        format(entry.date, 'yyyy-MM-dd'),
        entry.notes || null,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    const newEntry: WeightEntry = {
      ...entry,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setWeightEntries([newEntry, ...weightEntries]);
  };

  const updateWeightEntry = async (id: string, updates: Partial<WeightEntry>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.weight !== undefined) {
      fields.push('weight = ?');
      values.push(updates.weight);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(format(updates.date, 'yyyy-MM-dd'));
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE weight_entries SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setWeightEntries(weightEntries.map(w => 
      w.id === id ? { ...w, ...updates, updatedAt: new Date() } : w
    ));
  };

  const deleteWeightEntry = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM weight_entries WHERE id = ?', [id]);
    setWeightEntries(weightEntries.filter(w => w.id !== id));
  };

  // Body measurement methods
  const addBodyMeasurement = async (measurement: Omit<BodyMeasurement, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = database.getDatabase();
    const id = Date.now().toString();
    const now = new Date();
    const m = measurement.measurements;
    
    try {
      await db.runAsync(
        `INSERT INTO body_measurements (id, date, height, waist, chest, hip, neck, bicep, thigh, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          format(measurement.date, 'yyyy-MM-dd'),
          m.height || null,
          m.waist || null,
          m.chest || null,
          m.hip || null,
          m.neck || null,
          m.bicep || null,
          m.thigh || null,
          now.toISOString(),
          now.toISOString(),
        ]
      );
    } catch (insertError) {
      console.error('Database insert error:', insertError);
      console.error('Error details:', (insertError as Error).message);
      throw insertError;
    }

    const newMeasurement: BodyMeasurement = {
      ...measurement,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setBodyMeasurements([newMeasurement, ...bodyMeasurements]);
  };

  const updateBodyMeasurement = async (id: string, updates: Partial<BodyMeasurement>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(format(updates.date, 'yyyy-MM-dd'));
    }
    if (updates.measurements !== undefined) {
      const m = updates.measurements;
      if (m.height !== undefined) {
        fields.push('height = ?');
        values.push(m.height);
      }
      if (m.waist !== undefined) {
        fields.push('waist = ?');
        values.push(m.waist);
      }
      if (m.chest !== undefined) {
        fields.push('chest = ?');
        values.push(m.chest);
      }
      if (m.hip !== undefined) {
        fields.push('hip = ?');
        values.push(m.hip);
      }
      if (m.neck !== undefined) {
        fields.push('neck = ?');
        values.push(m.neck);
      }
      if (m.bicep !== undefined) {
        fields.push('bicep = ?');
        values.push(m.bicep);
      }
      if (m.thigh !== undefined) {
        fields.push('thigh = ?');
        values.push(m.thigh);
      }
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE body_measurements SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setBodyMeasurements(bodyMeasurements.map(m => 
      m.id === id ? { ...m, ...updates, updatedAt: new Date() } : m
    ));
  };

  const deleteBodyMeasurement = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM body_measurements WHERE id = ?', [id]);
    setBodyMeasurements(bodyMeasurements.filter(m => m.id !== id));
  };

  // Exercise methods
  const addExercise = async (exercise: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const db = database.getDatabase();
      const id = Date.now().toString();
      const now = new Date();
      
      console.log('Adding exercise:', exercise);
      
      await db.runAsync(
        `INSERT INTO exercises (id, name, type, duration, distance, sets, exercises, calories, date, notes, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          exercise.name || null,
          exercise.type,
          exercise.duration || null,
          exercise.distance || null,
          exercise.sets ? JSON.stringify(exercise.sets) : null,
          exercise.exercises ? JSON.stringify(exercise.exercises) : null,
          exercise.calories || null,
          format(exercise.date, 'yyyy-MM-dd'),
          exercise.notes || null,
          now.toISOString(),
          now.toISOString(),
        ]
      );

      const newExercise: Exercise = {
        ...exercise,
        id,
        createdAt: now,
        updatedAt: now,
      };

      setExercises([newExercise, ...exercises].sort((a, b) => b.date.getTime() - a.date.getTime()));
      console.log('Exercise added successfully');
    } catch (error) {
      console.error('Failed to add exercise:', error);
      throw error;
    }
  };

  const updateExercise = async (id: string, updates: Partial<Exercise>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.duration !== undefined) {
      fields.push('duration = ?');
      values.push(updates.duration);
    }
    if (updates.distance !== undefined) {
      fields.push('distance = ?');
      values.push(updates.distance);
    }
    if (updates.sets !== undefined) {
      fields.push('sets = ?');
      values.push(JSON.stringify(updates.sets));
    }
    if (updates.exercises !== undefined) {
      fields.push('exercises = ?');
      values.push(JSON.stringify(updates.exercises));
    }
    if (updates.calories !== undefined) {
      fields.push('calories = ?');
      values.push(updates.calories);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(format(updates.date, 'yyyy-MM-dd'));
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE exercises SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setExercises(exercises.map(e => 
      e.id === id ? { ...e, ...updates, updatedAt: new Date() } : e
    ).sort((a, b) => b.date.getTime() - a.date.getTime()));
  };

  const deleteExercise = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM exercises WHERE id = ?', [id]);
    setExercises(exercises.filter(e => e.id !== id));
  };

  // Profile methods
  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    try {
      const db = database.getDatabase();
      const now = new Date();
      
      const newProfile: UserProfile = {
        id: 'default',
        age: updates.age || userProfile?.age || 25,
        height: updates.height ?? userProfile?.height ?? undefined,
        gender: updates.gender || userProfile?.gender || 'male',
        activityLevel: updates.activityLevel || userProfile?.activityLevel || 'moderate',
        targetWeight: updates.targetWeight ?? userProfile?.targetWeight ?? undefined,
        createdAt: userProfile?.createdAt || now,
        updatedAt: now,
      };

      const transactionQuery = `
        BEGIN TRANSACTION;
        DELETE FROM user_profile WHERE id = 'default';
        INSERT INTO user_profile (id, age, height, gender, activity_level, target_weight, created_at, updated_at) 
        VALUES ('default', ${newProfile.age}, ${newProfile.height || 'NULL'}, '${newProfile.gender}', '${newProfile.activityLevel}', ${newProfile.targetWeight || 'NULL'}, '${newProfile.createdAt.toISOString()}', '${now.toISOString()}');
        COMMIT;
      `;
      
      try {
        await db.execAsync(transactionQuery);
      } catch (execError) {
        console.error('Transaction failed, trying individual operations:', execError);
        
        // Fallback to individual operations
        try {
          await db.runAsync('DELETE FROM user_profile WHERE id = ?', ['default']);
        } catch (deleteError) {
          // Table might be empty, continue
        }

        await db.runAsync(
          'INSERT INTO user_profile (id, age, height, gender, activity_level, target_weight, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [
            'default',
            newProfile.age,
            newProfile.height || null,
            newProfile.gender,
            newProfile.activityLevel,
            newProfile.targetWeight || null,
            newProfile.createdAt.toISOString(),
            now.toISOString(),
          ]
        );
      }

      setUserProfile(newProfile);
    } catch (error) {
      console.error('Database operation failed:', error);
      console.error('Error details:', (error as Error).message);
      throw error;
    }
  };

  // Analytics methods
  const getLatestWeight = () => {
    return weightEntries.length > 0 ? weightEntries[0] : null;
  };

  const getWeightTrend = (days: number) => {
    if (weightEntries.length < 2) {
      return { trend: 'stable' as const, change: 0 };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const recentEntries = weightEntries.filter(e => e.date >= cutoffDate);
    if (recentEntries.length < 2) {
      return { trend: 'stable' as const, change: 0 };
    }

    const latestWeight = recentEntries[0].weight;
    const oldestWeight = recentEntries[recentEntries.length - 1].weight;
    const change = latestWeight - oldestWeight;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(change) < 0.1) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return { trend, change: Math.abs(change) };
  };

  // Calculate body fat percentage from measurements
  const calculateBodyFatFromMeasurements = (measurements: BodyMeasurement['measurements']): number | null => {
    if (!userProfile || !userProfile.gender) {
      return null;
    }

    const { height, waist, neck, hip } = measurements;
    
    // Check if we have the required measurements for the calculation
    if (!height || !waist || !neck) {
      return null;
    }
    
    // For females, hip measurement is also required
    if (userProfile.gender === 'female' && !hip) {
      return null;
    }

    try {
      const bodyFat = calculateBodyFat(
        userProfile.gender,
        waist,
        neck,
        height,
        hip,
        'metric' // Always use metric since our app stores measurements in metric
      );
      
      // Handle edge cases where formula returns unrealistic values
      // Navy formula can sometimes return negative or very high values for certain body types
      if (isNaN(bodyFat) || bodyFat < 3 || bodyFat > 50) {
        return null;
      }
      
      return bodyFat;
    } catch (error) {
      console.error('Error calculating body fat:', error);
      return null;
    }
  };

  // Get latest height for smart defaults
  const getLatestHeight = (): number | null => {
    if (bodyMeasurements.length === 0) return null;
    
    // Find the most recent measurement that has height
    for (const measurement of bodyMeasurements) {
      if (measurement.measurements.height) {
        return measurement.measurements.height;
      }
    }
    
    return null;
  };

  return (
    <HealthContext.Provider
      value={{
        weightEntries,
        bodyMeasurements,
        exercises,
        userProfile,
        isLoading,
        loadHealthData,
        addWeightEntry,
        updateWeightEntry,
        deleteWeightEntry,
        addBodyMeasurement,
        updateBodyMeasurement,
        deleteBodyMeasurement,
        addExercise,
        updateExercise,
        deleteExercise,
        updateUserProfile,
        getLatestWeight,
        getWeightTrend,
        calculateBodyFatFromMeasurements,
        getLatestHeight,
        refreshData: loadHealthData,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
};