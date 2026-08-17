import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useCart } from '../context/CartContext';
import {
  ORDER_STATUS,
  TERMINAL_STATUSES,
} from '../utils/orderStatuses';
import { calculateHaversineDistance } from '../utils/distance';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function OrderDetailsScreen({
  orderId,
  selectedPharmacy,
  userProfile,
  onBack,
  onOpenCart,
  onSelectPharmacy,
  onNavigateToCart,
}) {
  const { cartItems, addToCart, clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Cancellation state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Reorder state
  const [isReordering, setIsReordering] = useState(false);
  const [reorderModalInfo, setReorderModalInfo] = useState(null);

  // Pharmacy Change state during Reorder
  const [showPharmChangeModal, setShowPharmChangeModal] = useState(false);
  const [targetPharmData, setTargetPharmData] = useState(null);

  // Load Odoo Order Details
  useEffect(() => {
    if (!orderId) {
      setIsLoading(false);
      setErrorMsg('No Order ID specified.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const fetchOrderDetails = async () => {
      try {
        const orderResult = await odooApi.searchRead(
          'sale.order',
          [['id', '=', orderId]],
          ['name', 'amount_total', 'state', 'date_order', 'pharmacy_id', 'status']
        );

        if (orderResult.records.length === 0) {
          setErrorMsg('Order document does not exist or has been deleted.');
          setOrder(null);
          setIsLoading(false);
          return;
        }

        const o = orderResult.records[0];

        // Fetch lines for this order
        const linesResult = await odooApi.searchRead(
          'sale.order.line',
          [['order_id', '=', o.id]],
          ['product_id', 'product_uom_qty', 'price_unit', 'price_total']
        );

        const items = linesResult.records.map((line) => {
          const medName = line.product_id ? line.product_id[1] : 'Medicine';
          return {
            id: line.id,
            medicineId: line.product_id ? line.product_id[0] : null,
            medicineName: medName,
            name: medName,
            quantity: line.product_uom_qty,
            unitPrice: line.price_unit,
            lineTotal: line.price_total,
          };
        });

        let uiStatus = 'Pending';
        if (o.state === 'sale') uiStatus = 'Active';
        else if (o.state === 'done') uiStatus = 'Completed';
        else if (o.state === 'cancel') uiStatus = 'Cancelled';

        setOrder({
          id: o.id,
          orderId: o.name,
          pharmacyName: o.pharmacy_id ? o.pharmacy_id[1] : 'MediLink Pharmacy',
          total: o.amount_total,
          status: o.status || uiStatus,
          createdAt: o.date_order ? new Date(o.date_order) : new Date(),
          items: items,
          subtotal: o.amount_total,
          deliveryFee: 0,
        });

        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching order details from Odoo:', err);
        setErrorMsg('Failed to load order details.');
        setIsLoading(false);
      }
    };

    fetchOrderDetails();
  }, [orderId]);

  // Format timestamp safely
  const formatTimestamp = (createdAt) => {
    if (!createdAt) return 'N/A';
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

    if (isNaN(date.getTime())) return 'N/A';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleConfirmCancel = async () => {
    if (isCancelling || !order) return;

    setCancelError('');
    setIsCancelling(true);

    try {
      await odooApi.write('sale.order', order.id, { state: 'cancel' });
      setOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          status: 'Cancelled'
        };
      });
      setShowCancelModal(false);
    } catch (err) {
      console.error('Odoo order cancellation error:', err);
      setCancelError(err.message || 'Failed to cancel order. Please try again.');
    } finally {
      setIsCancelling(false);
    }
  };

  // ----------------------------------------------------
  // PART 5: REORDER FEATURE (WITH SAFEGUARDS #6, #7, #8)
  // ----------------------------------------------------
  const handleInitiateReorder = async () => {
    if (isReordering || !order) return;

    setIsReordering(true);
    setErrorMsg('');

    try {
      const pUid = order.pharmacyUid;
      if (!pUid) {
        throw new Error('Order is missing pharmacy information.');
      }

      // 1. Fetch pharmacy from Odoo
      const result = await odooApi.searchRead(
        'res.partner',
        [['id', '=', pUid]],
        ['name', 'pharmacy_license', 'latitude', 'longitude', 'opening_hours']
      );
      if (result.records.length === 0) {
        throw new Error('The pharmacy that fulfilled this order no longer exists.');
      }

      const p = result.records[0];
      const pharmData = {
        id: p.id,
        pharmacyUid: p.id,
        pharmacyName: p.name,
        name: p.name,
        approvalStatus: 'approved',
        latitude: p.latitude != null ? Number(p.latitude) : NaN,
        longitude: p.longitude != null ? Number(p.longitude) : NaN,
        pharmacyLicense: p.pharmacy_license,
        openingHours: p.opening_hours,
        deliveryRadius: 10.0,
        isOpen: true
      };

      if (pharmData.approvalStatus !== 'approved') {
        throw new Error('This pharmacy is currently unapproved.');
      }

      if (pharmData.isOpen === false) {
        throw new Error('This pharmacy is currently closed. Reorder cannot be placed while closed.');
      }

      const radiusNum = Number(pharmData.deliveryRadius);
      if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
        throw new Error('This pharmacy has not set a valid delivery radius. Reorder cannot be placed.');
      }

      // Check delivery distance if customer location available
      if (pharmData.latitude && pharmData.longitude && userProfile?.latitude && userProfile?.longitude) {
        const dist = calculateHaversineDistance(
          userProfile.latitude,
          userProfile.longitude,
          pharmData.latitude,
          pharmData.longitude
        );
        if (dist !== null && dist > radiusNum) {
          throw new Error(
            `Your current location (${dist.toFixed(1)} km away) is outside this pharmacy's delivery radius (${radiusNum} km).`
          );
        }
      }

      // Check if current selected pharmacy matches this order's pharmacy
      const currentSelectedUid = selectedPharmacy?.pharmacyUid || selectedPharmacy?.id;
      if (currentSelectedUid && currentSelectedUid !== pUid && cartItems.length > 0) {
        // Prompt user to switch pharmacy and clear cart
        setTargetPharmData(pharmData);
        setShowPharmChangeModal(true);
        setIsReordering(false);
        return;
      }

      // Execute reorder populating cart
      await processReorderItems(pharmData);
    } catch (err) {
      console.error('Reorder initialization error:', err);
      setErrorMsg(err.message || 'Failed to initiate reorder.');
    } finally {
      setIsReordering(false);
    }
  };

  const processReorderItems = async (pharmData) => {
    const pUid = pharmData.pharmacyUid || pharmData.id;
    const oldItems = order?.items || [];

    const itemsToAdd = [];
    const reducedItems = [];
    const unavailableItems = [];

    for (const oldItem of oldItems) {
      const medId = oldItem.medicineId || oldItem.id;
      const oldQty = Number(oldItem.quantity || 1);
      const nameStr = oldItem.medicineName || oldItem.name || 'Medicine';

      if (!medId) {
        unavailableItems.push({ name: nameStr, reason: 'Invalid item ID' });
        continue;
      }

      // Fetch latest medicine document from Odoo (product.product)
      const medResult = await odooApi.searchRead(
        'product.product',
        [['id', '=', medId]],
        ['name', 'list_price', 'generic_name', 'strength', 'prescription_required', 'pharmacy_id']
      );
      if (medResult.records.length === 0) {
        unavailableItems.push({ name: nameStr, reason: 'Item no longer in catalog' });
        continue;
      }

      const m = medResult.records[0];
      const medData = {
        id: m.id,
        medicineId: m.id,
        medicineName: m.name,
        name: m.name,
        price: Number(m.list_price ?? 0),
        unitPrice: Number(m.list_price ?? 0),
        genericName: m.generic_name || '',
        generic: m.generic_name || '',
        strength: m.strength || '',
        prescriptionRequired: !!m.prescription_required,
        stock: 100, // Mock high stock
        isActive: true,
        pharmacyUid: m.pharmacy_id ? m.pharmacy_id[0] : null
      };

      if (medData.pharmacyUid !== pUid) {
        unavailableItems.push({ name: nameStr, reason: 'Pharmacy mismatch' });
        continue;
      }

      const currentStock = Number(medData.stock || 0);
      if (currentStock <= 0) {
        unavailableItems.push({ name: nameStr, reason: 'Out of stock' });
        continue;
      }

      // Safeguard #8: Check existing quantity in cart
      const existingInCart = cartItems.find((ci) => (ci.id === medId || ci.medicineId === medId));
      const existingCartQty = existingInCart ? Number(existingInCart.quantity) : 0;
      const remainingStockForCart = Math.max(0, currentStock - existingCartQty);

      if (remainingStockForCart <= 0) {
        unavailableItems.push({
          name: nameStr,
          reason: `Cart already has maximum stock available (${currentStock})`,
        });
        continue;
      }

      // Safeguard #7: quantityToAdd = Math.min(oldOrderedQuantity, currentStock)
      const quantityToAdd = Math.min(oldQty, remainingStockForCart);

      if (quantityToAdd < oldQty) {
        reducedItems.push({
          name: nameStr,
          oldQty,
          addedQty: quantityToAdd,
          stock: currentStock,
        });
      }

      // Safeguard #12: Latest unit price
      const latestPrice = Number(medData.price ?? medData.unitPrice ?? oldItem.unitPrice ?? 0);

      itemsToAdd.push({
        id: medId,
        medicineId: medId,
        pharmacyUid: pUid,
        pharmacyName: pharmData.pharmacyName || order.pharmacyName || 'Pharmacy',
        name: medData.medicineName || nameStr,
        medicineName: medData.medicineName || nameStr,
        genericName: medData.genericName || oldItem.genericName || '',
        strength: medData.strength || oldItem.strength || '',
        unitPrice: latestPrice,
        price: latestPrice,
        quantity: quantityToAdd,
        prescriptionRequired: !!medData.prescriptionRequired,
      });
    }

    if (itemsToAdd.length === 0) {
      setReorderModalInfo({
        title: 'Reorder Unavailable',
        message: 'None of the medicines from this order could be added to cart.',
        unavailableItems,
        reducedItems: [],
        addedCount: 0,
      });
      return;
    }

    // Set selected pharmacy in App state if provided
    if (onSelectPharmacy) {
      onSelectPharmacy(pharmData);
    }

    // Add valid items to cart
    for (const itemPayload of itemsToAdd) {
      addToCart(itemPayload, pharmData.pharmacyName);
    }

    // Show reorder summary modal
    setReorderModalInfo({
      title: 'Items Added to Cart',
      message: `${itemsToAdd.length} medicine(s) successfully added to cart with latest available prices and stock.`,
      addedCount: itemsToAdd.length,
      reducedItems,
      unavailableItems,
    });
  };

  const confirmSwitchAndReorder = async () => {
    if (targetPharmData) {
      clearCart();
      setShowPharmChangeModal(false);
      await processReorderItems(targetPharmData);
      setTargetPharmData(null);
    }
  };

  // Timeline Step calculation
  const getTimelineSteps = (status) => {
    const steps = [
      { key: ORDER_STATUS.PENDING, label: 'Order Placed', desc: 'Order received by pharmacy' },
      { key: ORDER_STATUS.ACCEPTED, label: 'Accepted', desc: 'Pharmacy accepted your order' },
      { key: ORDER_STATUS.PREPARING, label: 'Preparing', desc: 'Medicine is being packed' },
      { key: ORDER_STATUS.READY_FOR_DELIVERY, label: 'Ready for Delivery', desc: 'Package ready for dispatch' },
      { key: ORDER_STATUS.DELIVERED, label: 'Delivered', desc: 'Order delivered successfully' },
    ];

    const orderIndexMap = {
      [ORDER_STATUS.PENDING]: 0,
      [ORDER_STATUS.ACCEPTED]: 1,
      [ORDER_STATUS.PREPARING]: 2,
      [ORDER_STATUS.READY_FOR_DELIVERY]: 3,
      [ORDER_STATUS.DELIVERED]: 4,
    };

    const currentIndex = orderIndexMap[status] ?? 0;

    return { steps, currentIndex };
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching live order status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.errorCenterContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#991B1B" />
          <Text style={styles.errorCenterTitle}>Order Error</Text>
          <Text style={styles.errorCenterSub}>{errorMsg || 'Unable to load order details.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={onBack}>
            <Text style={styles.retryBtnText}>Back to Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Fallback calculations (#12)
  const orderIdDisplay = order.orderId || order.id;
  const items = Array.isArray(order.items) ? order.items : [];
  const subtotal = Number(order.subtotal ?? 0);
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const total = Number(order.total ?? (subtotal + deliveryFee));

  const isTerminalState = TERMINAL_STATUSES.includes(order.status);
  const isPending = order.status === ORDER_STATUS.PENDING;

  const { steps, currentIndex } = getTimelineSteps(order.status);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order #{orderIdDisplay}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Order Header Summary Card */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View>
                <Text style={styles.summaryOrderId}>Order #{orderIdDisplay}</Text>
                <Text style={styles.summaryDate}>Placed on {formatTimestamp(order.createdAt)}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: isPending ? '#FEF3C7' : isTerminalState && order.status !== ORDER_STATUS.DELIVERED ? '#FEE2E2' : '#E0F2FE' }]}>
                <Text style={[styles.statusBadgeText, { color: isPending ? '#92400E' : isTerminalState && order.status !== ORDER_STATUS.DELIVERED ? '#991B1B' : '#0369A1' }]}>
                  {order.status}
                </Text>
              </View>
            </View>
          </View>

          {/* ---------------------------------------------------- */}
          {/* PART 3: LIVE ORDER STATUS TIMELINE                   */}
          {/* ---------------------------------------------------- */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Live Status Tracking</Text>

            {order.status === ORDER_STATUS.CANCELLED || order.status === ORDER_STATUS.REJECTED ? (
              <View style={styles.terminalStatusCard}>
                <Ionicons name="close-circle" size={32} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.terminalStatusTitle}>
                    Order {order.status === ORDER_STATUS.CANCELLED ? 'Cancelled' : 'Rejected'}
                  </Text>
                  <Text style={styles.terminalStatusSub}>
                    {order.status === ORDER_STATUS.CANCELLED
                      ? `Cancelled by ${order.cancelledBy || 'customer'} on ${formatTimestamp(order.cancelledAt)}.`
                      : `Rejected by pharmacy on ${formatTimestamp(order.rejectedAt)}.`}
                  </Text>
                  <Text style={styles.terminalStatusNote}>Medicine inventory has been restored.</Text>
                </View>
              </View>
            ) : (
              <View style={styles.timelineContainer}>
                {steps.map((step, idx) => {
                  const isCompleted = idx < currentIndex;
                  const isCurrent = idx === currentIndex;

                  return (
                    <View key={step.key} style={styles.timelineRow}>
                      <View style={styles.timelineIndicatorCol}>
                        <View
                          style={[
                            styles.timelineDot,
                            isCompleted && styles.timelineDotCompleted,
                            isCurrent && styles.timelineDotCurrent,
                          ]}
                        >
                          {isCompleted ? (
                            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                          ) : isCurrent ? (
                            <View style={styles.innerCurrentDot} />
                          ) : null}
                        </View>
                        {idx < steps.length - 1 ? (
                          <View
                            style={[
                              styles.timelineLine,
                              isCompleted && styles.timelineLineCompleted,
                            ]}
                          />
                        ) : null}
                      </View>

                      <View style={styles.timelineContentCol}>
                        <Text
                          style={[
                            styles.timelineStepLabel,
                            (isCompleted || isCurrent) && styles.timelineStepLabelActive,
                          ]}
                        >
                          {step.label}
                        </Text>
                        <Text style={styles.timelineStepDesc}>{step.desc}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Pharmacy Details */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pharmacy Information</Text>
            <View style={styles.infoRow}>
              <Ionicons name="storefront-outline" size={18} color={colors.primary} />
              <Text style={styles.infoTextBold}>{order.pharmacyName || 'MediLink Pharmacy'}</Text>
            </View>
            {order.pharmacyAddress ? (
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.infoText}>{order.pharmacyAddress}</Text>
              </View>
            ) : null}
          </View>

          {/* Customer & Delivery Information */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={16} color={colors.primary} />
              <Text style={styles.infoTextBold}>{order.customerName || userProfile?.fullName || 'Customer'}</Text>
            </View>
            {order.customerPhone ? (
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={16} color={colors.onSurfaceVariant} />
                <Text style={styles.infoText}>{order.customerPhone}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.infoText}>
                {[order.deliveryAddress, order.deliveryArea, order.deliveryCity].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>

          {/* Ordered Medicines List */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ordered Medicines ({items.length})</Text>
            <View style={styles.itemList}>
              {items.map((item, idx) => {
                const name = item.medicineName || item.name || 'Unknown medicine';
                const generic = item.genericName || item.generic || '';
                const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
                const quantity = Number(item.quantity ?? 1);
                const lineTotal = Number(item.lineTotal ?? (unitPrice * quantity));

                return (
                  <View key={item.id || idx} style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName}>{name} {item.strength ? `(${item.strength})` : ''}</Text>
                      {generic ? <Text style={styles.itemGeneric}>Generic: {generic}</Text> : null}
                      <Text style={styles.itemUnitPrice}>৳{unitPrice.toFixed(2)} / unit</Text>
                    </View>
                    <View style={styles.itemQtyCol}>
                      <Text style={styles.itemQtyText}>x{quantity}</Text>
                      <Text style={styles.itemLineTotal}>৳{lineTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Pricing Breakdown */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Summary</Text>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceVal}>৳{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Delivery Fee ({order.deliveryMethod || 'Standard'})</Text>
              <Text style={styles.priceVal}>৳{deliveryFee.toFixed(2)}</Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalPriceLabel}>Total Amount</Text>
              <Text style={styles.totalPriceVal}>৳{total.toFixed(2)}</Text>
            </View>
            <View style={styles.methodRow}>
              <Ionicons name="card-outline" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.methodText}>Payment Method: {order.paymentMethod || 'Cash on Delivery'}</Text>
            </View>
          </View>

          {/* ---------------------------------------------------- */}
          {/* ACTION BUTTONS: CANCEL & REORDER                     */}
          {/* ---------------------------------------------------- */}
          <View style={styles.actionsContainer}>
            {/* Cancel Button (Only if Pending) */}
            {isPending ? (
              <TouchableOpacity
                style={[styles.cancelOrderBtn, isCancelling && { opacity: 0.6 }]}
                onPress={() => setShowCancelModal(true)}
                disabled={isCancelling}
                activeOpacity={0.8}
              >
                {isCancelling ? (
                  <ActivityIndicator size="small" color="#991B1B" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color="#991B1B" />
                    <Text style={styles.cancelOrderBtnText}>Cancel Order</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {/* Reorder Button (Only if Delivered, Cancelled, or Rejected) */}
            {isTerminalState ? (
              <TouchableOpacity
                style={[styles.reorderBtn, isReordering && { opacity: 0.6 }]}
                onPress={handleInitiateReorder}
                disabled={isReordering}
                activeOpacity={0.8}
              >
                {isReordering ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.reorderBtnText}>Reorder Medicines</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>

        {/* ---------------------------------------------------- */}
        {/* MODAL: CUSTOMER CANCELLATION CONFIRMATION             */}
        {/* ---------------------------------------------------- */}
        <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
              </View>
              <Text style={styles.modalTitle}>Cancel Order?</Text>
              <Text style={styles.modalSub}>
                Are you sure you want to cancel this order? Stock will be restored for all items.
              </Text>

              {cancelError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalErrorText}>{cancelError}</Text>
                </View>
              ) : null}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setCancelError('');
                    setShowCancelModal(false);
                  }}
                  disabled={isCancelling}
                >
                  <Text style={styles.modalCancelBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalConfirmBtn, isCancelling && { opacity: 0.6 }]}
                  onPress={handleConfirmCancel}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Yes, Cancel Order</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* MODAL: REORDER SUMMARY / UNAVAILABLE REPORT          */}
        {/* ---------------------------------------------------- */}
        <Modal visible={!!reorderModalInfo} transparent animationType="fade" onRequestClose={() => setReorderModalInfo(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{reorderModalInfo?.title}</Text>
              <Text style={styles.modalSub}>{reorderModalInfo?.message}</Text>

              {/* Reduced Items Warning */}
              {reorderModalInfo?.reducedItems?.length > 0 ? (
                <View style={styles.warningAlertBox}>
                  <Text style={styles.alertHeader}>Quantity Reduced Items:</Text>
                  {reorderModalInfo.reducedItems.map((item, i) => (
                    <Text key={i} style={styles.alertItemText}>
                      • {item.name}: Requested {item.oldQty}, added {item.addedQty} (Stock: {item.stock})
                    </Text>
                  ))}
                </View>
              ) : null}

              {/* Unavailable Items Warning */}
              {reorderModalInfo?.unavailableItems?.length > 0 ? (
                <View style={styles.dangerAlertBox}>
                  <Text style={styles.alertHeader}>Unavailable Items:</Text>
                  {reorderModalInfo.unavailableItems.map((item, i) => (
                    <Text key={i} style={styles.alertItemText}>
                      • {item.name}: {item.reason}
                    </Text>
                  ))}
                </View>
              ) : null}

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setReorderModalInfo(null)}
                >
                  <Text style={styles.modalCancelBtnText}>Close</Text>
                </TouchableOpacity>

                {reorderModalInfo?.addedCount > 0 ? (
                  <TouchableOpacity
                    style={styles.modalPrimaryBtn}
                    onPress={() => {
                      setReorderModalInfo(null);
                      if (onNavigateToCart) {
                        onNavigateToCart();
                      } else if (onOpenCart) {
                        onOpenCart();
                      }
                    }}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Go to Cart</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
        </Modal>

        {/* ---------------------------------------------------- */}
        {/* MODAL: PHARMACY CHANGE CLEAR CART CONFIRMATION       */}
        {/* ---------------------------------------------------- */}
        <Modal visible={showPharmChangeModal} transparent animationType="fade" onRequestClose={() => setShowPharmChangeModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Clear Cart & Switch Pharmacy?</Text>
              <Text style={styles.modalSub}>
                Your cart contains items from another pharmacy. Reordering from "{targetPharmData?.pharmacyName}" will clear your current cart.
              </Text>
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowPharmChangeModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={confirmSwitchAndReorder}
                >
                  <Text style={styles.modalConfirmBtnText}>Clear & Reorder</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = 
StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(12),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: colors.onSurfaceVariant,
  },
  errorCenterContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    gap: scale(12),
  },
  errorCenterTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#991B1B',
  },
  errorCenterSub: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: verticalScale(12),
    backgroundColor: colors.primary,
    paddingHorizontal: scale(18),
    paddingVertical: verticalScale(10),
    borderRadius: scale(10),
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  headerBar: {
    width: '100%',
    maxWidth: scale(420),
    height: verticalScale(56),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: scale(1),
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(18),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  scrollContent: {
    width: '100%',
    maxWidth: scale(420),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(14),
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryOrderId: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  summaryDate: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  statusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  statusBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    gap: scale(10),
  },
  cardTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(4),
  },
  terminalStatusCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: scale(1),
    borderColor: '#FECACA',
    borderRadius: scale(12),
    padding: scale(12),
    gap: scale(12),
  },
  terminalStatusTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#991B1B',
  },
  terminalStatusSub: {
    fontSize: moderateScale(12.5),
    color: '#7F1D1D',
    marginTop: verticalScale(2),
  },
  terminalStatusNote: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(4),
    fontStyle: 'italic',
  },
  timelineContainer: {
    paddingVertical: verticalScale(4),
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIndicatorCol: {
    alignItems: 'center',
    width: scale(24),
  },
  timelineDot: {
    width: scale(18),
    height: verticalScale(18),
    borderRadius: scale(9),
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  timelineDotCompleted: {
    backgroundColor: '#10B981',
  },
  timelineDotCurrent: {
    backgroundColor: colors.primary,
    width: scale(20),
    height: verticalScale(20),
    borderRadius: scale(10),
  },
  innerCurrentDot: {
    width: scale(8),
    height: verticalScale(8),
    borderRadius: scale(4),
    backgroundColor: '#FFFFFF',
  },
  timelineLine: {
    width: scale(2),
    height: verticalScale(36),
    backgroundColor: '#E2E8F0',
    marginVertical: -2,
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContentCol: {
    flex: 1,
    paddingLeft: scale(12),
    paddingBottom: verticalScale(16),
  },
  timelineStepLabel: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  timelineStepLabelActive: {
    color: colors.onSurface,
    fontWeight: '700',
  },
  timelineStepDesc: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(1),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  infoTextBold: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  infoText: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  itemList: {
    gap: scale(10),
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    borderBottomWidth: scale(1),
    borderBottomColor: '#F1F5F9',
  },
  itemName: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: colors.onSurface,
  },
  itemGeneric: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
  },
  itemUnitPrice: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  itemQtyCol: {
    alignItems: 'flex-end',
  },
  itemQtyText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  itemLineTotal: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.primary,
    marginTop: verticalScale(2),
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: verticalScale(4),
  },
  priceLabel: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  priceVal: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.onSurface,
  },
  priceDivider: {
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(6),
  },
  totalPriceLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.onSurface,
  },
  totalPriceVal: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.primary,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(8),
    paddingTop: verticalScale(8),
    borderTopWidth: scale(1),
    borderTopColor: '#F1F5F9',
  },
  methodText: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
  },
  actionsContainer: {
    marginTop: verticalScale(6),
    marginBottom: verticalScale(20),
    gap: scale(10),
  },
  cancelOrderBtn: {
    flexDirection: 'row',
    height: verticalScale(46),
    borderRadius: scale(12),
    backgroundColor: '#FEE2E2',
    borderWidth: scale(1),
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  cancelOrderBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#991B1B',
  },
  reorderBtn: {
    flexDirection: 'row',
    height: verticalScale(48),
    borderRadius: scale(12),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  reorderBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
  },
  modalCard: {
    width: '100%',
    maxWidth: scale(380),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
    gap: scale(12),
  },
  modalIconCircle: {
    width: scale(52),
    height: verticalScale(52),
    borderRadius: scale(26),
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  modalSub: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: moderateScale(18),
  },
  modalErrorBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    padding: scale(10),
    borderRadius: scale(8),
    borderWidth: scale(1),
    borderColor: '#FCA5A5',
  },
  modalErrorText: {
    fontSize: moderateScale(12),
    color: '#991B1B',
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(6),
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: verticalScale(42),
    borderRadius: scale(10),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalConfirmBtn: {
    flex: 1.2,
    height: verticalScale(42),
    borderRadius: scale(10),
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalPrimaryBtn: {
    flex: 1.2,
    height: verticalScale(42),
    borderRadius: scale(10),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  warningAlertBox: {
    width: '100%',
    backgroundColor: '#FEF3C7',
    borderWidth: scale(1),
    borderColor: '#FCD34D',
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(4),
  },
  dangerAlertBox: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderWidth: scale(1),
    borderColor: '#FECACA',
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(4),
  },
  alertHeader: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.onSurface,
  },
  alertItemText: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
  },
});
