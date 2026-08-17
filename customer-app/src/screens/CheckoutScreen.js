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
import { calculateHaversineDistance } from '../utils/distance';
import { isValidCoord } from '../components/BarikoiCustomerMap';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


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
  const [fullName, setFullName] = useState(userProfile?.fullName || userProfile?.name || 'Talha Tamim');
  const [phone, setPhone] = useState(userProfile?.phone || '01712345678');

  // Address Fields
  const [address, setAddress] = useState(userProfile?.address || 'House 12, Road 5, Block B');
  const [area, setArea] = useState(userProfile?.area || 'Dhanmondi');
  const [city, setCity] = useState(userProfile?.city || 'Dhaka');

  // Delivery & Payment Selections
  const [deliveryMethod, setDeliveryMethod] = useState('Standard Delivery');
  const [paymentMethod, setPaymentMethod] = useState('Cash on Delivery');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [isFullNameFocused, setIsFullNameFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isAddressFocused, setIsAddressFocused] = useState(false);
  const [isAreaFocused, setIsAreaFocused] = useState(false);
  const [isCityFocused, setIsCityFocused] = useState(false);

  const selectedDelivery = DELIVERY_METHODS.find((m) => m.name === deliveryMethod);
  const deliveryFee = selectedDelivery ? selectedDelivery.fee : 0;
  const grandTotal = subtotal + deliveryFee;

  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return false;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your contact phone number.');
      return false;
    }
    if (!address.trim()) {
      setErrorMessage('Please enter your street address.');
      return false;
    }
    if (!area.trim()) {
      setErrorMessage('Please enter your area/neighborhood.');
      return false;
    }
    if (!city.trim()) {
      setErrorMessage('Please enter your city.');
      return false;
    }
    if (cartItems.length === 0) {
      setErrorMessage('Your shopping cart is empty.');
      return false;
    }
    if (!selectedPharmacy) {
      setErrorMessage('Please select a pharmacy to fulfill your order.');
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

      const custLat = userProfile?.latitude != null ? Number(userProfile.latitude) : null;
      const custLng = userProfile?.longitude != null ? Number(userProfile.longitude) : null;

      // 1. Create Sale Order in Odoo
      const odooOrder = await odooApi.create('sale.order', {
        partner_id: odooApi.partnerId || 1, // Logged in Odoo customer
        pharmacy_id: pUid,
        customer_latitude: custLat,
        customer_longitude: custLng,
      });

      // 2. Create Sale Order Lines for each item in cart
      for (const item of cartItems) {
        const prodId = item.id || item.medicineId;
        await odooApi.create('sale.order.line', {
          order_id: odooOrder.id,
          product_id: prodId,
          product_uom_qty: item.quantity,
        });
      }

      console.log('Order successfully created in Odoo:', odooOrder.id);

      // Clear CartContext
      clearCart();

      // Navigate to OrderSuccessScreen
      if (onOrderPlaced) {
        onOrderPlaced(generatedOrderId);
      }
    } catch (error) {
      console.log('Error creating Odoo order:', error);
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
        <ScrollView style={{ width: '100%' }}
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
  headerBar: {
    width: '100%',
    maxWidth: scale(390),
    height: verticalScale(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(14),
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: scale(1),
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    borderWidth: scale(1),
    borderColor: 'rgba(0, 106, 94, 0.2)',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  backButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  headerRightPlaceholder: {
    width: scale(60),
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(40),
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(390),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    marginBottom: verticalScale(16),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(14),
  },
  cardTitle: {
    fontSize: moderateScale(15.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  formGroup: {
    gap: scale(10),
  },
  fieldLabel: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(10),
    height: verticalScale(42),
    paddingHorizontal: scale(12),
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  optionsList: {
    gap: scale(10),
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(12),
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  optionCardSelected: {
    backgroundColor: 'rgba(0, 106, 94, 0.06)',
    borderColor: colors.primary,
    borderWidth: scale(1.5),
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionName: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: colors.onSurface,
  },
  optionSubtext: {
    fontSize: moderateScale(11),
    color: colors.onSurfaceVariant,
  },
  optionFee: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  itemsSummaryList: {
    gap: scale(6),
    marginVertical: verticalScale(12),
  },
  summaryItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryItemName: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
    flex: 1,
    marginRight: scale(10),
  },
  summaryItemPrice: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  summaryLabel: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  summaryValue: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: colors.onSurface,
  },
  summaryDivider: {
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(10),
  },
  grandTotalLabel: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.onSurface,
  },
  grandTotalValue: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: colors.primary,
  },
  placeOrderButton: {
    height: verticalScale(50),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(14),
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
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
    gap: scale(8),
  },
  placeOrderText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  pharmacySelectedCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: colors.primary,
    marginBottom: verticalScale(16),
    backgroundColor: 'rgba(0, 106, 94, 0.03)',
  },
  pharmacyDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(4),
  },
  pharmacyNameText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyAddressText: {
    fontSize: moderateScale(12.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  changePharmBtn: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: scale(1),
    borderColor: colors.primary,
  },
  changePharmBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.primary,
  },
  noPharmacyRow: {
    gap: scale(8),
    marginTop: verticalScale(4),
  },
  noPharmText: {
    fontSize: moderateScale(13),
    color: '#991B1B',
    fontWeight: '600',
  },
  selectPharmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    height: verticalScale(40),
    backgroundColor: colors.primary,
    borderRadius: scale(10),
  },
  selectPharmBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
});
