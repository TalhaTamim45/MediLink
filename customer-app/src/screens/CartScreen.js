import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useCart } from '../context/CartContext';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function CartScreen({ selectedPharmacy, onOpenPharmacyMap, onBack, onProceedCheckout }) {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    totalItems,
    subtotal,
    deliveryFee,
    grandTotal,
  } = useCart();

  const [infoToast, setInfoToast] = useState('');
  const [errorBanner, setErrorBanner] = useState('');

  const handleProceedCheckoutPress = () => {
    if (cartItems.length === 0) return;
    if (!selectedPharmacy) {
      setErrorBanner('Please select a pharmacy before placing your order.');
      return;
    }
    setErrorBanner('');
    if (onProceedCheckout) {
      onProceedCheckout();
    } else {
      setInfoToast('Checkout feature coming soon.');
      setTimeout(() => setInfoToast(''), 2500);
    }
  };

  const pharmacyName = cartItems.length > 0 ? cartItems[0].pharmacyName : 'MediLink Pharmacy';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Sticky Header with Back Button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Shopping Cart</Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Notification Toast */}
        {infoToast ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
            <Text style={styles.infoText}>{infoToast}</Text>
          </View>
        ) : null}

        {/* Main Content Area */}
        {cartItems.length === 0 ? (
          /* Empty Cart Screen */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="cart-outline" size={64} color={colors.primary} />
            </View>

            <Text style={styles.emptyTitle}>Your cart is empty.</Text>
            <Text style={styles.emptySubtitle}>
              Looks like you haven't added any medicines to your cart yet.
            </Text>

            <TouchableOpacity
              style={styles.browseButton}
              onPress={onBack}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
              <Text style={styles.browseButtonText}>Browse Medicines</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Active Cart Screen */
          <ScrollView style={{ width: '100%' }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.cardContainer}>
              {/* Mandatory Pharmacy Error Banner */}
              {errorBanner ? (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                  <Text style={styles.errorText}>{errorBanner}</Text>
                  <TouchableOpacity
                    style={styles.openMapBtn}
                    onPress={onOpenPharmacyMap}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.openMapBtnText}>Select Pharmacy</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Pharmacy Store Header Badge */}
              <TouchableOpacity
                style={styles.pharmacyStoreBadge}
                onPress={onOpenPharmacyMap}
                activeOpacity={0.85}
              >
                <Ionicons name="storefront" size={22} color={colors.primary} />
                <View style={styles.pharmacyStoreInfo}>
                  <Text style={styles.pharmacyStoreTitle}>
                    {selectedPharmacy ? selectedPharmacy.pharmacyName : 'No Pharmacy Selected'}
                  </Text>
                  <Text style={styles.pharmacyStoreSubtitle}>
                    {selectedPharmacy
                      ? (selectedPharmacy.address || 'Dhaka, Bangladesh')
                      : 'Tap here to select a pharmacy on the Barikoi Map'}
                  </Text>
                </View>
                <View style={styles.changeBtnBadge}>
                  <Text style={styles.changeBtnBadgeText}>
                    {selectedPharmacy ? 'Change' : 'Select'}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Cart Items List */}
              <View style={styles.itemsList}>
                {cartItems.map((item) => (
                  <View key={item.id} style={styles.cartCard}>
                    <View style={styles.itemIconBox}>
                      <Ionicons name="medkit-outline" size={24} color={colors.primary} />
                    </View>

                    <View style={styles.itemInfo}>
                      <View style={styles.itemTitleRow}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <TouchableOpacity
                          onPress={() => removeFromCart(item.id)}
                          activeOpacity={0.7}
                          style={styles.deleteButton}
                        >
                          <Ionicons name="trash-outline" size={18} color="#DC2626" />
                        </TouchableOpacity>
                      </View>

                      <Text style={styles.itemSubtext}>
                        {item.strength ? `Strength: ${item.strength}` : item.generic}
                      </Text>

                      <View style={styles.itemFooterRow}>
                        <Text style={styles.unitPriceText}>
                          ৳{item.unitPrice.toFixed(2)}
                        </Text>

                        {/* Quantity Stepper */}
                        <View style={styles.stepperContainer}>
                          <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => updateQuantity(item.id, -1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="remove" size={16} color={colors.onSurface} />
                          </TouchableOpacity>

                          <Text style={styles.quantityText}>{item.quantity}</Text>

                          <TouchableOpacity
                            style={styles.stepperButton}
                            onPress={() => updateQuantity(item.id, 1)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="add" size={16} color={colors.onSurface} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Order Summary Card */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Order Summary</Text>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})</Text>
                  <Text style={styles.summaryValue}>৳{subtotal.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Delivery Fee</Text>
                  <Text style={styles.summaryValue}>৳{deliveryFee.toFixed(2)}</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryRow}>
                  <Text style={styles.grandTotalLabel}>Grand Total</Text>
                  <Text style={styles.grandTotalValue}>৳{grandTotal.toFixed(2)}</Text>
                </View>

                {/* Checkout Button */}
                <TouchableOpacity
                  style={styles.checkoutButton}
                  onPress={handleProceedCheckoutPress}
                  activeOpacity={0.85}
                >
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.onPrimary} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        )}
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
  infoBanner: {
    width: '100%',
    maxWidth: scale(390),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(10),
    gap: scale(8),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(12),
    padding: scale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: moderateScale(12.5),
    fontWeight: '600',
  },
  openMapBtn: {
    backgroundColor: '#991B1B',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(8),
  },
  openMapBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(11.5),
    fontWeight: '700',
  },
  changeBtnBadge: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: scale(1),
    borderColor: colors.primary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
  },
  changeBtnBadgeText: {
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    color: colors.primary,
  },
  infoText: {
    flex: 1,
    color: '#0369A1',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(24),
    maxWidth: scale(390),
    width: '100%',
  },
  emptyIconCircle: {
    width: scale(110),
    height: verticalScale(110),
    borderRadius: scale(55),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: verticalScale(24),
    lineHeight: moderateScale(20),
  },
  browseButton: {
    height: verticalScale(48),
    paddingHorizontal: scale(24),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  browseButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(14.5),
    fontWeight: '600',
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
  pharmacyStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderColor: 'rgba(0, 106, 94, 0.2)',
    borderWidth: scale(1),
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(16),
    gap: scale(12),
  },
  pharmacyStoreInfo: {
    flex: 1,
  },
  pharmacyStoreTitle: {
    fontSize: moderateScale(14.5),
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyStoreSubtitle: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  itemsList: {
    gap: scale(12),
    marginBottom: verticalScale(18),
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    padding: scale(12),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    gap: scale(12),
  },
  itemIconBox: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(10),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
    marginRight: scale(6),
  },
  deleteButton: {
    padding: scale(4),
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  itemSubtext: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    marginBottom: verticalScale(8),
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitPriceText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: scale(16),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
  },
  stepperButton: {
    width: scale(26),
    height: verticalScale(26),
    borderRadius: scale(13),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  quantityText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.onSurface,
    paddingHorizontal: scale(10),
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: moderateScale(15.5),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(14),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(10),
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
    marginVertical: verticalScale(12),
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
  checkoutButton: {
    height: verticalScale(48),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(16),
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  checkoutButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
});
