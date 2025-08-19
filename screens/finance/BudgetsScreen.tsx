import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { FINANCE_CATEGORIES } from '../../types/finance';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

const budgetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a valid positive number'),
  period: z.enum(['monthly', 'weekly']),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

export default function BudgetsScreen() {
  const { theme } = useTheme();
  const { budgets, addBudget, updateBudget, deleteBudget, getMonthlySpending } = useFinance();
  const { settings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      period: 'monthly',
    },
  });

  const onSubmit = async (data: BudgetFormData) => {
    try {
      const budgetData = {
        category: data.category,
        amount: parseFloat(data.amount),
        period: data.period as 'monthly' | 'weekly',
      };

      if (editingBudget) {
        await updateBudget(editingBudget.id, budgetData);
      } else {
        await addBudget(budgetData);
      }

      reset();
      setShowForm(false);
      setEditingBudget(null);
    } catch (error) {
      console.error('Budget save error:', error);
      Alert.alert('Error', 'Failed to save budget: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
    reset({
      category: budget.category,
      amount: budget.amount.toString(),
      period: budget.period,
    });
    setShowForm(true);
  };

  const handleDelete = (budgetId: string) => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteBudget(budgetId),
        },
      ]
    );
  };

  const getBudgetProgress = (budget: any) => {
    const spent = getMonthlySpending(budget.category);
    const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
    return {
      spent,
      percentage: Math.min(percentage, 100),
      remaining: Math.max(budget.amount - spent, 0),
    };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage <= 70) return theme.success;
    if (percentage <= 90) return theme.warning;
    return theme.error;
  };

  const getCategoryName = (categoryId: string) => {
    const category = FINANCE_CATEGORIES.expense.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {budgets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="wallet-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No budgets yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Create your first budget to track spending
            </Text>
          </View>
        ) : (
          budgets.map((budget) => {
            const progress = getBudgetProgress(budget);
            return (
              <Card key={budget.id} style={styles.budgetCard}>
                <View style={styles.budgetHeader}>
                  <View>
                    <Text style={[styles.categoryName, { color: theme.text }]}>
                      {getCategoryName(budget.category)}
                    </Text>
                    <Text style={[styles.period, { color: theme.textSecondary }]}>
                      {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} Budget
                    </Text>
                  </View>
                  <View style={styles.budgetActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(budget)}
                    >
                      <Ionicons name="pencil" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(budget.id)}
                    >
                      <Ionicons name="trash" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.budgetAmount}>
                  <Text style={[styles.spentAmount, { color: theme.text }]}>
                    {formatCurrency(progress.spent, settings.currency)} of {formatCurrency(budget.amount, settings.currency)}
                  </Text>
                  <Text style={[styles.remainingAmount, { color: theme.textSecondary }]}>
                    {formatCurrency(progress.remaining, settings.currency)} remaining
                  </Text>
                </View>

                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${progress.percentage}%`,
                          backgroundColor: getProgressColor(progress.percentage),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                    {progress.percentage.toFixed(0)}%
                  </Text>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowForm(true)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowForm(false);
          setEditingBudget(null);
          reset();
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                setEditingBudget(null);
                reset();
              }}
            >
              <Text style={[styles.cancelButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Category</Text>
              <Controller
                control={control}
                name="category"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.categoryGrid}>
                    {FINANCE_CATEGORIES.expense.map((category) => (
                      <TouchableOpacity
                        key={category.name}
                        style={[
                          styles.categoryItem,
                          {
                            backgroundColor: value === category.id ? theme.primary : theme.surface,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => onChange(category.id)}
                      >
                        <Ionicons
                          name={category.icon as any}
                          size={20}
                          color={value === category.id ? theme.background : theme.text}
                        />
                        <Text
                          style={[
                            styles.categoryText,
                            {
                              color: value === category.id ? theme.background : theme.text,
                            },
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
              {errors.category && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.category.message}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Budget Amount</Text>
              <Controller
                control={control}
                name="amount"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={(text) => {
                      // Only allow numbers and decimal points
                      const numericText = text.replace(/[^0-9.]/g, '');
                      // Ensure only one decimal point
                      const parts = numericText.split('.');
                      if (parts.length > 2) {
                        return;
                      }
                      onChange(numericText);
                    }}
                    placeholder={`${getCurrencySymbol(settings.currency)}0.00`}
                    keyboardType="numeric"
                  />
                )}
              />
              {errors.amount && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.amount.message}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Period</Text>
              <Controller
                control={control}
                name="period"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.periodContainer}>
                    {['monthly', 'weekly'].map((period) => (
                      <TouchableOpacity
                        key={period}
                        style={[
                          styles.periodButton,
                          {
                            backgroundColor: value === period ? theme.primary : theme.surface,
                            borderColor: theme.border,
                          },
                        ]}
                        onPress={() => onChange(period)}
                      >
                        <Text
                          style={[
                            styles.periodText,
                            {
                              color: value === period ? theme.background : theme.text,
                            },
                          ]}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              />
            </View>

            <Button
              title={editingBudget ? 'Update Budget' : 'Create Budget'}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: fontSize.md,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  budgetCard: {
    marginVertical: spacing.sm,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  categoryName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  period: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  budgetActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  budgetAmount: {
    marginBottom: spacing.md,
  },
  spentAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  remainingAmount: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'right',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cancelButton: {
    fontSize: fontSize.md,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  formGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    margin: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: fontSize.sm,
    marginLeft: spacing.xs,
  },
  periodContainer: {
    flexDirection: 'row',
  },
  periodButton: {
    flex: 1,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  periodText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
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