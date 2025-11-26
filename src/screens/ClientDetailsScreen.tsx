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
import { useInvoiceStore } from '@/store/invoiceStore';
import { Client, LedgerEntry, Invoice } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

export default function ClientDetailsScreen({ route, navigation }: any) {
  const { clientId } = route.params;
  const { theme, isDark } = useThemeStore();
  const { clients, ledgerEntries, loadLedger, addLedgerEntry, loadClients } =
    useClientStore();
  const { invoices, loadInvoices, updateInvoice } = useInvoiceStore();

  const [client, setClient] = useState<Client | undefined>(undefined);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Edit Client Form State
  const [editClientData, setEditClientData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    shopName: '',
    address: '',
    area: '',
  });

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date(),
    description: '',
    type: 'PAYMENT' as 'PAYMENT' | 'ADJUSTMENT',
    selectedInvoiceId: '' as string,
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
        await loadLedger(clientId);
        await loadInvoices();
      } catch (error) {
        console.error('Failed to load ledger:', error);
      }
    }
    setLoading(false);
  };

  // Filter unpaid invoices for this client
  useEffect(() => {
    const clientUnpaidInvoices = invoices
      .filter(
        inv =>
          inv.clientId === clientId &&
          (inv.status === 'UNPAID' || inv.status === 'PARTIAL'),
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    setUnpaidInvoices(clientUnpaidInvoices);
  }, [invoices, clientId]);

  const handleCall = () => {
    if (client?.phone) Linking.openURL(`tel:${client.phone}`);
  };

  const handleWhatsApp = () => {
    const phone = client?.whatsapp || client?.phone;
    if (phone) {
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleOpenEditModal = () => {
    if (client) {
      setEditClientData({
        name: client.name,
        phone: client.phone,
        whatsapp: client.whatsapp || '',
        shopName: client.shopName,
        address: client.address || '',
        area: client.area || '',
      });
      setShowEditModal(true);
    }
  };

  const handleSaveClientEdit = async () => {
    if (!editClientData.name.trim()) {
      showErrorToast('Validation Error', 'Please enter client name');
      return;
    }
    if (!editClientData.phone.trim()) {
      showErrorToast('Validation Error', 'Please enter phone number');
      return;
    }
    if (!editClientData.shopName.trim()) {
      showErrorToast('Validation Error', 'Please enter shop name');
      return;
    }

    try {
      const { updateClient } = useClientStore.getState();
      await updateClient(clientId, {
        name: editClientData.name,
        phone: editClientData.phone,
        whatsapp: editClientData.whatsapp || undefined,
        shopName: editClientData.shopName,
        address: editClientData.address || undefined,
        area: editClientData.area || undefined,
      });

      showSuccessToast('Client Updated', 'Client details updated successfully');
      setShowEditModal(false);
      await loadClients();
      loadData();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to update client');
    }
  };

  const hasWhatsApp = client?.whatsapp && client.whatsapp.length > 0;

  const handleSavePayment = async () => {
    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
      showErrorToast('Validation Error', 'Please enter a valid amount');
      return;
    }

    const paymentAmount = parseFloat(paymentData.amount);

    try {
      // If a specific invoice is selected, apply payment to it
      if (paymentData.selectedInvoiceId) {
        const invoice = unpaidInvoices.find(
          inv => inv.id === paymentData.selectedInvoiceId,
        );
        if (invoice) {
          const newAmountPaid = invoice.amountPaid + paymentAmount;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

          await updateInvoice(invoice.id, {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
          });
        }
      } else if (unpaidInvoices.length > 0) {
        // Auto-adjust: Apply payment to oldest invoices first (FIFO)
        let remainingPayment = paymentAmount;

        for (const invoice of unpaidInvoices) {
          if (remainingPayment <= 0) break;

          const amountToApply = Math.min(remainingPayment, invoice.amountDue);
          const newAmountPaid = invoice.amountPaid + amountToApply;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

          await updateInvoice(invoice.id, {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
          });

          remainingPayment -= amountToApply;
        }
      }

      // Add ledger entry
      await addLedgerEntry(clientId, {
        date: paymentData.date,
        type: paymentData.type,
        description:
          paymentData.description ||
          (paymentData.type === 'PAYMENT'
            ? 'Payment Received'
            : 'Balance Adjustment'),
        debit: 0,
        credit: paymentAmount,
        items: [],
      });

      showSuccessToast(
        'Payment Recorded',
        `Payment of PKR ${paymentAmount.toLocaleString()} recorded successfully`,
      );
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        date: new Date(),
        description: '',
        type: 'PAYMENT',
        selectedInvoiceId: '',
      });
      await loadClients(); // Refresh all clients to get updated balances
      await loadInvoices(); // Refresh invoices
      loadData(); // Refresh current client and ledger
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to record payment');
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
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <Text style={{ color: theme.textSecondary }}>Loading...</Text>
      </View>
    );
  }

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
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {client.name}
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            {client.shopName}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleOpenEditModal}
            style={styles.iconButton}
          >
            <Icon name="pencil" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCall} style={styles.iconButton}>
            <Icon name="phone" size={24} color={theme.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleWhatsApp}
            style={[styles.iconButton, !hasWhatsApp && styles.disabledIcon]}
            disabled={!hasWhatsApp}
          >
            <Icon
              name="whatsapp"
              size={24}
              color={hasWhatsApp ? '#25D366' : theme.textTertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Balance Card */}
      <View
        style={[
          styles.balanceCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <View>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            Current Balance
          </Text>
          <Text
            style={[
              styles.balanceValue,
              { color: client.balance > 0 ? theme.danger : theme.success },
            ]}
          >
            PKR {Math.abs(client.balance).toLocaleString()}
            <Text style={styles.balanceSuffix}>
              {client.balance > 0 ? ' (Due)' : ' (Credit)'}
            </Text>
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Transaction History
        </Text>
        <FlatList
          data={ledgerEntries}
          renderItem={renderLedgerItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No transactions yet
              </Text>
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
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Receive Payment
              </Text>
              <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Invoice Selection */}
              {unpaidInvoices.length > 0 && (
                <>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Apply to Invoice
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      },
                    ]}
                    onPress={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                  >
                    <Text
                      style={{
                        color: paymentData.selectedInvoiceId
                          ? theme.text
                          : theme.textTertiary,
                      }}
                    >
                      {paymentData.selectedInvoiceId
                        ? `#${
                            unpaidInvoices.find(
                              inv => inv.id === paymentData.selectedInvoiceId,
                            )?.invoiceNumber
                          } - PKR ${unpaidInvoices
                            .find(
                              inv => inv.id === paymentData.selectedInvoiceId,
                            )
                            ?.amountDue.toLocaleString()} due`
                        : 'Auto-adjust (oldest first)'}
                    </Text>
                    <Icon
                      name={showInvoiceDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {showInvoiceDropdown && (
                    <View
                      style={[
                        styles.dropdown,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.border },
                        ]}
                        onPress={() => {
                          setPaymentData({
                            ...paymentData,
                            selectedInvoiceId: '',
                          });
                          setShowInvoiceDropdown(false);
                        }}
                      >
                        <Text
                          style={{ color: theme.primary, fontWeight: '600' }}
                        >
                          Auto-adjust (oldest first)
                        </Text>
                      </TouchableOpacity>
                      {unpaidInvoices.map(inv => (
                        <TouchableOpacity
                          key={inv.id}
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: theme.border },
                          ]}
                          onPress={() => {
                            setPaymentData({
                              ...paymentData,
                              selectedInvoiceId: inv.id,
                            });
                            setShowInvoiceDropdown(false);
                          }}
                        >
                          <View>
                            <Text
                              style={{ color: theme.text, fontWeight: '600' }}
                            >
                              #{inv.invoiceNumber}
                            </Text>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                              }}
                            >
                              {formatDate(inv.createdAt)} • PKR{' '}
                              {inv.amountDue.toLocaleString()} due
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  inv.status === 'PARTIAL'
                                    ? theme.warning + '20'
                                    : theme.danger + '20',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  inv.status === 'PARTIAL'
                                    ? theme.warning
                                    : theme.danger,
                                fontSize: 10,
                                fontWeight: '600',
                              }}
                            >
                              {inv.status}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Amount *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="0.00"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={paymentData.amount}
                onChangeText={text =>
                  setPaymentData({ ...paymentData, amount: text })
                }
                autoFocus={unpaidInvoices.length === 0}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.text }}>
                  {formatDate(paymentData.date)}
                </Text>
                <Icon name="calendar" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentData.date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate)
                      setPaymentData({ ...paymentData, date: selectedDate });
                  }}
                  maximumDate={new Date()}
                />
              )}

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Optional note..."
                placeholderTextColor={theme.textTertiary}
                value={paymentData.description}
                onChangeText={text =>
                  setPaymentData({ ...paymentData, description: text })
                }
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.success, marginTop: 20 },
                ]}
                onPress={handleSavePayment}
              >
                <Text style={styles.saveButtonText}>Confirm Payment</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Client
              </Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Client name"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.name}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, name: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Phone *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Phone number"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={editClientData.phone}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, phone: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                WhatsApp Number
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="WhatsApp number (optional)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={editClientData.whatsapp}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, whatsapp: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Shop Name *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Shop name"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.shopName}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, shopName: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Address
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Address (optional)"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.address}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, address: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Area
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Area (optional)"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.area}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, area: text })
                }
              />

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.primary, marginTop: 20 },
                ]}
                onPress={handleSaveClientEdit}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
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
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: { padding: 4 },
  disabledIcon: { opacity: 0.5 },
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
  dropdown: {
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 8,
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
