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

export default function MedicineDetailsScreen({
  medicine,
  selectedPharmacy,
  onBack,
  onOpenPharmacyMap,
  onOpenCart,
}) {
  const { addToCart, cartItems } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [stockError, setStockError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  if (!medicine) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.outerContainer}>
          <Text style={{ margin: 20, fontSize: 16 }}>Medicine details not found.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={onBack}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const medName = medicine.medicineName || medicine.name || 'Medicine Details';
  const genericName = medicine.genericName || medicine.generic || '';
  const rawPrice = medicine.price ?? medicine.unitPrice;
  const priceNum = typeof rawPrice === 'number'
    ? rawPrice
    : parseFloat(String(rawPrice || '0').replace(/[^0-9.]/g, '')) || 0;

  const rawStock = medicine.stock;
  const availableStock = typeof rawStock === 'number'
    ? rawStock
    : parseInt(String(rawStock || '0'), 10) || (rawStock === 'In Stock' ? 99 : 0);

  const isOutOfStock = availableStock <= 0;

  const handleIncrement = () => {
    if (quantity >= availableStock) {
      setStockError(`Only ${availableStock} item(s) available in stock.`);
      return;
    }
    setStockError('');
    setQuantity(quantity + 1);
  };

  const handleDecrement = () => {
    setStockError('');
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  const handleAddToCart = () => {
    if (!selectedPharmacy) {
      alert('Please select a pharmacy before adding items to cart.');
      if (onOpenPharmacyMap) onOpenPharmacyMap();
      return;
    }

    if (isOutOfStock) {
      setStockError('This medicine is currently out of stock.');
      return;
    }

    // Check existing cart item quantity
    const existingInCart = cartItems.find((i) => i.id === medicine.id);
    const existingQty = existingInCart ? existingInCart.quantity : 0;

    if (existingQty + quantity > availableStock) {
      setStockError(`Cannot add. Only ${availableStock} item(s) in stock (${existingQty} already in cart).`);
      return;
    }

    // Add item payload
    addToCart({
      id: medicine.id,
      medicineId: medicine.id,
      pharmacyUid: selectedPharmacy.pharmacyUid || selectedPharmacy.id || medicine.pharmacyUid,
      pharmacyName: selectedPharmacy.pharmacyName || medicine.pharmacyName || 'MediLink Pharmacy',
      name: medName,
      medicineName: medName,
      genericName: genericName,
      generic: genericName,
      strength: medicine.strength || '',
      unitPrice: priceNum,
      price: priceNum,
      quantity: quantity,
      prescriptionRequired: !!medicine.prescriptionRequired,
    });

    setSuccessToast(`Added ${quantity} x "${medName}" to cart!`);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medicine Details</Text>
          <TouchableOpacity style={styles.cartIconBtn} onPress={onOpenCart} activeOpacity={0.7}>
            <Ionicons name="cart-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainContainer}>
            {/* Success Toast */}
            {successToast ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#065F46" />
                <Text style={styles.successText}>{successToast}</Text>
              </View>
            ) : null}

            {/* Stock Error Banner */}
            {stockError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{stockError}</Text>
              </View>
            ) : null}

            {/* Medicine Hero Card */}
            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <Ionicons name="medkit" size={36} color={colors.primary} />
              </View>

              <Text style={styles.medNameText}>{medName}</Text>

              {medicine.strength ? (
                <View style={styles.strengthBadge}>
                  <Text style={styles.strengthBadgeText}>{medicine.strength}</Text>
                </View>
              ) : null}

              <Text style={styles.genericText}>Generic: {genericName || 'N/A'}</Text>
              <Text style={styles.brandText}>Brand: {medicine.brand || medicine.company || 'Generic'}</Text>

              {/* Price & Badges */}
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>৳{priceNum.toFixed(2)}</Text>

                <View style={styles.badgesRow}>
                  {medicine.prescriptionRequired && (
                    <View style={styles.rxBadge}>
                      <Ionicons name="document-text-outline" size={12} color="#92400E" />
                      <Text style={styles.rxBadgeText}>Rx Required</Text>
                    </View>
                  )}

                  <View style={[styles.stockBadge, isOutOfStock ? styles.bgDanger : styles.bgSuccess]}>
                    <Text style={[styles.stockBadgeText, isOutOfStock ? styles.textDanger : styles.textSuccess]}>
                      {isOutOfStock ? 'Out of Stock' : `In Stock (${availableStock})`}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Category & Form</Text>
                <Text style={styles.sectionBody}>
                  {medicine.category || 'Medicine'} • {medicine.dosageForm || 'Tablet'}
                </Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Description & Indications</Text>
                <Text style={styles.sectionBody}>
                  {medicine.description || 'No detailed description provided for this medicine.'}
                </Text>
              </View>

              {/* Fulfilling Pharmacy Info */}
              <View style={styles.pharmacyBox}>
                <Ionicons name="storefront-outline" size={18} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pharmacyBoxTitle}>Fulfilling Partner Store</Text>
                  <Text style={styles.pharmacyBoxName}>
                    {selectedPharmacy?.pharmacyName || medicine.pharmacyName || 'MediLink Partner Pharmacy'}
                  </Text>
                </View>
              </View>

              {/* Quantity Picker & Add to Cart Controls */}
              {!isOutOfStock && (
                <View style={styles.qtyContainer}>
                  <Text style={styles.qtyLabel}>Quantity:</Text>
                  <View style={styles.qtyControls}>
                    <TouchableOpacity style={styles.qtyBtn} onPress={handleDecrement}>
                      <Ionicons name="remove" size={16} color={colors.onSurface} />
                    </TouchableOpacity>
                    <Text style={styles.qtyVal}>{quantity}</Text>
                    <TouchableOpacity style={styles.qtyBtn} onPress={handleIncrement}>
                      <Ionicons name="add" size={16} color={colors.onSurface} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={[styles.addToCartBtn, isOutOfStock && styles.btnDisabled]}
                onPress={handleAddToCart}
                disabled={isOutOfStock}
                activeOpacity={0.85}
              >
                <Ionicons name="cart" size={18} color="#FFFFFF" />
                <Text style={styles.addToCartBtnText}>
                  {isOutOfStock ? 'Out of Stock' : `Add ${quantity} to Cart • ৳${(priceNum * quantity).toFixed(2)}`}
                </Text>
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
    maxWidth: 600,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  cartIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: 600,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  successText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  medNameText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  strengthBadge: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  strengthBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  genericText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },
  brandText: {
    fontSize: 12.5,
    color: '#64748B',
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
  },
  priceText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rxBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  bgSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  textSuccess: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '700',
  },
  bgDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  textDanger: {
    color: '#991B1B',
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: 16,
  },
  section: {
    width: '100%',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  sectionBody: {
    fontSize: 13.5,
    color: colors.onSurface,
    lineHeight: 18,
  },
  pharmacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginVertical: 10,
  },
  pharmacyBoxTitle: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  pharmacyBoxName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.primary,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  qtyVal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.onSurface,
    minWidth: 20,
    textAlign: 'center',
  },
  addToCartBtn: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    marginTop: 10,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
