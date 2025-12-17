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

    // Check if this is a pack/box item
    const isPack =
      (item.unit === 'box' || item.unit === 'pack') &&
      item.itemsInPack &&
      item.itemsInPack > 0;

    const newItem: SaleItem = {
      stockItemId: item.id,
      stockItemName: item.name,
      quantity: 1,
      unitPrice: item.salePrice,
      total: item.salePrice,
      availableQuantity: item.currentQuantity,
      isPack: isPack,
      itemsInPack: item.itemsInPack,
      packsQuantity: isPack ? 1 : undefined,
      looseQuantity: 0,
    };

    setInvoiceItems([...invoiceItems, newItem]);
    setShowItemModal(false);
  };

  // Update pack quantity (full packs)
  const updatePackQuantity = (index: number, packs: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];
    const stockItem = stockItems.find(s => s.id === item.stockItemId);

    if (!stockItem) return;

    const looseItems = item.looseQuantity || 0;
    const totalQuantity = packs + looseItems / (item.itemsInPack || 1);

    if (totalQuantity > stockItem.currentQuantity) {
      showErrorToast(
        'Insufficient Stock',
        `Only ${stockItem.currentQuantity} ${stockItem.unit} available`,
      );
      return;
    }

    item.packsQuantity = packs;
    item.quantity = totalQuantity;
    // Calculate total: packs at pack price + loose items at per-item price
    const packTotal = packs * item.unitPrice;
    const looseTotal = looseItems * (item.unitPrice / (item.itemsInPack || 1));
    item.total = Math.round(packTotal + looseTotal);
    setInvoiceItems(newItems);
  };

  // Update loose items quantity (from partial pack)
  const updateLooseQuantity = (index: number, loose: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];
    const stockItem = stockItems.find(s => s.id === item.stockItemId);

    if (!stockItem || !item.itemsInPack) return;

    // Validate loose quantity doesn't exceed items in pack - 1
    if (loose >= item.itemsInPack) {
      showErrorToast(
        'Invalid Quantity',
        `Max ${item.itemsInPack - 1} loose items allowed`,
      );
      return;
    }

    const packs = item.packsQuantity || 0;
    const totalQuantity = packs + loose / item.itemsInPack;

    if (totalQuantity > stockItem.currentQuantity) {
      showErrorToast(
        'Insufficient Stock',
        `Only ${stockItem.currentQuantity} ${stockItem.unit} available`,
      );
      return;
    }

    item.looseQuantity = loose;
    item.quantity = totalQuantity;

    // Calculate total: packs at pack price + loose items at per-item price
    const packTotal = packs * item.unitPrice;
    const looseTotal = loose * (item.unitPrice / item.itemsInPack);
    item.total = Math.round(packTotal + looseTotal);
    setInvoiceItems(newItems);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const newItems = [...invoiceItems];
    const item = newItems[index];

    // Get available stock for this item
    const stockItem = stockItems.find(s => s.id === item.stockItemId);
    const availableQty = stockItem?.currentQuantity || 0;

    // Validate quantity against available stock
    if (quantity > availableQty) {
      showErrorToast(
        'Insufficient Stock',
        `Only ${availableQty} ${stockItem?.unit || 'units'} available`,
      );
      return;
    }

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

    // Validate stock availability for all items
    for (const item of invoiceItems) {
      const stockItem = stockItems.find(s => s.id === item.stockItemId);
      if (!stockItem) {
        showErrorToast('Error', `Stock item ${item.stockItemName} not found`);
        return;
      }
      if (item.quantity > stockItem.currentQuantity) {
        showErrorToast(
          'Insufficient Stock',
          `Only ${stockItem.currentQuantity} ${stockItem.unit} of ${item.stockItemName} available`,
        );
        return;
      }
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

      // Reload stock to reflect deductions
      loadStockItems('all');

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

        {invoiceItems.map((item, index) => {
          const stockItem = stockItems.find(s => s.id === item.stockItemId);
          const availableQty = stockItem?.currentQuantity || 0;
          const isOverStock = item.quantity > availableQty;
          const isPack =
            item.isPack && item.itemsInPack && item.itemsInPack > 0;

          return (
            <View
              key={index}
              style={[
                styles.itemCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isOverStock ? theme.danger : theme.border,
                },
              ]}
            >
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: theme.text }]}>
                    {item.stockItemName}
                  </Text>
                  <Text
                    style={[
                      styles.stockInfo,
                      {
                        color: isOverStock ? theme.danger : theme.textTertiary,
                      },
                    ]}
                  >
                    Available: {availableQty} {stockItem?.unit || 'pcs'}
                    {isPack && ` (${item.itemsInPack} items/pack)`}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(index)}>
                  <Icon name="close-circle" size={20} color={theme.danger} />
                </TouchableOpacity>
              </View>

              {/* Pack/Loose Controls for pack items */}
              {isPack ? (
                <View style={styles.packControls}>
                  <View style={styles.packRow}>
                    <View style={styles.controlGroup}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Full Packs
                      </Text>
                      <View style={styles.qtyAdjuster}>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: theme.surface },
                          ]}
                          onPress={() =>
                            updatePackQuantity(
                              index,
                              Math.max(0, (item.packsQuantity || 0) - 1),
                            )
                          }
                        >
                          <Icon name="minus" size={18} color={theme.text} />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          keyboardType="number-pad"
                          value={(item.packsQuantity || 0).toString()}
                          onChangeText={text =>
                            updatePackQuantity(index, parseInt(text) || 0)
                          }
                        />
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: theme.surface },
                          ]}
                          onPress={() =>
                            updatePackQuantity(
                              index,
                              (item.packsQuantity || 0) + 1,
                            )
                          }
                        >
                          <Icon name="plus" size={18} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.controlGroup}>
                      <Text
                        style={[
                          styles.controlLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Loose Items
                      </Text>
                      <View style={styles.qtyAdjuster}>
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: theme.surface },
                          ]}
                          onPress={() =>
                            updateLooseQuantity(
                              index,
                              Math.max(0, (item.looseQuantity || 0) - 1),
                            )
                          }
                        >
                          <Icon name="minus" size={18} color={theme.text} />
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            styles.qtyInput,
                            { color: theme.text, borderColor: theme.border },
                          ]}
                          keyboardType="number-pad"
                          value={(item.looseQuantity || 0).toString()}
                          onChangeText={text =>
                            updateLooseQuantity(index, parseInt(text) || 0)
                          }
                        />
                        <TouchableOpacity
                          style={[
                            styles.qtyBtn,
                            { backgroundColor: theme.surface },
                          ]}
                          onPress={() =>
                            updateLooseQuantity(
                              index,
                              (item.looseQuantity || 0) + 1,
                            )
                          }
                        >
                          <Icon name="plus" size={18} color={theme.text} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.packSummary,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <Text
                      style={[
                        styles.packSummaryText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {item.packsQuantity || 0} packs × PKR{' '}
                      {item.unitPrice.toLocaleString()} = PKR{' '}
                      {(
                        (item.packsQuantity || 0) * item.unitPrice
                      ).toLocaleString()}
                    </Text>
                    {(item.looseQuantity || 0) > 0 && (
                      <Text
                        style={[
                          styles.packSummaryText,
                          { color: theme.textSecondary },
                        ]}
                      >
                        + {item.looseQuantity} items × PKR{' '}
                        {Math.round(
                          item.unitPrice / (item.itemsInPack || 1),
                        ).toLocaleString()}{' '}
                        = PKR{' '}
                        {Math.round(
                          (item.looseQuantity || 0) *
                            (item.unitPrice / (item.itemsInPack || 1)),
                        ).toLocaleString()}
                      </Text>
                    )}
                    <Text style={[styles.packTotal, { color: theme.primary }]}>
                      Total: PKR {item.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ) : (
                /* Regular item controls */
                <View style={styles.itemControls}>
                  <View style={styles.controlGroup}>
                    <Text
                      style={[
                        styles.controlLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Qty
                    </Text>
                    <TextInput
                      style={[
                        styles.smallInput,
                        {
                          color: isOverStock ? theme.danger : theme.text,
                          borderColor: isOverStock
                            ? theme.danger
                            : theme.border,
                        },
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
                      style={[
                        styles.controlLabel,
                        { color: theme.textSecondary },
                      ]}
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
                      style={[
                        styles.controlLabel,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Total
                    </Text>
                    <Text style={[styles.itemTotal, { color: theme.text }]}>
                      {item.total.toLocaleString()}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        })}

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
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: theme.card }]}
              onPress={() => setShowClientModal(false)}
            >
              <Icon name="close" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select Client
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View
            style={[styles.searchContainer, { backgroundColor: theme.surface }]}
          >
            <Icon name="magnify" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name or shop..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredClients}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.clientListContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clientCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => {
                  setSelectedClient(item);
                  setShowClientModal(false);
                }}
              >
                <View
                  style={[
                    styles.clientAvatar,
                    { backgroundColor: theme.primary + '20' },
                  ]}
                >
                  <Icon name="account" size={24} color={theme.primary} />
                </View>
                <View style={styles.clientInfo}>
                  <Text style={[styles.clientName, { color: theme.text }]}>
                    {item.name}
                  </Text>
                  <Text
                    style={[styles.clientShop, { color: theme.textSecondary }]}
                  >
                    {item.shopName}
                  </Text>
                  {item.area && (
                    <View style={styles.clientAreaRow}>
                      <Icon
                        name="map-marker"
                        size={12}
                        color={theme.textTertiary}
                      />
                      <Text
                        style={[
                          styles.clientArea,
                          { color: theme.textTertiary },
                        ]}
                      >
                        {item.area}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.clientBalanceContainer}>
                  <Text
                    style={[
                      styles.clientBalanceLabel,
                      { color: theme.textTertiary },
                    ]}
                  >
                    Balance
                  </Text>
                  <Text
                    style={[
                      styles.clientBalance,
                      {
                        color: item.balance > 0 ? theme.danger : theme.success,
                      },
                    ]}
                  >
                    PKR {item.balance.toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Icon
                  name="account-search"
                  size={48}
                  color={theme.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No clients found
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* Item Selection Modal */}
      <Modal visible={showItemModal} animationType="slide">
        <View
          style={[styles.modalContainer, { backgroundColor: theme.background }]}
        >
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: theme.card }]}
              onPress={() => setShowItemModal(false)}
            >
              <Icon name="close" size={20} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select Item
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <View
            style={[styles.searchContainer, { backgroundColor: theme.surface }]}
          >
            <Icon name="magnify" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search by name or SKU..."
              placeholderTextColor={theme.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
          </View>
          <FlatList
            data={filteredStock}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.stockListContent}
            renderItem={({ item }) => {
              const isOutOfStock = item.currentQuantity <= 0;
              const isLowStock =
                item.currentQuantity <= item.minStockLevel &&
                item.currentQuantity > 0;
              const margin = item.salePrice - item.purchasePrice;
              const marginPercent = (
                (margin / item.purchasePrice) *
                100
              ).toFixed(0);

              return (
                <TouchableOpacity
                  style={[
                    styles.stockCard,
                    {
                      backgroundColor: theme.card,
                      borderColor: isOutOfStock
                        ? theme.danger + '50'
                        : theme.border,
                      opacity: isOutOfStock ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => addItemToInvoice(item)}
                  disabled={isOutOfStock}
                >
                  <View style={styles.stockCardHeader}>
                    <View style={styles.stockCardLeft}>
                      <Text
                        style={[styles.stockItemName, { color: theme.text }]}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[
                          styles.stockItemSku,
                          { color: theme.textTertiary },
                        ]}
                      >
                        SKU: {item.sku}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.stockQtyBadge,
                        {
                          backgroundColor: isOutOfStock
                            ? theme.danger + '20'
                            : isLowStock
                            ? theme.warning + '20'
                            : theme.success + '20',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stockQtyText,
                          {
                            color: isOutOfStock
                              ? theme.danger
                              : isLowStock
                              ? theme.warning
                              : theme.success,
                          },
                        ]}
                      >
                        {isOutOfStock
                          ? 'Out of Stock'
                          : `${item.currentQuantity} ${item.unit}`}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stockCardPrices}>
                    <View style={styles.priceItem}>
                      <Text
                        style={[
                          styles.priceLabel,
                          { color: theme.textTertiary },
                        ]}
                      >
                        Purchase
                      </Text>
                      <Text
                        style={[
                          styles.priceValue,
                          { color: theme.textSecondary },
                        ]}
                      >
                        PKR {item.purchasePrice}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text
                        style={[
                          styles.priceLabel,
                          { color: theme.textTertiary },
                        ]}
                      >
                        Sale
                      </Text>
                      <Text
                        style={[styles.priceValue, { color: theme.primary }]}
                      >
                        PKR {item.salePrice}
                      </Text>
                    </View>
                    <View style={styles.priceItem}>
                      <Text
                        style={[
                          styles.priceLabel,
                          { color: theme.textTertiary },
                        ]}
                      >
                        Margin
                      </Text>
                      <Text
                        style={[styles.priceValue, { color: theme.success }]}
                      >
                        {marginPercent}%
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Icon
                  name="package-variant"
                  size={48}
                  color={theme.textTertiary}
                />
                <Text
                  style={[styles.emptyText, { color: theme.textSecondary }]}
                >
                  No items found
                </Text>
              </View>
            }
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
  stockInfo: { fontSize: 12, marginTop: 2 },
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
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  clientListContent: {
    padding: 16,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientShop: {
    fontSize: 14,
    marginBottom: 2,
  },
  clientAreaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  clientArea: {
    fontSize: 12,
  },
  clientBalanceContainer: {
    alignItems: 'flex-end',
  },
  clientBalanceLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  clientBalance: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stockListContent: {
    padding: 16,
  },
  stockCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  stockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stockCardLeft: {
    flex: 1,
  },
  stockItemName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  stockItemSku: {
    fontSize: 12,
  },
  stockQtyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockQtyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  stockCardPrices: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  priceItem: {
    alignItems: 'center',
    flex: 1,
  },
  priceLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
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
  listItemSubtitle: { fontSize: 12 },
  listItemPrice: { fontSize: 16, fontWeight: 'bold' },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // Pack controls styles
  packControls: {
    marginTop: 8,
  },
  packRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  qtyAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 70,
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
  },
  packSummary: {
    padding: 10,
    borderRadius: 8,
  },
  packSummaryText: {
    fontSize: 12,
    marginBottom: 4,
  },
  packTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
});
