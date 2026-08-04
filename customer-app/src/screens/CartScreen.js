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
          <ScrollView
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
  infoBanner: {
    width: '100%',
    maxWidth: 390,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    gap: 8,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 12.5,
    fontWeight: '600',
  },
  openMapBtn: {
    backgroundColor: '#991B1B',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  openMapBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '700',
  },
  changeBtnBadge: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeBtnBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.primary,
  },
  infoText: {
    flex: 1,
    color: '#0369A1',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    maxWidth: 390,
    width: '100%',
  },
  emptyIconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  browseButton: {
    height: 48,
    paddingHorizontal: 24,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  browseButtonText: {
    color: colors.onPrimary,
    fontSize: 14.5,
    fontWeight: '600',
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
  pharmacyStoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderColor: 'rgba(0, 106, 94, 0.2)',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  pharmacyStoreInfo: {
    flex: 1,
  },
  pharmacyStoreTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyStoreSubtitle: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  itemsList: {
    gap: 12,
    marginBottom: 18,
  },
  cartCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    flex: 1,
    marginRight: 6,
  },
  deleteButton: {
    padding: 4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  itemSubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  itemFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitPriceText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperButton: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
    paddingHorizontal: 10,
  },
  summaryCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
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
    marginVertical: 12,
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
  checkoutButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  checkoutButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
