import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useClientStore } from '@/store/clientStore';
import { Client, LedgerEntry } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ClientDetailsScreen({ route, navigation }: any) {
  const { clientId } = route.params;
  const { theme, isDark } = useThemeStore();
  const { clients, getClientLedger, addLedgerEntry } = useClientStore();

  const [client, setClient] = useState<Client | undefined>(undefined);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date(),
    description: '',
    type: 'PAYMENT' as 'PAYMENT' | 'ADJUSTMENT',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId, clients]); // Reload when clients change (e.g. balance update)

  const loadData = async () => {
    const foundClient = clients.find(c => c.id === clientId);
    setClient(foundClient);

    if (foundClient) {
      try {
        const history = await getClientLedger(clientId);
        setLedger(history);
      } catch (error) {
        console.error('Failed to load ledger:', error);
      }
    }
    setLoading(false);
  };

  const handleCall = () => {
    if (client?.phone) Linking.openURL(`tel:${client.phone}`);
  };

  const handleWhatsApp = () => {
    const phone = client?.whatsapp || client?.phone;
    if (phone) {
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleSavePayment = async () => {
    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    try {
      await addLedgerEntry(clientId, {
        date: paymentData.date,
        type: paymentData.type,
        description: paymentData.description || (paymentData.type === 'PAYMENT' ? 'Payment Received' : 'Balance Adjustment'),
        debit: 0,
        credit: parseFloat(paymentData.amount),
        items: [],
      });
      
      Alert.alert('Success', 'Payment recorded successfully');
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        date: new Date(),
        description: '',
        type: 'PAYMENT',
      });
      loadData(); // Refresh data
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to record payment');
    }
  };

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderLedgerItem = ({ item }: { item: LedgerEntry }) => (
    <View style={[styles.ledgerItem, { borderBottomColor: theme.border }]}>
      <View style={styles.ledgerLeft}>
        <Text style={[styles.ledgerDate, { color: theme.textSecondary }]}>
          {formatDate(item.date)}
        </Text>
        <Text style={[styles.ledgerDesc, { color: theme.text }]}>
          {item.description}
        </Text>
        {item.type === 'SALE' && (
           <Text style={[styles.ledgerSub, { color: theme.textTertiary }]}>
             Invoice #{item.invoiceId || 'N/A'}
           </Text>
        )}
      </View>
      <View style={styles.ledgerRight}>
        <View style={styles.amountRow}>
          {item.debit > 0 && (
            <Text style={[styles.debitText, { color: theme.danger }]}>
              + {item.debit.toLocaleString()}
            </Text>
          )}
          {item.credit > 0 && (
            <Text style={[styles.creditText, { color: theme.success }]}>
              - {item.credit.toLocaleString()}
            </Text>
          )}
        </View>
        <Text style={[styles.balanceText, { color: theme.textSecondary }]}>
          Bal: {item.balance.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading || !client) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.surface} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>{client.name}</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>{client.shopName}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleCall} style={styles.iconButton}>
            <Icon name="phone" size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleWhatsApp} style={styles.iconButton}>
            <Icon name="whatsapp" size={24} color="#25D366" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>Current Balance</Text>
          <Text style={[
            styles.balanceValue, 
            { color: client.balance > 0 ? theme.danger : theme.success }
          ]}>
            PKR {Math.abs(client.balance).toLocaleString()} 
            <Text style={styles.balanceSuffix}>{client.balance > 0 ? ' (Due)' : ' (Credit)'}</Text>
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.payButton, { backgroundColor: theme.primary }]}
          onPress={() => setShowPaymentModal(true)}
        >
          <Text style={styles.payButtonText}>Receive Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Ledger List */}
      <View style={styles.listContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Transaction History</Text>
        <FlatList
          data={ledger}
          renderItem={renderLedgerItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>No transactions yet</Text>
            </View>
          }
        />
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Receive Payment</Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Amount *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={paymentData.amount}
                onChangeText={(text) => setPaymentData({ ...paymentData, amount: text })}
                autoFocus
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>Date</Text>
              <TouchableOpacity
                style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.text }}>{formatDate(paymentData.date)}</Text>
                <Icon name="calendar" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentData.date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setPaymentData({ ...paymentData, date: selectedDate });
                  }}
                  maximumDate={new Date()}
                />
              )}

              <Text style={[styles.label, { color: theme.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                placeholder="Optional note..."
                placeholderTextColor={theme.textTertiary}
                value={paymentData.description}
                onChangeText={(text) => setPaymentData({ ...paymentData, description: text })}
              />

              <TouchableOpacity 
                style={[styles.saveButton, { backgroundColor: theme.success, marginTop: 20 }]}
                onPress={handleSavePayment}
              >
                <Text style={styles.saveButtonText}>Confirm Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  backButton: { marginRight: 16 },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 14 },
  headerActions: { flexDirection: 'row', gap: 16 },
  iconButton: { padding: 4 },
  balanceCard: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
  },
  balanceLabel: { fontSize: 14, marginBottom: 4 },
  balanceValue: { fontSize: 24, fontWeight: 'bold' },
  balanceSuffix: { fontSize: 14, fontWeight: 'normal' },
  payButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  payButtonText: { color: '#fff', fontWeight: '600' },
  listContainer: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  listContent: { paddingBottom: 20 },
  ledgerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  ledgerLeft: { flex: 1 },
  ledgerDate: { fontSize: 12, marginBottom: 2 },
  ledgerDesc: { fontSize: 16, fontWeight: '500' },
  ledgerSub: { fontSize: 12, marginTop: 2 },
  ledgerRight: { alignItems: 'flex-end' },
  amountRow: { flexDirection: 'row', marginBottom: 4 },
  debitText: { fontSize: 16, fontWeight: 'bold' },
  creditText: { fontSize: 16, fontWeight: 'bold' },
  balanceText: { fontSize: 12 },
  emptyContainer: { padding: 20, alignItems: 'center' },
  emptyText: { fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
