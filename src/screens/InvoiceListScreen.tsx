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
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { useClientStore } from '@/store/clientStore';
import { Invoice } from '@/types';
import { generateAndShareInvoicePDF } from '@/utils/pdfGenerator';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function InvoiceListScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { invoices, loadInvoices, deleteInvoice } = useInvoiceStore();
  const { clients, loadClients } = useClientStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadInvoices();
      loadClients();
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

  const handleGeneratePDF = async (includeLedger: boolean = false) => {
    if (!selectedInvoice) return;

    const client = clients.find(c => c.id === selectedInvoice.clientId);
    if (!client) {
      showErrorToast('Error', 'Client information not found');
      return;
    }

    setGeneratingPDF(true);
    try {
      // Get ledger entries if needed
      let ledgerEntries: any[] = [];
      if (includeLedger) {
        const { clientRepository } = await import('@/database/repositories');
        ledgerEntries = await clientRepository.getLedger(client.id);
      }

      await generateAndShareInvoicePDF({
        invoice: selectedInvoice,
        client,
        ledgerEntries,
        includeLedger,
      });
      showSuccessToast('Success', 'PDF generated and ready to share');
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        showErrorToast('Error', error.message || 'Failed to generate PDF');
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      await deleteInvoice(invoiceToDelete.id);
      showSuccessToast(
        'Deleted',
        `Invoice #${invoiceToDelete.invoiceNumber} has been deleted`,
      );
      setShowDetailsModal(false);
      setSelectedInvoice(null);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to delete invoice');
    } finally {
      setShowDeleteConfirm(false);
      setInvoiceToDelete(null);
    }
  };

  const renderInvoice = ({ item }: { item: Invoice }) => {
    const statusColors = {
      PAID: theme.success,
      PARTIAL: theme.warning,
      UNPAID: theme.danger,
    };
    const statusColor = statusColors[item.status] || theme.textSecondary;

    return (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderLeftColor: statusColor,
            borderLeftWidth: 4,
            borderColor: theme.border,
          },
        ]}
        onPress={() => {
          setSelectedInvoice(item);
          setShowDetailsModal(true);
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.invoiceNumber, { color: theme.text }]}>
              #{item.invoiceNumber}
            </Text>
            <Text style={[styles.clientName, { color: theme.textSecondary }]}>
              {item.client.name}
            </Text>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.amount, { color: theme.text }]}>
              PKR {item.total.toLocaleString()}
            </Text>
            <View style={styles.statusRow}>
              <Icon
                name={
                  item.status === 'PAID'
                    ? 'check-circle'
                    : item.status === 'PARTIAL'
                    ? 'progress-clock'
                    : 'alert-circle-outline'
                }
                size={14}
                color={statusColor}
              />
              <Text style={[styles.statusTextSmall, { color: statusColor }]}>
                {item.status === 'PAID'
                  ? 'Paid'
                  : item.status === 'PARTIAL'
                  ? 'Partial'
                  : 'Unpaid'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
          <Text style={[styles.date, { color: theme.textTertiary }]}>
            {formatDate(item.createdAt)}
          </Text>
          {item.status !== 'PAID' && (
            <Text style={[styles.dueAmount, { color: theme.danger }]}>
              Due: PKR {item.amountDue.toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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

              {/* PDF Generation Buttons */}
              <View
                style={[styles.pdfSection, { borderTopColor: theme.border }]}
              >
                <Text
                  style={[
                    styles.pdfSectionTitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  Share Invoice
                </Text>
                <View style={styles.pdfButtons}>
                  <TouchableOpacity
                    style={[
                      styles.pdfButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={() => handleGeneratePDF(false)}
                    disabled={generatingPDF}
                  >
                    {generatingPDF ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="file-pdf-box" size={20} color="#fff" />
                        <Text style={styles.pdfButtonText}>Invoice Only</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.pdfButton,
                      { backgroundColor: theme.success },
                    ]}
                    onPress={() => handleGeneratePDF(true)}
                    disabled={generatingPDF}
                  >
                    {generatingPDF ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon
                          name="file-document-multiple"
                          size={20}
                          color="#fff"
                        />
                        <Text style={styles.pdfButtonText}>With Ledger</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Delete Button */}
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: theme.danger }]}
                onPress={() =>
                  selectedInvoice && handleDeleteInvoice(selectedInvoice)
                }
              >
                <Icon name="delete-outline" size={20} color={theme.danger} />
                <Text
                  style={[styles.deleteButtonText, { color: theme.danger }]}
                >
                  Delete Invoice
                </Text>
              </TouchableOpacity>

              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Invoice"
        message={`Are you sure you want to delete Invoice #${invoiceToDelete?.invoiceNumber}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteInvoice}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setInvoiceToDelete(null);
        }}
        destructive
      />
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
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  invoiceNumber: { fontSize: 16, fontWeight: 'bold' },
  clientName: { fontSize: 14, marginTop: 2 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
  date: { fontSize: 12 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  dueAmount: { fontSize: 13, fontWeight: '600' },
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
  pdfSection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
  },
  pdfSectionTitle: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  pdfButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
