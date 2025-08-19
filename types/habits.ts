export interface Habit {
  id: string;
  name: string;
  category: string;
  frequency: 'daily';
  targetCount: number;
  color: string;
  icon: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitEntry {
  id: string;
  habitId: string;
  date: Date;
  completed: boolean;
  count: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: Date | null;
  completionRate: number;
}

export const HABIT_CATEGORIES = [
  { id: 'health', name: 'Health', icon: 'heart', color: '#FF3B30' },
  { id: 'fitness', name: 'Fitness', icon: 'dumbbell', color: '#007AFF' },
  { id: 'learning', name: 'Learning', icon: 'book', color: '#34C759' },
  { id: 'productivity', name: 'Productivity', icon: 'clock', color: '#FF9500' },
  { id: 'mindfulness', name: 'Mindfulness', icon: 'brain', color: '#AF52DE' },
  { id: 'social', name: 'Social', icon: 'users', color: '#5AC8FA' },
  { id: 'creative', name: 'Creative', icon: 'palette', color: '#FF2D55' },
  { id: 'other', name: 'Other', icon: 'more-horizontal', color: '#8E8E93' },
];