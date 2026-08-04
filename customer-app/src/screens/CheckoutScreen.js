import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useCart } from '../context/CartContext';
import { db, auth } from '../config/firebase';
import { doc, getDoc, collection, addDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { calculateHaversineDistance } from '../utils/distance';
import { isValidCoord } from '../components/BarikoiCustomerMap';
const DELIVERY_METHODS = [
  { id: 'standard', name: 'Standard Delivery', time: 'Delivered within 1-2 hours', fee: 60 },
  { id: 'express', name: 'Express Delivery', time: 'Fastest delivery within 30-45 mins', fee: 100 },
];

const PAYMENT_METHODS = [
  { id: 'cod', name: 'Cash on Delivery', subtext: 'Pay cash when medicine arrives', icon: 'cash-outline' },
  { id: 'bkash', name: 'bKash / Mobile Banking', subtext: 'Pay securely via mobile wallet', icon: 'phone-portrait-outline' },
];

export default function CheckoutScreen({ userProfile, selectedPharmacy, onOpenPharmacyMap, onBack, onOrderPlaced }) {
  const { cartItems, subtotal, clearCart } = useCart();

  // Prefill Full Name and Phone from Firestore customer profile
  const [fullName, setFullName] = useState(userProfile?.fullName || '');
  const [phone, setPhone] = useState(userProfile?.phone || '');

  // Address Fields
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('Dhaka');

  // Delivery & Payment Selections
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate delivery fee based on selected method
  const deliveryFee = deliveryMethod === 'Express Delivery' ? 100 : 60;
  const grandTotal = subtotal + deliveryFee;

  const validateForm = () => {
    if (!selectedPharmacy || (!selectedPharmacy.pharmacyUid && !selectedPharmacy.id)) {
      setErrorMessage('Please select a pharmacy before placing your order.');
      return false;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter your delivery street address.');
      return false;
    }
    if (!area.trim()) {
      setErrorMessage('Please enter your area / neighborhood.');
      return false;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city.');
      return false;
    }
    if (!paymentMethod) {
      setErrorMessage('Please select a payment method.');
      return false;
    }
    return true;
  };

  const handlePlaceOrder = async () => {
    if (isSubmitting) return;

    setErrorMessage('');

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const pUid = selectedPharmacy.pharmacyUid || selectedPharmacy.id;
      const generatedOrderId = 'ML-' + Math.floor(100000 + Math.random() * 900000);

      // Execute Firestore Transaction for Atomic Stock Validation & Order Creation
      await runTransaction(db, async (transaction) => {
        // 1. Re-verify selected pharmacy document status & delivery eligibility (Safeguard #10)
        const pharmDocRef = doc(db, 'pharmacies', pUid);
        const pharmDocSnap = await transaction.get(pharmDocRef);

        if (!pharmDocSnap.exists()) {
          throw new Error('Selected pharmacy profile no longer exists. Please select another pharmacy.');
        }

        const pData = pharmDocSnap.data();

        if (pData.approvalStatus !== 'approved') {
          throw new Error('Selected pharmacy is unapproved. Please select another pharmacy.');
        }

        if (pData.isOpen === false) {
          throw new Error('Selected pharmacy is currently closed. Orders cannot be placed while closed.');
        }

        const pLat = Number(pData.latitude);
        const pLng = Number(pData.longitude);
        if (!isValidCoord(pLat, pLng)) {
          throw new Error('Selected pharmacy has invalid location coordinates on record.');
        }

        const radiusRaw = pData.deliveryRadius;
        const radiusNum = Number(radiusRaw);
        if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
          throw new Error('This pharmacy has not set a valid delivery radius. Orders cannot be placed at this time.');
        }

        // Verify customer location distance if customer GPS available
        const custLat = userProfile?.latitude != null ? Number(userProfile.latitude) : null;
        const custLng = userProfile?.longitude != null ? Number(userProfile.longitude) : null;
        if (isValidCoord(custLat, custLng)) {
          const dist = calculateHaversineDistance(custLat, custLng, pLat, pLng);
          if (dist != null && dist > radiusNum) {
            throw new Error(
              'This pharmacy is outside your delivery area. You can browse medicines, but you cannot place an order from your current location.'
            );
          }
        }

        // 2. Validate medicine stock for every item in cart and compute new stock
        const stockUpdates = [];

        for (const item of cartItems) {
          const medId = item.medicineId || item.id;
          if (!medId) continue;

          const medRef = doc(db, 'medicines', medId);
          const medSnap = await transaction.get(medRef);

          if (!medSnap.exists()) {
            throw new Error(`Medicine "${item.name || item.medicineName}" is no longer available.`);
          }

          const medData = medSnap.data();
          if (medData.isActive === false) {
            throw new Error(`Medicine "${medData.medicineName}" is currently inactive.`);
          }

          if (medData.pharmacyUid !== pUid) {
            throw new Error(`Medicine "${medData.medicineName}" belongs to a different pharmacy.`);
          }

          const currentStock = medData.stock || 0;
          if (currentStock < item.quantity) {
            throw new Error(
              `Insufficient stock for "${medData.medicineName}". Requested: ${item.quantity}, Available: ${currentStock}.`
            );
          }

          stockUpdates.push({
            ref: medRef,
            newStock: currentStock - item.quantity,
          });
        }

        // 3. Apply stock decrements
        for (const update of stockUpdates) {
          transaction.update(update.ref, {
            stock: update.newStock,
            updatedAt: new Date(),
          });
        }

        // 4. Create new order document
        const newOrderRef = doc(collection(db, 'orders'));
        const orderData = {
          orderId: generatedOrderId,
          pharmacyUid: pUid,
          pharmacyName: selectedPharmacy.pharmacyName || pData.pharmacyName || 'MediLink Pharmacy',
          pharmacyAddress: selectedPharmacy.address || pData.address || 'Dhaka',
          pharmacyLatitude: selectedPharmacy.latitude || pData.latitude || null,
          pharmacyLongitude: selectedPharmacy.longitude || pData.longitude || null,
          customerLatitude: null,
          customerLongitude: null,
          distanceKm: selectedPharmacy.distance || null,
          customerUid: userProfile?.uid || auth.currentUser?.uid || 'guest',
          customerName: fullName.trim() || userProfile?.fullName || 'Customer',
          customerEmail: userProfile?.email || auth.currentUser?.email || '',
          customerPhone: phone.trim() || userProfile?.phone || '',
          deliveryAddress: address.trim(),
          deliveryArea: area.trim(),
          deliveryCity: city.trim(),
          deliveryMethod: deliveryMethod,
          paymentMethod: paymentMethod,
          items: cartItems.map((item) => ({
            id: item.id || item.medicineId,
            medicineId: item.medicineId || item.id,
            name: item.name || item.medicineName,
            medicineName: item.medicineName || item.name,
            genericName: item.genericName || item.generic || '',
            strength: item.strength || '',
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            lineTotal: item.unitPrice * item.quantity,
            prescriptionRequired: !!item.prescriptionRequired,
            pharmacyName: selectedPharmacy.pharmacyName || 'MediLink Pharmacy',
          })),
          subtotal: subtotal,
          deliveryFee: deliveryFee,
          total: grandTotal,
          status: 'Pending',
          createdAt: serverTimestamp(),
        };

        transaction.set(newOrderRef, orderData);
      });

      console.log('Order successfully created via atomic transaction with stock decrement:', generatedOrderId);

      // Clear CartContext
      clearCart();

      // Navigate to OrderSuccessScreen
      if (onOrderPlaced) {
        onOrderPlaced(generatedOrderId);
      }
    } catch (error) {
      console.log('Error creating Firestore order:', error);
      setErrorMessage('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back to cart"
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Checkout</Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Scrollable Content */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Selected Pharmacy Banner Card */}
            <View style={styles.pharmacySelectedCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="storefront" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Fulfilling Pharmacy</Text>
              </View>

              {selectedPharmacy ? (
                <View style={styles.pharmacyDetailsRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pharmacyNameText}>{selectedPharmacy.pharmacyName}</Text>
                    <Text style={styles.pharmacyAddressText}>
                      {selectedPharmacy.address || 'Dhaka, Bangladesh'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.changePharmBtn}
                    onPress={onOpenPharmacyMap}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changePharmBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.noPharmacyRow}>
                  <Text style={styles.noPharmText}>No pharmacy selected for this order.</Text>
                  <TouchableOpacity
                    style={styles.selectPharmBtn}
                    onPress={onOpenPharmacyMap}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="map-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.selectPharmBtnText}>Select Pharmacy Map</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Error Message Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* 1. Delivery Address Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="location-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Delivery Address</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Full Name</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                />

                <Text style={styles.fieldLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone Number"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Street Address *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="House 12, Road 5, Block B"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                />

                <View style={styles.twoColumnRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Area *</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      value={area}
                      onChangeText={setArea}
                      placeholder="e.g. Dhanmondi"
                      placeholderTextColor="rgba(62, 73, 70, 0.55)"
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>City *</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      value={city}
                      onChangeText={setCity}
                      placeholder="e.g. Dhaka"
                      placeholderTextColor="rgba(62, 73, 70, 0.55)"
                    />
                  </View>
                </View>
              </View>
            </View>

            {/* 2. Delivery Method Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="bicycle-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Delivery Method</Text>
              </View>

              <View style={styles.optionsList}>
                {DELIVERY_METHODS.map((method) => {
                  const isSelected = deliveryMethod === method.name;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => setDeliveryMethod(method.name)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionLeft}>
                        <Ionicons
                          name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                          size={18}
                          color={isSelected ? colors.primary : colors.onSurfaceVariant}
                        />
                        <View style={{ marginLeft: 10 }}>
                          <Text style={styles.optionName}>{method.name}</Text>
                          <Text style={styles.optionSubtext}>{method.time}</Text>
                        </View>
                      </View>
                      <Text style={styles.optionFee}>৳{method.fee}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Payment Method Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
                <Text style={styles.cardTitle}>Payment Method</Text>
              </View>

              <View style={styles.optionsList}>
                {PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.name;
                  return (
                    <TouchableOpacity
                      key={method.id}
                      style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                      onPress={() => setPaymentMethod(method.name)}
                      activeOpacity={0.8}
                    >
                      <View style={styles.optionLeft}>
                        <Ionicons
                          name={method.icon}
                          size={18}
                          color={isSelected ? colors.primary : colors.onSurfaceVariant}
                        />
                        <Text style={[styles.optionName, { marginLeft: 10 }]}>{method.name}</Text>
                      </View>
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={18}
                        color={isSelected ? colors.primary : '#CBD5E1'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 4. Order Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.cardTitle}>Order Summary</Text>

              <View style={styles.itemsSummaryList}>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.summaryItemRow}>
                    <Text style={styles.summaryItemName} numberOfLines={1}>
                      {item.name} x {item.quantity}
                    </Text>
                    <Text style={styles.summaryItemPrice}>
                      ৳{(item.unitPrice * item.quantity).toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>৳{subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee ({deliveryMethod})</Text>
                <Text style={styles.summaryValue}>৳{deliveryFee.toFixed(2)}</Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>৳{grandTotal.toFixed(2)}</Text>
              </View>

              {/* Place Order Button */}
              <TouchableOpacity
                style={[styles.placeOrderButton, isSubmitting && styles.placeOrderDisabled]}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                    <Text style={styles.placeOrderText}>Placing Order...</Text>
                  </View>
                ) : (
                  <Text style={styles.placeOrderText}>Place Order • ৳{grandTotal.toFixed(2)}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
    maxWidth: 390,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 94, 0.2)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  headerRightPlaceholder: {
    width: 60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  formGroup: {
    gap: 10,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    height: 42,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  optionCardSelected: {
    backgroundColor: 'rgba(0, 106, 94, 0.06)',
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionSubtext: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  optionFee: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemsSummaryList: {
    gap: 6,
    marginVertical: 12,
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemName: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    flex: 1,
    marginRight: 10,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  grandTotalValue: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary,
  },
  placeOrderButton: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  placeOrderDisabled: {
    opacity: 0.75,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  placeOrderText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  pharmacySelectedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.primary,
    marginBottom: 16,
    backgroundColor: 'rgba(0, 106, 94, 0.03)',
  },
  pharmacyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  pharmacyNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyAddressText: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  changePharmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  changePharmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  noPharmacyRow: {
    gap: 8,
    marginTop: 4,
  },
  noPharmText: {
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
  },
  selectPharmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 40,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  selectPharmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
