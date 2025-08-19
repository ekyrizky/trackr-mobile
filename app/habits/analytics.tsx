import React from 'react';
import { Stack } from 'expo-router';
import HabitAnalytics from '../../screens/habits/HabitAnalytics';

export default function HabitAnalyticsPage() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Habit Analytics'
        }} 
      />
      <HabitAnalytics />
    </>
  );
}