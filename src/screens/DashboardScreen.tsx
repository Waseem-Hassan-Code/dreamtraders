import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Switch,
  Image,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useStockStore } from '@/store/stockStore';
import { useClientStore } from '@/store/clientStore';
import { useThemeStore } from '@/store/themeStore';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }: any) {
  const { lowStockItems, loadLowStockItems, stockItems, loadStockItems } =
    useStockStore();
  const { clients, loadClients } = useClientStore();
  const { theme, isDark, toggleTheme } = useThemeStore();

  const [stockValue, setStockValue] = useState({
    purchaseValue: 0,
    saleValue: 0,
  });
  const [categoryValues, setCategoryValues] = useState<
    { categoryId: string; value: number }[]
  >([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadLowStockItems();
      loadClients();
      loadStockItems('all');
      loadStockStats();
    });
    return unsubscribe;
  }, [navigation]);

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

  // Sample data for charts - replace with real data later
  const salesData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        data: [2000, 4500, 2800, 8000, 9900, 4300, 6000],
        color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
        strokeWidth: 3,
      },
    ],
  };

  const expenseData = {
    labels: ['Food', 'Petrol', 'Bills', 'Misc'],
    datasets: [{ data: [1200, 800, 1500, 600] }],
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
            <Text style={[styles.headerSubtitle, { color: theme.textTertiary }]}>
              Welcome back! 👋
            </Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Icon
            name={isDark ? 'weather-night' : 'weather-sunny'}
            size={24}
            color={theme.textSecondary}
          />
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: '#cbd5e1', true: theme.primary }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
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
            icon="alert-circle"
            value={lowStockCount}
            label="Low Stock"
            color={theme.danger}
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
              Sales Overview
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <LineChart
              data={salesData}
              width={width - 48}
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
            yAxisLabel="₹"
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
