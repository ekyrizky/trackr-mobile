import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Settings } from '../types/index';
import { database } from '../services/database';
import { storage } from '../services/storage';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (settings: Partial<Settings>) => Promise<void>;
  loadSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: Settings = {
  currency: 'IDR',
  dateFormat: 'MM/dd/yyyy',
  measurementUnit: 'metric',
  theme: 'system',
  notifications: {
    habits: true,
    budgets: true,
    goals: true,
  },
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load data immediately since this context will only be mounted
    // after the database is ready (via DatabaseProvider)
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (!database.isReady()) {
        console.warn('Database not ready, using default settings');
        setSettings(defaultSettings);
        return;
      }

      const db = database.getDatabase();
      const result = await db.getFirstAsync<any>(
        'SELECT * FROM settings WHERE id = ?',
        ['default']
      );

      if (result) {
        const loadedSettings: Settings = {
          currency: result.currency || defaultSettings.currency,
          dateFormat: result.date_format || defaultSettings.dateFormat,
          measurementUnit: result.measurement_unit || defaultSettings.measurementUnit,
          theme: result.theme || defaultSettings.theme,
          notifications: result.notifications 
            ? JSON.parse(result.notifications) 
            : defaultSettings.notifications,
        };
        setSettings(loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);

      // Check if database is available
      if (!database.isReady()) {
        console.warn('Database not ready, settings will be applied on next app start');
        return;
      }

      let db;
      try {
        db = database.getDatabase();
      } catch (dbError) {
        console.warn('Failed to get database connection:', dbError);
        return;
      }

      // Try to update database with retries
      let retries = 3;
      while (retries > 0) {
        try {
          await db.runAsync(
            `UPDATE settings SET 
              currency = ?, 
              date_format = ?, 
              measurement_unit = ?, 
              theme = ?, 
              notifications = ?,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`,
            [
              updatedSettings.currency,
              updatedSettings.dateFormat,
              updatedSettings.measurementUnit,
              updatedSettings.theme,
              JSON.stringify(updatedSettings.notifications),
              'default'
            ]
          );
          break; // Success, exit retry loop
        } catch (dbError) {
          retries--;
          if (retries === 0) {
            console.error('Failed to update settings after retries:', dbError);
            // Don't throw here, let the UI update succeed
          } else {
            console.warn(`Database update failed, retrying... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms before retry
          }
        }
      }

      // Update storage for quick access (this usually works even if DB fails)
      try {
        await storage.setCurrency(updatedSettings.currency);
        await storage.setMeasurementUnit(updatedSettings.measurementUnit);
      } catch (storageError) {
        console.warn('Failed to update storage:', storageError);
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Don't throw here to prevent UI from breaking
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loadSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};