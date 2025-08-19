import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { spacing, fontSize } from '../../constants/theme';
import { formatCurrency as formatCurrencyUtil } from '../../utils/currency';

export default function FinanceDashboard() {
  const { theme } = useTheme();
  const { transactions, budgets, goals, getMonthlyBalance } = useFinance();
  const { settings } = useSettings();
  
  const { income, expenses, balance } = getMonthlyBalance();

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, settings.currency);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.surface }]}>
        <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
          Monthly Balance
        </Text>
        <Text style={[styles.balanceAmount, { color: theme.text }]}>
          {formatCurrency(balance)}
        </Text>
        <View style={styles.balanceRow}>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceItemLabel, { color: theme.textSecondary }]}>
              Income
            </Text>
            <Text style={[styles.balanceItemAmount, { color: theme.success }]}>
              {formatCurrency(income)}
            </Text>
          </View>
          <View style={styles.balanceItem}>
            <Text style={[styles.balanceItemLabel, { color: theme.textSecondary }]}>
              Expenses
            </Text>
            <Text style={[styles.balanceItemAmount, { color: theme.error }]}>
              {formatCurrency(expenses)}
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push('/finance/add-transaction')}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.quickActionText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Menu Items */}
      <View style={[styles.menuSection, { backgroundColor: theme.surface }]}>
        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/finance/transactions')}
        >
          <Ionicons name="list" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Transactions</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/finance/budgets')}
        >
          <Ionicons name="wallet" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Budgets</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.menuItem, { borderBottomColor: theme.border }]}
          onPress={() => router.push('/finance/goals')}
        >
          <Ionicons name="flag" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Goals</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/finance/analytics')}
        >
          <Ionicons name="analytics" size={24} color={theme.primary} />
          <Text style={[styles.menuText, { color: theme.text }]}>Analytics</Text>
          <Ionicons name="chevron-forward" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Recent Transactions */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Recent Transactions
          </Text>
          <TouchableOpacity onPress={() => router.push('/finance/transactions')}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
          </TouchableOpacity>
        </View>
        {transactions.slice(0, 5).map((transaction) => (
          <View
            key={transaction.id}
            style={[styles.transactionItem, { borderBottomColor: theme.border }]}
          >
            <View>
              <Text style={[styles.transactionCategory, { color: theme.text }]}>
                {transaction.category}
              </Text>
              <Text style={[styles.transactionDescription, { color: theme.textSecondary }]}>
                {transaction.description}
              </Text>
            </View>
            <Text
              style={[
                styles.transactionAmount,
                { color: transaction.type === 'income' ? theme.success : theme.error },
              ]}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  balanceCard: {
    margin: spacing.md,
    padding: spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: fontSize.sm,
    marginBottom: spacing.xs,
  },
  balanceAmount: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    marginBottom: spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceItemLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacing.xs,
  },
  balanceItemAmount: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  quickActions: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: 8,
  },
  quickActionText: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  menuSection: {
    marginHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
  },
  menuText: {
    flex: 1,
    fontSize: fontSize.md,
    marginLeft: spacing.md,
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: fontSize.sm,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
  },
  transactionCategory: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  transactionDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});