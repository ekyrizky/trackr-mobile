export * from './finance';
export * from './health';
export * from './habits';

export interface Settings {
  currency: string;
  dateFormat: string;
  measurementUnit: 'metric' | 'imperial';
  theme: 'light' | 'dark' | 'system';
  notifications: {
    habits: boolean;
    budgets: boolean;
    goals: boolean;
  };
}