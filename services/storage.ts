import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  THEME: '@trackr_theme',
  CURRENCY: '@trackr_currency',
  DATE_FORMAT: '@trackr_date_format',
  MEASUREMENT_UNIT: '@trackr_measurement_unit',
  NOTIFICATIONS: '@trackr_notifications',
  ONBOARDING_COMPLETE: '@trackr_onboarding_complete',
  LAST_SYNC: '@trackr_last_sync',
};

export class StorageService {
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Error getting ${key} from storage:`, error);
      return null;
    }
  }

  static async set<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting ${key} in storage:`, error);
    }
  }

  static async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing ${key} from storage:`, error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  // Specific methods for common operations
  static async getTheme(): Promise<'light' | 'dark' | 'system'> {
    const theme = await this.get<'light' | 'dark' | 'system'>(STORAGE_KEYS.THEME);
    return theme || 'system';
  }

  static async setTheme(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await this.set(STORAGE_KEYS.THEME, theme);
  }

  static async getCurrency(): Promise<string> {
    const currency = await this.get<string>(STORAGE_KEYS.CURRENCY);
    return currency || 'USD';
  }

  static async setCurrency(currency: string): Promise<void> {
    await this.set(STORAGE_KEYS.CURRENCY, currency);
  }

  static async getMeasurementUnit(): Promise<'metric' | 'imperial'> {
    const unit = await this.get<'metric' | 'imperial'>(STORAGE_KEYS.MEASUREMENT_UNIT);
    return unit || 'metric';
  }

  static async setMeasurementUnit(unit: 'metric' | 'imperial'): Promise<void> {
    await this.set(STORAGE_KEYS.MEASUREMENT_UNIT, unit);
  }

  static async isOnboardingComplete(): Promise<boolean> {
    const complete = await this.get<boolean>(STORAGE_KEYS.ONBOARDING_COMPLETE);
    return complete || false;
  }

  static async setOnboardingComplete(): Promise<void> {
    await this.set(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
  }
}

export const storage = StorageService;