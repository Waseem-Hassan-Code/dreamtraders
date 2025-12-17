import React, {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Linking,
  StatusBar,
  Animated,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeStore } from '@/store/themeStore';
import { useClientStore } from '@/store/clientStore';
import { useInvoiceStore } from '@/store/invoiceStore';
import { Client, LedgerEntry, Invoice } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { showSuccessToast, showErrorToast } from '@/utils/toast';
import { shadows, borderRadius, spacing } from '@/utils/theme';

const { width } = Dimensions.get('window');
const ITEMS_PER_PAGE = 15;

// Animated Ledger Card Component
const LedgerCard = ({
  item,
  theme,
  index,
}: {
  item: LedgerEntry;
  theme: any;
  index: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay: index * 30,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        delay: index * 30,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const formatDate = (date: Date | string | number) => {
    const d = new Date(date);
    return {
      day: d.getDate().toString().padStart(2, '0'),
      month: d.toLocaleDateString('en-GB', { month: 'short' }),
      year: d.getFullYear(),
    };
  };

  const dateInfo = formatDate(item.date);
  const isDebit = item.debit > 0;
  const amount = isDebit ? item.debit : item.credit;

  const getTypeIcon = () => {
    switch (item.type) {
      case 'SALE':
        return 'cart-arrow-right';
      case 'PAYMENT':
        return 'cash-check';
      case 'ADJUSTMENT':
        return 'tune-variant';
      default:
        return 'swap-horizontal';
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'SALE':
        return theme.primary;
      case 'PAYMENT':
        return theme.success;
      case 'ADJUSTMENT':
        return theme.warning;
      default:
        return theme.textSecondary;
    }
  };

  return (
    <Animated.View
      style={[
        styles.ledgerCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.borderLight,
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
        shadows.small,
      ]}
    >
      {/* Date Column */}
      <View
        style={[styles.ledgerDateColumn, { backgroundColor: theme.background }]}
      >
        <Text style={[styles.ledgerDay, { color: theme.text }]}>
          {dateInfo.day}
        </Text>
        <Text style={[styles.ledgerMonth, { color: theme.textSecondary }]}>
          {dateInfo.month}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.ledgerContent}>
        {/* Type Badge and Description */}
        <View style={styles.ledgerTopRow}>
          <View
            style={[
              styles.typeBadge,
              { backgroundColor: getTypeColor() + '15' },
            ]}
          >
            <Icon name={getTypeIcon()} size={14} color={getTypeColor()} />
            <Text style={[styles.typeText, { color: getTypeColor() }]}>
              {item.type}
            </Text>
          </View>
          {item.type === 'SALE' && item.invoiceId && (
            <View
              style={[
                styles.invoiceBadge,
                { backgroundColor: theme.primary + '10' },
              ]}
            >
              <Text style={[styles.invoiceText, { color: theme.primary }]}>
                #{item.invoiceId.slice(-6)}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.ledgerDescription, { color: theme.text }]}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        {/* Items Preview if Sale */}
        {item.type === 'SALE' && item.items && item.items.length > 0 && (
          <View style={styles.itemsPreview}>
            <Icon name="package-variant" size={12} color={theme.textTertiary} />
            <Text
              style={[styles.itemsPreviewText, { color: theme.textTertiary }]}
              numberOfLines={1}
            >
              {item.items.length} item{item.items.length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Amount Column */}
      <View style={styles.ledgerAmountColumn}>
        <View
          style={[
            styles.amountContainer,
            {
              backgroundColor: isDebit
                ? theme.danger + '10'
                : theme.success + '10',
            },
          ]}
        >
          <Text
            style={[
              styles.amountSign,
              { color: isDebit ? theme.danger : theme.success },
            ]}
          >
            {isDebit ? '+' : '-'}
          </Text>
          <Text
            style={[
              styles.amountValue,
              { color: isDebit ? theme.danger : theme.success },
            ]}
          >
            {amount.toLocaleString()}
          </Text>
        </View>
        <View style={styles.balanceRow}>
          <Text
            style={[styles.balanceLabelText, { color: theme.textTertiary }]}
          >
            Balance:
          </Text>
          <Text
            style={[
              styles.balanceValueText,
              { color: item.balance > 0 ? theme.danger : theme.success },
            ]}
          >
            {item.balance.toLocaleString()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Skeleton Loader for Ledger Items
const LedgerSkeleton = ({ theme }: { theme: any }) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeletonCard,
        { backgroundColor: theme.card, opacity },
        shadows.small,
      ]}
    >
      <View style={[styles.skeletonDate, { backgroundColor: theme.shimmer }]} />
      <View style={styles.skeletonContent}>
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.shimmer, width: '40%' },
          ]}
        />
        <View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.shimmer, width: '80%' },
          ]}
        />
      </View>
      <View
        style={[styles.skeletonAmount, { backgroundColor: theme.shimmer }]}
      />
    </Animated.View>
  );
};

export default function ClientDetailsScreen({ route, navigation }: any) {
  const { clientId } = route.params;
  const { theme, isDark } = useThemeStore();
  const { clients, ledgerEntries, loadLedger, addLedgerEntry, loadClients } =
    useClientStore();
  const { invoices, loadInvoices, updateInvoice } = useInvoiceStore();

  const [client, setClient] = useState<Client | undefined>(undefined);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unpaidInvoices, setUnpaidInvoices] = useState<Invoice[]>([]);
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);

  // Lazy Loading State
  const [displayedEntries, setDisplayedEntries] = useState<LedgerEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Edit Client Form State
  const [editClientData, setEditClientData] = useState({
    name: '',
    phone: '',
    whatsapp: '',
    shopName: '',
    address: '',
    area: '',
  });

  // Payment Form State
  const [paymentData, setPaymentData] = useState({
    amount: '',
    date: new Date(),
    description: '',
    type: 'PAYMENT' as 'PAYMENT' | 'ADJUSTMENT',
    selectedInvoiceId: '' as string,
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Animation
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    loadData();
    // Entrance animations
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, [clientId, clients]);

  // Initialize displayed entries with lazy loading
  useEffect(() => {
    if (ledgerEntries.length > 0) {
      const initialEntries = ledgerEntries.slice(0, ITEMS_PER_PAGE);
      setDisplayedEntries(initialEntries);
      setHasMoreData(ledgerEntries.length > ITEMS_PER_PAGE);
      setCurrentPage(1);
    } else {
      setDisplayedEntries([]);
      setHasMoreData(false);
    }
  }, [ledgerEntries]);

  const loadData = async () => {
    const foundClient = clients.find(c => c.id === clientId);
    setClient(foundClient);

    if (foundClient) {
      try {
        await loadLedger(clientId);
        await loadInvoices();
      } catch (error) {
        console.error('Failed to load ledger:', error);
      }
    }
    setLoading(false);
  };

  // Load more entries (lazy loading)
  const loadMoreEntries = useCallback(() => {
    if (loadingMore || !hasMoreData) return;

    setLoadingMore(true);

    // Simulate network delay for smooth UX
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = currentPage * ITEMS_PER_PAGE;
      const endIndex = startIndex + ITEMS_PER_PAGE;
      const newEntries = ledgerEntries.slice(startIndex, endIndex);

      if (newEntries.length > 0) {
        setDisplayedEntries(prev => [...prev, ...newEntries]);
        setCurrentPage(nextPage);
        setHasMoreData(endIndex < ledgerEntries.length);
      } else {
        setHasMoreData(false);
      }
      setLoadingMore(false);
    }, 300);
  }, [currentPage, ledgerEntries, loadingMore, hasMoreData]);

  // Filter unpaid invoices for this client
  useEffect(() => {
    const clientUnpaidInvoices = invoices
      .filter(
        inv =>
          inv.clientId === clientId &&
          (inv.status === 'UNPAID' || inv.status === 'PARTIAL'),
      )
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
    setUnpaidInvoices(clientUnpaidInvoices);
  }, [invoices, clientId]);

  const handleCall = () => {
    if (client?.phone) Linking.openURL(`tel:${client.phone}`);
  };

  const handleWhatsApp = () => {
    const phone = client?.whatsapp || client?.phone;
    if (phone) {
      Linking.openURL(`whatsapp://send?phone=${phone}`);
    }
  };

  const handleOpenEditModal = () => {
    if (client) {
      setEditClientData({
        name: client.name,
        phone: client.phone,
        whatsapp: client.whatsapp || '',
        shopName: client.shopName,
        address: client.address || '',
        area: client.area || '',
      });
      setShowEditModal(true);
    }
  };

  const handleSaveClientEdit = async () => {
    if (!editClientData.name.trim()) {
      showErrorToast('Validation Error', 'Please enter client name');
      return;
    }
    if (!editClientData.phone.trim()) {
      showErrorToast('Validation Error', 'Please enter phone number');
      return;
    }
    if (!editClientData.shopName.trim()) {
      showErrorToast('Validation Error', 'Please enter shop name');
      return;
    }

    try {
      const { updateClient } = useClientStore.getState();
      await updateClient(clientId, {
        name: editClientData.name,
        phone: editClientData.phone,
        whatsapp: editClientData.whatsapp || undefined,
        shopName: editClientData.shopName,
        address: editClientData.address || undefined,
        area: editClientData.area || undefined,
      });

      showSuccessToast('Client Updated', 'Client details updated successfully');
      setShowEditModal(false);
      await loadClients();
      loadData();
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to update client');
    }
  };

  const hasWhatsApp = client?.whatsapp && client.whatsapp.length > 0;

  const handleSavePayment = async () => {
    if (!paymentData.amount || isNaN(parseFloat(paymentData.amount))) {
      showErrorToast('Validation Error', 'Please enter a valid amount');
      return;
    }

    const paymentAmount = parseFloat(paymentData.amount);

    try {
      // If a specific invoice is selected, apply payment to it
      if (paymentData.selectedInvoiceId) {
        const invoice = unpaidInvoices.find(
          inv => inv.id === paymentData.selectedInvoiceId,
        );
        if (invoice) {
          const newAmountPaid = invoice.amountPaid + paymentAmount;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

          await updateInvoice(invoice.id, {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
          });
        }
      } else if (unpaidInvoices.length > 0) {
        // Auto-adjust: Apply payment to oldest invoices first (FIFO)
        let remainingPayment = paymentAmount;

        for (const invoice of unpaidInvoices) {
          if (remainingPayment <= 0) break;

          const amountToApply = Math.min(remainingPayment, invoice.amountDue);
          const newAmountPaid = invoice.amountPaid + amountToApply;
          const newAmountDue = invoice.total - newAmountPaid;
          const newStatus = newAmountDue <= 0 ? 'PAID' : 'PARTIAL';

          await updateInvoice(invoice.id, {
            amountPaid: newAmountPaid,
            amountDue: Math.max(0, newAmountDue),
            status: newStatus,
          });

          remainingPayment -= amountToApply;
        }
      }

      // Add ledger entry
      await addLedgerEntry(clientId, {
        date: paymentData.date,
        type: paymentData.type,
        description:
          paymentData.description ||
          (paymentData.type === 'PAYMENT'
            ? 'Payment Received'
            : 'Balance Adjustment'),
        debit: 0,
        credit: paymentAmount,
        items: [],
      });

      showSuccessToast(
        'Payment Recorded',
        `Payment of PKR ${paymentAmount.toLocaleString()} recorded successfully`,
      );
      setShowPaymentModal(false);
      setPaymentData({
        amount: '',
        date: new Date(),
        description: '',
        type: 'PAYMENT',
        selectedInvoiceId: '',
      });

      // Refresh data in sequence to ensure UI updates
      await loadClients();
      await loadInvoices();
      await loadLedger(clientId);

      // Force update local client state with new balance
      const updatedClients = useClientStore.getState().clients;
      const updatedClient = updatedClients.find(c => c.id === clientId);
      if (updatedClient) {
        setClient(updatedClient);
      }
    } catch (error: any) {
      showErrorToast('Error', error.message || 'Failed to record payment');
    }
  };

  const formatDate = (date: Date | string | number) => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Statistics calculation
  const stats = useMemo(() => {
    const totalDebits = ledgerEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredits = ledgerEntries.reduce((sum, e) => sum + e.credit, 0);
    const salesCount = ledgerEntries.filter(e => e.type === 'SALE').length;
    const paymentsCount = ledgerEntries.filter(
      e => e.type === 'PAYMENT',
    ).length;
    return { totalDebits, totalCredits, salesCount, paymentsCount };
  }, [ledgerEntries]);

  const renderLedgerItem = useCallback(
    ({ item, index }: { item: LedgerEntry; index: number }) => (
      <LedgerCard item={item} theme={theme} index={index % ITEMS_PER_PAGE} />
    ),
    [theme],
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Loading more...
        </Text>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.primary + '15' },
        ]}
      >
        <Icon name="clipboard-text-outline" size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No Transactions Yet
      </Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Create an invoice or receive a payment to start the ledger
      </Text>
    </View>
  );

  if (loading || !client) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{ color: theme.textSecondary, marginTop: 12 }}>
          Loading client details...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor="transparent"
        translucent
      />

      {/* Modern Header with Gradient */}
      <LinearGradient
        colors={
          isDark
            ? [theme.surface, theme.background]
            : [theme.surface, theme.background]
        }
        style={styles.headerGradient}
      >
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.backButton, { backgroundColor: theme.background }]}
          >
            <Icon name="arrow-left" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View
              style={[
                styles.avatarLarge,
                { backgroundColor: theme.primary + '20' },
              ]}
            >
              <Text style={[styles.avatarText, { color: theme.primary }]}>
                {client.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {client.name}
            </Text>
            <Text
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              {client.shopName}
            </Text>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleOpenEditModal}
              style={[
                styles.actionButton,
                { backgroundColor: theme.background },
              ]}
            >
              <Icon name="pencil" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Quick Action Buttons */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            onPress={handleCall}
            style={[
              styles.quickActionBtn,
              { backgroundColor: theme.primary + '15' },
            ]}
          >
            <Icon name="phone" size={20} color={theme.primary} />
            <Text style={[styles.quickActionText, { color: theme.primary }]}>
              Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleWhatsApp}
            style={[
              styles.quickActionBtn,
              {
                backgroundColor: hasWhatsApp
                  ? '#25D36615'
                  : theme.border + '50',
                opacity: hasWhatsApp ? 1 : 0.5,
              },
            ]}
            disabled={!hasWhatsApp}
          >
            <Icon
              name="whatsapp"
              size={20}
              color={hasWhatsApp ? '#25D366' : theme.textTertiary}
            />
            <Text
              style={[
                styles.quickActionText,
                { color: hasWhatsApp ? '#25D366' : theme.textTertiary },
              ]}
            >
              WhatsApp
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              navigation.navigate('InvoiceCreate', { clientId: client.id })
            }
            style={[
              styles.quickActionBtn,
              { backgroundColor: theme.success + '15' },
            ]}
          >
            <Icon name="receipt" size={20} color={theme.success} />
            <Text style={[styles.quickActionText, { color: theme.success }]}>
              Invoice
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Balance Card */}
      <Animated.View style={{ transform: [{ scale: cardScale }] }}>
        <LinearGradient
          colors={
            client.balance > 0
              ? [theme.danger, theme.dangerGradientEnd || '#dc2626']
              : [theme.success, theme.successGradientEnd || '#059669']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.balanceCard, shadows.large]}
        >
          <View style={styles.balanceTop}>
            <View style={styles.balanceIconContainer}>
              <Icon
                name={
                  client.balance > 0 ? 'arrow-up-circle' : 'arrow-down-circle'
                }
                size={32}
                color="rgba(255,255,255,0.9)"
              />
            </View>
            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Current Balance</Text>
              <Text style={styles.balanceAmount}>
                PKR {Math.abs(client.balance).toLocaleString()}
              </Text>
              <Text style={styles.balanceStatus}>
                {client.balance > 0 ? 'Outstanding Due' : 'Credit Available'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.receivePaymentBtn}
            onPress={() => setShowPaymentModal(true)}
            activeOpacity={0.8}
          >
            <Icon name="cash-plus" size={20} color={theme.success} />
            <Text style={[styles.receivePaymentText, { color: theme.success }]}>
              Receive Payment
            </Text>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View
          style={[
            styles.statBox,
            { backgroundColor: theme.card },
            shadows.small,
          ]}
        >
          <Icon name="cart-arrow-right" size={20} color={theme.primary} />
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {stats.salesCount}
          </Text>
          <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>
            Sales
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            { backgroundColor: theme.card },
            shadows.small,
          ]}
        >
          <Icon name="cash-check" size={20} color={theme.success} />
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {stats.paymentsCount}
          </Text>
          <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>
            Payments
          </Text>
        </View>
        <View
          style={[
            styles.statBox,
            { backgroundColor: theme.card },
            shadows.small,
          ]}
        >
          <Icon name="trending-up" size={20} color={theme.warning} />
          <Text style={[styles.statNumber, { color: theme.text }]}>
            {(stats.totalDebits / 1000).toFixed(0)}K
          </Text>
          <Text style={[styles.statLabelText, { color: theme.textSecondary }]}>
            Total Sales
          </Text>
        </View>
      </View>

      {/* Ledger Section */}
      <View style={styles.ledgerSection}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Icon
              name="book-open-page-variant"
              size={22}
              color={theme.primary}
            />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Transaction Ledger
            </Text>
          </View>
          <Text style={[styles.entryCount, { color: theme.textTertiary }]}>
            {displayedEntries.length} of {ledgerEntries.length} entries
          </Text>
        </View>

        <FlatList
          data={displayedEntries}
          renderItem={renderLedgerItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ledgerList}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMoreEntries}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          initialNumToRender={ITEMS_PER_PAGE}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={true}
        />
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
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
                    { backgroundColor: theme.success + '15' },
                  ]}
                >
                  <Icon name="cash-plus" size={24} color={theme.success} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Receive Payment
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
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
              {/* Invoice Selection */}
              {unpaidInvoices.length > 0 && (
                <>
                  <Text
                    style={[styles.inputLabel, { color: theme.textSecondary }]}
                  >
                    Apply to Invoice
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.selectInput,
                      {
                        backgroundColor: theme.card,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setShowInvoiceDropdown(!showInvoiceDropdown)}
                  >
                    <Text
                      style={{
                        color: paymentData.selectedInvoiceId
                          ? theme.text
                          : theme.textTertiary,
                        flex: 1,
                      }}
                    >
                      {paymentData.selectedInvoiceId
                        ? `#${
                            unpaidInvoices.find(
                              inv => inv.id === paymentData.selectedInvoiceId,
                            )?.invoiceNumber
                          } - PKR ${unpaidInvoices
                            .find(
                              inv => inv.id === paymentData.selectedInvoiceId,
                            )
                            ?.amountDue.toLocaleString()} due`
                        : 'Auto-adjust (oldest first)'}
                    </Text>
                    <Icon
                      name={showInvoiceDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {showInvoiceDropdown && (
                    <View
                      style={[
                        styles.dropdown,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={[
                          styles.dropdownItem,
                          { borderBottomColor: theme.border },
                        ]}
                        onPress={() => {
                          setPaymentData({
                            ...paymentData,
                            selectedInvoiceId: '',
                          });
                          setShowInvoiceDropdown(false);
                        }}
                      >
                        <Icon name="auto-fix" size={18} color={theme.primary} />
                        <Text
                          style={{
                            color: theme.primary,
                            fontWeight: '600',
                            marginLeft: 8,
                          }}
                        >
                          Auto-adjust (oldest first)
                        </Text>
                      </TouchableOpacity>
                      {unpaidInvoices.map(inv => (
                        <TouchableOpacity
                          key={inv.id}
                          style={[
                            styles.dropdownItem,
                            { borderBottomColor: theme.border },
                          ]}
                          onPress={() => {
                            setPaymentData({
                              ...paymentData,
                              selectedInvoiceId: inv.id,
                            });
                            setShowInvoiceDropdown(false);
                          }}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{ color: theme.text, fontWeight: '600' }}
                            >
                              #{inv.invoiceNumber}
                            </Text>
                            <Text
                              style={{
                                color: theme.textSecondary,
                                fontSize: 12,
                              }}
                            >
                              {formatDate(inv.createdAt)} • PKR{' '}
                              {inv.amountDue.toLocaleString()} due
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor:
                                  inv.status === 'PARTIAL'
                                    ? theme.warning + '20'
                                    : theme.danger + '20',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                color:
                                  inv.status === 'PARTIAL'
                                    ? theme.warning
                                    : theme.danger,
                                fontSize: 10,
                                fontWeight: '600',
                              }}
                            >
                              {inv.status}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Amount *
              </Text>
              <View
                style={[
                  styles.amountInputContainer,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.currencyPrefix,
                    { color: theme.textSecondary },
                  ]}
                >
                  PKR
                </Text>
                <TextInput
                  style={[styles.amountInput, { color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="decimal-pad"
                  value={paymentData.amount}
                  onChangeText={text =>
                    setPaymentData({ ...paymentData, amount: text })
                  }
                  autoFocus={unpaidInvoices.length === 0}
                />
              </View>

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Date
              </Text>
              <TouchableOpacity
                style={[
                  styles.selectInput,
                  {
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setShowDatePicker(true)}
              >
                <Icon name="calendar" size={20} color={theme.primary} />
                <Text style={{ color: theme.text, marginLeft: 12, flex: 1 }}>
                  {formatDate(paymentData.date)}
                </Text>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentData.date}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate)
                      setPaymentData({ ...paymentData, date: selectedDate });
                  }}
                  maximumDate={new Date()}
                />
              )}

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Description
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Optional note..."
                placeholderTextColor={theme.textTertiary}
                value={paymentData.description}
                onChangeText={text =>
                  setPaymentData({ ...paymentData, description: text })
                }
              />

              <TouchableOpacity
                style={[styles.confirmButton, shadows.colored(theme.success)]}
                onPress={handleSavePayment}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    theme.success,
                    theme.successGradientEnd || '#059669',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Icon name="check-circle" size={22} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
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
                  <Icon name="account-edit" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.modalTitle, { color: theme.text }]}>
                  Edit Client
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
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
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Name *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Client name"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.name}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, name: text })
                }
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Phone *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Phone number"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={editClientData.phone}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, phone: text })
                }
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                WhatsApp Number
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="WhatsApp number (optional)"
                placeholderTextColor={theme.textTertiary}
                keyboardType="phone-pad"
                value={editClientData.whatsapp}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, whatsapp: text })
                }
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Shop Name *
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Shop name"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.shopName}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, shopName: text })
                }
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Address
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Address (optional)"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.address}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, address: text })
                }
              />

              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                Area
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.card,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                placeholder="Area (optional)"
                placeholderTextColor={theme.textTertiary}
                value={editClientData.area}
                onChangeText={text =>
                  setEditClientData({ ...editClientData, area: text })
                }
              />

              <TouchableOpacity
                style={[styles.confirmButton, shadows.colored(theme.primary)]}
                onPress={handleSaveClientEdit}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[
                    theme.primary,
                    theme.primaryGradientEnd || '#1d4ed8',
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.confirmButtonGradient}
                >
                  <Icon name="content-save" size={22} color="#fff" />
                  <Text style={styles.confirmButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>

              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  avatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  balanceCard: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  balanceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  balanceInfo: {
    flex: 1,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceAmount: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    marginVertical: 2,
  },
  balanceStatus: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '500',
  },
  receivePaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  receivePaymentText: {
    fontSize: 16,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    padding: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabelText: {
    fontSize: 11,
    marginTop: 2,
  },
  ledgerSection: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  entryCount: {
    fontSize: 12,
  },
  ledgerList: {
    paddingBottom: 20,
  },
  ledgerCard: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ledgerDateColumn: {
    width: 54,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ledgerDay: {
    fontSize: 20,
    fontWeight: '700',
  },
  ledgerMonth: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  ledgerContent: {
    flex: 1,
    padding: 12,
    paddingLeft: 8,
  },
  ledgerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  invoiceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  invoiceText: {
    fontSize: 10,
    fontWeight: '600',
  },
  ledgerDescription: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  itemsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  itemsPreviewText: {
    fontSize: 11,
  },
  ledgerAmountColumn: {
    paddingVertical: 12,
    paddingRight: 12,
    paddingLeft: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amountSign: {
    fontSize: 14,
    fontWeight: '700',
    marginRight: 2,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  balanceLabelText: {
    fontSize: 10,
  },
  balanceValueText: {
    fontSize: 12,
    fontWeight: '600',
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  skeletonCard: {
    flexDirection: 'row',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    height: 80,
  },
  skeletonDate: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  skeletonLine: {
    height: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  skeletonAmount: {
    width: 60,
    height: 24,
    borderRadius: 8,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  selectInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInputContainer: {
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 14,
  },
  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  dropdownItem: {
    padding: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  confirmButton: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
