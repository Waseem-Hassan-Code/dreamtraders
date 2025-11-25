import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  StatusBar,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useStockStore } from '@/store/stockStore';
import { useClientStore } from '@/store/clientStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useExpenseStore } from '@/store/expenseStore';
import { PieChart } from 'react-native-chart-kit';

const { width } = Dimensions.get('window');

export default function ReportsScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { stockItems, loadStockItems } = useStockStore();
  const { clients, loadClients } = useClientStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const { expenses, loadExpenses } = useExpenseStore();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await Promise.all([
      loadStockItems('all'),
      loadClients(),
      loadInvoices(),
      loadExpenses(),
    ]);
    setLoading(false);
  };

  // Calculations
  const totalStockValue = stockItems.reduce((sum, item) => sum + (item.currentQuantity * item.salePrice), 0);
  const totalPurchaseValue = stockItems.reduce((sum, item) => sum + (item.currentQuantity * item.purchasePrice), 0);
  
  const totalReceivables = clients.reduce((sum, client) => sum + (client.balance > 0 ? client.balance : 0), 0);
  const totalPayables = clients.reduce((sum, client) => sum + (client.balance < 0 ? Math.abs(client.balance) : 0), 0);

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Estimated Profit (Revenue - Cost of Goods Sold - Expenses)
  // Note: This is a rough estimate as we don't track COGS per invoice item perfectly in this simple version yet
  // We'll use a simple approximation: Revenue - Expenses for now, but ideally it should be Gross Profit - Expenses
  const netProfit = totalRevenue - totalExpenses; 

  const chartConfig = {
    backgroundGradientFrom: theme.surface,
    backgroundGradientTo: theme.surface,
    color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
    labelColor: (opacity = 1) => theme.textSecondary,
  };

  const pieData = [
    {
      name: 'Stock',
      population: totalStockValue,
      color: theme.primary,
      legendFontColor: theme.textSecondary,
      legendFontSize: 12,
    },
    {
      name: 'Receivables',
      population: totalReceivables,
      color: theme.warning,
      legendFontColor: theme.textSecondary,
      legendFontSize: 12,
    },
    {
      name: 'Cash/Bank',
      population: Math.max(0, totalRevenue - totalExpenses), // Simplified cash in hand
      color: theme.success,
      legendFontColor: theme.textSecondary,
      legendFontSize: 12,
    },
  ];

  const StatRow = ({ label, value, color, icon }: any) => (
    <View style={[styles.statRow, { borderBottomColor: theme.border }]}>
      <View style={styles.statLabelRow}>
        <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
          <Icon name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{label}</Text>
      </View>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Financial Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Net Worth Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textSecondary }]}>Estimated Net Worth</Text>
          <Text style={[styles.bigValue, { color: theme.primary }]}>
            PKR {(totalStockValue + totalReceivables - totalPayables + (totalRevenue - totalExpenses)).toLocaleString()}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.textTertiary }]}>
            Assets + Receivables - Payables + Cash
          </Text>
        </View>

        {/* Asset Distribution */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Asset Distribution</Text>
          <PieChart
            data={pieData}
            width={width - 64}
            height={200}
            chartConfig={chartConfig}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </View>

        {/* Detailed Stats */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Business Details</Text>
          
          <StatRow 
            label="Stock Value (Retail)" 
            value={`PKR ${totalStockValue.toLocaleString()}`} 
            color={theme.primary} 
            icon="package-variant"
          />
          <StatRow 
            label="Stock Value (Purchase)" 
            value={`PKR ${totalPurchaseValue.toLocaleString()}`} 
            color={theme.textTertiary} 
            icon="package-variant-closed"
          />
          <StatRow 
            label="Total Receivables" 
            value={`PKR ${totalReceivables.toLocaleString()}`} 
            color={theme.warning} 
            icon="hand-coin"
          />
          <StatRow 
            label="Total Payables" 
            value={`PKR ${totalPayables.toLocaleString()}`} 
            color={theme.danger} 
            icon="hand-coin-outline"
          />
        </View>

        {/* P&L Summary */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, marginBottom: 30 }]}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 16 }]}>Profit & Loss (Est.)</Text>
          
          <StatRow 
            label="Total Revenue" 
            value={`+ PKR ${totalRevenue.toLocaleString()}`} 
            color={theme.success} 
            icon="cash-plus"
          />
          <StatRow 
            label="Total Expenses" 
            value={`- PKR ${totalExpenses.toLocaleString()}`} 
            color={theme.danger} 
            icon="cash-minus"
          />
          
          <View style={[styles.totalRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Net Profit</Text>
            <Text style={[styles.totalValue, { color: netProfit >= 0 ? theme.success : theme.danger }]}>
              PKR {netProfit.toLocaleString()}
            </Text>
          </View>
        </View>
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
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  bigValue: { fontSize: 32, fontWeight: 'bold', marginBottom: 4 },
  cardSubtitle: { fontSize: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: { fontSize: 14, fontWeight: '500' },
  statValue: { fontSize: 16, fontWeight: 'bold' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    marginTop: 4,
    borderTopWidth: 1,
  },
  totalLabel: { fontSize: 18, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
});
