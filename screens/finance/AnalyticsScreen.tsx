import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths } from 'date-fns';

import { useTheme } from '../../contexts/ThemeContext';
import { useFinance } from '../../contexts/FinanceContext';
import { useSettings } from '../../contexts/SettingsContext';
import { FINANCE_CATEGORIES } from '../../types/finance';
import { Card } from '../../components/ui';
import { spacing, fontSize } from '../../constants/theme';
import { formatCurrency as formatCurrencyUtil } from '../../utils/currency';

const screenWidth = Dimensions.get('window').width;

export default function AnalyticsScreen() {
  const { theme } = useTheme();
  const { transactions, getMonthlyBalance, getCategorySpending } = useFinance();
  const { settings } = useSettings();

  const formatCurrency = (amount: number) => {
    return formatCurrencyUtil(amount, settings.currency);
  };

  // Monthly balance over time
  const monthlyData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
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
        month: format(date, 'MMM'),
        income,
        expenses,
        balance: income - expenses,
      };
    });

    return {
      labels: last6Months.map(d => d.month),
      datasets: [
        {
          data: last6Months.map(d => d.income),
          color: () => theme.success,
          strokeWidth: 2,
        },
        {
          data: last6Months.map(d => d.expenses),
          color: () => theme.error,
          strokeWidth: 2,
        },
      ],
      legend: ['Income', 'Expenses'],
    };
  }, [transactions, theme]);

  // Category spending for current month
  const categoryData = useMemo(() => {
    const categorySpending = getCategorySpending('month');
    const expenseCategories = FINANCE_CATEGORIES.expense;
    
    const data = expenseCategories
      .map(category => ({
        name: category.name,
        amount: categorySpending[category.id] || 0,
        color: category.color,
        legendFontColor: theme.text,
        legendFontSize: 12,
      }))
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6); // Top 6 categories

    return data;
  }, [transactions, theme]);

  // Daily spending trend for current month
  const dailySpendingData = useMemo(() => {
    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const dailySpending = days.map(day => {
      const dayTransactions = transactions.filter(t => 
        format(t.date, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd') &&
        t.type === 'expense'
      );
      
      return dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    });

    return {
      labels: days.map(day => format(day, 'dd')),
      datasets: [{
        data: dailySpending,
        color: () => theme.primary,
        strokeWidth: 2,
      }],
    };
  }, [transactions, theme]);

  const chartConfig = {
    backgroundColor: theme.surface,
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${isDarkMode ? '255, 255, 255' : '0, 0, 0'}, ${opacity})`,
    labelColor: (opacity = 1) => theme.text,
    style: {
      borderRadius: 12,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '1',
      stroke: theme.primary,
    },
  };

  const isDarkMode = theme.background === '#000000';

  const { income, expenses, balance } = getMonthlyBalance();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Monthly Overview */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Monthly Overview
        </Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: theme.success }]}>
              {formatCurrency(income)}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Income
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[styles.overviewValue, { color: theme.error }]}>
              {formatCurrency(expenses)}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Expenses
            </Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={[
              styles.overviewValue, 
              { color: balance >= 0 ? theme.success : theme.error }
            ]}>
              {formatCurrency(balance)}
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textSecondary }]}>
              Balance
            </Text>
          </View>
        </View>
      </Card>

      {/* Income vs Expenses Trend */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Income vs Expenses (6 Months)
        </Text>
        {monthlyData.datasets[0].data.length > 0 ? (
          <LineChart
            data={monthlyData}
            width={screenWidth - spacing.md * 4}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No data available for the selected period
            </Text>
          </View>
        )}
      </Card>

      {/* Category Breakdown */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Spending by Category
        </Text>
        {categoryData.length > 0 ? (
          <PieChart
            data={categoryData}
            width={screenWidth - spacing.md * 4}
            height={220}
            chartConfig={chartConfig}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="15"
            center={[10, 10]}
            absolute
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No expenses recorded this month
            </Text>
          </View>
        )}
      </Card>

      {/* Daily Spending */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Daily Spending This Month
        </Text>
        {dailySpendingData.datasets[0].data.some(value => value > 0) ? (
          <BarChart
            data={dailySpendingData}
            width={screenWidth - spacing.md * 4}
            height={220}
            chartConfig={chartConfig}
            verticalLabelRotation={30}
            style={styles.chart}
            yAxisLabel=""
            yAxisSuffix=""
          />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No spending recorded this month
            </Text>
          </View>
        )}
      </Card>

      {/* Top Categories */}
      <Card style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Top Spending Categories
        </Text>
        {categoryData.length > 0 ? (
          categoryData.slice(0, 5).map((category, index) => (
            <View key={category.name} style={styles.categoryItem}>
              <View style={styles.categoryInfo}>
                <View style={[styles.categoryColor, { backgroundColor: category.color }]} />
                <Text style={[styles.categoryName, { color: theme.text }]}>
                  {category.name}
                </Text>
              </View>
              <Text style={[styles.categoryAmount, { color: theme.text }]}>
                {formatCurrency(category.amount)}
              </Text>
            </View>
          ))
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={[styles.noDataText, { color: theme.textSecondary }]}>
              No spending data available
            </Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  section: {
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  overviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  overviewValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
  },
  overviewLabel: {
    fontSize: fontSize.sm,
    marginTop: spacing.xs,
  },
  chart: {
    marginVertical: spacing.sm,
    borderRadius: 12,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  noDataText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: spacing.sm,
  },
  categoryName: {
    fontSize: fontSize.md,
  },
  categoryAmount: {
    fontSize: fontSize.md,
    fontWeight: '600',
  },
});