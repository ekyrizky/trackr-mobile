export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: Date;
  type: 'income' | 'expense';
  createdAt: Date;
  updatedAt: Date;
}

export interface Budget {
  id: string;
  category: string;
  amount: number;
  period: 'monthly' | 'weekly';
  spent: number;
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const FINANCE_CATEGORIES = {
  income: [
    { id: 'salary', name: 'Salary', icon: 'briefcase', color: '#34C759' },
    { id: 'freelance', name: 'Freelance', icon: 'laptop', color: '#5AC8FA' },
    { id: 'investment', name: 'Investment', icon: 'trending-up', color: '#007AFF' },
    { id: 'gift', name: 'Gift', icon: 'gift', color: '#FF9500' },
    { id: 'other_income', name: 'Other', icon: 'more-horizontal', color: '#8E8E93' },
  ],
  expense: [
    { id: 'food', name: 'Food & Dining', icon: 'utensils', color: '#FF3B30' },
    { id: 'transport', name: 'Transport', icon: 'car', color: '#5AC8FA' },
    { id: 'shopping', name: 'Shopping', icon: 'shopping-bag', color: '#AF52DE' },
    { id: 'entertainment', name: 'Entertainment', icon: 'film', color: '#FF9500' },
    { id: 'bills', name: 'Bills & Utilities', icon: 'file-text', color: '#007AFF' },
    { id: 'health', name: 'Healthcare', icon: 'heart', color: '#FF3B30' },
    { id: 'education', name: 'Education', icon: 'book', color: '#34C759' },
    { id: 'other_expense', name: 'Other', icon: 'more-horizontal', color: '#8E8E93' },
  ],
};