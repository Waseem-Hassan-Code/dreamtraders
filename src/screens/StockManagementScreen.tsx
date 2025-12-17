import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  FlatList,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useStockStore } from '@/store/stockStore';
import { useCategoryStore } from '@/store/categoryStore';
import { StockItem, CategorySettings } from '@/types';
import { generateId, generateSequentialSKU } from '@/utils/idGenerator';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function StockManagementScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const {
    stockItems,
    loadStockItems,
    createStockItem,
    updateStockItem,
    deleteStockItem,
  } = useStockStore();
  const { categories, loadCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  // Add Stock Modal State
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [addStockItem, setAddStockItem] = useState<StockItem | null>(null);
  const [addStockQuantity, setAddStockQuantity] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    categoryType: 'Detergents',
    name: '',
    size: '',
    sku: '',
    barcode: '',
    purchasePrice: '',
    discountablePrice: '',
    salePrice: '',
    currentQuantity: '',
    minStockLevel: '',
    unit: 'pcs',
    description: '',
    itemsInPack: '', // Number of items in box/pack for bulk purchases
  });

  // Check if unit is collective type (box, pack)
  const isCollectiveUnit = formData.unit === 'box' || formData.unit === 'pack';

  // Calculate unit price based on items in pack
  const calculateUnitPrice = (totalPrice: string, itemsInPack: string) => {
    const total = parseFloat(totalPrice) || 0;
    const items = parseFloat(itemsInPack) || 0;
    if (total > 0 && items > 0) {
      return (total / items).toFixed(2);
    }
    return '0.00';
  };

  useEffect(() => {
    loadStockItems('all');
    loadCategories();
  }, []);

  useEffect(() => {}, [stockItems]);

  const enabledCategories = categories
    .filter(c => c.enabled)
    .sort((a, b) => a.order - b.order);
  const sizes = ['50g', '100g', '250g', '500g', '1kg', '2kg', '5kg', 'Custom'];
  const units = ['pcs', 'kg', 'g', 'L', 'ml', 'box', 'pack'];

  const filteredItems = stockItems.filter(
    item =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Auto-generate SKU when opening modal for new item
  const handleOpenAddModal = async () => {
    resetForm();
    // Generate new SKU for new items
    const newSku = await generateSequentialSKU();
    setFormData(prev => ({ ...prev, sku: newSku }));
    setShowAddModal(true);
  };

  const handleSaveStock = async () => {
    if (!formData.name.trim()) {
      showErrorToast('Validation Error', 'Please enter product name');
      return;
    }

    if (!formData.sku.trim()) {
      showErrorToast('Validation Error', 'Please enter SKU');
      return;
    }

    if (!formData.purchasePrice || parseFloat(formData.purchasePrice) <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid purchase price');
      return;
    }

    if (
      formData.salePrice &&
      parseFloat(formData.salePrice) < parseFloat(formData.purchasePrice)
    ) {
      showErrorToast('Warning', 'Sale price is less than purchase price');
    }

    try {
      const stockItem: StockItem = {
        id: editingItem?.id || generateId(),
        categoryId: formData.categoryType.toLowerCase(),
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode || undefined,
        purchasePrice: parseFloat(formData.purchasePrice),
        discountablePrice:
          parseFloat(formData.discountablePrice) ||
          parseFloat(formData.purchasePrice),
        salePrice:
          parseFloat(formData.salePrice) ||
          parseFloat(formData.discountablePrice) ||
          parseFloat(formData.purchasePrice),
        currentQuantity: parseFloat(formData.currentQuantity) || 0,
        minStockLevel: parseFloat(formData.minStockLevel) || 0,
        unit: formData.unit,
        itemsInPack: formData.itemsInPack
          ? parseInt(formData.itemsInPack)
          : undefined,
        description: formData.description || undefined,
        createdAt: editingItem?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingItem) {
        await updateStockItem(stockItem.id, stockItem);
        showSuccessToast(
          'Stock Updated',
          `${formData.name} has been updated successfully`,
        );
      } else {
        await createStockItem(stockItem);
        showSuccessToast(
          'Stock Added',
          `${formData.name} (${formData.currentQuantity} ${formData.unit}) added successfully`,
        );
      }

      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to save stock item');
    }
  };

  const resetForm = () => {
    setFormData({
      categoryType: 'Detergents',
      name: '',
      size: '',
      sku: '',
      barcode: '',
      purchasePrice: '',
      discountablePrice: '',
      salePrice: '',
      currentQuantity: '',
      minStockLevel: '',
      unit: 'pcs',
      description: '',
      itemsInPack: '',
    });
    setEditingItem(null);
  };

  const handleEditItem = (item: StockItem) => {
    setEditingItem(item);
    setFormData({
      categoryType: item.categoryId,
      name: item.name,
      size: '',
      sku: item.sku,
      barcode: item.barcode || '',
      purchasePrice: item.purchasePrice.toString(),
      discountablePrice: item.discountablePrice.toString(),
      salePrice: item.salePrice.toString(),
      currentQuantity: item.currentQuantity.toString(),
      minStockLevel: item.minStockLevel.toString(),
      unit: item.unit,
      description: item.description || '',
      itemsInPack: item.itemsInPack?.toString() || '',
    });
    setShowAddModal(true);
  };

  const handleOpenAddStock = (item: StockItem) => {
    setAddStockItem(item);
    setAddStockQuantity('');
    setShowAddStockModal(true);
  };

  const handleAddStockQuantity = async () => {
    if (!addStockItem) return;

    const qty = parseFloat(addStockQuantity);
    if (!qty || qty <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid quantity');
      return;
    }

    try {
      const { stockRepository } = await import('@/database/repositories');
      await stockRepository.updateQuantity(addStockItem.id, qty, {
        stockItemId: addStockItem.id,
        type: 'IN',
        quantity: qty,
        reason: 'Stock replenishment',
        performedBy: 'user',
      });

      await loadStockItems('all');
      setShowAddStockModal(false);
      setAddStockItem(null);
      setAddStockQuantity('');

      showSuccessToast(
        'Stock Added',
        `Added ${qty} ${addStockItem.unit} to ${addStockItem.name}`,
      );
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to add stock');
    }
  };

  const handleDeleteStock = (item: StockItem) => {
    setItemToDelete(item);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStock = async () => {
    if (!itemToDelete) return;
    try {
      await deleteStockItem(itemToDelete.id);
      showSuccessToast('Deleted', `${itemToDelete.name} has been deleted`);
      setShowAddModal(false);
      setEditingItem(null);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to delete stock item');
    } finally {
      setShowDeleteConfirm(false);
      setItemToDelete(null);
    }
  };

  const renderStockItem = ({ item }: { item: StockItem }) => {
    const isLowStock = item.currentQuantity <= item.minStockLevel;
    return (
      <TouchableOpacity
        style={[
          styles.stockCard,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
        onPress={() => handleEditItem(item)}
      >
        <View style={styles.stockHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.stockName, { color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.stockSku, { color: theme.textTertiary }]}>
              SKU: {item.sku}
            </Text>
            {item.description && (
              <View style={styles.stockSizeRow}>
                <Icon name="weight" size={14} color={theme.textTertiary} />
                <Text style={[styles.stockSize, { color: theme.textTertiary }]}>
                  {item.description}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.stockRightSection}>
            <View
              style={[
                styles.stockBadge,
                {
                  backgroundColor: isLowStock
                    ? theme.danger + '20'
                    : theme.success + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.stockBadgeText,
                  { color: isLowStock ? theme.danger : theme.success },
                ]}
              >
                {item.currentQuantity} {item.unit}
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.addStockBtn,
                { backgroundColor: theme.primary + '20' },
              ]}
              onPress={e => {
                e.stopPropagation();
                handleOpenAddStock(item);
              }}
            >
              <Icon name="plus" size={16} color={theme.primary} />
              <Text style={[styles.addStockBtnText, { color: theme.primary }]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stockDetails}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
              Purchase:
            </Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>
              PKR {item.purchasePrice}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
              Wholesale:
            </Text>
            <Text style={[styles.priceValue, { color: theme.text }]}>
              PKR {item.discountablePrice}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>
              Retail:
            </Text>
            <Text style={[styles.priceValue, { color: theme.primary }]}>
              PKR {item.salePrice}
            </Text>
          </View>
        </View>

        {isLowStock && (
          <View
            style={[
              styles.lowStockAlert,
              { backgroundColor: theme.danger + '15' },
            ]}
          >
            <Icon name="alert" size={16} color={theme.danger} />
            <Text style={[styles.lowStockText, { color: theme.danger }]}>
              Low Stock! Min: {item.minStockLevel} {item.unit}
            </Text>
          </View>
        )}
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Stock Management
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View
        style={[styles.searchContainer, { backgroundColor: theme.surface }]}
      >
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search stock items..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryScroll, { backgroundColor: theme.surface }]}
        contentContainerStyle={styles.categoryScrollContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              backgroundColor: !selectedCategory ? theme.primary : theme.card,
              borderColor: theme.border,
            },
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text
            style={[
              styles.categoryChipText,
              { color: !selectedCategory ? '#fff' : theme.text },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {enabledCategories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === cat.id ? theme.primary : theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setSelectedCategory(cat.id)}
          >
            <Icon
              name={cat.icon}
              size={18}
              color={selectedCategory === cat.id ? '#fff' : cat.color}
            />
            <Text
              style={[
                styles.categoryChipText,
                { color: selectedCategory === cat.id ? '#fff' : theme.text },
              ]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredItems}
        renderItem={renderStockItem}
        keyExtractor={(item: StockItem) => item.id}
        // @ts-ignore - contentContainerStyle is valid in React Native 0.82
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="package-variant" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No stock items found
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={handleOpenAddModal}
            >
              <Text style={styles.emptyButtonText}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* FAB Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={handleOpenAddModal}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingItem ? 'Edit Stock Item' : 'Add New Stock'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelectScroll}
              >
                {categories
                  .filter(c => c.enabled)
                  .sort((a, b) => a.order - b.order)
                  .map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categorySelectChip,
                        {
                          backgroundColor:
                            formData.categoryType === cat.name
                              ? cat.color
                              : theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() =>
                        setFormData({ ...formData, categoryType: cat.name })
                      }
                    >
                      <Icon
                        name={cat.icon}
                        size={24}
                        color={
                          formData.categoryType === cat.name
                            ? '#fff'
                            : cat.color
                        }
                      />
                      <Text
                        style={[
                          styles.categorySelectText,
                          {
                            color:
                              formData.categoryType === cat.name
                                ? '#fff'
                                : theme.text,
                          },
                        ]}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Product Name *
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
                placeholder="e.g., Ariel, Surf Excel"
                placeholderTextColor={theme.textTertiary}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
              />

              {/* Conditionally show size field if category has weight */}
              {(() => {
                const selectedCat = categories.find(
                  c => c.name === formData.categoryType,
                );
                return selectedCat?.hasWeight ? (
                  <>
                    <Text
                      style={[styles.label, { color: theme.textSecondary }]}
                    >
                      Size/Weight
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.sizeScroll}
                    >
                      {sizes.map(size => (
                        <TouchableOpacity
                          key={size}
                          style={[
                            styles.sizeChip,
                            {
                              backgroundColor:
                                formData.size === size
                                  ? theme.primary
                                  : theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                          onPress={() => setFormData({ ...formData, size })}
                        >
                          <Text
                            style={[
                              styles.sizeText,
                              {
                                color:
                                  formData.size === size ? '#fff' : theme.text,
                              },
                            ]}
                          >
                            {size}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                ) : null;
              })()}

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    SKU {!editingItem && '(Auto-generated)'}
                  </Text>
                  <View
                    style={[
                      styles.input,
                      styles.skuInput,
                      {
                        backgroundColor: editingItem
                          ? theme.card
                          : theme.card + '80',
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text, fontSize: 16 }}>
                      {formData.sku || 'Generating...'}
                    </Text>
                    {!editingItem && (
                      <Icon name="lock" size={16} color={theme.textTertiary} />
                    )}
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Barcode
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
                    placeholder="Optional"
                    placeholderTextColor={theme.textTertiary}
                    value={formData.barcode}
                    onChangeText={text =>
                      setFormData({ ...formData, barcode: text })
                    }
                  />
                </View>
              </View>

              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Pricing Details
              </Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Purchase Price *
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
                    value={formData.purchasePrice}
                    onChangeText={text =>
                      setFormData({ ...formData, purchasePrice: text })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Wholesale Rate
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
                    value={formData.discountablePrice}
                    onChangeText={text =>
                      setFormData({ ...formData, discountablePrice: text })
                    }
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Retail Price
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
                value={formData.salePrice}
                onChangeText={text =>
                  setFormData({ ...formData, salePrice: text })
                }
              />

              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Stock Details
              </Text>

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Current Quantity
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
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    value={formData.currentQuantity}
                    onChangeText={text =>
                      setFormData({ ...formData, currentQuantity: text })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Min Stock Level
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
                    placeholder="0"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="decimal-pad"
                    value={formData.minStockLevel}
                    onChangeText={text =>
                      setFormData({ ...formData, minStockLevel: text })
                    }
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Unit
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
              >
                {units.map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor:
                          formData.unit === unit ? theme.primary : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, unit, itemsInPack: '' })
                    }
                  >
                    <Text
                      style={[
                        styles.unitText,
                        { color: formData.unit === unit ? '#fff' : theme.text },
                      ]}
                    >
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Items in Pack - shown only for box/pack units */}
              {isCollectiveUnit && (
                <>
                  <View
                    style={[
                      styles.unitPriceInfo,
                      {
                        backgroundColor: theme.primary + '10',
                        borderColor: theme.primary + '30',
                      },
                    ]}
                  >
                    <Icon name="information" size={20} color={theme.primary} />
                    <Text
                      style={[
                        styles.unitPriceInfoText,
                        { color: theme.primary },
                      ]}
                    >
                      For {formData.unit} purchases, enter items per{' '}
                      {formData.unit} to calculate unit price
                    </Text>
                  </View>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.label, { color: theme.textSecondary }]}
                      >
                        Items per{' '}
                        {formData.unit.charAt(0).toUpperCase() +
                          formData.unit.slice(1)}
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
                        placeholder="e.g., 12, 24, 48"
                        placeholderTextColor={theme.textTertiary}
                        keyboardType="number-pad"
                        value={formData.itemsInPack}
                        onChangeText={text =>
                          setFormData({ ...formData, itemsInPack: text })
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.label, { color: theme.textSecondary }]}
                      >
                        Unit Price (Auto)
                      </Text>
                      <View
                        style={[
                          styles.input,
                          styles.skuInput,
                          {
                            backgroundColor: theme.success + '15',
                            borderColor: theme.success + '40',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: theme.success,
                            fontSize: 16,
                            fontWeight: '600',
                          }}
                        >
                          PKR{' '}
                          {calculateUnitPrice(
                            formData.purchasePrice,
                            formData.itemsInPack,
                          )}
                        </Text>
                        <Icon
                          name="calculator"
                          size={16}
                          color={theme.success}
                        />
                      </View>
                    </View>
                  </View>
                  {formData.itemsInPack && formData.purchasePrice && (
                    <View
                      style={[
                        styles.calculationSummary,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <View style={styles.calculationRow}>
                        <Text
                          style={[
                            styles.calculationLabel,
                            { color: theme.textSecondary },
                          ]}
                        >
                          Purchase Price / Item:
                        </Text>
                        <Text
                          style={[
                            styles.calculationValue,
                            { color: theme.success },
                          ]}
                        >
                          PKR{' '}
                          {calculateUnitPrice(
                            formData.purchasePrice,
                            formData.itemsInPack,
                          )}
                        </Text>
                      </View>
                      {formData.discountablePrice && (
                        <View style={styles.calculationRow}>
                          <Text
                            style={[
                              styles.calculationLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Wholesale / Item:
                          </Text>
                          <Text
                            style={[
                              styles.calculationValue,
                              { color: theme.primary },
                            ]}
                          >
                            PKR{' '}
                            {calculateUnitPrice(
                              formData.discountablePrice,
                              formData.itemsInPack,
                            )}
                          </Text>
                        </View>
                      )}
                      {formData.salePrice && (
                        <View style={styles.calculationRow}>
                          <Text
                            style={[
                              styles.calculationLabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            Retail / Item:
                          </Text>
                          <Text
                            style={[
                              styles.calculationValue,
                              { color: theme.warning },
                            ]}
                          >
                            PKR{' '}
                            {calculateUnitPrice(
                              formData.salePrice,
                              formData.itemsInPack,
                            )}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Optional notes or description..."
                placeholderTextColor={theme.textTertiary}
                multiline
                numberOfLines={3}
                value={formData.description}
                onChangeText={text =>
                  setFormData({ ...formData, description: text })
                }
              />

              {/* Delete Button - only show when editing */}
              {editingItem && (
                <TouchableOpacity
                  style={[
                    styles.deleteStockButton,
                    { borderColor: theme.danger },
                  ]}
                  onPress={() => handleDeleteStock(editingItem)}
                >
                  <Icon name="delete-outline" size={20} color={theme.danger} />
                  <Text
                    style={[
                      styles.deleteStockButtonText,
                      { color: theme.danger },
                    ]}
                  >
                    Delete This Item
                  </Text>
                </TouchableOpacity>
              )}

              <View style={{ height: 20 }} />
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveStock}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>Save Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Stock Quantity Modal */}
      <Modal
        visible={showAddStockModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowAddStockModal(false)}
      >
        <View style={styles.addStockModalOverlay}>
          <View
            style={[
              styles.addStockModalContent,
              { backgroundColor: theme.surface },
            ]}
          >
            <View
              style={[
                styles.addStockModalHeader,
                { borderBottomColor: theme.border },
              ]}
            >
              <Text style={[styles.addStockModalTitle, { color: theme.text }]}>
                Add Stock
              </Text>
              <TouchableOpacity onPress={() => setShowAddStockModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.addStockModalBody}>
              <Text style={[styles.addStockItemName, { color: theme.text }]}>
                {addStockItem?.name}
              </Text>
              <Text
                style={[styles.addStockItemSku, { color: theme.textSecondary }]}
              >
                SKU: {addStockItem?.sku}
              </Text>

              <View
                style={[
                  styles.currentStockRow,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.currentStockLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Current Stock
                </Text>
                <Text style={[styles.currentStockValue, { color: theme.text }]}>
                  {addStockItem?.currentQuantity} {addStockItem?.unit}
                </Text>
              </View>

              {/* Total Value */}
              <View
                style={[
                  styles.currentStockRow,
                  {
                    backgroundColor: theme.success + '15',
                    borderColor: theme.success + '30',
                    marginTop: 8,
                  },
                ]}
              >
                <Text
                  style={[styles.currentStockLabel, { color: theme.success }]}
                >
                  Total Value (Purchase)
                </Text>
                <Text
                  style={[styles.currentStockValue, { color: theme.success }]}
                >
                  PKR{' '}
                  {(
                    (addStockItem?.currentQuantity || 0) *
                    (addStockItem?.purchasePrice || 0)
                  ).toLocaleString()}
                </Text>
              </View>

              <Text
                style={[
                  styles.label,
                  { color: theme.textSecondary, marginTop: 16 },
                ]}
              >
                Quantity to Add *
              </Text>
              <TextInput
                style={[
                  styles.addStockInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Enter quantity"
                placeholderTextColor={theme.textTertiary}
                keyboardType="decimal-pad"
                value={addStockQuantity}
                onChangeText={setAddStockQuantity}
                autoFocus
              />

              <View style={styles.addStockModalFooter}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                      flex: 1,
                    },
                  ]}
                  onPress={() => setShowAddStockModal(false)}
                >
                  <Text
                    style={[styles.cancelButtonText, { color: theme.text }]}
                  >
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: theme.success, flex: 1 },
                  ]}
                  onPress={handleAddStockQuantity}
                >
                  <Icon name="plus" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Add Stock</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete Stock Item"
        message={`Are you sure you want to delete "${itemToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteStock}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setItemToDelete(null);
        }}
        destructive
      />
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
  headerTitle: { fontSize: 20, fontWeight: 'bold', flex: 1, marginLeft: 16 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  categoryScroll: { maxHeight: 56 },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    height: 36,
  },
  categoryChipText: { fontSize: 13, fontWeight: '600', maxWidth: 80 },
  listContent: { padding: 16 },
  stockCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    elevation: 2,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stockName: { fontSize: 18, fontWeight: 'bold' },
  stockSku: { fontSize: 12, marginTop: 2 },
  stockSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stockSize: { fontSize: 12, marginLeft: 2 },
  stockBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  stockBadgeText: { fontSize: 14, fontWeight: 'bold' },
  stockDetails: { gap: 8 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceLabel: { fontSize: 14 },
  priceValue: { fontSize: 14, fontWeight: '600' },
  lowStockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
  },
  lowStockText: { fontSize: 12, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24 },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalScroll: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  skuInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  categorySelectScroll: { marginBottom: 8 },
  categorySelectChip: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    minWidth: 100,
  },
  categorySelectText: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  sizeScroll: { marginBottom: 8 },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  sizeText: { fontSize: 14, fontWeight: '600' },
  unitScroll: { marginBottom: 8 },
  unitChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  unitText: { fontSize: 14, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: { fontSize: 16, fontWeight: '600' },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  stockRightSection: {
    alignItems: 'flex-end',
    gap: 8,
  },
  addStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addStockBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addStockModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  addStockModalContent: {
    width: '100%',
    borderRadius: 16,
    elevation: 5,
  },
  addStockModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  addStockModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addStockModalBody: {
    padding: 20,
  },
  addStockItemName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addStockItemSku: {
    fontSize: 14,
    marginTop: 4,
  },
  currentStockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 16,
  },
  currentStockLabel: {
    fontSize: 14,
  },
  currentStockValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addStockInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 18,
    textAlign: 'center',
  },
  addStockModalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  unitPriceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 8,
  },
  unitPriceInfoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  calculationSummary: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calculationLabel: {
    fontSize: 14,
  },
  calculationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
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
  deleteStockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 24,
    gap: 8,
  },
  deleteStockButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
