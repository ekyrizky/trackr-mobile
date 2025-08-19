import React from 'react';
import { Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';

export default function HealthLayout() {
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
      <Stack.Screen name="weight-entry" options={{ title: 'Weight Entry' }} />
      <Stack.Screen name="measurements" options={{ title: 'Measurements' }} />
      <Stack.Screen name="exercise-log" options={{ title: 'Exercise Log' }} />
      <Stack.Screen name="profile" options={{ title: 'Health Profile' }} />
    </Stack>
  );
}