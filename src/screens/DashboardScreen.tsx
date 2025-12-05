import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStockStore } from '@/store/stockStore';
import { useClientStore } from '@/store/clientStore';
import { useThemeStore } from '@/store/themeStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useExpenseStore } from '@/store/expenseStore';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { lowStockItems, loadLowStockItems, stockItems, loadStockItems } =
    useStockStore();
  const { clients, loadClients } = useClientStore();
  const { theme, isDark } = useThemeStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const { expenses, loadExpenses } = useExpenseStore();

  const [stockValue, setStockValue] = useState({
    purchaseValue: 0,
    saleValue: 0,
  });
  const [categoryValues, setCategoryValues] = useState<
    { categoryId: string; value: number }[]
  >([]);
  const [monthlySales, setMonthlySales] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const [monthlyExpenses, setMonthlyExpenses] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);
  const [expensesByCategory, setExpensesByCategory] = useState<
    { label: string; value: number }[]
  >([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLowStockItems();
      loadClients();
      loadStockItems('all');
      loadStockStats();
      loadInvoices();
      loadExpenses();
    });
    return unsubscribe;
  }, [navigation]);

  // Calculate monthly sales from invoices (current year)
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const monthSales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Jan to Dec

    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      if (invoiceDate.getFullYear() === currentYear) {
        const month = invoiceDate.getMonth(); // 0 = January
        monthSales[month] += invoice.total;
      }
    });

    setMonthlySales(monthSales);
  }, [invoices]);

  // Calculate monthly expenses (current year)
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const monthExp = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      if (expenseDate.getFullYear() === currentYear) {
        const month = expenseDate.getMonth();
        monthExp[month] += expense.amount;
      }
    });

    setMonthlyExpenses(monthExp);
  }, [expenses]);

  // Calculate expenses by category
  useEffect(() => {
    const categoryTotals: { [key: string]: number } = {};

    expenses.forEach(expense => {
      const categoryName = expense.category?.name || 'Misc';
      categoryTotals[categoryName] =
        (categoryTotals[categoryName] || 0) + expense.amount;
    });

    const expenseData = Object.entries(categoryTotals)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 4); // Top 4 categories

    setExpensesByCategory(expenseData);
  }, [expenses]);

  // Calculate net earnings (sales - expenses) per month
  const monthlyEarnings = useMemo(() => {
    return monthlySales.map((sale, index) => sale - monthlyExpenses[index]);
  }, [monthlySales, monthlyExpenses]);

  // Calculate total margin from stock (sale price - purchase price)
  const totalMargin = useMemo(() => {
    return stockItems.reduce((total, item) => {
      const margin =
        (item.salePrice - item.purchasePrice) * item.currentQuantity;
      return total + margin;
    }, 0);
  }, [stockItems]);

  // Calculate current month earnings
  const currentMonthEarnings = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return monthlyEarnings[currentMonth] || 0;
  }, [monthlyEarnings]);

  const loadStockStats = async () => {
    try {
      const { stockRepository } = await import('@/database/repositories');
      const value = await stockRepository.getStockValue();
      const categoryVals = await stockRepository.getStockValueByCategory();
      setStockValue(value);
      setCategoryValues(categoryVals);
    } catch (error) {
      console.error('Failed to load stock stats:', error);
    }
  };

  const totalClients = clients.length;
  const totalOutstanding = clients.reduce(
    (sum, client) => sum + client.balance,
    0,
  );
  const lowStockCount = lowStockItems.length;

  // Real sales data for the year (monthly)
  const salesData = {
    labels: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    datasets: [
      {
        data: monthlySales.map(v => v || 0),
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  // Real expense data by category
  const expenseLabels =
    expensesByCategory.length > 0
      ? expensesByCategory.map(e => e.label)
      : ['No Data'];
  const expenseValues =
    expensesByCategory.length > 0 ? expensesByCategory.map(e => e.value) : [0];

  const expenseData = {
    labels: expenseLabels,
    datasets: [{ data: expenseValues }],
  };

  // Load categories for display
  const { categories } = require('@/store/categoryStore').useCategoryStore();

  // Build stock category data from real values
  const stockCategoryData = categoryValues
    .map((cv, index) => {
      const category = categories.find((c: any) => c.id === cv.categoryId);
      const colors = [
        '#0ea5e9',
        '#10b981',
        '#f59e0b',
        '#ef4444',
        '#8b5cf6',
        '#ec4899',
      ];
      return {
        name: category?.name || cv.categoryId,
        population: cv.value,
        color: category?.color || colors[index % colors.length],
        legendFontColor: theme.textSecondary,
      };
    })
    .filter(item => item.population > 0);

  const chartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => theme.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.primary,
    },
  };

  const StatCard = ({ icon, value, label, color, onPress }: any) => (
    <TouchableOpacity
      style={[
        styles.statCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={onPress}
    >
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

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
        <View style={styles.headerLeft}>
          <Image
            source={require('@/assets/images/AppLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Dream Traders
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textTertiary }]}
            >
              Welcome back! 👋
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="cog" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Earnings Summary Card */}
        <View
          style={[
            styles.earningsCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.earningsHeader}>
            <Icon name="chart-line" size={24} color={theme.success} />
            <Text style={[styles.earningsTitle, { color: theme.text }]}>
              This Month's Performance
            </Text>
          </View>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text
                style={[styles.earningsLabel, { color: theme.textSecondary }]}
              >
                Sales
              </Text>
              <Text style={[styles.earningsValue, { color: theme.success }]}>
                PKR {monthlySales[new Date().getMonth()].toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                styles.earningsDivider,
                { backgroundColor: theme.border },
              ]}
            />
            <View style={styles.earningsItem}>
              <Text
                style={[styles.earningsLabel, { color: theme.textSecondary }]}
              >
                Expenses
              </Text>
              <Text style={[styles.earningsValue, { color: theme.danger }]}>
                PKR {monthlyExpenses[new Date().getMonth()].toLocaleString()}
              </Text>
            </View>
            <View
              style={[
                styles.earningsDivider,
                { backgroundColor: theme.border },
              ]}
            />
            <View style={styles.earningsItem}>
              <Text
                style={[styles.earningsLabel, { color: theme.textSecondary }]}
              >
                Net Profit
              </Text>
              <Text
                style={[
                  styles.earningsValue,
                  {
                    color:
                      currentMonthEarnings >= 0 ? theme.success : theme.danger,
                  },
                ]}
              >
                PKR {currentMonthEarnings.toLocaleString()}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.viewEarningsBtn,
              { backgroundColor: theme.primary + '15' },
            ]}
            onPress={() => navigation.navigate('MonthlyEarnings')}
          >
            <Text
              style={[styles.viewEarningsBtnText, { color: theme.primary }]}
            >
              View Detailed Earnings
            </Text>
            <Icon name="chevron-right" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="account-group"
            value={totalClients}
            label="Total Clients"
            color={theme.primary}
            onPress={() => navigation.navigate('ClientList')}
          />
          <StatCard
            icon="cash-multiple"
            value={`PKR ${(stockValue.saleValue / 1000).toFixed(0)}K`}
            label="Stock Worth"
            color={theme.success}
            onPress={() => navigation.navigate('StockManagement')}
          />
          <StatCard
            icon="currency-usd"
            value={`PKR ${(totalOutstanding / 1000).toFixed(1)}K`}
            label="Outstanding"
            color={theme.warning}
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            icon="trending-up"
            value={`PKR ${(totalMargin / 1000).toFixed(0)}K`}
            label="Total Margin"
            color="#8b5cf6"
            onPress={() => navigation.navigate('StockManagement')}
          />
        </View>

        {/* Low Stock Alert */}
        {lowStockCount > 0 && (
          <View
            style={[
              styles.alertSection,
              { backgroundColor: theme.card, borderColor: theme.danger },
            ]}
          >
            <View style={styles.alertHeader}>
              <Icon name="alert-circle" size={24} color={theme.danger} />
              <Text style={[styles.alertTitle, { color: theme.danger }]}>
                Low Stock Alerts
              </Text>
            </View>
            {lowStockItems.slice(0, 5).map(alert => (
              <View
                key={alert.stockItem.id}
                style={[styles.alertItem, { borderBottomColor: theme.border }]}
              >
                <View>
                  <Text style={[styles.alertItemName, { color: theme.text }]}>
                    {alert.stockItem.name}
                  </Text>
                  <Text
                    style={[styles.alertItemSku, { color: theme.textTertiary }]}
                  >
                    SKU: {alert.stockItem.sku}
                  </Text>
                </View>
                <View style={styles.alertItemRight}>
                  <Text style={[styles.alertItemQty, { color: theme.danger }]}>
                    {alert.currentQuantity}
                  </Text>
                  <Text
                    style={[
                      styles.alertItemUnit,
                      { color: theme.textTertiary },
                    ]}
                  >
                    / {alert.minLevel} {alert.stockItem.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Sales Chart */}
        <View
          style={[
            styles.chartSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <Icon name="chart-line-variant" size={24} color={theme.primary} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Monthly Sales Overview
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={salesData}
              width={width * 1.5}
              height={220}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={true}
              withVerticalLabels={true}
              withHorizontalLabels={true}
            />
          </ScrollView>
        </View>

        {/* Expense Bar Chart */}
        <View
          style={[
            styles.chartSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <Icon name="cash-multiple" size={24} color={theme.warning} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Weekly Expenses
            </Text>
          </View>
          <BarChart
            data={expenseData}
            width={width - 48}
            height={220}
            yAxisLabel="PKR "
            yAxisSuffix=""
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(245, 158, 11, ${opacity})`,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
            withInnerLines={false}
          />
        </View>

        {/* Stock Distribution Pie Chart */}
        <View
          style={[
            styles.chartSection,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.chartHeader}>
            <Icon name="chart-donut" size={24} color={theme.success} />
            <Text style={[styles.chartTitle, { color: theme.text }]}>
              Stock Distribution
            </Text>
          </View>
          <PieChart
            data={stockCategoryData}
            width={width - 48}
            height={220}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
            style={styles.chart}
          />
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scrollView: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsCard: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  earningsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  earningsValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  earningsDivider: {
    width: 1,
    height: 40,
  },
  viewEarningsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  viewEarningsBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  alertSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  alertItemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  alertItemSku: {
    fontSize: 12,
    marginTop: 2,
  },
  alertItemRight: {
    alignItems: 'flex-end',
  },
  alertItemQty: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  alertItemUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  chartSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  quickActionsSection: {
    padding: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
