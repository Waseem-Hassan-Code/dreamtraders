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
  Switch,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useCategoryStore } from '@/store/categoryStore';
import { CategorySettings } from '@/types';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { Database } from '@/database';
import {
  uploadToFirestore,
  downloadFromFirestore,
  fullSync,
  getSyncStatus,
  SyncProgress,
} from '@/services/firebaseSync';

// Available icons for categories
const AVAILABLE_ICONS = [
  'spray-bottle',
  'food-apple',
  'cup-water',
  'bottle-soda',
  'food-croissant',
  'candy',
  'spray',
  'home-variant',
  'bottle-tonic',
  'shopping',
  'cart',
  'package-variant',
  'box',
  'cube',
  'glass-cocktail',
  'food',
  'silverware-fork-knife',
  'ice-cream',
  'cookie',
  'car',
  'briefcase',
  'tools',
  'medical-bag',
  'school',
  'tshirt-crew',
  'shoe-sneaker',
  'flower',
  'baby-carriage',
  'book-open-variant',
  'cellphone',
  'laptop',
  'monitor',
  'gamepad-variant',
  'headphones',
  'watch',
  'wallet',
  'credit-card',
  'bank',
  'fuel',
  'gift',
];

// Available colors
const AVAILABLE_COLORS = [
  { name: 'Blue', value: '#0ea5e9' },
  { name: 'Green', value: '#10b981' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Purple', value: '#8b5cf6' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Emerald', value: '#059669' },
];

export default function SettingsScreen({ navigation }: any) {
  const { theme, isDark, toggleTheme } = useThemeStore();
  const {
    categories,
    loadCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    toggleCategoryEnabled,
  } = useCategoryStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<CategorySettings | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [categoryToDelete, setCategoryToDelete] =
    useState<CategorySettings | null>(null);

  // Sync state
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    icon: 'package-variant',
    color: '#0ea5e9',
    hasWeight: true,
  });

  useEffect(() => {
    loadCategories();
    loadSyncStatus();
  }, []);

  const loadSyncStatus = async () => {
    try {
      const status = await getSyncStatus();
      setUnsyncedCount(status.unsyncedCount);
      setLastSyncTime(status.lastSyncTime);
    } catch (error) {
      console.log('Error loading sync status:', error);
    }
  };

  const handleUploadToCloud = async () => {
    setIsSyncing(true);
    try {
      const result = await uploadToFirestore(progress => {
        setSyncProgress(progress);
      });
      if (result.success) {
        showSuccessToast('Upload Complete', result.message);
        await loadSyncStatus();
      } else {
        showErrorToast('Upload Failed', result.message);
      }
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Upload failed');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleDownloadFromCloud = async () => {
    Alert.alert(
      'Download Data',
      'This will download all data from the cloud and merge with your local data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Download',
          onPress: async () => {
            setIsSyncing(true);
            try {
              const result = await downloadFromFirestore(progress => {
                setSyncProgress(progress);
              });
              if (result.success) {
                showSuccessToast('Download Complete', result.message);
                await loadSyncStatus();
              } else {
                showErrorToast('Download Failed', result.message);
              }
            } catch (error: any) {
              showErrorToast('Error', error.message || 'Download failed');
            } finally {
              setIsSyncing(false);
              setSyncProgress(null);
            }
          },
        },
      ],
    );
  };

  const handleFullSync = async () => {
    setIsSyncing(true);
    try {
      const result = await fullSync(progress => {
        setSyncProgress(progress);
      });
      if (result.success) {
        showSuccessToast('Sync Complete', result.message);
        await loadSyncStatus();
      } else {
        showErrorToast('Sync Failed', result.message);
      }
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Sync failed');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, formData);
      } else {
        await createCategory({
          ...formData,
          enabled: true,
        });
      }
      resetForm();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save category');
    }
  };

  const handleDeleteCategory = (category: CategorySettings) => {
    setCategoryToDelete(category);
    setShowDeleteDialog(true);
  };

  const confirmDeleteCategory = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete.id);
        showSuccessToast(
          'Deleted',
          `Category "${categoryToDelete.name}" deleted`,
        );
      } catch (error) {
        showErrorToast('Error', 'Failed to delete category');
      }
    }
    setShowDeleteDialog(false);
    setCategoryToDelete(null);
  };

  const handleResetDatabase = async () => {
    try {
      const database = (await import('@/database')).default;
      database.resetDatabase();
      showSuccessToast(
        'Success',
        'Database has been reset. Please restart the app.',
      );
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to reset database');
    }
    setShowResetDialog(false);
  };

  const handleEditCategory = (category: CategorySettings) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
      hasWeight: category.hasWeight,
    });
    setShowAddModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      icon: 'package-variant',
      color: '#0ea5e9',
      hasWeight: true,
    });
    setEditingCategory(null);
  };

  const renderCategoryItem = (category: CategorySettings) => (
    <View
      key={category.id}
      style={[
        styles.categoryItem,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
    >
      <View style={styles.categoryLeft}>
        <View
          style={[
            styles.categoryIconContainer,
            { backgroundColor: category.color + '20' },
          ]}
        >
          <Icon name={category.icon} size={24} color={category.color} />
        </View>
        <View style={styles.categoryInfo}>
          <Text style={[styles.categoryName, { color: theme.text }]}>
            {category.name}
          </Text>
          <View style={styles.categoryBadges}>
            {category.hasWeight && (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.primary + '20' },
                ]}
              >
                <Text style={[styles.badgeText, { color: theme.primary }]}>
                  Has Weight
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <View style={styles.categoryActions}>
        <Switch
          value={category.enabled}
          onValueChange={() => toggleCategoryEnabled(category.id)}
          trackColor={{ false: theme.border, true: theme.primary + '50' }}
          thumbColor={category.enabled ? theme.primary : theme.textTertiary}
        />
        <TouchableOpacity
          onPress={() => handleEditCategory(category)}
          style={styles.actionButton}
        >
          <Icon name="pencil" size={20} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDeleteCategory(category)}
          style={styles.actionButton}
        >
          <Icon name="delete" size={20} color={theme.danger} />
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Settings
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            App Settings
          </Text>
          <View
            style={[
              styles.settingCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Icon name="theme-light-dark" size={24} color={theme.primary} />
                <Text style={[styles.settingLabel, { color: theme.text }]}>
                  Dark Mode
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: theme.border, true: theme.primary + '50' }}
                thumbColor={isDark ? theme.primary : theme.textTertiary}
              />
            </View>
          </View>
        </View>

        {/* Cloud Sync Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Cloud Sync
          </Text>
          <View
            style={[
              styles.settingCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            {/* Sync Status */}
            <View
              style={[
                styles.syncStatusRow,
                { borderBottomColor: theme.border },
              ]}
            >
              <View style={styles.syncStatusItem}>
                <Icon name="cloud-upload" size={20} color={theme.primary} />
                <Text
                  style={[
                    styles.syncStatusLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Unsynced
                </Text>
                <Text
                  style={[
                    styles.syncStatusValue,
                    {
                      color: unsyncedCount > 0 ? theme.warning : theme.success,
                    },
                  ]}
                >
                  {unsyncedCount} records
                </Text>
              </View>
              <View style={styles.syncStatusItem}>
                <Icon name="clock-outline" size={20} color={theme.primary} />
                <Text
                  style={[
                    styles.syncStatusLabel,
                    { color: theme.textSecondary },
                  ]}
                >
                  Last Sync
                </Text>
                <Text style={[styles.syncStatusValue, { color: theme.text }]}>
                  {lastSyncTime
                    ? lastSyncTime.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </Text>
              </View>
            </View>

            {/* Sync Progress */}
            {isSyncing && syncProgress && (
              <View
                style={[
                  styles.syncProgressContainer,
                  { backgroundColor: theme.primary + '10' },
                ]}
              >
                <ActivityIndicator size="small" color={theme.primary} />
                <View style={styles.syncProgressText}>
                  <Text
                    style={[styles.syncProgressTitle, { color: theme.text }]}
                  >
                    {syncProgress.status === 'uploading'
                      ? 'Uploading...'
                      : 'Downloading...'}
                  </Text>
                  <Text
                    style={[
                      styles.syncProgressMessage,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {syncProgress.message}
                  </Text>
                </View>
              </View>
            )}

            {/* Upload Button */}
            <TouchableOpacity
              style={[styles.settingRow, { opacity: isSyncing ? 0.5 : 1 }]}
              onPress={handleUploadToCloud}
              disabled={isSyncing}
            >
              <View style={styles.settingLeft}>
                <Icon name="cloud-upload" size={24} color={theme.success} />
                <View>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    Upload to Cloud
                  </Text>
                  <Text
                    style={[styles.helperText, { color: theme.textSecondary }]}
                  >
                    Backup local data to Firebase
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {/* Download Button */}
            <TouchableOpacity
              style={[styles.settingRow, { opacity: isSyncing ? 0.5 : 1 }]}
              onPress={handleDownloadFromCloud}
              disabled={isSyncing}
            >
              <View style={styles.settingLeft}>
                <Icon name="cloud-download" size={24} color={theme.primary} />
                <View>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    Download from Cloud
                  </Text>
                  <Text
                    style={[styles.helperText, { color: theme.textSecondary }]}
                  >
                    Restore data on new device
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>

            {/* Full Sync Button */}
            <TouchableOpacity
              style={[styles.settingRow, { opacity: isSyncing ? 0.5 : 1 }]}
              onPress={handleFullSync}
              disabled={isSyncing}
            >
              <View style={styles.settingLeft}>
                <Icon name="cloud-sync" size={24} color={theme.warning} />
                <View>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    Full Sync
                  </Text>
                  <Text
                    style={[styles.helperText, { color: theme.textSecondary }]}
                  >
                    Upload & download all data
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Developer Tools Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Developer Tools
          </Text>
          <View
            style={[
              styles.settingCard,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={styles.settingRow}
              onPress={() => setShowResetDialog(true)}
            >
              <View style={styles.settingLeft}>
                <Icon name="database-refresh" size={24} color={theme.danger} />
                <View>
                  <Text style={[styles.settingLabel, { color: theme.text }]}>
                    Reset Database
                  </Text>
                  <Text
                    style={[styles.helperText, { color: theme.textSecondary }]}
                  >
                    Clear all data and reinitialize
                  </Text>
                </View>
              </View>
              <Icon
                name="chevron-right"
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Category Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Product Categories
            </Text>
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              style={[styles.addButton, { backgroundColor: theme.primary }]}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.addButtonText}>Add Category</Text>
            </TouchableOpacity>
          </View>
          <Text
            style={[styles.sectionDescription, { color: theme.textSecondary }]}
          >
            Define your product categories and customize form fields
          </Text>

          {categories.sort((a, b) => a.order - b.order).map(renderCategoryItem)}
        </View>
      </ScrollView>

      {/* Add/Edit Category Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          resetForm();
          setShowAddModal(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>
                  Category Name *
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
                  value={formData.name}
                  onChangeText={text =>
                    setFormData({ ...formData, name: text })
                  }
                  placeholder="e.g., Detergents, Groceries"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Icon</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setShowIconPicker(true)}
                >
                  <Icon name={formData.icon} size={24} color={formData.color} />
                  <Text style={[styles.pickerText, { color: theme.text }]}>
                    {formData.icon}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.text }]}>Color</Text>
                <TouchableOpacity
                  style={[
                    styles.pickerButton,
                    {
                      backgroundColor: theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => setShowColorPicker(true)}
                >
                  <View
                    style={[
                      styles.colorPreview,
                      { backgroundColor: formData.color },
                    ]}
                  />
                  <Text style={[styles.pickerText, { color: theme.text }]}>
                    {formData.color}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={20}
                    color={theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.label, { color: theme.text }]}>
                      Has Weight/Size Field
                    </Text>
                    <Text
                      style={[
                        styles.helperText,
                        { color: theme.textSecondary },
                      ]}
                    >
                      Enable if products need weight or size specifications
                    </Text>
                  </View>
                  <Switch
                    value={formData.hasWeight}
                    onValueChange={value =>
                      setFormData({ ...formData, hasWeight: value })
                    }
                    trackColor={{
                      false: theme.border,
                      true: theme.primary + '50',
                    }}
                    thumbColor={
                      formData.hasWeight ? theme.primary : theme.textTertiary
                    }
                  />
                </View>
              </View>
            </ScrollView>

            <View
              style={[styles.modalFooter, { borderTopColor: theme.border }]}
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { backgroundColor: theme.card },
                ]}
                onPress={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <Text style={[styles.buttonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleSaveCategory}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>
                  {editingCategory ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Icon Picker Modal */}
      <Modal
        visible={showIconPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowIconPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.pickerModal, { backgroundColor: theme.surface }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Icon
              </Text>
              <TouchableOpacity onPress={() => setShowIconPicker(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerGrid}>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map(iconName => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconOption,
                      {
                        backgroundColor: theme.card,
                        borderColor:
                          formData.icon === iconName
                            ? theme.primary
                            : theme.border,
                        borderWidth: formData.icon === iconName ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, icon: iconName });
                      setShowIconPicker(false);
                    }}
                  >
                    <Icon name={iconName} size={28} color={formData.color} />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal
        visible={showColorPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowColorPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.pickerModal, { backgroundColor: theme.surface }]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Select Color
              </Text>
              <TouchableOpacity onPress={() => setShowColorPicker(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.colorGrid}>
              {AVAILABLE_COLORS.map(color => (
                <TouchableOpacity
                  key={color.value}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: color.value,
                      borderColor:
                        formData.color === color.value
                          ? theme.text
                          : 'transparent',
                      borderWidth: formData.color === color.value ? 3 : 0,
                    },
                  ]}
                  onPress={() => {
                    setFormData({ ...formData, color: color.value });
                    setShowColorPicker(false);
                  }}
                >
                  {formData.color === color.value && (
                    <Icon name="check" size={24} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Category Confirm Dialog */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        type="danger"
        icon="tag-remove"
        confirmText="Delete"
        onConfirm={() => {
          if (categoryToDelete) {
            deleteCategory(categoryToDelete.id);
          }
          setShowDeleteDialog(false);
          setCategoryToDelete(null);
        }}
        onCancel={() => {
          setShowDeleteDialog(false);
          setCategoryToDelete(null);
        }}
      />

      {/* Reset Database Confirm Dialog */}
      <ConfirmDialog
        visible={showResetDialog}
        title="Reset Database"
        message="This will delete ALL data including clients, invoices, stock, and expenses. This action cannot be undone!"
        type="danger"
        icon="database-remove"
        confirmText="Reset All Data"
        onConfirm={async () => {
          try {
            const db = Database.getInstance();
            await db.execute('DELETE FROM invoice_items');
            await db.execute('DELETE FROM invoices');
            await db.execute('DELETE FROM ledger_entries');
            await db.execute('DELETE FROM clients');
            await db.execute('DELETE FROM stock_movements');
            await db.execute('DELETE FROM stock_items');
            await db.execute('DELETE FROM expenses');
            showSuccessToast(
              'Database Reset',
              'All data has been cleared successfully',
            );
          } catch (error) {
            console.error('Error resetting database:', error);
            showErrorToast('Error', 'Failed to reset database');
          }
          setShowResetDialog(false);
        }}
        onCancel={() => setShowResetDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  settingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
  },
  colorPreview: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {},
  saveButton: {},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerModal: {
    width: '90%',
    maxHeight: '70%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  pickerGrid: {
    padding: 16,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconOption: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  colorOption: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  syncStatusItem: {
    alignItems: 'center',
    gap: 4,
  },
  syncStatusLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  syncStatusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 8,
    gap: 12,
  },
  syncProgressText: {
    flex: 1,
  },
  syncProgressTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  syncProgressMessage: {
    fontSize: 12,
    marginTop: 2,
  },
});
