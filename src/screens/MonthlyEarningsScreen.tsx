import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useExpenseStore } from '@/store/expenseStore';
import { useStockStore } from '@/store/stockStore';

interface MonthData {
  month: string;
  year: number;
  monthNum: number;
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalMargin: number;
  invoiceCount: number;
  expenseCount: number;
}

export default function MonthlyEarningsScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const { expenses, loadExpenses } = useExpenseStore();
  const { stockItems, loadStockItems } = useStockStore();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadInvoices();
    loadExpenses();
    loadStockItems('all');
  }, []);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    invoices.forEach(inv => {
      const date = new Date(inv.createdAt);
      years.add(date.getFullYear());
    });
    expenses.forEach(exp => {
      const date = new Date(exp.date);
      years.add(date.getFullYear());
    });
    // Add current year if no data
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [invoices, expenses]);

  // Calculate monthly earnings data
  const monthlyData = useMemo(() => {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    const data: MonthData[] = [];

    months.forEach((month, index) => {
      // Filter invoices for this month
      const monthInvoices = invoices.filter(inv => {
        const date = new Date(inv.createdAt);
        return date.getFullYear() === selectedYear && date.getMonth() === index;
      });

      // Filter expenses for this month
      const monthExpenses = expenses.filter(exp => {
        const date = new Date(exp.date);
        return date.getFullYear() === selectedYear && date.getMonth() === index;
      });

      // Calculate totals
      const totalSales = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const totalExpenses = monthExpenses.reduce(
        (sum, exp) => sum + exp.amount,
        0,
      );
      const netProfit = totalSales - totalExpenses;

      // Calculate margin (sale price - purchase price for all items sold)
      let totalMargin = 0;
      monthInvoices.forEach(invoice => {
        invoice.items.forEach(item => {
          const stockItem = stockItems.find(s => s.id === item.stockItemId);
          if (stockItem) {
            const purchaseCost = stockItem.purchasePrice * item.quantity;
            const saleValue = item.total;
            totalMargin += saleValue - purchaseCost;
          }
        });
      });

      data.push({
        month,
        year: selectedYear,
        monthNum: index,
        totalSales,
        totalExpenses,
        netProfit,
        totalMargin,
        invoiceCount: monthInvoices.length,
        expenseCount: monthExpenses.length,
      });
    });

    return data;
  }, [invoices, expenses, stockItems, selectedYear]);

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, month) => ({
        totalSales: acc.totalSales + month.totalSales,
        totalExpenses: acc.totalExpenses + month.totalExpenses,
        netProfit: acc.netProfit + month.netProfit,
        totalMargin: acc.totalMargin + month.totalMargin,
        invoiceCount: acc.invoiceCount + month.invoiceCount,
        expenseCount: acc.expenseCount + month.expenseCount,
      }),
      {
        totalSales: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalMargin: 0,
        invoiceCount: 0,
        expenseCount: 0,
      },
    );
  }, [monthlyData]);

  const renderMonthCard = (data: MonthData) => {
    const isCurrentMonth =
      data.monthNum === new Date().getMonth() &&
      data.year === new Date().getFullYear();

    const hasData = data.invoiceCount > 0 || data.expenseCount > 0;

    return (
      <View
        key={data.month}
        style={[
          styles.monthCard,
          {
            backgroundColor: theme.card,
            borderColor: isCurrentMonth ? theme.primary : theme.border,
            borderWidth: isCurrentMonth ? 2 : 1,
          },
        ]}
      >
        <View style={styles.monthHeader}>
          <View style={styles.monthTitleRow}>
            <Text style={[styles.monthName, { color: theme.text }]}>
              {data.month}
            </Text>
            {isCurrentMonth && (
              <View
                style={[
                  styles.currentBadge,
                  { backgroundColor: theme.primary },
                ]}
              >
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
          </View>
          <View style={styles.invoiceCount}>
            <Icon name="receipt" size={14} color={theme.textTertiary} />
            <Text
              style={[styles.invoiceCountText, { color: theme.textTertiary }]}
            >
              {data.invoiceCount} invoices
            </Text>
          </View>
        </View>

        {hasData ? (
          <>
            <View style={styles.monthStats}>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: theme.success + '20' },
                  ]}
                >
                  <Icon name="arrow-up" size={16} color={theme.success} />
                </View>
                <View>
                  <Text
                    style={[styles.statLabel, { color: theme.textTertiary }]}
                  >
                    Sales
                  </Text>
                  <Text style={[styles.statValue, { color: theme.success }]}>
                    PKR {data.totalSales.toLocaleString()}
                  </Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: theme.danger + '20' },
                  ]}
                >
                  <Icon name="arrow-down" size={16} color={theme.danger} />
                </View>
                <View>
                  <Text
                    style={[styles.statLabel, { color: theme.textTertiary }]}
                  >
                    Expenses
                  </Text>
                  <Text style={[styles.statValue, { color: theme.danger }]}>
                    PKR {data.totalExpenses.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={styles.profitRow}>
              <View style={styles.profitItem}>
                <Text
                  style={[styles.profitLabel, { color: theme.textSecondary }]}
                >
                  Gross Profit
                </Text>
                <Text
                  style={[
                    styles.profitValue,
                    {
                      color:
                        data.totalMargin >= 0 ? theme.success : theme.danger,
                    },
                  ]}
                >
                  PKR {data.totalMargin.toLocaleString()}
                </Text>
              </View>
              <View style={styles.profitItem}>
                <Text
                  style={[styles.profitLabel, { color: theme.textSecondary }]}
                >
                  Net (After Exp.)
                </Text>
                <Text
                  style={[
                    styles.profitValue,
                    {
                      color: data.netProfit >= 0 ? theme.primary : theme.danger,
                    },
                  ]}
                >
                  PKR {(data.totalMargin - data.totalExpenses).toLocaleString()}
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Icon name="calendar-blank" size={32} color={theme.textTertiary} />
            <Text style={[styles.noDataText, { color: theme.textTertiary }]}>
              No transactions
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Monthly Earnings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Year Selector */}
      <View style={[styles.yearSelector, { backgroundColor: theme.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearScroll}
        >
          {availableYears.map(year => (
            <TouchableOpacity
              key={year}
              style={[
                styles.yearChip,
                {
                  backgroundColor:
                    selectedYear === year ? theme.primary : theme.card,
                  borderColor: theme.border,
                },
              ]}
              onPress={() => setSelectedYear(year)}
            >
              <Text
                style={[
                  styles.yearChipText,
                  { color: selectedYear === year ? '#fff' : theme.text },
                ]}
              >
                {year}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Yearly Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.summaryTitle}>Yearly Summary {selectedYear}</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>
                PKR {yearlyTotals.totalSales.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total Expenses</Text>
              <Text style={styles.summaryValue}>
                PKR {yearlyTotals.totalExpenses.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Gross Profit</Text>
              <Text style={styles.summaryValue}>
                PKR {yearlyTotals.totalMargin.toLocaleString()}
              </Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Net Profit</Text>
              <Text style={styles.summaryValue}>
                PKR{' '}
                {(
                  yearlyTotals.totalMargin - yearlyTotals.totalExpenses
                ).toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.summaryFooter}>
            <View style={styles.summaryFooterItem}>
              <Icon name="receipt" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryFooterText}>
                {yearlyTotals.invoiceCount} Invoices
              </Text>
            </View>
            <View style={styles.summaryFooterItem}>
              <Icon name="cash-minus" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.summaryFooterText}>
                {yearlyTotals.expenseCount} Expenses
              </Text>
            </View>
          </View>
        </View>

        {/* Monthly Cards */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Monthly Breakdown
        </Text>
        {monthlyData.map(renderMonthCard)}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  yearSelector: {
    paddingVertical: 12,
  },
  yearScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  yearChip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 10,
  },
  yearChipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryItem: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  summaryFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryFooterText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  monthCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  monthName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  invoiceCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  invoiceCountText: {
    fontSize: 12,
  },
  monthStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  profitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  profitItem: {
    flex: 1,
  },
  profitLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  profitValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noDataText: {
    fontSize: 14,
    marginTop: 8,
  },
});
