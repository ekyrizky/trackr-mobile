import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function HabitsLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.surface,
        },
        headerTintColor: theme.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen name="add-habit" options={{ title: 'Add Habit', presentation: 'modal' }} />
      <Stack.Screen name="list" options={{ title: 'Habits List' }} />
      <Stack.Screen name="details" options={{ title: 'Habit Details' }} />
      <Stack.Screen name="analytics" options={{ title: 'Habit Analytics' }} />
    </Stack>
  );
}