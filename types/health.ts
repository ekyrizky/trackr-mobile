export interface WeightEntry {
  id: string;
  weight: number;
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BodyMeasurement {
  id: string;
  date: Date;
  measurements: {
    height?: number;
    waist?: number;
    chest?: number;
    hip?: number;
    neck?: number;
    bicep?: number;
    thigh?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface ExerciseSet {
  reps: number;
  weight?: number;
}

export interface StrengthExercise {
  name: string;
  sets: number;
  reps: number;
  weight?: number;
}

export interface Exercise {
  id: string;
  name?: string; // for cardio exercises
  type: 'cardio' | 'strength';
  // Cardio fields
  duration?: number; // minutes for cardio
  distance?: number; // miles/km for cardio
  // Strength fields
  exercises?: StrengthExercise[]; // for strength training
  // Legacy fields (for backward compatibility)
  sets?: ExerciseSet[]; // old strength format
  calories?: number; // legacy field
  date: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  id: string;
  age: number;
  height?: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  targetWeight?: number;
  createdAt: Date;
  updatedAt: Date;
}

export const EXERCISE_TYPES = {
  cardio: [
    { id: 'running', name: 'Running', icon: 'run' },
    { id: 'cycling', name: 'Cycling', icon: 'bike' },
    { id: 'swimming', name: 'Swimming', icon: 'swimming' },
    { id: 'walking', name: 'Walking', icon: 'walk' },
    { id: 'elliptical', name: 'Elliptical', icon: 'fitness-center' },
  ],
  strength: [
    { id: 'benchpress', name: 'Bench Press', icon: 'fitness-center' },
    { id: 'squat', name: 'Squat', icon: 'fitness-center' },
    { id: 'deadlift', name: 'Deadlift', icon: 'fitness-center' },
    { id: 'pullup', name: 'Pull Up', icon: 'fitness-center' },
    { id: 'pushup', name: 'Push Up', icon: 'fitness-center' },
  ],
};