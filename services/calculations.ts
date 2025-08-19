import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, differenceInDays } from 'date-fns';

// Health Calculations
export const calculateBMI = (weight: number, height: number, unit: 'metric' | 'imperial' = 'metric'): number => {
  if (unit === 'metric') {
    // weight in kg, height in cm
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  } else {
    // weight in lbs, height in inches
    return (weight / (height * height)) * 703;
  }
};

export const getBMICategory = (bmi: number): string => {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
};

// BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
export const calculateBMR = (
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female',
  unit: 'metric' | 'imperial' = 'metric'
): number => {
  let weightKg = unit === 'metric' ? weight : weight / 2.20462;
  let heightCm = unit === 'metric' ? height : height * 2.54;

  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  }

  return bmr;
};

// Navy Body Fat Formula
export const calculateBodyFat = (
  gender: 'male' | 'female',
  waist: number,
  neck: number,
  height: number,
  hip?: number,
  unit: 'metric' | 'imperial' = 'metric'
): number => {
  let waistCm = unit === 'metric' ? waist : waist * 2.54;
  let neckCm = unit === 'metric' ? neck : neck * 2.54;
  let heightCm = unit === 'metric' ? height : height * 2.54;
  let hipCm = hip ? (unit === 'metric' ? hip : hip * 2.54) : 0;

  if (gender === 'male') {
    return 495 / (1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (!hipCm) return 0;
    return 495 / (1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.22100 * Math.log10(heightCm)) - 450;
  }
};

// Finance Calculations
export const calculateBudgetProgress = (spent: number, budget: number): number => {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
};

export const calculateGoalProgress = (current: number, target: number): number => {
  if (target === 0) return 0;
  return (current / target) * 100;
};

export const getMonthDateRange = (date: Date = new Date()) => {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  };
};

export const getWeekDateRange = (date: Date = new Date()) => {
  return {
    start: startOfWeek(date),
    end: endOfWeek(date),
  };
};

// Habit Calculations
export const calculateStreak = (
  entries: Array<{ date: Date; completed: boolean }>,
  frequency: 'daily'
): { current: number; longest: number } => {
  if (entries.length === 0) return { current: 0, longest: 0 };

  // Sort entries by date in descending order
  const sortedEntries = [...entries].sort((a, b) => b.date.getTime() - a.date.getTime());
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let lastDate = new Date();

  for (let i = 0; i < sortedEntries.length; i++) {
    const entry = sortedEntries[i];
    
    if (!entry.completed) {
      if (i === 0) currentStreak = 0;
      tempStreak = 0;
      continue;
    }

    if (i === 0) {
      const daysSinceLastEntry = differenceInDays(lastDate, entry.date);
      if (frequency === 'daily' && daysSinceLastEntry <= 1) {
        currentStreak = 1;
        tempStreak = 1;
      } else {
        currentStreak = 0;
        tempStreak = 1;
      }
    } else {
      const daysBetween = differenceInDays(sortedEntries[i - 1].date, entry.date);
      if (frequency === 'daily' && daysBetween === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);
  }

  return { current: currentStreak, longest: longestStreak };
};

export const calculateCompletionRate = (
  entries: Array<{ completed: boolean }>,
  totalDays: number
): number => {
  if (totalDays === 0) return 0;
  const completedDays = entries.filter(e => e.completed).length;
  return (completedDays / totalDays) * 100;
};

// Weight conversions
export const convertWeight = (weight: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number => {
  if (from === to) return weight;
  if (from === 'kg' && to === 'lbs') return weight * 2.20462;
  return weight / 2.20462;
};

// Height conversions
export const convertHeight = (height: number, from: 'cm' | 'inches', to: 'cm' | 'inches'): number => {
  if (from === to) return height;
  if (from === 'cm' && to === 'inches') return height / 2.54;
  return height * 2.54;
};