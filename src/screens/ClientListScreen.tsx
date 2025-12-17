import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useClientStore } from '@/store/clientStore';
import { Client } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { shadows } from '@/utils/theme';

const { width } = Dimensions.get('window');

// Phone number formatting/masking function
const formatPhoneNumber = (text: string): string => {
  // Remove all non-digit characters
  const cleaned = text.replace(/\D/g, '');

  // Apply Pakistani phone format: 03XX-XXXXXXX
  if (cleaned.length <= 4) {
    return cleaned;
  } else if (cleaned.length <= 11) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
  }
  return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 11)}`;
};

// Get raw phone number without formatting
const getRawPhoneNumber = (formatted: string): string => {
  return formatted.replace(/\D/g, '');
};

// Animated Client Card Component (extracted to avoid hook rules violation)
const ClientCard = ({
  item,
  index,
  theme,
  navigation,
  onDelete,
}: {
  item: Client;
  index: number;
  theme: any;
  navigation: any;
  onDelete: (client: Client) => void;
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 50, 500),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View
      style={{
        opacity: animValue,
        transform: [
          {
            translateY: animValue.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            }),
          },
        ],
      }}
    >
      <TouchableOpacity
        style={[
          styles.clientCard,
          { backgroundColor: theme.card, borderColor: theme.borderLight },
          shadows.small,
        ]}
        onPress={() =>
          navigation.navigate('ClientDetails', { clientId: item.id })
        }
        activeOpacity={0.8}
      >
        {/* Card Header */}
        <View style={styles.clientHeader}>
          <View
            style={[
              styles.clientAvatar,
              { backgroundColor: theme.primary + '15' },
            ]}
          >
            <Text style={[styles.avatarText, { color: theme.primary }]}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.clientInfo}>
            <Text style={[styles.clientName, { color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.clientShop, { color: theme.textSecondary }]}>
              {item.shopName}
            </Text>
            <View style={styles.contactRow}>
              <Icon name="phone-outline" size={13} color={theme.textTertiary} />
              <Text style={[styles.clientPhone, { color: theme.textTertiary }]}>
                {item.phone}
              </Text>
            </View>
          </View>

          {/* Balance Badge */}
          <View style={styles.clientActions}>
            <LinearGradient
              colors={
                item.balance > 0
                  ? [theme.danger + '20', theme.danger + '10']
                  : [theme.success + '20', theme.success + '10']
              }
              style={styles.balanceBadge}
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
            </LinearGradient>
          </View>
        </View>

        {/* Extra Details */}
        {(item.area || item.whatsapp) && (
          <View style={styles.clientDetails}>
            {item.area && (
              <View
                style={[
                  styles.detailChip,
                  { backgroundColor: theme.background },
                ]}
              >
                <Icon
                  name="map-marker-outline"
                  size={13}
                  color={theme.textTertiary}
                />
                <Text
                  style={[styles.detailText, { color: theme.textSecondary }]}
                >
                  {item.area}
                </Text>
              </View>
            )}
            {item.whatsapp && (
              <View
                style={[styles.detailChip, { backgroundColor: '#25D36610' }]}
              >
                <Icon name="whatsapp" size={13} color="#25D366" />
                <Text style={[styles.detailText, { color: '#25D366' }]}>
                  WhatsApp
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Footer Stats */}
        <View
          style={[styles.clientStats, { borderTopColor: theme.borderLight }]}
        >
          <View style={styles.statItem}>
            <Icon name="chart-line" size={16} color={theme.textTertiary} />
            <Text style={[styles.statLabel, { color: theme.textTertiary }]}>
              Total Business
            </Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              PKR {item.totalBusinessValue.toLocaleString()}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.deleteButton,
              { backgroundColor: theme.danger + '10' },
            ]}
            onPress={() => onDelete(item)}
          >
            <Icon name="trash-can-outline" size={18} color={theme.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

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

  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    client: Client | null;
  }>({ visible: false, client: null });

  const handleDeleteClient = (client: Client) => {
    setDeleteConfirm({ visible: true, client });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.client) {
      await deleteClient(deleteConfirm.client.id);
      showSuccessToast(
        'Client Deleted',
        `${deleteConfirm.client.name} has been deleted`,
      );
    }
    setDeleteConfirm({ visible: false, client: null });
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

  const renderClientCard = ({
    item,
    index,
  }: {
    item: Client;
    index: number;
  }) => {
    return (
      <ClientCard
        item={item}
        index={index}
        theme={theme}
        navigation={navigation}
        onDelete={handleDeleteClient}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Modern Header */}
      <LinearGradient
        colors={
          isDark
            ? [theme.surface, theme.background]
            : [theme.surface, theme.background]
        }
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              Clients
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              {clients.length} total clients
            </Text>
          </View>
          <View
            style={[
              styles.headerBadge,
              { backgroundColor: theme.primary + '15' },
            ]}
          >
            <Icon name="account-group" size={20} color={theme.primary} />
          </View>
        </View>
      </LinearGradient>

      {/* Modern Search Bar */}
      <View style={styles.searchWrapper}>
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.card, borderColor: theme.borderLight },
            shadows.small,
          ]}
        >
          <Icon name="magnify" size={22} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name, shop, or phone..."
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
      </View>

      <FlatList
        data={filteredClients}
        renderItem={renderClientCard}
        keyExtractor={(item: Client) => item.id}
        // @ts-ignore - contentContainerStyle is valid in React Native 0.82
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconContainer,
                { backgroundColor: theme.primary + '15' },
              ]}
            >
              <Icon
                name="account-search-outline"
                size={56}
                color={theme.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
              No Clients Found
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: theme.textSecondary }]}
            >
              {searchQuery
                ? 'Try a different search term'
                : 'Add your first client to get started'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity
                style={[styles.emptyButton, shadows.colored(theme.primary)]}
                onPress={() => setShowAddModal(true)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    theme.primary,
                    theme.primaryGradientEnd || '#1d4ed8',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.emptyButtonGradient}
                >
                  <Icon name="plus" size={20} color="#fff" />
                  <Text style={styles.emptyButtonText}>Add First Client</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Modern FAB */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[theme.primary, theme.primaryGradientEnd || '#1d4ed8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fab, shadows.medium]}
        >
          <Icon name="plus" size={28} color="#fff" />
        </LinearGradient>
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
            <View style={styles.modalHandle}>
              <View
                style={[styles.handleBar, { backgroundColor: theme.border }]}
              />
            </View>

            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <View style={styles.modalTitleRow}>
                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: theme.primary + '15' },
                  ]}
                >
                  <Icon
                    name={editingClient ? 'account-edit' : 'account-plus'}
                    size={24}
                    color={theme.primary}
                  />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  {editingClient ? 'Edit Client' : 'Add New Client'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  resetForm();
                  setShowAddModal(false);
                }}
                style={[
                  styles.closeButton,
                  { backgroundColor: theme.background },
                ]}
              >
                <Icon name="close" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
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
                    placeholder="03XX-XXXXXXX"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="phone-pad"
                    maxLength={12}
                    value={formatPhoneNumber(formData.phone)}
                    onChangeText={text =>
                      setFormData({
                        ...formData,
                        phone: getRawPhoneNumber(text),
                      })
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
                    placeholder="03XX-XXXXXXX"
                    placeholderTextColor={theme.textTertiary}
                    keyboardType="phone-pad"
                    maxLength={12}
                    value={
                      formData.whatsapp
                        ? formatPhoneNumber(formData.whatsapp)
                        : ''
                    }
                    onChangeText={text =>
                      setFormData({
                        ...formData,
                        whatsapp: getRawPhoneNumber(text),
                      })
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
                activeOpacity={0.8}
              >
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, shadows.colored(theme.primary)]}
                onPress={handleSaveClient}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    theme.primary,
                    theme.primaryGradientEnd || '#1d4ed8',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveButtonGradient}
                >
                  <Icon
                    name={editingClient ? 'content-save' : 'check'}
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.saveButtonText}>
                    {editingClient ? 'Update' : 'Save'}
                  </Text>
                </LinearGradient>
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
        onCancel={() => setDeleteConfirm({ visible: false, client: null })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 44,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  clientCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  clientHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  clientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  clientShop: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  clientPhone: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientActions: {
    alignItems: 'flex-end',
  },
  balanceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  balanceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  clientDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    fontWeight: '500',
  },
  clientStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteButton: {
    padding: 10,
    borderRadius: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
  },
  modalHandle: {
    alignItems: 'center',
    paddingTop: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
