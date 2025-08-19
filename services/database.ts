import * as SQLite from 'expo-sqlite';

const DATABASE_NAME = 'trackr.db';

export class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async init(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await this.createTables();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.execAsync(`
      -- Finance Tables
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        date TEXT NOT NULL,
        type TEXT CHECK(type IN ('income', 'expense')),
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        period TEXT DEFAULT 'monthly',
        spent REAL DEFAULT 0,
        start_date TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        deadline TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Health Tables
      CREATE TABLE IF NOT EXISTS weight_entries (
        id TEXT PRIMARY KEY,
        weight REAL NOT NULL,
        body_fat REAL,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS body_measurements (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        height REAL,
        waist REAL,
        chest REAL,
        hip REAL,
        neck REAL,
        bicep REAL,
        thigh REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY,
        name TEXT,
        type TEXT CHECK(type IN ('cardio', 'strength')),
        duration INTEGER,
        distance REAL,
        sets TEXT,
        exercises TEXT,
        calories INTEGER,
        date TEXT NOT NULL,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_profile (
        id TEXT PRIMARY KEY DEFAULT 'default',
        age INTEGER,
        height REAL,
        gender TEXT,
        activity_level TEXT,
        target_weight REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Habits Tables
      CREATE TABLE IF NOT EXISTS habits (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        frequency TEXT CHECK(frequency IN ('daily')),
        target_count INTEGER DEFAULT 1,
        color TEXT,
        icon TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS habit_entries (
        id TEXT PRIMARY KEY,
        habit_id TEXT REFERENCES habits(id),
        date TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        count INTEGER DEFAULT 0,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Settings Table
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY DEFAULT 'default',
        currency TEXT DEFAULT 'IDR',
        date_format TEXT DEFAULT 'MM/dd/yyyy',
        measurement_unit TEXT DEFAULT 'metric',
        theme TEXT DEFAULT 'system',
        notifications TEXT DEFAULT '{"habits":true,"budgets":true,"goals":true}',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
      CREATE INDEX IF NOT EXISTS idx_weight_entries_date ON weight_entries(date);
      CREATE INDEX IF NOT EXISTS idx_exercises_date ON exercises(date);
      CREATE INDEX IF NOT EXISTS idx_habit_entries_habit_date ON habit_entries(habit_id, date);
    `);

    // Migration for existing databases: Add height column to user_profile if it doesn't exist
    try {
      await this.db.execAsync(`
        ALTER TABLE user_profile ADD COLUMN height REAL;
      `);
    } catch (error) {
      // Column already exists or other error - ignore
    }


    // Insert default settings
    await this.db.runAsync(
      'INSERT OR IGNORE INTO settings (id) VALUES (?)',
      ['default']
    );

    // Insert default user profile
    await this.db.runAsync(
      'INSERT OR IGNORE INTO user_profile (id) VALUES (?)',
      ['default']
    );
  }

  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  isReady(): boolean {
    return this.db !== null;
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync(`
        DELETE FROM transactions;
        DELETE FROM budgets;
        DELETE FROM goals;
        DELETE FROM weight_entries;
        DELETE FROM body_measurements;
        DELETE FROM exercises;
        DELETE FROM habits;
        DELETE FROM habit_entries;
        UPDATE user_profile SET age = NULL, height = NULL, gender = NULL, activity_level = NULL, target_weight = NULL;
        UPDATE settings SET currency = 'IDR', date_format = 'MM/dd/yyyy', measurement_unit = 'metric', theme = 'system', notifications = '{"habits":true,"budgets":true,"goals":true}';
      `);
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw error;
    }
  }
}

export const database = DatabaseService.getInstance();