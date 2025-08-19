import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import Swipeable from 'react-native-gesture-handler/Swipeable';

import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Transaction } from '../../types/finance';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { formatCurrency as formatCurrencyUtil } from '../../utils/currency';


export default function TransactionsList() {
  const { theme } = useTheme();
  const { transactions, deleteTransaction } = useFinance();
  const { settings } = useSettings();
  
  const [searchText, setSearchText] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'income' | 'expense'>('all');
  
  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, settings.currency);
  };

  const filteredTransactions = useMemo(() => {
    let filtered = transactions;

    // Filter by type
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(t => t.type === selectedFilter);
    }

    // Filter by search text
    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase()) ||
        t.category.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    return filtered;
  }, [transactions, selectedFilter, searchText]);

  const handleDeleteTransaction = (id: string) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTransaction(id),
        },
      ]
    );
  };

  const renderRightAction = (id: string) => (
    <TouchableOpacity
      style={[styles.deleteAction, { backgroundColor: theme.error }]}
      onPress={() => handleDeleteTransaction(id)}
    >
      <Ionicons name="trash" size={24} color="white" />
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <Swipeable renderRightActions={() => renderRightAction(item.id)}>
      <TouchableOpacity
        style={[styles.transactionItem, { backgroundColor: theme.surface }]}
        onPress={() => router.push({ pathname: '/finance/add-transaction', params: { transactionId: item.id } })}
      >
        <View style={styles.transactionContent}>
          <View style={styles.transactionInfo}>
            <Text style={[styles.transactionCategory, { color: theme.text }]}>
              {item.category}
            </Text>
            <Text style={[styles.transactionDescription, { color: theme.textSecondary }]}>
              {item.description || 'No description'}
            </Text>
            <Text style={[styles.transactionDate, { color: theme.textSecondary }]}>
              {format(item.date, 'MMM dd, yyyy')}
            </Text>
          </View>
          <View style={styles.transactionAmount}>
            <Text
              style={[
                styles.amountText,
                { color: item.type === 'income' ? theme.success : theme.error },
              ]}
            >
              {item.type === 'income' ? '+' : '-'}
              {formatCurrency(item.amount)}
            </Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search Input */}
      <View style={[styles.searchContainer, { backgroundColor: theme.surface }]}>
        <Ionicons name="search" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search transactions..."
          placeholderTextColor={theme.textSecondary}
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {[
          { key: 'all', label: 'All' },
          { key: 'income', label: 'Income' },
          { key: 'expense', label: 'Expense' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.filterButton,
              {
                backgroundColor: selectedFilter === filter.key ? theme.primary : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedFilter(filter.key as any)}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: selectedFilter === filter.key ? 'white' : theme.text },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-text-outline" size={64} color={theme.textSecondary} />
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        No transactions found
      </Text>
      <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        {searchText || selectedFilter !== 'all'
          ? 'Try adjusting your search or filters'
          : 'Add your first transaction to get started'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => router.push('/finance/add-transaction')}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
  },
  header: {
    padding: spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: fontSize.md,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  filterButtonText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  transactionItem: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionCategory: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: fontSize.sm,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: fontSize.xs,
  },
  transactionAmount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});