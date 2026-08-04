import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { db, auth } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  ORDER_STATUS,
  ACTIVE_STATUSES,
  COMPLETED_STATUSES,
  CANCELLED_STATUSES,
} from '../utils/orderStatuses';

export default function MyOrdersScreen({ onBack, onSelectOrder, onOpenPharmacyMap }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Active' | 'Completed' | 'Cancelled'
  const [searchQuery, setSearchQuery] = useState('');

  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsLoading(false);
      setErrorMessage('User authentication required.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    // Real-time listener for current user's orders
    const ordersQuery = query(
      collection(db, 'orders'),
      where('customerUid', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort by createdAt descending in JavaScript to avoid composite index requirement
        fetchedOrders.sort((a, b) => {
          const getTime = (val) => {
            if (!val) return 0;
            if (typeof val.toMillis === 'function') return val.toMillis();
            if (val.seconds) return val.seconds * 1000;
            if (val instanceof Date) return val.getTime();
            if (typeof val === 'number') return val;
            const parsed = new Date(val).getTime();
            return isNaN(parsed) ? 0 : parsed;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setOrders(fetchedOrders);
        setIsLoading(false);
        setIsRefreshing(false);
      },
      (error) => {
        console.error('Error fetching customer orders:', error);
        setErrorMessage('Failed to load orders in real time. Please try again.');
        setIsLoading(false);
        setIsRefreshing(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Snapshot updates automatically, but we reset state indicator
    setTimeout(() => setIsRefreshing(false), 800);
  }, []);

  // Filter orders by tab and search query
  const filteredOrders = orders.filter((order) => {
    const status = order.status || ORDER_STATUS.PENDING;

    // Tab filter
    let matchesTab = true;
    if (activeTab === 'Active') {
      matchesTab = ACTIVE_STATUSES.includes(status);
    } else if (activeTab === 'Completed') {
      matchesTab = COMPLETED_STATUSES.includes(status);
    } else if (activeTab === 'Cancelled') {
      matchesTab = CANCELLED_STATUSES.includes(status);
    }

    if (!matchesTab) return false;

    // Search filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();

    const orderIdStr = (order.orderId || order.id || '').toLowerCase();
    const pharmacyNameStr = (order.pharmacyName || '').toLowerCase();
    const statusStr = status.toLowerCase();
    const itemsMatch = Array.isArray(order.items) && order.items.some((item) => {
      const name = (item.medicineName || item.name || '').toLowerCase();
      const generic = (item.genericName || item.generic || '').toLowerCase();
      return name.includes(q) || generic.includes(q);
    });

    return (
      orderIdStr.includes(q) ||
      pharmacyNameStr.includes(q) ||
      statusStr.includes(q) ||
      itemsMatch
    );
  });

  const formatTimestamp = (createdAt) => {
    if (!createdAt) return 'Recently';
    let date;
    if (typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    } else if (createdAt.seconds) {
      date = new Date(createdAt.seconds * 1000);
    } else if (createdAt instanceof Date) {
      date = createdAt;
    } else {
      date = new Date(createdAt);
    }

    if (isNaN(date.getTime())) return 'Recently';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case ORDER_STATUS.PENDING:
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D', icon: 'time-outline' };
      case ORDER_STATUS.ACCEPTED:
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD', icon: 'checkmark-circle-outline' };
      case ORDER_STATUS.PREPARING:
        return { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE', icon: 'flame-outline' };
      case ORDER_STATUS.READY_FOR_DELIVERY:
        return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE', icon: 'cube-outline' };
      case ORDER_STATUS.DELIVERED:
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0', icon: 'checkmark-done-circle' };
      case ORDER_STATUS.CANCELLED:
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5', icon: 'close-circle-outline' };
      case ORDER_STATUS.REJECTED:
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: 'alert-circle-outline' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1', icon: 'ellipse-outline' };
    }
  };

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.includes(o.status)).length;
  const completedCount = orders.filter((o) => COMPLETED_STATUSES.includes(o.status)).length;
  const cancelledCount = orders.filter((o) => CANCELLED_STATUSES.includes(o.status)).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
            placeholder="Search by Order ID, pharmacy, item, or status..."
            placeholderTextColor="rgba(62, 73, 70, 0.55)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Tab Filters */}
        <View style={styles.tabsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
            {[
              { id: 'All', label: 'All', count: orders.length },
              { id: 'Active', label: 'Active', count: activeCount },
              { id: 'Completed', label: 'Completed', count: completedCount },
              { id: 'Cancelled', label: 'Cancelled', count: cancelledCount },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabButton, isActive && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                  {tab.count > 0 ? (
                    <View style={[styles.tabBadgeCircle, isActive && styles.tabBadgeCircleActive]}>
                      <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>{tab.count}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Error Banner */}
        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Content Body */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        >
          {isLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading your orders...</Text>
            </View>
          ) : filteredOrders.length === 0 ? (
            <View style={styles.emptyBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="receipt-outline" size={44} color={colors.outline} />
              </View>
              <Text style={styles.emptyTitle}>No Orders Found</Text>
              <Text style={styles.emptySubtext}>
                {searchQuery
                  ? `No orders matching "${searchQuery}"`
                  : activeTab === 'All'
                  ? 'You have not placed any orders yet.'
                  : `You have no ${activeTab.toLowerCase()} orders.`}
              </Text>
            </View>
          ) : (
            <View style={styles.orderListContainer}>
              {filteredOrders.map((order) => {
                const statusStyle = getStatusStyle(order.status);
                const orderIdDisplay = order.orderId || order.id;
                const pharmacyNameDisplay = order.pharmacyName || 'MediLink Pharmacy';
                const totalAmount = Number(order.total ?? 0);
                const itemCount = Array.isArray(order.items) ? order.items.length : 0;
                const addressStr = [order.deliveryAddress, order.deliveryArea, order.deliveryCity]
                  .filter(Boolean)
                  .join(', ');

                return (
                  <View key={order.id} style={styles.orderCard}>
                    {/* Header */}
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.orderIdText}>Order #{orderIdDisplay}</Text>
                        <Text style={styles.orderDateText}>{formatTimestamp(order.createdAt)}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                        <Ionicons name={statusStyle.icon} size={14} color={statusStyle.text} style={{ marginRight: 4 }} />
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{order.status || 'Pending'}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    {/* Pharmacy Info */}
                    <View style={styles.pharmacyRow}>
                      <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                      <Text style={styles.pharmacyNameText}>{pharmacyNameDisplay}</Text>
                    </View>

                    {/* Delivery Address */}
                    {addressStr ? (
                      <View style={styles.addressRow}>
                        <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
                        <Text style={styles.addressText} numberOfLines={1}>
                          {addressStr}
                        </Text>
                      </View>
                    ) : null}

                    {/* Order Details Badges */}
                    <View style={styles.metaRow}>
                      <View style={styles.metaBadge}>
                        <Ionicons name="medical-outline" size={13} color={colors.onSurfaceVariant} />
                        <Text style={styles.metaText}>{itemCount} {itemCount === 1 ? 'item' : 'items'}</Text>
                      </View>
                      <View style={styles.metaBadge}>
                        <Ionicons name="wallet-outline" size={13} color={colors.onSurfaceVariant} />
                        <Text style={styles.metaText}>{order.paymentMethod || 'Cash on Delivery'}</Text>
                      </View>
                    </View>

                    {/* Card Footer: Price & View Details Button */}
                    <View style={styles.cardFooter}>
                      <View>
                        <Text style={styles.totalLabel}>Total Amount</Text>
                        <Text style={styles.totalValue}>৳{totalAmount.toFixed(2)}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => onSelectOrder && onSelectOrder(order)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.detailsBtnText}>View Details</Text>
                        <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    maxWidth: 420,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  searchWrapper: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    marginVertical: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: colors.onSurface,
  },
  tabsWrapper: {
    width: '100%',
    maxWidth: 420,
    paddingBottom: 8,
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabBadgeCircle: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  tabBadgeTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    width: '100%',
    maxWidth: 420,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptySubtext: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  orderListContainer: {
    gap: 12,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  orderDateText: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  pharmacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pharmacyNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressText: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  detailsBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
