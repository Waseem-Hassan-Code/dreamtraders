import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useClientStore } from '@/store/clientStore';
import { useStockStore } from '@/store/stockStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { Client, StockItem, SaleItem } from '@/types';
import { showSuccessToast, showErrorToast } from '@/utils/toast';

export default function InvoiceCreateScreen({ navigation, route }: any) {
  const { theme, isDark } = useThemeStore();
  const { clients, loadClients } = useClientStore();
  const { stockItems, loadStockItems } = useStockStore();
  const { createInvoice, generateInvoiceNumber } = useInvoiceStore();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<SaleItem[]>([]);
  const [invoiceNumber, setInvoiceNumber] = useState('');

  // Modals
  const [showClientModal, setShowClientModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Invoice Details
  const [discount, setDiscount] = useState('');
  const [tax, setTax] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [notes, setNotes] = useState('');

  // Reload clients and stock whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadClients();
      loadStockItems('all');
      loadInvoiceNumber();

      // Pre-select client if passed from Client Details
      if (route.params?.clientId) {
        const client = clients.find(c => c.id === route.params.clientId);
        if (client) setSelectedClient(client);
      }
    }, [route.params?.clientId]),
  );

  const loadInvoiceNumber = async () => {
    const num = await generateInvoiceNumber();
    setInvoiceNumber(num);
  };

  const addItemToInvoice = (item: StockItem) => {
    const existingItem = invoiceItems.find(i => i.stockItemId === item.id);

    if (existingItem) {
      showErrorToast('Item Already Added', 'Adjust quantity in the list');
      return;
    }

    if (item.currentQuantity <= 0) {
      showErrorToast('Out of Stock', `${item.name} is out of stock`);
      return;
    }

    const newItem: SaleItem = {
      stockItemId: item.id,
      stockItemName: item.name,
      quantity: 1,
      unitPrice: item.salePrice,
      total: item.salePrice,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setShowItemModal(false);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];
    item.quantity = quantity;
    item.total = quantity * item.unitPrice;
    setInvoiceItems(newItems);
  };

  const updateItemPrice = (index: number, price: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];
    item.unitPrice = price;
    item.total = item.quantity * price;
    setInvoiceItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...invoiceItems];
    newItems.splice(index, 1);
    setInvoiceItems(newItems);
  };

  // Calculations
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = parseFloat(discount) || 0;
  const taxAmount = parseFloat(tax) || 0;
  const total = subtotal - discountAmount + taxAmount;
  const paid = parseFloat(amountPaid) || 0;
  const due = total - paid;

  const handleSaveInvoice = async () => {
    if (!selectedClient) {
      showErrorToast('Validation Error', 'Please select a client');
      return;
    }
    if (invoiceItems.length === 0) {
      showErrorToast('Validation Error', 'Please add at least one item');
      return;
    }

    if (paid > total) {
      showErrorToast('Validation Error', 'Amount paid cannot exceed total');
      return;
    }

    try {
      await createInvoice({
        invoiceNumber,
        clientId: selectedClient.id,
        client: selectedClient,
        items: invoiceItems,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        total,
        amountPaid: paid,
        amountDue: due,
        status: due <= 0 ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID',
        notes,
      });

      showSuccessToast(
        'Invoice Created',
        `Invoice #${invoiceNumber} created successfully`,
      );
      navigation.goBack();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to create invoice');
    }
  };

  const filteredStock = stockItems.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.shopName.toLowerCase().includes(searchQuery.toLowerCase()),
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          New Invoice
        </Text>
        <TouchableOpacity onPress={handleSaveInvoice}>
          <Text style={[styles.saveText, { color: theme.primary }]}>SAVE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Invoice Info */}
        <View
          style={[
            styles.section,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Invoice #
            </Text>
            <Text style={[styles.value, { color: theme.text }]}>
              {invoiceNumber}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.row}
            onPress={() => {
              setSearchQuery('');
              setShowClientModal(true);
            }}
          >
            <Text style={[styles.label, { color: theme.textSecondary }]}>
              Client
            </Text>
            <View style={styles.clientSelect}>
              <Text
                style={[
                  styles.value,
                  { color: selectedClient ? theme.text : theme.textTertiary },
                ]}
              >
                {selectedClient ? selectedClient.name : 'Select Client'}
              </Text>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Items List */}
        <View style={styles.itemsHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Items
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setShowItemModal(true);
            }}
          >
            <Text style={[styles.addText, { color: theme.primary }]}>
              + Add Item
            </Text>
          </TouchableOpacity>
        </View>

        {invoiceItems.map((item, index) => (
          <View
            key={index}
            style={[
              styles.itemCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.itemHeader}>
              <Text style={[styles.itemName, { color: theme.text }]}>
                {item.stockItemName}
              </Text>
              <TouchableOpacity onPress={() => removeItem(index)}>
                <Icon name="close-circle" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.itemControls}>
              <View style={styles.controlGroup}>
                <Text
                  style={[styles.controlLabel, { color: theme.textSecondary }]}
                >
                  Qty
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                  keyboardType="decimal-pad"
                  value={item.quantity.toString()}
                  onChangeText={text =>
                    updateItemQuantity(index, parseFloat(text) || 0)
                  }
                />
              </View>
              <View style={styles.controlGroup}>
                <Text
                  style={[styles.controlLabel, { color: theme.textSecondary }]}
                >
                  Price
                </Text>
                <TextInput
                  style={[
                    styles.smallInput,
                    { color: theme.text, borderColor: theme.border },
                  ]}
                  keyboardType="decimal-pad"
                  value={item.unitPrice.toString()}
                  onChangeText={text =>
                    updateItemPrice(index, parseFloat(text) || 0)
                  }
                />
              </View>
              <View style={styles.controlGroup}>
                <Text
                  style={[styles.controlLabel, { color: theme.textSecondary }]}
                >
                  Total
                </Text>
                <Text style={[styles.itemTotal, { color: theme.text }]}>
                  {item.total.toLocaleString()}
                </Text>
              </View>
            </View>
          </View>
        ))}

        {/* Summary */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginTop: 20,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Subtotal
            </Text>
            <Text style={[styles.summaryValue, { color: theme.text }]}>
              {subtotal.toLocaleString()}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Discount
            </Text>
            <TextInput
              style={[styles.summaryInput, { color: theme.text }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={discount}
              onChangeText={setDiscount}
              textAlign="right"
            />
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Tax
            </Text>
            <TextInput
              style={[styles.summaryInput, { color: theme.text }]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={tax}
              onChangeText={setTax}
              textAlign="right"
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.summaryRow}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>
              Total
            </Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>
              {total.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Payment */}
        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              marginTop: 20,
              marginBottom: 40,
            },
          ]}
        >
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Amount Paid
            </Text>
            <TextInput
              style={[
                styles.summaryInput,
                { color: theme.success, fontWeight: 'bold' },
              ]}
              placeholder="0"
              placeholderTextColor={theme.textTertiary}
              keyboardType="decimal-pad"
              value={amountPaid}
              onChangeText={setAmountPaid}
              textAlign="right"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
              Balance Due
            </Text>
            <Text
              style={[
                styles.summaryValue,
                { color: due > 0 ? theme.danger : theme.success },
              ]}
            >
              {due.toLocaleString()}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Client Selection Modal */}
      <Modal visible={showClientModal} animationType="slide">
        <View
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity onPress={() => setShowClientModal(false)}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.modalSearch,
                { color: theme.text, backgroundColor: theme.card },
              ]}
              placeholder="Search Clients..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listItem, { borderBottomColor: theme.border }]}
                onPress={() => {
                  setSelectedClient(item);
                  setShowClientModal(false);
                }}
              >
                <Text style={[styles.listItemTitle, { color: theme.text }]}>
                  {item.name}
                </Text>
                <Text
                  style={[
                    styles.listItemSubtitle,
                    { color: theme.textSecondary },
                  ]}
                >
                  {item.shopName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Item Selection Modal */}
      <Modal visible={showItemModal} animationType="slide">
        <View
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
        >
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <TouchableOpacity onPress={() => setShowItemModal(false)}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <TextInput
              style={[
                styles.modalSearch,
                { color: theme.text, backgroundColor: theme.card },
              ]}
              placeholder="Search Items..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredStock}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.listItem, { borderBottomColor: theme.border }]}
                onPress={() => addItemToInvoice(item)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.listItemTitle, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.listItemSubtitle,
                      { color: theme.textSecondary },
                    ]}
                  >
                    Stock: {item.currentQuantity} {item.unit}
                  </Text>
                </View>
                <Text style={[styles.listItemPrice, { color: theme.primary }]}>
                  {item.salePrice}
                </Text>
              </TouchableOpacity>
            )}
          />
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
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    elevation: 2,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  saveText: { fontSize: 16, fontWeight: 'bold' },
  content: { flex: 1, padding: 16 },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  divider: { height: 1, marginVertical: 8 },
  label: { fontSize: 16 },
  value: { fontSize: 16, fontWeight: '600' },
  clientSelect: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  addText: { fontSize: 16, fontWeight: '600' },
  itemCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemControls: { flexDirection: 'row', gap: 12 },
  controlGroup: { flex: 1 },
  controlLabel: { fontSize: 12, marginBottom: 4 },
  smallInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: { fontSize: 16 },
  summaryValue: { fontSize: 16, fontWeight: '600' },
  summaryInput: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 80,
    padding: 0,
  },
  totalLabel: { fontSize: 20, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  modalSearch: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 16,
  },
  listItem: {
    padding: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listItemTitle: { fontSize: 16, fontWeight: '600' },
  listItemSubtitle: { fontSize: 14, marginTop: 4 },
  listItemPrice: { fontSize: 16, fontWeight: 'bold' },
});
