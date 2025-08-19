import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Habit, HabitEntry, HabitStreak } from '../types/habits';
import { database } from '../services/database';
import { calculateStreak, calculateCompletionRate } from '../services/calculations';
import { notificationService } from '../services/notifications';
import { format, startOfDay, differenceInDays } from 'date-fns';

interface HabitsContextType {
  habits: Habit[];
  habitEntries: HabitEntry[];
  isLoading: boolean;
  
  // Data loading
  loadHabitsData: () => Promise<void>;
  
  // Habit methods
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateHabit: (id: string, habit: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  
  // Entry methods
  markHabitComplete: (habitId: string, date: Date, count?: number) => Promise<void>;
  markHabitIncomplete: (habitId: string, date: Date) => Promise<void>;
  getHabitEntry: (habitId: string, date: Date) => HabitEntry | null;
  
  // Analytics
  calculateHabitStreak: (habitId: string) => HabitStreak;
  getHabitCompletionRate: (habitId: string, days: number) => number;
  getTodaysHabits: () => Array<{ habit: Habit; completed: boolean; count: number }>;
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

interface HabitsProviderProps {
  children: ReactNode;
}

export const HabitsProvider: React.FC<HabitsProviderProps> = ({ children }) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data immediately since this context will only be mounted
    // after the database is ready (via DatabaseProvider)
    loadHabitsData();
  }, []);

  const loadHabitsData = async () => {
    try {
      const db = database.getDatabase();
      
      // Load habits
      const habitsResult = await db.getAllAsync<any>(
        'SELECT * FROM habits ORDER BY created_at DESC'
      );
      setHabits(habitsResult.map(h => ({
        ...h,
        targetCount: h.target_count,
        createdAt: new Date(h.created_at),
        updatedAt: new Date(h.updated_at),
      })));

      // Load habit entries
      const entriesResult = await db.getAllAsync<any>(
        'SELECT * FROM habit_entries ORDER BY date DESC'
      );
      setHabitEntries(entriesResult.map(e => ({
        ...e,
        habitId: e.habit_id,
        date: new Date(e.date),
        completed: e.completed === 1,
        createdAt: new Date(e.created_at),
        updatedAt: new Date(e.updated_at),
      })));
    } catch (error) {
      console.error('Failed to load habits data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Habit methods
  const addHabit = async (habit: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = database.getDatabase();
    const id = Date.now().toString();
    const now = new Date();
    
    console.log('Adding habit with data:', habit);
    
    try {
      await db.runAsync(
        `INSERT INTO habits (id, name, category, frequency, target_count, color, icon, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          habit.name,
          habit.category,
          habit.frequency,
          habit.targetCount,
          habit.color,
          habit.icon,
          now.toISOString(),
          now.toISOString(),
        ]
      );
    } catch (error) {
      console.error('Database error adding habit:', error);
      throw error;
    }

    const newHabit: Habit = {
      ...habit,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setHabits([newHabit, ...habits]);
    
    // Schedule habit reminder notification
    try {
      await notificationService.scheduleHabitReminder(id, habit.name);
      console.log('Habit reminder scheduled for:', habit.name);
    } catch (error) {
      console.error('Failed to schedule habit reminder:', error);
    }
  };

  const updateHabit = async (id: string, updates: Partial<Habit>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.frequency !== undefined) {
      fields.push('frequency = ?');
      values.push(updates.frequency);
    }
    if (updates.targetCount !== undefined) {
      fields.push('target_count = ?');
      values.push(updates.targetCount);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE habits SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setHabits(habits.map(h => 
      h.id === id ? { ...h, ...updates, updatedAt: new Date() } : h
    ));
  };

  const deleteHabit = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM habits WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM habit_entries WHERE habit_id = ?', [id]);
    
    setHabits(habits.filter(h => h.id !== id));
    setHabitEntries(habitEntries.filter(e => e.habitId !== id));
    
    // Cancel habit reminder notification
    try {
      await notificationService.cancelHabitReminder(id);
      console.log('Habit reminder cancelled for habit:', id);
    } catch (error) {
      console.error('Failed to cancel habit reminder:', error);
    }
  };

  // Entry methods
  const markHabitComplete = async (habitId: string, date: Date, count: number = 1) => {
    const db = database.getDatabase();
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    const now = new Date();
    
    // Get habit to check target count
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      throw new Error('Habit not found');
    }
    
    // Determine if habit is completed based on count vs target
    const isCompleted = count >= habit.targetCount;
    
    // Check if entry exists
    const existing = await db.getFirstAsync<any>(
      'SELECT * FROM habit_entries WHERE habit_id = ? AND date = ?',
      [habitId, dateStr]
    );

    if (existing) {
      // Update existing entry
      await db.runAsync(
        `UPDATE habit_entries SET completed = ?, count = ?, updated_at = ? 
         WHERE habit_id = ? AND date = ?`,
        [isCompleted ? 1 : 0, count, now.toISOString(), habitId, dateStr]
      );

      setHabitEntries(habitEntries.map(e => 
        e.habitId === habitId && format(e.date, 'yyyy-MM-dd') === dateStr
          ? { ...e, completed: isCompleted, count, updatedAt: now }
          : e
      ));
    } else {
      // Create new entry
      const id = Date.now().toString();
      await db.runAsync(
        `INSERT INTO habit_entries (id, habit_id, date, completed, count, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, habitId, dateStr, isCompleted ? 1 : 0, count, now.toISOString(), now.toISOString()]
      );

      const newEntry: HabitEntry = {
        id,
        habitId,
        date: startOfDay(date),
        completed: isCompleted,
        count,
        createdAt: now,
        updatedAt: now,
      };

      setHabitEntries([newEntry, ...habitEntries]);
    }
  };

  const markHabitIncomplete = async (habitId: string, date: Date) => {
    const db = database.getDatabase();
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    const now = new Date();
    
    await db.runAsync(
      `UPDATE habit_entries SET completed = 0, count = 0, updated_at = ? 
       WHERE habit_id = ? AND date = ?`,
      [now.toISOString(), habitId, dateStr]
    );

    setHabitEntries(habitEntries.map(e => 
      e.habitId === habitId && format(e.date, 'yyyy-MM-dd') === dateStr
        ? { ...e, completed: false, count: 0, updatedAt: now }
        : e
    ));
  };

  const getHabitEntry = (habitId: string, date: Date): HabitEntry | null => {
    const dateStr = format(startOfDay(date), 'yyyy-MM-dd');
    return habitEntries.find(e => 
      e.habitId === habitId && format(e.date, 'yyyy-MM-dd') === dateStr
    ) || null;
  };

  // Analytics methods
  const calculateHabitStreak = (habitId: string): HabitStreak => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) {
      return {
        habitId,
        currentStreak: 0,
        longestStreak: 0,
        lastCompletedDate: null,
        completionRate: 0,
      };
    }

    const entries = habitEntries
      .filter(e => e.habitId === habitId)
      .sort((a, b) => b.date.getTime() - a.date.getTime());

    const { current, longest } = calculateStreak(entries, habit.frequency);
    const lastCompleted = entries.find(e => e.completed);
    
    // Calculate completion rate for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentEntries = entries.filter(e => e.date >= thirtyDaysAgo);
    const completionRate = calculateCompletionRate(recentEntries, 30);

    return {
      habitId,
      currentStreak: current,
      longestStreak: longest,
      lastCompletedDate: lastCompleted ? lastCompleted.date : null,
      completionRate,
    };
  };

  const getHabitCompletionRate = (habitId: string, days: number): number => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const entries = habitEntries.filter(e => 
      e.habitId === habitId && e.date >= cutoffDate
    );

    return calculateCompletionRate(entries, days);
  };

  const getTodaysHabits = () => {
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');

    return habits.map(habit => {
      const entry = habitEntries.find(e => 
        e.habitId === habit.id && format(e.date, 'yyyy-MM-dd') === todayStr
      );

      return {
        habit,
        completed: entry?.completed || false,
        count: entry?.count || 0,
      };
    });
  };

  return (
    <HabitsContext.Provider
      value={{
        habits,
        habitEntries,
        isLoading,
        loadHabitsData,
        addHabit,
        updateHabit,
        deleteHabit,
        markHabitComplete,
        markHabitIncomplete,
        getHabitEntry,
        calculateHabitStreak,
        getHabitCompletionRate,
        getTodaysHabits,
      }}
    >
      {children}
    </HabitsContext.Provider>
  );
};

export const useHabits = () => {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error('useHabits must be used within a HabitsProvider');
  }
  return context;
};