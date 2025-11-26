import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { Invoice } from '@/types';

export default function InvoiceListScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { invoices, loadInvoices } = useInvoiceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadInvoices();
    });
    return unsubscribe;
  }, [navigation]);

  const filteredInvoices = invoices.filter(
    inv =>
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderInvoice = ({ item }: { item: Invoice }) => (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() => {
        setSelectedInvoice(item);
        setShowDetailsModal(true);
      }}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={[styles.invoiceNumber, { color: theme.text }]}>
            #{item.invoiceNumber}
          </Text>
          <Text style={[styles.clientName, { color: theme.textSecondary }]}>
            {item.client.name}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.status === 'PAID'
                  ? theme.success + '20'
                  : item.status === 'PARTIAL'
                  ? theme.warning + '20'
                  : theme.danger + '20',
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  item.status === 'PAID'
                    ? theme.success
                    : item.status === 'PARTIAL'
                    ? theme.warning
                    : theme.danger,
              },
            ]}
          >
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.date, { color: theme.textTertiary }]}>
          {formatDate(item.createdAt)}
        </Text>
        <Text style={[styles.amount, { color: theme.text }]}>
          PKR {item.total.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.surface}
      />

      <View
        style={[
          styles.header,
          { backgroundColor: theme.surface, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Invoices
        </Text>
      </View>

      <View
        style={[styles.searchContainer, { backgroundColor: theme.surface }]}
      >
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search invoices..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredInvoices}
        renderItem={renderInvoice}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="receipt" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No invoices found
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('CreateInvoice')}
            >
              <Text style={styles.emptyButtonText}>
                Create Your First Invoice
              </Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => navigation.navigate('CreateInvoice')}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Invoice Details Modal */}
      <Modal
        visible={showDetailsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Invoice #{selectedInvoice?.invoiceNumber}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              {/* Client Info */}
              <View
                style={[
                  styles.detailSection,
                  { borderBottomColor: theme.border },
                ]}
              >
                <View style={styles.detailRow}>
                  <Icon name="account" size={20} color={theme.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Client
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {selectedInvoice?.client.name}
                    </Text>
                    <Text
                      style={[
                        styles.detailSubValue,
                        { color: theme.textTertiary },
                      ]}
                    >
                      {selectedInvoice?.client.shopName}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <Icon name="calendar" size={20} color={theme.textSecondary} />
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.detailLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Date
                    </Text>
                    <Text style={[styles.detailValue, { color: theme.text }]}>
                      {formatDate(selectedInvoice?.createdAt || new Date())}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Items List */}
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Items ({selectedInvoice?.items.length || 0})
              </Text>
              {selectedInvoice?.items.map((item, index) => (
                <View
                  key={index}
                  style={[styles.itemRow, { borderBottomColor: theme.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: theme.text }]}>
                      {item.stockItemName}
                    </Text>
                    <Text
                      style={[styles.itemQty, { color: theme.textSecondary }]}
                    >
                      {item.quantity} × PKR {item.unitPrice.toLocaleString()}
                    </Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: theme.text }]}>
                    PKR {item.total.toLocaleString()}
                  </Text>
                </View>
              ))}

              {/* Summary */}
              <View
                style={[
                  styles.summarySection,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Subtotal
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.text }]}>
                    PKR {selectedInvoice?.subtotal.toLocaleString()}
                  </Text>
                </View>
                {(selectedInvoice?.discount || 0) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Discount
                    </Text>
                    <Text
                      style={[styles.summaryValue, { color: theme.success }]}
                    >
                      - PKR {selectedInvoice?.discount.toLocaleString()}
                    </Text>
                  </View>
                )}
                {(selectedInvoice?.tax || 0) > 0 && (
                  <View style={styles.summaryRow}>
                    <Text
                      style={[
                        styles.summaryLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Tax
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.text }]}>
                      PKR {selectedInvoice?.tax.toLocaleString()}
                    </Text>
                  </View>
                )}
                <View
                  style={[
                    styles.summaryRow,
                    styles.totalRow,
                    { borderTopColor: theme.border },
                  ]}
                >
                  <Text style={[styles.totalLabel, { color: theme.text }]}>
                    Total
                  </Text>
                  <Text style={[styles.totalValue, { color: theme.primary }]}>
                    PKR {selectedInvoice?.total.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Paid
                  </Text>
                  <Text style={[styles.summaryValue, { color: theme.success }]}>
                    PKR {selectedInvoice?.amountPaid.toLocaleString()}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text
                    style={[
                      styles.summaryLabel,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Balance Due
                  </Text>
                  <Text
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          (selectedInvoice?.amountDue || 0) > 0
                            ? theme.danger
                            : theme.success,
                      },
                    ]}
                  >
                    PKR {selectedInvoice?.amountDue.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Status Badge */}
              <View style={styles.statusContainer}>
                <View
                  style={[
                    styles.statusBadgeLarge,
                    {
                      backgroundColor:
                        selectedInvoice?.status === 'PAID'
                          ? theme.success + '20'
                          : selectedInvoice?.status === 'PARTIAL'
                          ? theme.warning + '20'
                          : theme.danger + '20',
                    },
                  ]}
                >
                  <Icon
                    name={
                      selectedInvoice?.status === 'PAID'
                        ? 'check-circle'
                        : selectedInvoice?.status === 'PARTIAL'
                        ? 'clock-outline'
                        : 'alert-circle'
                    }
                    size={20}
                    color={
                      selectedInvoice?.status === 'PAID'
                        ? theme.success
                        : selectedInvoice?.status === 'PARTIAL'
                        ? theme.warning
                        : theme.danger
                    }
                  />
                  <Text
                    style={[
                      styles.statusTextLarge,
                      {
                        color:
                          selectedInvoice?.status === 'PAID'
                            ? theme.success
                            : selectedInvoice?.status === 'PARTIAL'
                            ? theme.warning
                            : theme.danger,
                      },
                    ]}
                  >
                    {selectedInvoice?.status === 'PAID'
                      ? 'Fully Paid'
                      : selectedInvoice?.status === 'PARTIAL'
                      ? 'Partially Paid'
                      : 'Unpaid'}
                  </Text>
                </View>
              </View>

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
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceNumber: { fontSize: 16, fontWeight: 'bold' },
  clientName: { fontSize: 14, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  date: { fontSize: 12 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 16, marginTop: 16 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  emptyButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  detailSection: {
    borderBottomWidth: 1,
    paddingBottom: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailSubValue: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
  },
  itemQty: {
    fontSize: 13,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: '600',
  },
  summarySection: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  statusBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  statusTextLarge: {
    fontSize: 16,
    fontWeight: '600',
  },
});
