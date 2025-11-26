import React, { useEffect, useState } from 'react';
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
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    date: new Date(),
    notes: '',
  });

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

  const [deleteConfirm, setDeleteConfirm] = useState<{visible: boolean; expense: Expense | null}>({visible: false, expense: null});

  const handleDelete = (expense: Expense) => {
    setDeleteConfirm({visible: true, expense});
  };

  const confirmDelete = async () => {
    if (deleteConfirm.expense) {
      await deleteExpense(deleteConfirm.expense.id);
      showSuccessToast('Expense Deleted', 'Expense has been deleted');
    }
    setDeleteConfirm({visible: false, expense: null});
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
    <View
      style={[
        styles.card,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.cardLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: item.category.color + '20' },
          ]}
        >
          <Icon
            name={item.category.icon || 'cash'}
            size={24}
            color={item.category.color || theme.text}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={[styles.desc, { color: theme.text }]}>
            {item.description}
          </Text>
          <Text style={[styles.category, { color: theme.textSecondary }]}>
            {item.category.name}
          </Text>
          <Text style={[styles.date, { color: theme.textTertiary }]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </View>
      <View style={styles.cardRight}>
        <Text style={[styles.amount, { color: theme.danger }]}>
          - {item.amount.toLocaleString()}
        </Text>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          style={styles.deleteBtn}
        >
          <Icon name="trash-can-outline" size={20} color={theme.textTertiary} />
        </TouchableOpacity>
      </View>
    </View>
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

      <FlatList
        data={expenses}
        renderItem={renderExpenseItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="cash-multiple" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No expenses recorded
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
        message={`Are you sure you want to delete this expense of ₹${deleteConfirm.expense?.amount?.toLocaleString() || ''}?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon="cash-remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({visible: false, expense: null})}
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
  listContent: { padding: 16 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    alignItems: 'center',
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: { flex: 1 },
  desc: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 14, marginTop: 2 },
  date: { fontSize: 12, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 16, fontWeight: 'bold' },
  deleteBtn: { padding: 4 },
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
