import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { database } from '../services/database';
import { createSampleData } from '../services/sampleData';

interface DatabaseContextType {
  isReady: boolean;
  error: string | null;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function useDatabaseContext() {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabaseContext must be used within a DatabaseProvider');
  }
  return context;
}

interface DatabaseProviderProps {
  children: ReactNode;
}

export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeDatabase();
  }, []);

  const initializeDatabase = async () => {
    try {
      await database.init();
      
      // Create sample data for development
      // Remove this in production
      // await createSampleData();
      
      setIsReady(true);
      console.log('Database initialized successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown database error';
      setError(errorMessage);
      console.error('Failed to initialize database:', err);
    }
  };

  return (
    <DatabaseContext.Provider value={{ isReady, error }}>
      {children}
    </DatabaseContext.Provider>
  );
}