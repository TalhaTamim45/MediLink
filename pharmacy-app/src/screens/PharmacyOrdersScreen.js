import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { db } from '../config/firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ORDER_STATUS,
  TERMINAL_STATUSES,
  isValidStatusTransition,
} from '../utils/orderStatuses';

export default function PharmacyOrdersScreen({ pharmacy, onOrdersChange }) {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Rejected'
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    setErrorMsg('');

    if (!pharmacy?.uid) {
      setIsLoading(false);
      return;
    }

    // Real-time listener for orders collection filtered by logged-in pharmacy UID
    const ordersQuery = query(
      collection(db, 'orders'),
      where('pharmacyUid', '==', pharmacy.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const fetchedOrders = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        // Sort by createdAt descending locally
        fetchedOrders.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toMillis?.() || 0);
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toMillis?.() || 0);
          return timeB - timeA;
        });

        setOrders(fetchedOrders);
        if (onOrdersChange) {
          onOrdersChange(fetchedOrders);
        }
        setIsLoading(false);
      },
      (err) => {
        console.error('Error listening to orders in pharmacy app:', err);
        setErrorMsg('Failed to load real-time orders from Firestore.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pharmacy?.uid]);

  // Handle status updates & atomic stock restoration on Rejection
  const handleUpdateStatus = async (orderId, newStatus) => {
    if (updatingOrderId || !pharmacy?.uid) return;
    setUpdatingOrderId(orderId);
    setErrorMsg('');

    try {
      if (newStatus === ORDER_STATUS.REJECTED) {
        // Atomic transaction for rejection with stock restoration & ownership validation
        await runTransaction(db, async (transaction) => {
          const orderRef = doc(db, 'orders', orderId);
          const latestOrderSnap = await transaction.get(orderRef);

          if (!latestOrderSnap.exists()) {
            throw new Error('Order document does not exist.');
          }

          const latestOrder = latestOrderSnap.data();

          // Safeguard #2: Confirm pharmacy ownership
          if (latestOrder.pharmacyUid !== pharmacy.uid) {
            throw new Error('Unauthorized. This order does not belong to your pharmacy.');
          }

          // Safeguard #1: Confirm status is strictly Pending
          if (latestOrder.status !== ORDER_STATUS.PENDING) {
            throw new Error(
              `Cannot reject order because current status is "${latestOrder.status}". Stock will not be restored.`
            );
          }

          // Validate items and prepare stock restoration
          const items = latestOrder.items || [];
          const stockUpdates = [];

          for (const item of items) {
            // Safeguard #4: Medicine ID fallback
            const medId = item.medicineId || item.id;
            if (!medId) {
              throw new Error('Invalid item metadata in order. Missing medicine ID.');
            }

            // Safeguard #5: Quantity validation
            const qty = Number(item.quantity);
            if (!Number.isInteger(qty) || qty <= 0) {
              throw new Error(`Invalid item quantity (${item.quantity}) for "${item.medicineName || item.name}".`);
            }

            // Safeguard #3: Missing medicine document check
            const medRef = doc(db, 'medicines', medId);
            const medSnap = await transaction.get(medRef);

            if (!medSnap.exists()) {
              throw new Error(
                `Medicine "${item.medicineName || item.name || 'Unknown'}" no longer exists in catalog. Rejection aborted.`
              );
            }

            const currentStock = Number(medSnap.data().stock || 0);
            stockUpdates.push({
              ref: medRef,
              newStock: currentStock + qty,
            });
          }

          // Apply stock restorations
          for (const update of stockUpdates) {
            transaction.update(update.ref, {
              stock: update.newStock,
              updatedAt: serverTimestamp(),
            });
          }

          // Update order status with serverTimestamp (Safeguard #11)
          transaction.update(orderRef, {
            status: ORDER_STATUS.REJECTED,
            rejectedAt: serverTimestamp(),
            rejectedBy: 'pharmacy',
            updatedAt: serverTimestamp(),
          });
        });
      } else {
        // Standard status transitions (Accepted, Preparing, Ready for Delivery, Delivered)
        const orderRef = doc(db, 'orders', orderId);

        // Fetch current status to validate transition (Safeguard #9)
        const targetOrder = orders.find((o) => o.id === orderId);
        const currentStatus = targetOrder?.status || ORDER_STATUS.PENDING;

        // Safeguard #2: Confirm pharmacy ownership
        if (targetOrder?.pharmacyUid && targetOrder.pharmacyUid !== pharmacy.uid) {
          throw new Error('Unauthorized order update.');
        }

        // Safeguard #9: Enforce valid status transition logic
        if (!isValidStatusTransition(currentStatus, newStatus)) {
          throw new Error(`Invalid transition from "${currentStatus}" to "${newStatus}".`);
        }

        // Safeguard #11: Map timestamp field by status
        const updatePayload = {
          status: newStatus,
          updatedAt: serverTimestamp(),
        };

        if (newStatus === ORDER_STATUS.ACCEPTED) {
          updatePayload.acceptedAt = serverTimestamp();
        } else if (newStatus === ORDER_STATUS.PREPARING) {
          updatePayload.preparingAt = serverTimestamp();
        } else if (newStatus === ORDER_STATUS.READY_FOR_DELIVERY) {
          updatePayload.readyAt = serverTimestamp();
        } else if (newStatus === ORDER_STATUS.DELIVERED) {
          updatePayload.deliveredAt = serverTimestamp();
        }

        await updateDoc(orderRef, updatePayload);
      }
    } catch (err) {
      console.error('Error updating order status in pharmacy app:', err);
      alert(err.message || 'Failed to update order status. Please try again.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Filter orders based on active tab
  const filteredOrders = orders.filter((order) => {
    const status = order.status || ORDER_STATUS.PENDING;
    if (activeTab === 'All') return true;
    if (activeTab === 'Pending') return status === ORDER_STATUS.PENDING;
    if (activeTab === 'Preparing') return status === ORDER_STATUS.ACCEPTED || status === ORDER_STATUS.PREPARING;
    if (activeTab === 'Ready') return status === ORDER_STATUS.READY_FOR_DELIVERY;
    if (activeTab === 'Completed') return status === ORDER_STATUS.DELIVERED;
    if (activeTab === 'Rejected') return status === ORDER_STATUS.REJECTED || status === ORDER_STATUS.CANCELLED;
    return true;
  });

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case ORDER_STATUS.PENDING:
        return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' };
      case ORDER_STATUS.ACCEPTED:
      case ORDER_STATUS.PREPARING:
        return { bg: '#E0F2FE', text: '#0369A1', border: '#BAE6FD' };
      case ORDER_STATUS.READY_FOR_DELIVERY:
        return { bg: '#EDE9FE', text: '#6D28D9', border: '#DDD6FE' };
      case ORDER_STATUS.DELIVERED:
        return { bg: '#D1FAE5', text: '#065F46', border: '#A7F3D0' };
      case ORDER_STATUS.CANCELLED:
      case ORDER_STATUS.REJECTED:
        return { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const formatTimestamp = (createdAt) => {
    if (!createdAt) return 'Just now';
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Category / Status Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContainer}
      >
        {[
          { id: 'All', label: 'All Orders', count: orders.length },
          { id: 'Pending', label: 'Pending', count: orders.filter((o) => o.status === ORDER_STATUS.PENDING).length },
          { id: 'Preparing', label: 'Preparing', count: orders.filter((o) => o.status === ORDER_STATUS.ACCEPTED || o.status === ORDER_STATUS.PREPARING).length },
          { id: 'Ready', label: 'Ready', count: orders.filter((o) => o.status === ORDER_STATUS.READY_FOR_DELIVERY).length },
          { id: 'Completed', label: 'Completed', count: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED).length },
          { id: 'Rejected', label: 'Cancelled / Rejected', count: orders.filter((o) => o.status === ORDER_STATUS.REJECTED || o.status === ORDER_STATUS.CANCELLED).length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {tab.count > 0 ? (
                <View style={[styles.badgeCircle, isActive && styles.badgeCircleActive]}>
                  <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                    {tab.count}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Error Message */}
      {errorMsg ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      ) : null}

      {/* Loading Indicator */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching real-time orders...</Text>
        </View>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="receipt-outline" size={40} color={colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>No Orders Found</Text>
          <Text style={styles.emptySubtext}>
            There are currently no orders in the "{activeTab}" filter.
          </Text>
        </View>
      ) : (
        /* Orders List */
        <View style={styles.ordersList}>
          {filteredOrders.map((order) => {
            const statusStyle = getStatusBadgeStyle(order.status);
            const isUpdatingThis = updatingOrderId === order.id;

            const customerName = order.customerName || order.userAddress?.name || 'Customer';
            const customerPhone = order.customerPhone || order.userAddress?.phone || 'N/A';
            const addressStr = order.deliveryAddress || order.userAddress?.street || 'N/A';
            const areaCityStr = [
              order.deliveryArea || order.userAddress?.area,
              order.deliveryCity || order.userAddress?.city,
            ]
              .filter(Boolean)
              .join(', ');

            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <View key={order.id} style={styles.orderCard}>
                {/* Header: Order ID & Status */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.orderIdText}>
                      Order #{order.orderId || order.id.slice(0, 8)}
                    </Text>
                    <Text style={styles.timeText}>{formatTimestamp(order.createdAt)}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                    ]}
                  >
                    <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                      {order.status || ORDER_STATUS.PENDING}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Customer Details */}
                <View style={styles.customerSection}>
                  <View style={styles.infoRow}>
                    <Ionicons name="person-outline" size={16} color={colors.primary} />
                    <Text style={styles.infoTextBold}>{customerName}</Text>
                    <Text style={styles.phoneText}>({customerPhone})</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
                    <Text style={styles.infoText} numberOfLines={2}>
                      {addressStr} {areaCityStr ? `• ${areaCityStr}` : ''}
                    </Text>
                  </View>

                  <View style={styles.tagRow}>
                    <View style={styles.tagBadge}>
                      <Ionicons name="cash-outline" size={13} color={colors.onSurfaceVariant} />
                      <Text style={styles.tagText}>{order.paymentMethod || 'Cash on Delivery'}</Text>
                    </View>
                    <View style={styles.tagBadge}>
                      <Ionicons name="bicycle-outline" size={13} color={colors.onSurfaceVariant} />
                      <Text style={styles.tagText}>{order.deliveryMethod || 'Standard Delivery'}</Text>
                    </View>
                  </View>
                </View>

                {/* Items List */}
                <View style={styles.itemsBox}>
                  <Text style={styles.itemsBoxTitle}>Ordered Medicines:</Text>
                  {items.length > 0 ? (
                    items.map((item, idx) => {
                      const itemPrice = Number(item.unitPrice ?? item.price ?? 0);
                      const qty = Number(item.quantity ?? 1);
                      const lineTotal = Number(item.lineTotal ?? (itemPrice * qty));
                      const name = item.medicineName || item.name || 'Unknown medicine';
                      const generic = item.genericName || item.generic || '';

                      return (
                        <View key={item.id || idx} style={styles.itemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.itemNameText} numberOfLines={1}>
                              {name} {item.strength ? `(${item.strength})` : ''}
                            </Text>
                            {generic ? (
                              <Text style={styles.itemGenericText}>
                                Generic: {generic}
                              </Text>
                            ) : null}
                          </View>
                          <Text style={styles.itemQtyText}>x{qty}</Text>
                          <Text style={styles.itemPriceText}>
                            ৳{itemPrice.toFixed(2)} = ৳{lineTotal.toFixed(2)}
                          </Text>
                        </View>
                      );
                    })
                  ) : (
                    <Text style={styles.noItemsText}>No items specified</Text>
                  )}
                </View>

                {/* Pricing Summary */}
                <View style={styles.priceSummaryRow}>
                  <Text style={styles.priceLabel}>
                    Subtotal: ৳{Number(order.subtotal || 0).toFixed(2)} • Delivery: ৳{Number(order.deliveryFee || 0).toFixed(2)}
                  </Text>
                  <Text style={styles.totalPriceText}>
                    Total: ৳{Number(order.total || 0).toFixed(2)}
                  </Text>
                </View>

                {/* Action Buttons with Transition Logic (Safeguard #9, #13) */}
                <View style={styles.actionRow}>
                  {isUpdatingThis ? (
                    <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
                  ) : (
                    <>
                      {/* PENDING -> Accept / Reject */}
                      {order.status === ORDER_STATUS.PENDING || !order.status ? (
                        <>
                          <Pressable
                            style={[styles.btn, styles.btnReject]}
                            onPress={() => handleUpdateStatus(order.id, ORDER_STATUS.REJECTED)}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#991B1B" />
                            <Text style={styles.btnRejectText}>Reject Order</Text>
                          </Pressable>

                          <Pressable
                            style={[styles.btn, styles.btnAccept]}
                            onPress={() => handleUpdateStatus(order.id, ORDER_STATUS.ACCEPTED)}
                          >
                            <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                            <Text style={styles.btnAcceptText}>Accept Order</Text>
                          </Pressable>
                        </>
                      ) : null}

                      {/* ACCEPTED -> Start Preparing */}
                      {order.status === ORDER_STATUS.ACCEPTED ? (
                        <Pressable
                          style={[styles.btn, styles.btnPrimaryBlock]}
                          onPress={() => handleUpdateStatus(order.id, ORDER_STATUS.PREPARING)}
                        >
                          <Ionicons name="flame-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.btnPrimaryBlockText}>Start Preparing</Text>
                        </Pressable>
                      ) : null}

                      {/* PREPARING -> Mark Ready */}
                      {order.status === ORDER_STATUS.PREPARING ? (
                        <Pressable
                          style={[styles.btn, styles.btnPrimaryBlock]}
                          onPress={() => handleUpdateStatus(order.id, ORDER_STATUS.READY_FOR_DELIVERY)}
                        >
                          <Ionicons name="cube-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.btnPrimaryBlockText}>Mark Ready for Delivery</Text>
                        </Pressable>
                      ) : null}

                      {/* READY FOR DELIVERY -> Mark Delivered */}
                      {order.status === ORDER_STATUS.READY_FOR_DELIVERY ? (
                        <Pressable
                          style={[styles.btn, styles.btnSuccessBlock]}
                          onPress={() => handleUpdateStatus(order.id, ORDER_STATUS.DELIVERED)}
                        >
                          <Ionicons name="checkmark-done-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.btnSuccessBlockText}>Mark Delivered</Text>
                        </Pressable>
                      ) : null}

                      {/* DELIVERED */}
                      {order.status === ORDER_STATUS.DELIVERED ? (
                        <View style={styles.completedTag}>
                          <Ionicons name="checkmark-circle" size={16} color="#059669" />
                          <Text style={styles.completedTagText}>Order Delivered</Text>
                        </View>
                      ) : null}

                      {/* REJECTED */}
                      {order.status === ORDER_STATUS.REJECTED ? (
                        <View style={styles.rejectedTag}>
                          <Ionicons name="close-circle" size={16} color="#DC2626" />
                          <Text style={styles.rejectedTagText}>Order Rejected</Text>
                        </View>
                      ) : null}

                      {/* CANCELLED BY CUSTOMER */}
                      {order.status === ORDER_STATUS.CANCELLED ? (
                        <View style={styles.cancelledTag}>
                          <Ionicons name="close-circle-outline" size={16} color="#B91C1C" />
                          <Text style={styles.cancelledTagText}>Order Cancelled by Customer</Text>
                        </View>
                      ) : null}
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  tabsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
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
  badgeCircle: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurface,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#991B1B',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 36,
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptySubtext: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
  },
  ordersList: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    gap: 10,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  orderIdText: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  timeText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  customerSection: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  phoneText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
  },
  infoText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  tagText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  itemsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  itemsBoxTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurface,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemNameText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemGenericText: {
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
  },
  itemQtyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  itemPriceText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.primary,
  },
  noItemsText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  priceSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  priceLabel: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnReject: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  btnRejectText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  btnAccept: {
    backgroundColor: colors.primary,
  },
  btnAcceptText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPrimaryBlock: {
    backgroundColor: colors.primary,
  },
  btnPrimaryBlockText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnSuccessBlock: {
    backgroundColor: '#059669',
  },
  btnSuccessBlockText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 8,
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
  },
  completedTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#065F46',
  },
  rejectedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 8,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
  },
  rejectedTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancelledTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  cancelledTagText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#B91C1C',
  },
});
