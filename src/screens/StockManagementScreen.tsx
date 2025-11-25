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
import { generateId } from '@/utils/idGenerator';

export default function StockManagementScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { stockItems, loadStockItems, createStockItem, updateStockItem } =
    useStockStore();
  const { categories, loadCategories } = useCategoryStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

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
  });

  useEffect(() => {
    loadStockItems('all');
    loadCategories();
  }, []);

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

  const handleSaveStock = async () => {
    if (!formData.name || !formData.sku || !formData.purchasePrice) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
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
        description: formData.description || undefined,
        createdAt: editingItem?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      if (editingItem) {
        await updateStockItem(stockItem.id, stockItem);
        Alert.alert(
          'Success',
          `${formData.name} has been updated successfully`,
        );
      } else {
        await createStockItem(stockItem);
        Alert.alert(
          'Success',
          `${formData.name} (${formData.currentQuantity} ${formData.unit}) added successfully`,
        );
      }

      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save stock item');
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
    });
    setShowAddModal(true);
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
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Icon name="plus-circle" size={28} color={theme.primary} />
        </TouchableOpacity>
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
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Item</Text>
            </TouchableOpacity>
          </View>
        }
      />

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
                    SKU *
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
                    placeholder="Stock Keeping Unit"
                    placeholderTextColor={theme.textTertiary}
                    value={formData.sku}
                    onChangeText={text =>
                      setFormData({ ...formData, sku: text })
                    }
                  />
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
                    onPress={() => setFormData({ ...formData, unit })}
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
  categoryScroll: { maxHeight: 50 },
  categoryScrollContent: { paddingHorizontal: 16, gap: 8, paddingVertical: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  categoryChipText: { fontSize: 14, fontWeight: '600' },
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
});
