import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Transaction, Budget, Goal } from '../types/finance';
import { database } from '../services/database';
import { notificationService } from '../services/notifications';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface FinanceContextType {
  transactions: Transaction[];
  budgets: Budget[];
  goals: Goal[];
  isLoading: boolean;
  
  // Data loading
  loadFinanceData: () => Promise<void>;
  
  // Transaction methods
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTransaction: (id: string, transaction: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  
  // Budget methods
  addBudget: (budget: Omit<Budget, 'id' | 'spent' | 'startDate' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateBudget: (id: string, budget: Partial<Budget>) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  
  // Goal methods
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addGoalContribution: (goalId: string, amount: number) => Promise<void>;
  
  // Analytics
  getMonthlyBalance: () => { income: number; expenses: number; balance: number };
  getCategorySpending: (period?: 'month' | 'week') => Record<string, number>;
  getMonthlySpending: (category: string) => number;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

interface FinanceProviderProps {
  children: ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Only load data immediately since this context will only be mounted
    // after the database is ready (via DatabaseProvider)
    loadFinanceData();
  }, []);

  const loadFinanceData = async () => {
    try {
      const db = database.getDatabase();
      
      // Load transactions
      const transactionsResult = await db.getAllAsync<any>(
        'SELECT * FROM transactions ORDER BY date DESC'
      );
      setTransactions(transactionsResult.map(t => ({
        ...t,
        date: new Date(t.date),
        createdAt: new Date(t.created_at),
        updatedAt: new Date(t.updated_at),
      })));

      // Load budgets
      const budgetsResult = await db.getAllAsync<any>('SELECT * FROM budgets');
      console.log('Loaded budgets from database:', budgetsResult);
      setBudgets(budgetsResult.map(b => ({
        ...b,
        startDate: new Date(b.start_date),
        createdAt: new Date(b.created_at),
        updatedAt: new Date(b.updated_at),
      })));

      // Load goals
      const goalsResult = await db.getAllAsync<any>('SELECT * FROM goals');
      setGoals(goalsResult.map(g => ({
        ...g,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        deadline: g.deadline ? new Date(g.deadline) : null,
        createdAt: new Date(g.created_at),
        updatedAt: new Date(g.updated_at),
      })));

      // Update budget spending
      await updateBudgetSpending();
    } catch (error) {
      console.error('Failed to load finance data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBudgetSpending = async () => {
    const db = database.getDatabase();
    const updatedBudgets = [];

    for (const budget of budgets) {
      let periodStart: string;
      let periodEnd: string;

      if (budget.period === 'monthly') {
        periodStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
        periodEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
      } else {
        // Weekly: current week starting from budget start date or current week
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)
        
        periodStart = format(weekStart, 'yyyy-MM-dd');
        periodEnd = format(weekEnd, 'yyyy-MM-dd');
      }

      const spentResult = await db.getFirstAsync<{ total: number }>(
        `SELECT SUM(amount) as total FROM transactions 
         WHERE category = ? AND type = 'expense' 
         AND date BETWEEN ? AND ?`,
        [budget.category, periodStart, periodEnd]
      );

      console.log(`Looking for transactions with category: ${budget.category}, Period: ${periodStart} to ${periodEnd}`);
      const spent = spentResult?.total || 0;
      console.log(`Budget ${budget.category}: spent ${spent} of ${budget.amount} (${budget.period})`);
      
      // Update database
      await db.runAsync(
        'UPDATE budgets SET spent = ? WHERE id = ?',
        [spent, budget.id]
      );

      // Update local state
      const updatedBudget = {
        ...budget,
        spent: spent
      };
      updatedBudgets.push(updatedBudget);
      
      // Check for budget alerts
      const spentPercentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      if (spentPercentage >= 80) { // Alert at 80%, 90%, and 100%
        try {
          await notificationService.scheduleBudgetAlert(budget.id, budget.category, spentPercentage);
        } catch (error) {
          console.error('Failed to schedule budget alert:', error);
        }
      }
    }

    // Update local state with new spending amounts
    setBudgets(updatedBudgets);
  };

  const updateBudgetSpendingForBudget = async (budget: Budget) => {
    const db = database.getDatabase();
    
    let periodStart: string;
    let periodEnd: string;

    if (budget.period === 'monthly') {
      periodStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      periodEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
    } else {
      // Weekly: current week
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      periodStart = format(weekStart, 'yyyy-MM-dd');
      periodEnd = format(weekEnd, 'yyyy-MM-dd');
    }

    const spentResult = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(amount) as total FROM transactions 
       WHERE category = ? AND type = 'expense' 
       AND date BETWEEN ? AND ?`,
      [budget.category, periodStart, periodEnd]
    );

    console.log(`Budget category: ${budget.category}, Period: ${periodStart} to ${periodEnd}, Found transactions: ${spentResult?.total || 0}`);

    const spent = spentResult?.total || 0;
    console.log(`Single budget ${budget.category}: spent ${spent} of ${budget.amount} (${budget.period})`);
    
    // Update database
    await db.runAsync(
      'UPDATE budgets SET spent = ? WHERE id = ?',
      [spent, budget.id]
    );

    // Update local state
    setBudgets(prevBudgets => 
      prevBudgets.map(b => 
        b.id === budget.id ? { ...b, spent: spent } : b
      )
    );
  };

  // Transaction methods
  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = database.getDatabase();
    const id = Date.now().toString();
    const now = new Date();
    
    await db.runAsync(
      `INSERT INTO transactions (id, amount, category, description, date, type, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        transaction.amount,
        transaction.category,
        transaction.description,
        format(transaction.date, 'yyyy-MM-dd'),
        transaction.type,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    const newTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: now,
      updatedAt: now,
    };

    setTransactions([newTransaction, ...transactions]);
    console.log('Transaction added:', { category: transaction.category, amount: transaction.amount, type: transaction.type });
    await updateBudgetSpending();
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(format(updates.date, 'yyyy-MM-dd'));
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setTransactions(transactions.map(t => 
      t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
    ));
    await updateBudgetSpending();
  };

  const deleteTransaction = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
    setTransactions(transactions.filter(t => t.id !== id));
    await updateBudgetSpending();
  };

  // Budget methods
  const addBudget = async (budget: Omit<Budget, 'id' | 'spent' | 'startDate' | 'createdAt' | 'updatedAt'>) => {
    try {
      console.log('Adding budget:', budget);
      const db = database.getDatabase();
      const id = Date.now().toString();
      const now = new Date();
      
      // Set default start date based on period
      const startDate = budget.period === 'monthly' 
        ? startOfMonth(now)
        : now; // For weekly, start from current date
      
      console.log('Budget data to insert:', { id, category: budget.category, amount: budget.amount, period: budget.period, startDate });
      
      await db.runAsync(
        `INSERT INTO budgets (id, category, amount, period, start_date, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        budget.category,
        budget.amount,
        budget.period,
        format(startDate, 'yyyy-MM-dd'),
        now.toISOString(),
        now.toISOString(),
      ]
    );

      const newBudget: Budget = {
        ...budget,
        id,
        spent: 0,
        startDate,
        createdAt: now,
        updatedAt: now,
      };

      setBudgets([...budgets, newBudget]);
      console.log('Budget added successfully:', newBudget);
      // Update spending for the new budget
      await updateBudgetSpendingForBudget(newBudget);
    } catch (error) {
      console.error('Failed to add budget:', error);
      throw error;
    }
  };

  const updateBudget = async (id: string, updates: Partial<Budget>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.category !== undefined) {
      fields.push('category = ?');
      values.push(updates.category);
    }
    if (updates.amount !== undefined) {
      fields.push('amount = ?');
      values.push(updates.amount);
    }
    if (updates.period !== undefined) {
      fields.push('period = ?');
      values.push(updates.period);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setBudgets(budgets.map(b => 
      b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
    ));
  };

  const deleteBudget = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
    setBudgets(budgets.filter(b => b.id !== id));
  };

  // Goal methods
  const addGoal = async (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const db = database.getDatabase();
    const id = Date.now().toString();
    const now = new Date();
    
    await db.runAsync(
      `INSERT INTO goals (id, name, target_amount, current_amount, deadline, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        goal.name,
        goal.targetAmount,
        goal.currentAmount || 0,
        goal.deadline ? format(goal.deadline, 'yyyy-MM-dd') : null,
        now.toISOString(),
        now.toISOString(),
      ]
    );

    const newGoal: Goal = {
      ...goal,
      id,
      currentAmount: goal.currentAmount || 0,
      createdAt: now,
      updatedAt: now,
    };

    setGoals([...goals, newGoal]);
    
    // Schedule goal reminder notification
    try {
      const daysUntilDeadline = goal.deadline 
        ? Math.ceil((new Date(goal.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : undefined;
      await notificationService.scheduleGoalReminder(id, goal.name, daysUntilDeadline);
      console.log('Goal reminder scheduled for:', goal.name);
    } catch (error) {
      console.error('Failed to schedule goal reminder:', error);
    }
  };

  const updateGoal = async (id: string, updates: Partial<Goal>) => {
    const db = database.getDatabase();
    const fields = [];
    const values = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.targetAmount !== undefined) {
      fields.push('target_amount = ?');
      values.push(updates.targetAmount);
    }
    if (updates.currentAmount !== undefined) {
      fields.push('current_amount = ?');
      values.push(updates.currentAmount);
    }
    if (updates.deadline !== undefined) {
      fields.push('deadline = ?');
      values.push(updates.deadline ? format(updates.deadline, 'yyyy-MM-dd') : null);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    await db.runAsync(
      `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`,
      values
    );

    setGoals(goals.map(g => 
      g.id === id ? { ...g, ...updates, updatedAt: new Date() } : g
    ));
  };

  const deleteGoal = async (id: string) => {
    const db = database.getDatabase();
    await db.runAsync('DELETE FROM goals WHERE id = ?', [id]);
    setGoals(goals.filter(g => g.id !== id));
    
    // Cancel goal reminder notification
    try {
      await notificationService.cancelGoalReminder(id);
      console.log('Goal reminder cancelled for goal:', id);
    } catch (error) {
      console.error('Failed to cancel goal reminder:', error);
    }
  };

  // Analytics methods
  const getMonthlyBalance = () => {
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    
    const monthTransactions = transactions.filter(t => 
      t.date >= monthStart && t.date <= monthEnd
    );

    const income = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      income,
      expenses,
      balance: income - expenses,
    };
  };

  const getCategorySpending = (period: 'month' | 'week' = 'month') => {
    const start = period === 'month' ? startOfMonth(new Date()) : new Date();
    const end = period === 'month' ? endOfMonth(new Date()) : new Date();

    const periodTransactions = transactions.filter(t => 
      t.type === 'expense' && t.date >= start && t.date <= end
    );

    return periodTransactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);
  };

  const getMonthlySpending = (category: string) => {
    // Find the budget for this category to determine the period
    const budget = budgets.find(b => b.category === category);
    
    let periodStart: Date;
    let periodEnd: Date;

    if (budget?.period === 'weekly') {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of current week (Sunday)
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6); // End of current week (Saturday)
      
      periodStart = weekStart;
      periodEnd = weekEnd;
    } else {
      // Default to monthly
      periodStart = startOfMonth(new Date());
      periodEnd = endOfMonth(new Date());
    }
    
    return transactions
      .filter(t => 
        t.type === 'expense' && 
        t.category === category && 
        t.date >= periodStart && 
        t.date <= periodEnd
      )
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const addGoalContribution = async (goalId: string, amount: number) => {
    const db = database.getDatabase();
    const goal = goals.find(g => g.id === goalId);
    
    if (!goal) {
      throw new Error('Goal not found');
    }

    const newCurrentAmount = goal.currentAmount + amount;
    const now = new Date();

    await db.runAsync(
      'UPDATE goals SET current_amount = ?, updated_at = ? WHERE id = ?',
      [newCurrentAmount, now.toISOString(), goalId]
    );

    setGoals(goals.map(g => 
      g.id === goalId 
        ? { ...g, currentAmount: newCurrentAmount, updatedAt: now }
        : g
    ));
  };

  return (
    <FinanceContext.Provider
      value={{
        transactions,
        budgets,
        goals,
        isLoading,
        loadFinanceData,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBudget,
        updateBudget,
        deleteBudget,
        addGoal,
        updateGoal,
        deleteGoal,
        addGoalContribution,
        getMonthlyBalance,
        getCategorySpending,
        getMonthlySpending,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};