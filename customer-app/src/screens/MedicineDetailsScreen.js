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

        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
    maxWidth: scale(600),
    height: verticalScale(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: scale(1),
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  backBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  cartIconBtn: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: scale(600),
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  successText: {
    color: '#065F46',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '600',
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  iconCircle: {
    width: scale(72),
    height: verticalScale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  medNameText: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  strengthBadge: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: scale(1),
    borderColor: colors.primary,
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(3),
    marginTop: verticalScale(6),
  },
  strengthBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.primary,
  },
  genericText: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(6),
  },
  brandText: {
    fontSize: moderateScale(12.5),
    color: '#64748B',
    marginTop: verticalScale(2),
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: verticalScale(16),
  },
  priceText: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: colors.primary,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: scale(6),
  },
  rxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: scale(1),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
  },
  rxBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#92400E',
  },
  stockBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(8),
    borderWidth: scale(1),
  },
  bgSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  textSuccess: {
    color: '#065F46',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  bgDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  textDanger: {
    color: '#991B1B',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  divider: {
    height: verticalScale(1),
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginVertical: verticalScale(16),
  },
  section: {
    width: '100%',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.onSurfaceVariant,
    marginBottom: verticalScale(2),
  },
  sectionBody: {
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
    lineHeight: moderateScale(18),
  },
  pharmacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: '#F8FAFC',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    borderRadius: scale(12),
    padding: scale(12),
    width: '100%',
    marginVertical: verticalScale(10),
  },
  pharmacyBoxTitle: {
    fontSize: moderateScale(11),
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  pharmacyBoxName: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.primary,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: verticalScale(10),
  },
  qtyLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.onSurface,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
  },
  qtyBtn: {
    width: scale(32),
    height: verticalScale(32),
    borderRadius: scale(8),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
  },
  qtyVal: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: colors.onSurface,
    minWidth: scale(20),
    textAlign: 'center',
  },
  addToCartBtn: {
    height: verticalScale(50),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
    width: '100%',
    marginTop: verticalScale(10),
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  addToCartBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
});
