import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { Button, Card, Input } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { formatCurrency, getCurrencySymbol } from '../../utils/currency';

const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.string().min(1, 'Target amount is required').refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0;
  }, 'Target amount must be a valid positive number'),
  deadline: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

export default function GoalsScreen() {
  const { theme } = useTheme();
  const { goals, addGoal, updateGoal, deleteGoal, addGoalContribution } = useFinance();
  const { settings } = useSettings();
  const [showForm, setShowForm] = useState(false);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [selectedGoal, setSelectedGoal] = useState<any>(null);
  const [contributionAmount, setContributionAmount] = useState('');
  const [contributionType, setContributionType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
  });

  const onSubmit = async (data: GoalFormData) => {
    try {
      const goalData = {
        name: data.name,
        targetAmount: parseFloat(data.targetAmount),
        currentAmount: editingGoal ? editingGoal.currentAmount : 0,
        deadline: selectedDate,
      };

      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await addGoal(goalData);
      }

      reset();
      setShowForm(false);
      setEditingGoal(null);
      setSelectedDate(new Date());
      setShowDatePicker(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal');
    }
  };

  const handleEdit = (goal: any) => {
    setEditingGoal(goal);
    reset({
      name: goal.name,
      targetAmount: goal.targetAmount.toString(),
      deadline: goal.deadline ? format(new Date(goal.deadline), 'yyyy-MM-dd') : '',
    });
    if (goal.deadline) {
      setSelectedDate(new Date(goal.deadline));
    }
    setShowForm(true);
  };

  const handleDelete = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGoal(goalId),
        },
      ]
    );
  };

  const handleContribution = (goal: any) => {
    setSelectedGoal(goal);
    setContributionAmount('');
    setContributionType('deposit');
    setShowContributionForm(true);
  };

  const submitContribution = async () => {
    if (!selectedGoal || !contributionAmount) return;

    try {
      const baseAmount = parseFloat(contributionAmount);
      if (baseAmount <= 0) {
        Alert.alert('Error', 'Please enter a valid amount');
        return;
      }

      // For withdrawals, make the amount negative
      const finalAmount = contributionType === 'withdrawal' ? -baseAmount : baseAmount;
      
      // Check if withdrawal would make current amount negative
      if (contributionType === 'withdrawal' && selectedGoal.currentAmount + finalAmount < 0) {
        Alert.alert('Error', 'Cannot withdraw more than the current amount');
        return;
      }

      await addGoalContribution(selectedGoal.id, finalAmount);
      setShowContributionForm(false);
      setSelectedGoal(null);
      setContributionAmount('');
      setContributionType('deposit');
    } catch (error) {
      Alert.alert('Error', `Failed to ${contributionType === 'deposit' ? 'add contribution' : 'withdraw amount'}`);
    }
  };

  const getGoalProgress = (goal: any) => {
    const targetAmount = goal.targetAmount || 0;
    const currentAmount = goal.currentAmount || 0;
    const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;
    return {
      percentage: Math.min(percentage, 100),
      remaining: Math.max(targetAmount - currentAmount, 0),
    };
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return theme.success;
    if (percentage >= 75) return theme.primary;
    if (percentage >= 50) return theme.warning;
    return theme.textSecondary;
  };

  const isGoalOverdue = (goal: any) => {
    if (!goal.deadline) return false;
    return new Date() > new Date(goal.deadline) && goal.currentAmount < goal.targetAmount;
  };

  const getDaysRemaining = (goal: any) => {
    if (!goal.deadline) return null;
    const today = new Date();
    const deadline = new Date(goal.deadline);
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const onDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {goals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="flag-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No goals yet
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
              Set your first financial goal to start saving
            </Text>
          </View>
        ) : (
          goals.map((goal) => {
            const progress = getGoalProgress(goal);
            const daysRemaining = getDaysRemaining(goal);
            const overdue = isGoalOverdue(goal);
            
            return (
              <Card key={goal.id} style={styles.goalCard}>
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <Text style={[styles.goalName, { color: theme.text }]}>
                      {goal.name}
                    </Text>
                    {goal.deadline && (
                      <Text style={[
                        styles.deadline,
                        { color: overdue ? theme.error : theme.textSecondary }
                      ]}>
                        {overdue
                          ? 'Overdue'
                          : daysRemaining === 0
                          ? 'Due today'
                          : daysRemaining === 1
                          ? '1 day left'
                          : daysRemaining && daysRemaining > 0
                          ? `${daysRemaining} days left`
                          : 'Overdue'
                        }
                      </Text>
                    )}
                  </View>
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleContribution(goal)}
                    >
                      <Ionicons name="cash" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEdit(goal)}
                    >
                      <Ionicons name="pencil" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(goal.id)}
                    >
                      <Ionicons name="trash" size={18} color={theme.error} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.goalAmount}>
                  <Text style={[styles.currentAmount, { color: theme.text }]}>
                    {formatCurrency(goal.currentAmount || 0, settings.currency)} of {formatCurrency(goal.targetAmount || 0, settings.currency)}
                  </Text>
                  <Text style={[styles.remainingAmount, { color: theme.textSecondary }]}>
                    {formatCurrency(progress.remaining || 0, settings.currency)} remaining
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

                {progress.percentage >= 100 && (
                  <View style={[styles.completedBadge, { backgroundColor: theme.success }]}>
                    <Ionicons name="checkmark" size={16} color={theme.background} />
                    <Text style={[styles.completedText, { color: theme.background }]}>
                      Goal Achieved!
                    </Text>
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => {
          setShowForm(true);
          setSelectedDate(new Date());
          setShowDatePicker(false);
        }}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Goal Form Modal */}
      <Modal
        visible={showForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowForm(false);
          setEditingGoal(null);
          reset();
          setSelectedDate(new Date());
          setShowDatePicker(false);
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowForm(false);
                setEditingGoal(null);
                reset();
                setSelectedDate(new Date());
                setShowDatePicker(false);
              }}
            >
              <Text style={[styles.cancelButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingGoal ? 'Edit Goal' : 'Add Goal'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Goal Name</Text>
              <Controller
                control={control}
                name="name"
                render={({ field: { onChange, value } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder="e.g., Emergency Fund, Vacation, New Car"
                  />
                )}
              />
              {errors.name && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.name.message}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Target Amount</Text>
              <Controller
                control={control}
                name="targetAmount"
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
              {errors.targetAmount && (
                <Text style={[styles.errorText, { color: theme.error }]}>
                  {errors.targetAmount.message}
                </Text>
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: theme.text }]}>Deadline (Optional)</Text>
              <TouchableOpacity
                style={[styles.dateButton, { borderColor: theme.border }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={[styles.dateValue, { color: theme.text }]}>
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
                  minimumDate={new Date()}
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
                    minimumDate={new Date()}
                    style={styles.iosDatePicker}
                  />
                </View>
              )}
              
              <Text style={[styles.helpText, { color: theme.textSecondary }]}>
                Leave empty for no deadline
              </Text>
            </View>

            <Button
              title={editingGoal ? 'Update Goal' : 'Create Goal'}
              onPress={handleSubmit(onSubmit)}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Contribution Modal */}
      <Modal
        visible={showContributionForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowContributionForm(false);
          setSelectedGoal(null);
          setContributionAmount('');
          setContributionType('deposit');
        }}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <TouchableOpacity
              onPress={() => {
                setShowContributionForm(false);
                setSelectedGoal(null);
                setContributionAmount('');
                setContributionType('deposit');
              }}
            >
              <Text style={[styles.cancelButton, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {contributionType === 'deposit' ? 'Add Contribution' : 'Withdraw Amount'}
            </Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.modalContent}>
            {selectedGoal && (
              <>
                <Text style={[styles.contributionGoalName, { color: theme.text }]}>
                  {selectedGoal.name}
                </Text>
                <Text style={[styles.contributionProgress, { color: theme.textSecondary }]}>
                  Current: {formatCurrency(selectedGoal.currentAmount || 0, settings.currency)} of {formatCurrency(selectedGoal.targetAmount || 0, settings.currency)}
                </Text>

                {/* Contribution Type Toggle */}
                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>Action</Text>
                  <View style={styles.contributionTypeToggle}>
                    <TouchableOpacity
                      style={[
                        styles.contributionTypeButton,
                        {
                          backgroundColor: contributionType === 'deposit' ? theme.success : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setContributionType('deposit')}
                    >
                      <Ionicons 
                        name="add-circle" 
                        size={18} 
                        color={contributionType === 'deposit' ? 'white' : theme.text} 
                      />
                      <Text
                        style={[
                          styles.contributionTypeText,
                          { color: contributionType === 'deposit' ? 'white' : theme.text },
                        ]}
                      >
                        Deposit
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.contributionTypeButton,
                        {
                          backgroundColor: contributionType === 'withdrawal' ? theme.error : theme.surface,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setContributionType('withdrawal')}
                    >
                      <Ionicons 
                        name="remove-circle" 
                        size={18} 
                        color={contributionType === 'withdrawal' ? 'white' : theme.text} 
                      />
                      <Text
                        style={[
                          styles.contributionTypeText,
                          { color: contributionType === 'withdrawal' ? 'white' : theme.text },
                        ]}
                      >
                        Withdraw
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.formGroup}>
                  <Text style={[styles.label, { color: theme.text }]}>
                    {contributionType === 'deposit' ? 'Deposit Amount' : 'Withdrawal Amount'}
                  </Text>
                  <Input
                    value={contributionAmount}
                    onChangeText={(text) => {
                      // Only allow numbers and decimal points
                      const numericText = text.replace(/[^0-9.]/g, '');
                      // Ensure only one decimal point
                      const parts = numericText.split('.');
                      if (parts.length > 2) {
                        return;
                      }
                      setContributionAmount(numericText);
                    }}
                    placeholder={`${getCurrencySymbol(settings.currency)}0.00`}
                    keyboardType="numeric"
                  />
                </View>

                <Button
                  title={contributionType === 'deposit' ? 'Add Contribution' : 'Withdraw Amount'}
                  onPress={submitContribution}
                  style={styles.submitButton}
                />
              </>
            )}
          </View>
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
  goalCard: {
    marginVertical: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  goalInfo: {
    flex: 1,
  },
  goalName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
  deadline: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  goalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: spacing.sm,
    marginLeft: spacing.xs,
  },
  goalAmount: {
    marginBottom: spacing.md,
  },
  currentAmount: {
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
    marginBottom: spacing.sm,
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
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  completedText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginLeft: spacing.xs,
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
  helpText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  submitButton: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  errorText: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  contributionGoalName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  contributionProgress: {
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
  },
  contributionTypeToggle: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  contributionTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    gap: spacing.xs,
  },
  contributionTypeText: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  dateValue: {
    fontSize: fontSize.md,
    flex: 1,
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