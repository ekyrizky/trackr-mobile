import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { DatabaseProvider, useDatabaseContext } from '../contexts/DatabaseContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { FinanceProvider } from '../contexts/FinanceContext';
import { HealthProvider } from '../contexts/HealthContext';
import { HabitsProvider } from '../contexts/HabitsContext';
import { notificationService } from '../services/notifications';
import LoadingScreen from '../components/common/LoadingScreen';

function RootLayoutNav() {
  const { isDark } = useTheme();
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

function AppWithDatabase() {
  const { isReady, error } = useDatabaseContext();

  useEffect(() => {
    if (isReady) {
      // Initialize notifications after database is ready
      notificationService.init().catch(error => {
        console.error('Failed to initialize notifications:', error);
      });
    }
  }, [isReady]);

  if (error) {
    // You could create a proper error screen here
    console.error('Database error:', error);
    return <LoadingScreen />;
  }

  if (!isReady) {
    return <LoadingScreen />;
  }

  return (
    <SettingsProvider>
      <FinanceProvider>
        <HealthProvider>
          <HabitsProvider>
            <RootLayoutNav />
          </HabitsProvider>
        </HealthProvider>
      </FinanceProvider>
    </SettingsProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <DatabaseProvider>
            <AppWithDatabase />
          </DatabaseProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}