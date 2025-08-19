import React from 'react';
import { Stack } from 'expo-router';
import HabitDetails from '../../screens/habits/HabitDetails';

export default function HabitDetailsPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Habit Details'
        }} 
      />
      <HabitDetails />
    </>
  );
}