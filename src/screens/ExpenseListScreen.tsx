import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useExpenseStore } from '../store/expenseStore';
import { Expense, ExpenseCategory } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function ExpenseListScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const {
    expenses,
    categories,
    loadExpenses,
    loadCategories,
    createExpense,
    deleteExpense,
  } = useExpenseStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date(),
    notes: '',
  });

  // Filter expenses based on search query
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;
    const query = searchQuery.toLowerCase();
    return expenses.filter(
      exp =>
        exp.description.toLowerCase().includes(query) ||
        exp.category.name.toLowerCase().includes(query),
    );
  }, [expenses, searchQuery]);

  // Calculate summary statistics - expenses only
  const summary = useMemo(() => {
    const today = new Date();
    const thisMonth = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return (
        expDate.getMonth() === today.getMonth() &&
        expDate.getFullYear() === today.getFullYear()
      );
    });
    const totalThisMonth = thisMonth.reduce((sum, exp) => sum + exp.amount, 0);
    const totalAll = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    return { totalThisMonth, totalAll, countThisMonth: thisMonth.length };
  }, [expenses]);

  useEffect(() => {
    loadExpenses();
    loadCategories();
  }, []);

  // Set default category when categories load
  useEffect(() => {
    if (categories.length > 0 && !formData.categoryId) {
      setFormData(prev => ({ ...prev, categoryId: categories[0].id }));
    }
  }, [categories]);

  const handleSaveExpense = async () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      showErrorToast('Validation Error', 'Please enter a valid amount');
      return;
    }

    if (!formData.categoryId) {
      showErrorToast('Validation Error', 'Please select a category');
      return;
    }

    if (!formData.description.trim()) {
      showErrorToast('Validation Error', 'Please enter a description');
      return;
    }

    const category = categories.find(c => c.id === formData.categoryId);
    if (!category) {
      showErrorToast('Error', 'Invalid category selected');
      return;
    }

    try {
      await createExpense({
        category,
        categoryId: category.id,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date,
        isRecurring: false,
        notes: formData.notes,
      });

      showSuccessToast('Expense Added', 'Expense added successfully');
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to save expense');
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    expense: Expense | null;
  }>({ visible: false, expense: null });

  const handleDelete = (expense: Expense) => {
    setDeleteConfirm({ visible: true, expense });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.expense) {
      await deleteExpense(deleteConfirm.expense.id);
      showSuccessToast('Expense Deleted', 'Expense has been deleted');
    }
    setDeleteConfirm({ visible: false, expense: null });
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      categoryId: categories[0]?.id || '',
      date: new Date(),
      notes: '',
    });
  };

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderExpenseItem = ({ item }: { item: Expense }) => (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderLeftColor: item.category.color || theme.danger,
          borderLeftWidth: 4,
        },
      ]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.iconBox,
              { backgroundColor: (item.category.color || theme.danger) + '15' },
            ]}
          >
            <Icon
              name={item.category.icon || 'cash'}
              size={22}
              color={item.category.color || theme.danger}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text
              style={[styles.desc, { color: theme.text }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
            <View style={styles.categoryRow}>
              <View
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor:
                      (item.category.color || theme.danger) + '15',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.categoryBadgeText,
                    { color: item.category.color || theme.danger },
                  ]}
                >
                  {item.category.name}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={[styles.amount, { color: theme.danger }]}>
            PKR {item.amount.toLocaleString()}
          </Text>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            style={[styles.deleteBtn, { backgroundColor: theme.danger + '10' }]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="trash-can-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
        <View style={styles.dateRow}>
          <Icon name="calendar-outline" size={14} color={theme.textTertiary} />
          <Text style={[styles.date, { color: theme.textTertiary }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        {item.notes && (
          <View style={styles.notesRow}>
            <Icon
              name="note-text-outline"
              size={14}
              color={theme.textTertiary}
            />
            <Text
              style={[styles.notesText, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {item.notes}
            </Text>
          </View>
        )}
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
          Expenses
        </Text>
      </View>

      {/* Search Bar */}
      <View
        style={[styles.searchContainer, { backgroundColor: theme.surface }]}
      >
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search expenses..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={18} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Card */}
      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: theme.danger, borderRadius: 16 },
          ]}
        >
          <View style={styles.summaryTop}>
            <View style={styles.summaryIconBox}>
              <Icon name="cash-minus" size={24} color="#fff" />
            </View>
            <View style={styles.summaryInfo}>
              <Text style={styles.summaryLabel}>This Month</Text>
              <Text style={styles.summaryAmount}>
                PKR {summary.totalThisMonth.toLocaleString()}
              </Text>
            </View>
          </View>
          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: 'rgba(255,255,255,0.2)' },
            ]}
          />
          <View style={styles.summaryBottom}>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {summary.countThisMonth}
              </Text>
              <Text style={styles.summaryStatLabel}>This Month</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>{expenses.length}</Text>
              <Text style={styles.summaryStatLabel}>Total Records</Text>
            </View>
            <View style={styles.summaryStatItem}>
              <Text style={styles.summaryStatValue}>
                {(summary.totalAll / 1000).toFixed(1)}K
              </Text>
              <Text style={styles.summaryStatLabel}>All Time</Text>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredExpenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cash-multiple" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'No expenses match your search'
                : 'No expenses recorded'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.danger }]}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add Expense Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Add Expense
              </Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
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
                value={formData.amount}
                onChangeText={text =>
                  setFormData({ ...formData, amount: text })
                }
                autoFocus
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Category *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
              >
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor:
                          formData.categoryId === cat.id
                            ? cat.color
                            : theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() =>
                      setFormData({ ...formData, categoryId: cat.id })
                    }
                  >
                    <Icon
                      name={cat.icon || 'circle'}
                      size={16}
                      color={
                        formData.categoryId === cat.id ? '#fff' : cat.color
                      }
                    />
                    <Text
                      style={[
                        styles.categoryChipText,
                        {
                          color:
                            formData.categoryId === cat.id
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
                Description *
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
                placeholder="e.g. Lunch, Petrol"
                placeholderTextColor={theme.textTertiary}
                value={formData.description}
                onChangeText={text =>
                  setFormData({ ...formData, description: text })
                }
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
                  {formatDate(formData.date)}
                </Text>
                <Icon name="calendar" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate)
                      setFormData({ ...formData, date: selectedDate });
                  }}
                  maximumDate={new Date()}
                />
              )}

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { backgroundColor: theme.danger, marginTop: 24 },
                ]}
                onPress={handleSaveExpense}
              >
                <Text style={styles.saveButtonText}>Save Expense</Text>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="Delete Expense"
        message={`Are you sure you want to delete this expense of PKR ${
          deleteConfirm.expense?.amount?.toLocaleString() || ''
        }?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon="cash-remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ visible: false, expense: null })}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  summaryCard: {
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  summaryTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryIconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
    marginBottom: 2,
  },
  summaryAmount: {
    color: '#fff',
    fontSize: 26,
    fontWeight: 'bold',
  },
  summaryDivider: {
    height: 1,
    marginVertical: 12,
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryStatItem: {
    alignItems: 'center',
  },
  summaryStatValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  summaryStatLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 2,
  },
  listContent: { padding: 16, paddingTop: 8 },
  card: {
    padding: 14,
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
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  desc: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  deleteBtn: {
    padding: 6,
    borderRadius: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  date: { fontSize: 12 },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginLeft: 16,
  },
  notesText: {
    fontSize: 12,
    flex: 1,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
  categoryScroll: { flexDirection: 'row', marginBottom: 8 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  categoryChipText: { fontSize: 14, fontWeight: '500' },
  saveButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
