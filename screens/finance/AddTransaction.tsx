import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { FINANCE_CATEGORIES } from '../../types/finance';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';


const transactionSchema = z.object({
  amount: z.string().min(1, 'Amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Amount must be a valid positive number'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  type: z.enum(['income', 'expense']),
});

type TransactionForm = z.infer<typeof transactionSchema>;

export default function AddTransaction() {
  const params = useLocalSearchParams();
  const { theme } = useTheme();
  const { addTransaction, updateTransaction, transactions } = useFinance();
  const { settings } = useSettings();
  
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const transactionId = params.transactionId as string;
  const isEditing = !!transactionId;
  
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      description: '',
    },
  });

  useEffect(() => {
    if (isEditing && transactionId) {
      const transaction = transactions.find(t => t.id === transactionId);
      if (transaction) {
        setValue('amount', transaction.amount.toString());
        setValue('category', transaction.category);
        setValue('description', transaction.description);
        setValue('type', transaction.type);
        setTransactionType(transaction.type);
        setSelectedDate(transaction.date);
      }
    }
  }, [isEditing, transactionId, transactions, setValue]);

  const onSubmit = async (data: TransactionForm) => {
    try {
      setIsLoading(true);
      
      const transactionData = {
        amount: parseFloat(data.amount),
        category: data.category,
        description: data.description || '',
        type: data.type,
        date: selectedDate,
      };

      if (isEditing && transactionId) {
        await updateTransaction(transactionId, transactionData);
      } else {
        await addTransaction(transactionData);
      }
      
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to save transaction');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = transactionType === 'income' 
    ? FINANCE_CATEGORIES.income 
    : FINANCE_CATEGORIES.expense;

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Card style={styles.card}>
        {/* Transaction Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: transactionType === 'expense' ? theme.error : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {
              setTransactionType('expense');
              setValue('type', 'expense');
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                { color: transactionType === 'expense' ? 'white' : theme.text },
              ]}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              {
                backgroundColor: transactionType === 'income' ? theme.success : theme.surface,
                borderColor: theme.border,
              },
            ]}
            onPress={() => {
              setTransactionType('income');
              setValue('type', 'income');
            }}
          >
            <Text
              style={[
                styles.typeButtonText,
                { color: transactionType === 'income' ? 'white' : theme.text },
              ]}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Amount"
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
              placeholder="0.00"
              keyboardType="numeric"
              error={errors.amount?.message}
              required
            />
          )}
        />

        {/* Category Selection */}
        <Text style={[styles.sectionLabel, { color: theme.text }]}>
          Category <Text style={{ color: theme.error }}>*</Text>
        </Text>
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, value } }) => (
            <View style={styles.categoriesGrid}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryItem,
                    {
                      backgroundColor: value === category.id ? category.color : theme.surface,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => onChange(category.id)}
                >
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={value === category.id ? 'white' : theme.text}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      { color: value === category.id ? 'white' : theme.text },
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
          <Text style={[styles.error, { color: theme.error }]}>
            {errors.category.message}
          </Text>
        )}

        {/* Description Input */}
        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Description"
              value={value}
              onChangeText={onChange}
              placeholder="Optional description"
              multiline
              numberOfLines={3}
            />
          )}
        />

        {/* Date Selection */}
        <TouchableOpacity
          style={[styles.dateButton, { borderColor: theme.border }]}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={[styles.dateLabel, { color: theme.text }]}>Date</Text>
          <Text style={[styles.dateValue, { color: theme.primary }]}>
            {format(selectedDate, 'MMM dd, yyyy')}
          </Text>
          <Ionicons name="calendar" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Date Picker for Android */}
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            onChange={onDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Date Picker for iOS */}
        {showDatePicker && Platform.OS === 'ios' && (
          <View style={styles.iosDatePickerContainer}>
            <View style={[styles.iosDatePickerHeader, { backgroundColor: theme.surface }]}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={[styles.iosDatePickerButton, { color: theme.primary }]}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              onChange={onDateChange}
              maximumDate={new Date()}
              style={styles.iosDatePicker}
            />
          </View>
        )}

        {/* Submit Button */}
        <Button
          title={isEditing ? 'Update Transaction' : 'Add Transaction'}
          onPress={handleSubmit(onSubmit)}
          disabled={isLoading}
          style={styles.submitButton}
        />
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  card: {
    margin: spacing.md,
  },
  typeToggle: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  typeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: spacing.xs,
    borderRadius: 8,
  },
  typeButtonText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  categoryItem: {
    width: '48%',
    padding: spacing.sm,
    margin: '1%',
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  categoryText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.lg,
  },
  dateLabel: {
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  dateValue: {
    fontSize: fontSize.md,
    flex: 1,
    textAlign: 'right',
    marginRight: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  error: {
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
  },
  iosDatePickerContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  iosDatePickerButton: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  iosDatePicker: {
    backgroundColor: 'white',
  },
});