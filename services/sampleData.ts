import { database } from './database';
import { format, subDays, startOfMonth } from 'date-fns';

export const createSampleData = async () => {
  try {
    const db = database.getDatabase();

    // Clear existing data
    await db.execAsync(`
      DELETE FROM transactions;
      DELETE FROM budgets;
      DELETE FROM goals;
      DELETE FROM weight_entries;
      DELETE FROM body_measurements;
      DELETE FROM exercises;
      DELETE FROM habits;
      DELETE FROM habit_entries;
    `);

    // Finance Sample Data
    const financeData = await createFinanceSampleData();
    const healthData = await createHealthSampleData();
    const habitsData = await createHabitsSampleData();

    console.log('Sample data created successfully');
  } catch (error) {
    console.error('Failed to create sample data:', error);
  }
};

const createFinanceSampleData = async () => {
  const db = database.getDatabase();
  const now = new Date();

  // Sample transactions over the last 3 months
  const transactions = [
    // This month
    { amount: 3000, category: 'salary', description: 'Monthly salary', type: 'income', date: startOfMonth(now) },
    { amount: 25, category: 'food', description: 'Coffee shop', type: 'expense', date: subDays(now, 1) },
    { amount: 120, category: 'food', description: 'Grocery shopping', type: 'expense', date: subDays(now, 2) },
    { amount: 45, category: 'transport', description: 'Gas station', type: 'expense', date: subDays(now, 3) },
    { amount: 200, category: 'shopping', description: 'New clothes', type: 'expense', date: subDays(now, 5) },
    { amount: 80, category: 'entertainment', description: 'Movies with friends', type: 'expense', date: subDays(now, 7) },
    { amount: 500, category: 'freelance', description: 'Web design project', type: 'income', date: subDays(now, 8) },
    { amount: 150, category: 'bills', description: 'Electricity bill', type: 'expense', date: subDays(now, 10) },
    { amount: 35, category: 'food', description: 'Restaurant dinner', type: 'expense', date: subDays(now, 12) },
    { amount: 60, category: 'health', description: 'Pharmacy', type: 'expense', date: subDays(now, 14) },
    
    // Last month
    { amount: 3000, category: 'salary', description: 'Monthly salary', type: 'income', date: subDays(now, 30) },
    { amount: 800, category: 'bills', description: 'Rent payment', type: 'expense', date: subDays(now, 32) },
    { amount: 300, category: 'food', description: 'Monthly groceries', type: 'expense', date: subDays(now, 35) },
    { amount: 100, category: 'transport', description: 'Monthly gas', type: 'expense', date: subDays(now, 40) },
    { amount: 250, category: 'entertainment', description: 'Concert tickets', type: 'expense', date: subDays(now, 45) },
    
    // Two months ago
    { amount: 3000, category: 'salary', description: 'Monthly salary', type: 'income', date: subDays(now, 60) },
    { amount: 800, category: 'bills', description: 'Rent payment', type: 'expense', date: subDays(now, 62) },
    { amount: 1200, category: 'investment', description: 'Stock dividend', type: 'income', date: subDays(now, 65) },
    { amount: 400, category: 'shopping', description: 'Electronics', type: 'expense', date: subDays(now, 70) },
  ];

  for (const transaction of transactions) {
    await db.runAsync(
      `INSERT INTO transactions (id, amount, category, description, date, type, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        transaction.amount,
        transaction.category,
        transaction.description,
        format(transaction.date, 'yyyy-MM-dd'),
        transaction.type,
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  // Sample budgets
  const budgets = [
    { category: 'food', amount: 500, period: 'monthly' },
    { category: 'transport', amount: 200, period: 'monthly' },
    { category: 'entertainment', amount: 300, period: 'monthly' },
    { category: 'shopping', amount: 400, period: 'monthly' },
  ];

  for (const budget of budgets) {
    await db.runAsync(
      `INSERT INTO budgets (id, category, amount, period, start_date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        budget.category,
        budget.amount,
        budget.period,
        format(startOfMonth(now), 'yyyy-MM-dd'),
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  // Sample goals
  const goals = [
    { name: 'Emergency Fund', targetAmount: 10000, currentAmount: 3500, deadline: new Date(2024, 11, 31) },
    { name: 'Vacation to Japan', targetAmount: 5000, currentAmount: 1200, deadline: new Date(2024, 8, 15) },
    { name: 'New Car', targetAmount: 25000, currentAmount: 8000, deadline: new Date(2025, 5, 1) },
  ];

  for (const goal of goals) {
    await db.runAsync(
      `INSERT INTO goals (id, name, target_amount, current_amount, deadline, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        goal.name,
        goal.targetAmount,
        goal.currentAmount,
        format(goal.deadline, 'yyyy-MM-dd'),
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  return { transactions, budgets, goals };
};

const createHealthSampleData = async () => {
  const db = database.getDatabase();
  const now = new Date();

  // Update user profile
  await db.runAsync(
    `UPDATE user_profile SET height = ?, age = ?, gender = ?, activity_level = ?, target_weight = ? WHERE id = ?`,
    [175, 28, 'male', 'moderate', 75, 'default']
  );

  // Sample weight entries (last 3 months)
  const weightEntries = [];
  for (let i = 0; i < 90; i++) {
    const date = subDays(now, i);
    // Simulate gradual weight loss with some variance
    const baseWeight = 80 - (i * 0.05) + (Math.random() - 0.5) * 2;
    weightEntries.push({
      weight: Math.round(baseWeight * 10) / 10,
      date,
      bodyFat: 15 + Math.random() * 3,
    });
  }

  for (const entry of weightEntries) {
    await db.runAsync(
      `INSERT INTO weight_entries (id, weight, body_fat, date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        entry.weight,
        entry.bodyFat,
        format(entry.date, 'yyyy-MM-dd'),
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  // Sample body measurements (weekly for last 3 months)
  const measurements = [];
  for (let i = 0; i < 12; i++) {
    const date = subDays(now, i * 7);
    measurements.push({
      date,
      waist: 85 - i * 0.5,
      chest: 95 + i * 0.2,
      hip: 90 - i * 0.3,
      neck: 38,
      bicep: 35 + i * 0.1,
      thigh: 55 - i * 0.2,
    });
  }

  for (const measurement of measurements) {
    await db.runAsync(
      `INSERT INTO body_measurements (id, date, waist, chest, hip, neck, bicep, thigh, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        format(measurement.date, 'yyyy-MM-dd'),
        measurement.waist,
        measurement.chest,
        measurement.hip,
        measurement.neck,
        measurement.bicep,
        measurement.thigh,
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  // Sample exercises
  const exercises = [
    { name: 'Morning Run', type: 'cardio', duration: 30, calories: 300, date: subDays(now, 1) },
    { name: 'Bench Press', type: 'strength', sets: JSON.stringify([{reps: 10, weight: 80}, {reps: 8, weight: 85}, {reps: 6, weight: 90}]), date: subDays(now, 2) },
    { name: 'Cycling', type: 'cardio', duration: 45, calories: 400, date: subDays(now, 3) },
    { name: 'Squats', type: 'strength', sets: JSON.stringify([{reps: 12, weight: 100}, {reps: 10, weight: 110}, {reps: 8, weight: 120}]), date: subDays(now, 4) },
    { name: 'Swimming', type: 'cardio', duration: 60, calories: 500, date: subDays(now, 5) },
  ];

  for (const exercise of exercises) {
    await db.runAsync(
      `INSERT INTO exercises (id, name, type, duration, sets, calories, date, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        Date.now().toString() + Math.random().toString(),
        exercise.name,
        exercise.type,
        exercise.duration || null,
        exercise.sets || null,
        exercise.calories || null,
        format(exercise.date, 'yyyy-MM-dd'),
        now.toISOString(),
        now.toISOString(),
      ]
    );
  }

  return { weightEntries, measurements, exercises };
};

const createHabitsSampleData = async () => {
  const db = database.getDatabase();
  const now = new Date();

  // Sample habits
  const habits = [
    { name: 'Drink 8 glasses of water', category: 'health', frequency: 'daily', targetCount: 8, color: '#007AFF', icon: 'water' },
    { name: 'Exercise', category: 'fitness', frequency: 'daily', targetCount: 1, color: '#FF3B30', icon: 'fitness' },
    { name: 'Read for 30 minutes', category: 'learning', frequency: 'daily', targetCount: 1, color: '#34C759', icon: 'book' },
    { name: 'Meditate', category: 'mindfulness', frequency: 'daily', targetCount: 1, color: '#AF52DE', icon: 'flower' },
    { name: 'Connect with friend', category: 'social', frequency: 'daily', targetCount: 1, color: '#5AC8FA', icon: 'chatbubble' },
  ];

  const habitIds: string[] = [];
  for (const habit of habits) {
    const habitId = Date.now().toString() + Math.random().toString();
    habitIds.push(habitId);
    
    await db.runAsync(
      `INSERT INTO habits (id, name, category, frequency, target_count, color, icon, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        habitId,
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
  }

  // Sample habit entries for the last 30 days
  for (let i = 0; i < 30; i++) {
    const date = subDays(now, i);
    
    for (let j = 0; j < habitIds.length; j++) {
      const habitId = habitIds[j];
      const habit = habits[j];
      
      // Random completion with higher probability for recent dates
      const completionChance = 0.7 + (30 - i) * 0.01;
      const completed = Math.random() < completionChance;
      
      if (completed || Math.random() < 0.3) { // Also add some incomplete entries
        await db.runAsync(
          `INSERT INTO habit_entries (id, habit_id, date, completed, count, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            Date.now().toString() + Math.random().toString(),
            habitId,
            format(date, 'yyyy-MM-dd'),
            completed ? 1 : 0,
            completed ? (habit.frequency === 'daily' ? Math.floor(Math.random() * habit.targetCount) + 1 : 1) : 0,
            now.toISOString(),
            now.toISOString(),
          ]
        );
      }
    }
  }

  return { habits };
};