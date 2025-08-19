import React from 'react';
import { Stack } from 'expo-router';
import AddHabit from '../../screens/habits/AddHabit';

export default function AddHabitPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Add Habit',
          presentation: 'modal'
        }} 
      />
      <AddHabit />
    </>
  );
}