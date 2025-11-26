import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useClientStore } from '@/store/clientStore';
import { Client } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';

export default function ClientListScreen({ navigation }: any) {
  const { theme, isDark } = useThemeStore();
  const { clients, loadClients, createClient, updateClient, deleteClient } =
    useClientStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    email: '',
    dob: new Date(),
    shopName: '',
    address: '',
    area: '',
  });

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadClients();
    });
    return unsubscribe;
  }, [navigation]);

  const filteredClients = clients.filter(
    client =>
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.shopName.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSaveClient = async () => {
    if (!formData.name.trim()) {
      showErrorToast('Validation Error', 'Please enter client name');
      return;
    }

    if (!formData.phone.trim()) {
      showErrorToast('Validation Error', 'Please enter phone number');
      return;
    }

    // Validate phone number
    if (formData.phone.length < 10) {
      showErrorToast(
        'Validation Error',
        'Phone number must be at least 10 digits',
      );
      return;
    }

    if (!formData.shopName.trim()) {
      showErrorToast('Validation Error', 'Please enter shop name');
      return;
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showErrorToast('Validation Error', 'Please enter a valid email address');
      return;
    }

    try {
      if (editingClient) {
        await updateClient(editingClient.id, {
          ...formData,
          dob: formData.dob,
        });
        showSuccessToast(
          'Client Updated',
          `${formData.name} has been updated successfully`,
        );
      } else {
        await createClient({
          ...formData,
          dob: formData.dob,
          balance: 0,
          totalBusinessValue: 0,
        });
        showSuccessToast(
          'Client Added',
          `${formData.name} has been added successfully`,
        );
      }
      resetForm();
      setShowAddModal(false);
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to save client');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setFormData({
      name: client.name,
      phone: client.phone,
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      dob: client.dob || new Date(),
      shopName: client.shopName,
      address: client.address || '',
      area: client.area || '',
    });
    setShowAddModal(true);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{visible: boolean; client: Client | null}>({visible: false, client: null});

  const handleDeleteClient = (client: Client) => {
    setDeleteConfirm({visible: true, client});
  };

  const confirmDelete = async () => {
    if (deleteConfirm.client) {
      await deleteClient(deleteConfirm.client.id);
      showSuccessToast('Client Deleted', `${deleteConfirm.client.name} has been deleted`);
    }
    setDeleteConfirm({visible: false, client: null});
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      dob: new Date(),
      shopName: '',
      address: '',
      area: '',
    });
    setEditingClient(null);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderClientCard = ({ item }: { item: Client }) => (
    <TouchableOpacity
      style={[
        styles.clientCard,
        { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={() =>
        navigation.navigate('ClientDetails', { clientId: item.id })
      }
    >
      <View style={styles.clientHeader}>
        <View
          style={[
            styles.clientAvatar,
            { backgroundColor: theme.primary + '20' },
          ]}
        >
          <Icon name="account" size={32} color={theme.primary} />
        </View>
        <View style={styles.clientInfo}>
          <Text style={[styles.clientName, { color: theme.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.clientShop, { color: theme.textSecondary }]}>
            {item.shopName}
          </Text>
          <View style={styles.contactRow}>
            <Icon name="phone" size={14} color={theme.textTertiary} />
            <Text style={[styles.clientPhone, { color: theme.textTertiary }]}>
              {item.phone}
            </Text>
          </View>
        </View>
        <View style={styles.clientActions}>
          <View
            style={[
              styles.balanceBadge,
              {
                backgroundColor:
                  item.balance > 0 ? theme.danger + '20' : theme.success + '20',
              },
            ]}
          >
            <Text
              style={[
                styles.balanceText,
                { color: item.balance > 0 ? theme.danger : theme.success },
              ]}
            >
              PKR {Math.abs(item.balance).toLocaleString()}
            </Text>
            <Text
              style={[
                styles.balanceLabel,
                { color: item.balance > 0 ? theme.danger : theme.success },
              ]}
            >
              {item.balance > 0 ? 'Due' : 'Credit'}
            </Text>
          </View>
        </View>
      </View>

      {(item.area || item.email || item.whatsapp) && (
        <View style={styles.clientDetails}>
          {item.area && (
            <View style={styles.detailRow}>
              <Icon name="map-marker" size={14} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.area}
              </Text>
            </View>
          )}
          {item.email && (
            <View style={styles.detailRow}>
              <Icon name="email" size={14} color={theme.textTertiary} />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.email}
              </Text>
            </View>
          )}
          {item.whatsapp && (
            <View style={styles.detailRow}>
              <Icon name="whatsapp" size={14} color="#25D366" />
              <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                {item.whatsapp}
              </Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.clientStats}>
        <View style={styles.statItem}>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
            Total Business
          </Text>
          <Text style={[styles.statValue, { color: theme.text }]}>
            PKR {item.totalBusinessValue.toLocaleString()}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteClient(item)}
        >
          <Icon name="delete" size={20} color={theme.danger} />
        </TouchableOpacity>
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
          Clients ({clients.length})
        </Text>
      </View>

      <View
        style={[styles.searchContainer, { backgroundColor: theme.surface }]}
      >
        <Icon name="magnify" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Search clients..."
          placeholderTextColor={theme.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClientCard}
        keyExtractor={(item: Client) => item.id}
        // @ts-ignore - contentContainerStyle is valid in React Native 0.82
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-group" size={64} color={theme.textTertiary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No clients found
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: theme.primary }]}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Client</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={() => setShowAddModal(true)}
      >
        <Icon name="plus" size={32} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Client Modal */}
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
                {editingClient ? 'Edit Client' : 'Add New Client'}
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
              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Client Name *
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
                placeholder="Enter client name"
                placeholderTextColor={theme.textTertiary}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
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
                placeholder="Enter shop name"
                placeholderTextColor={theme.textTertiary}
                value={formData.shopName}
                onChangeText={text =>
                  setFormData({ ...formData, shopName: text })
                }
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Phone Number *
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
                    placeholder="03XXXXXXXXX"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="phone-pad"
                    value={formData.phone}
                    onChangeText={text =>
                      setFormData({ ...formData, phone: text })
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>
                    WhatsApp
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
                    keyboardType="phone-pad"
                    value={formData.whatsapp}
                    onChangeText={text =>
                      setFormData({ ...formData, whatsapp: text })
                    }
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Email
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
                placeholder="email@example.com (Optional)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={formData.email}
                onChangeText={text => setFormData({ ...formData, email: text })}
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Date of Birth
              </Text>
              <TouchableOpacity
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: theme.text }}>
                  {formatDate(formData.dob)}
                </Text>
                <Icon name="calendar" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={formData.dob}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setFormData({ ...formData, dob: selectedDate });
                    }
                  }}
                  maximumDate={new Date()}
                />
              )}

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
                placeholder="Enter address (Optional)"
                placeholderTextColor={theme.textTertiary}
                value={formData.address}
                onChangeText={text =>
                  setFormData({ ...formData, address: text })
                }
              />

              <Text style={[styles.label, { color: theme.textSecondary }]}>
                Area/Locality
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
                placeholder="Enter area (Optional)"
                placeholderTextColor={theme.textTertiary}
                value={formData.area}
                onChangeText={text => setFormData({ ...formData, area: text })}
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
                  resetForm();
                  setShowAddModal(false);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveClient}
              >
                <Icon name="check" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {editingClient ? 'Update' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirm.visible}
        title="Delete Client"
        message={`Are you sure you want to delete ${deleteConfirm.client?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        icon="account-remove"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({visible: false, client: null})}
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
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { padding: 16 },
  clientCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  clientHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientInfo: { flex: 1 },
  clientName: { fontSize: 18, fontWeight: 'bold', marginBottom: 2 },
  clientShop: { fontSize: 14, marginBottom: 4 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  clientPhone: { fontSize: 12 },
  clientActions: { alignItems: 'flex-end' },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  balanceText: { fontSize: 14, fontWeight: 'bold' },
  balanceLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  clientDetails: {
    marginBottom: 12,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: { fontSize: 13 },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  statItem: {},
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  deleteButton: { padding: 8 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 16, marginTop: 16, marginBottom: 24 },
  emptyButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
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
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16 },
  row: { flexDirection: 'row', gap: 12 },
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
