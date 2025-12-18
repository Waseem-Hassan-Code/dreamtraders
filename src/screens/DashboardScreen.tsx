import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Image,
  Animated,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStockStore } from '@/store/stockStore';
import { useClientStore } from '@/store/clientStore';
import { useThemeStore } from '@/store/themeStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useExpenseStore } from '@/store/expenseStore';
import { shadows } from '@/utils/theme';

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

  // Calculate monthly sales and gross profit from invoices (current year)
  const [monthlyGrossProfit, setMonthlyGrossProfit] = useState<number[]>([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  ]);

  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();

    const monthSales = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Jan to Dec
    const monthProfit = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // Gross profit per month

    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      if (invoiceDate.getFullYear() === currentYear) {
        const month = invoiceDate.getMonth(); // 0 = January
        monthSales[month] += invoice.total;

        // Calculate gross profit (margin) for this invoice
        invoice.items.forEach(item => {
          const stockItem = stockItems.find(s => s.id === item.stockItemId);
          if (stockItem) {
            const purchaseCost = stockItem.purchasePrice * item.quantity;
            const saleValue = item.total;
            monthProfit[month] += saleValue - purchaseCost;
          }
        });
      }
    });

    setMonthlySales(monthSales);
    setMonthlyGrossProfit(monthProfit);
  }, [invoices, stockItems]);

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

  // Calculate net profit (gross profit - expenses) per month
  // Net Profit = (Sale Price - Purchase Price) - Expenses
  const monthlyNetProfit = useMemo(() => {
    return monthlyGrossProfit.map(
      (profit, index) => profit - monthlyExpenses[index],
    );
  }, [monthlyGrossProfit, monthlyExpenses]);

  // Calculate total margin from stock (sale price - purchase price)
  const totalMargin = useMemo(() => {
    return stockItems.reduce((total, item) => {
      const margin =
        (item.salePrice - item.purchasePrice) * item.currentQuantity;
      return total + margin;
    }, 0);
  }, [stockItems]);

  // Calculate current month's gross profit and net profit
  const currentMonthGrossProfit = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return monthlyGrossProfit[currentMonth] || 0;
  }, [monthlyGrossProfit]);

  const currentMonthNetProfit = useMemo(() => {
    const currentMonth = new Date().getMonth();
    return monthlyNetProfit[currentMonth] || 0;
  }, [monthlyNetProfit]);

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

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const StatCard = ({ icon, value, label, color, onPress, delay = 0 }: any) => {
    const cardFade = useRef(new Animated.Value(0)).current;
    const cardSlide = useRef(new Animated.Value(20)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(cardFade, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(cardSlide, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }, []);

    return (
      <TouchableOpacity
        style={[
          styles.statCard,
          { backgroundColor: theme.card, borderColor: theme.borderLight },
          shadows.small,
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Animated.View
          style={{
            opacity: cardFade,
            transform: [{ translateY: cardSlide }],
          }}
        >
          <View style={[styles.statIcon, { backgroundColor: color + '15' }]}>
            <Icon name={icon} size={26} color={color} />
          </View>
          <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            {label}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
      />

      {/* Modern Header */}
      <LinearGradient
        colors={
          isDark
            ? [theme.surface, theme.background]
            : [theme.surface, theme.background]
        }
        style={styles.headerGradient}
      >
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.logoContainer,
                { backgroundColor: theme.primary + '15' },
              ]}
            >
              <Image
                source={require('@/assets/images/appLogo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
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
              style={[
                styles.settingsBtn,
                { backgroundColor: theme.card },
                shadows.small,
              ]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <Icon name="cog-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Modern Earnings Summary Card */}
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <LinearGradient
            colors={[
              currentMonthNetProfit >= 0 ? theme.success : theme.danger,
              currentMonthNetProfit >= 0
                ? theme.successGradientEnd || '#059669'
                : theme.dangerGradientEnd || '#dc2626',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.earningsCard, shadows.large]}
          >
            <View style={styles.earningsHeader}>
              <View style={styles.earningsIconContainer}>
                <Icon
                  name="chart-line"
                  size={28}
                  color="rgba(255,255,255,0.9)"
                />
              </View>
              <View>
                <Text style={styles.earningsTitle}>
                  This Month's Performance
                </Text>
                <Text style={styles.earningsDate}>
                  {new Date().toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Sales</Text>
                <Text style={styles.earningsValue}>
                  PKR {monthlySales[new Date().getMonth()].toLocaleString()}
                </Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Gross Profit</Text>
                <Text style={styles.earningsValue}>
                  PKR {currentMonthGrossProfit.toLocaleString()}
                </Text>
              </View>
              <View style={styles.earningsDivider} />
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Net Profit</Text>
                <Text style={[styles.earningsValue, styles.profitValue]}>
                  PKR {currentMonthNetProfit.toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.viewEarningsBtn}
              onPress={() => navigation.navigate('MonthlyEarnings')}
              activeOpacity={0.8}
            >
              <Text style={styles.viewEarningsBtnText}>
                View Detailed Report
              </Text>
              <Icon
                name="chevron-right"
                size={20}
                color="rgba(255,255,255,0.9)"
              />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="account-group"
            value={totalClients}
            label="Total Clients"
            color={theme.primary}
            delay={100}
            onPress={() => navigation.navigate('ClientList')}
          />
          <StatCard
            icon="cube-outline"
            value={`PKR ${(stockValue.saleValue / 1000).toFixed(0)}K`}
            label="Stock Worth"
            color={theme.success}
            delay={200}
            onPress={() => navigation.navigate('StockManagement')}
          />
          <StatCard
            icon="cash-clock"
            value={`PKR ${(totalOutstanding / 1000).toFixed(1)}K`}
            label="Outstanding"
            color={theme.warning}
            delay={300}
            onPress={() => navigation.navigate('Reports')}
          />
          <StatCard
            icon="trending-up"
            value={`PKR ${(totalMargin / 1000).toFixed(0)}K`}
            label="Total Margin"
            color={theme.secondary}
            delay={400}
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
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
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
    paddingTop: 8,
    gap: 12,
  },
  statCard: {
    width: '47.5%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsCard: {
    margin: 16,
    padding: 20,
    borderRadius: 20,
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  earningsIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  earningsTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  earningsDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    padding: 16,
  },
  earningsItem: {
    flex: 1,
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 11,
    marginBottom: 4,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  earningsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  profitValue: {
    fontSize: 16,
  },
  earningsDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  viewEarningsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  viewEarningsBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  alertSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  alertTitle: {
    fontSize: 17,
    fontWeight: '700',
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
    fontWeight: '700',
  },
  alertItemUnit: {
    fontSize: 12,
    marginTop: 2,
  },
  chartSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '700',
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
    fontWeight: '700',
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
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'center',
  },
});
