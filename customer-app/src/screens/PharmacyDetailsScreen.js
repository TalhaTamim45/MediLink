import React, { useState, useEffect } from 'react';
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
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import {
  getDeliveryStatus,
  formatDistanceText,
} from '../utils/pharmacyValidation';

const CATEGORY_CHIPS = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Supplements'];

export default function PharmacyDetailsScreen({
  pharmacyData,
  onBack,
  onOpenCart,
  onOpenMedicineDetails,
}) {
  const { addToCart, totalItems, subtotal } = useCart();
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [infoToast, setInfoToast] = useState('');

  const pUid = pharmacyData?.pharmacyUid || pharmacyData?.id;
  const pharmacyName = pharmacyData?.pharmacyName || pharmacyData?.name || 'Partner Pharmacy';
  const address = pharmacyData?.address || pharmacyData?.locationAddress || 'Dhaka, Bangladesh';
  const isClosed = pharmacyData?.isOpen === false;

  const distText = formatDistanceText(pharmacyData?.distance);
  const deliveryInfo = getDeliveryStatus(pharmacyData?.distance, pharmacyData?.deliveryRadius);

  // 1. Subscribe to medicines for this pharmacy with cleanup (Safeguard #1)
  useEffect(() => {
    setIsLoading(true);
    if (!pUid) {
      setIsLoading(false);
      return;
    }

    const q = query(collection(db, 'medicines'), where('pharmacyUid', '==', pUid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((d) => ({ id: d.id, medicineId: d.id, ...d.data() }))
          .filter((m) => m.isActive !== false && (m.stock || 0) > 0);

        setMedicines(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error loading pharmacy medicines:', err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [pUid]);

  const handleAddToCartPress = (medicine) => {
    if (isClosed) {
      alert('This pharmacy is currently closed. Items cannot be added to cart while closed.');
      return;
    }

    const medName = medicine.medicineName || medicine.name || 'Medicine';
    const unitPrice = Number(medicine.price ?? medicine.unitPrice ?? 0);

    addToCart({
      id: medicine.id,
      medicineId: medicine.id,
      pharmacyUid: pUid,
      pharmacyName: pharmacyName,
      name: medName,
      medicineName: medName,
      genericName: medicine.genericName || medicine.generic || '',
      strength: medicine.strength || '',
      unitPrice: unitPrice,
      price: unitPrice,
      quantity: 1,
      prescriptionRequired: !!medicine.prescriptionRequired,
    });

    setInfoToast(`Added "${medName}" to cart!`);
    setTimeout(() => setInfoToast(''), 2200);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Top App Bar with Prominent Back Button */}
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (onBack) onBack();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle} numberOfLines={1}>
            {pharmacyName}
          </Text>

          <View style={styles.headerRightPlaceholder} />
        </View>

        {/* Scrollable Content */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            {/* Hero Card */}
            <View style={styles.heroCard}>
              <View style={styles.bannerBackground}>
                <TouchableOpacity
                  style={styles.bannerBackButton}
                  onPress={() => {
                    if (onBack) onBack();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color={colors.primary} />
                  <Text style={styles.bannerBackText}>Back</Text>
                </TouchableOpacity>

                <Ionicons name="medical" size={44} color="rgba(255, 255, 255, 0.35)" />
              </View>

              <View style={styles.pharmacyDetailsHeader}>
                <View style={styles.logoBadge}>
                  <Ionicons name="medical" size={28} color={colors.primary} />
                </View>

                <View style={styles.titleBadgeRow}>
                  <Text style={styles.pharmacyNameText}>{pharmacyName}</Text>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                </View>

                <Text style={styles.addressText}>{address}</Text>

                {/* Real Meta Row */}
                <View style={styles.statsRow}>
                  <View style={[styles.statusTag, isClosed ? styles.bgClosed : styles.bgOpen]}>
                    <Text style={[styles.statusText, isClosed ? styles.textClosed : styles.textOpen]}>
                      {isClosed ? 'Currently Closed' : 'Open Now'}
                    </Text>
                  </View>

                  {distText ? (
                    <View style={styles.statItem}>
                      <Ionicons name="navigate-outline" size={13} color={colors.primary} />
                      <Text style={styles.statValue}>{distText}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Delivery Availability Badge */}
                <View style={[styles.deliveryBadge, styles[`badge_${deliveryInfo.badgeType}`]]}>
                  <Ionicons
                    name={
                      deliveryInfo.badgeType === 'success'
                        ? 'checkmark-circle-outline'
                        : deliveryInfo.badgeType === 'danger'
                        ? 'warning-outline'
                        : 'information-circle-outline'
                    }
                    size={13}
                    color={
                      deliveryInfo.badgeType === 'success'
                        ? '#065F46'
                        : deliveryInfo.badgeType === 'danger'
                        ? '#991B1B'
                        : deliveryInfo.badgeType === 'warning'
                        ? '#92400E'
                        : '#0369A1'
                    }
                  />
                  <Text style={[styles.deliveryBadgeText, styles[`badgeText_${deliveryInfo.badgeType}`]]}>
                    {deliveryInfo.statusText}
                    {deliveryInfo.hasRadius ? ` (${deliveryInfo.radiusNum} km radius)` : ''}
                  </Text>
                </View>
              </View>
            </View>

            {/* Informational Callout Banner for Outside Radius or Closed */}
            {deliveryInfo.badgeType === 'danger' ? (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color="#991B1B" />
                <Text style={styles.warningBannerText}>
                  This pharmacy is outside your delivery area. You can browse medicines, but you cannot place an order from your current location.
                </Text>
              </View>
            ) : isClosed ? (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.warningBannerText}>
                  This pharmacy is currently closed. You can browse medicines, but orders cannot be placed while closed.
                </Text>
              </View>
            ) : null}

            {/* Notification Info Toast */}
            {infoToast ? (
              <View style={styles.infoBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#059669" />
                <Text style={styles.infoText}>{infoToast}</Text>
              </View>
            ) : null}

            {/* Search Medicines Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                placeholder={`Search medicines in ${pharmacyName.split(' ')[0]}...`}
                placeholderTextColor="rgba(62, 73, 70, 0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Medicine Category Chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
              {CATEGORY_CHIPS.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                    onPress={() => setSelectedCategory(cat)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Available Medicines List */}
            <View style={styles.medicinesSection}>
              <Text style={styles.sectionTitle}>Available Medicines ({medicines.length})</Text>

              {isLoading ? (
                <View style={{ paddingVertical: 30, alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={{ fontSize: 12.5, color: colors.onSurfaceVariant }}>Loading store catalog...</Text>
                </View>
              ) : medicines.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="medkit-outline" size={32} color={colors.outline} />
                  <Text style={styles.emptyTitle}>No medicines currently available</Text>
                  <Text style={styles.emptySubtext}>
                    This pharmacy hasn't listed active in-stock medicines yet.
                  </Text>
                </View>
              ) : (
                <View style={styles.medicinesList}>
                  {medicines
                    .filter((m) => {
                      if (searchQuery.trim()) {
                        const q = searchQuery.toLowerCase();
                        const matchName = (m.medicineName || m.name || '').toLowerCase().includes(q);
                        const matchGen = (m.genericName || m.generic || '').toLowerCase().includes(q);
                        const matchBrand = (m.brand || m.company || '').toLowerCase().includes(q);
                        if (!matchName && !matchGen && !matchBrand) return false;
                      }
                      if (selectedCategory !== 'All') {
                        if (m.category !== selectedCategory) return false;
                      }
                      return true;
                    })
                    .map((med) => {
                      const nameStr = med.medicineName || med.name || 'Medicine';
                      const priceVal = Number(med.price ?? med.unitPrice ?? 0);

                      return (
                        <TouchableOpacity
                          key={med.id}
                          style={styles.medicineCard}
                          onPress={() => onOpenMedicineDetails && onOpenMedicineDetails(med)}
                          activeOpacity={0.9}
                        >
                          <View style={styles.medicineIconBox}>
                            <Ionicons name="medkit-outline" size={24} color={colors.primary} />
                          </View>

                          <View style={styles.medicineInfo}>
                            <View style={styles.medicineHeaderRow}>
                              <Text style={styles.medicineName}>{nameStr}</Text>
                              <View style={styles.stockBadge}>
                                <Text style={styles.stockBadgeText}>In Stock ({med.stock})</Text>
                              </View>
                            </View>
                            <Text style={styles.genericText}>Generic: {med.genericName || med.generic || 'N/A'}</Text>
                            <Text style={styles.strengthText}>
                              {med.strength ? `Strength: ${med.strength}` : `Category: ${med.category || 'Tablet'}`}
                            </Text>

                            <View style={styles.medicineFooterRow}>
                              <Text style={styles.priceText}>৳{priceVal.toFixed(2)}</Text>
                              <TouchableOpacity
                                style={[styles.addToCartButton, isClosed && styles.btnDisabled]}
                                onPress={() => handleAddToCartPress(med)}
                                disabled={isClosed}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="add" size={16} color={colors.onPrimary} />
                                <Text style={styles.addToCartText}>{isClosed ? 'Closed' : 'Add to Cart'}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Floating Cart Action Button */}
        {totalItems > 0 ? (
          <View style={styles.floatingCartContainer}>
            <TouchableOpacity style={styles.floatingCartButton} onPress={onOpenCart} activeOpacity={0.85}>
              <View style={styles.floatingCartLeft}>
                <View style={styles.cartIconCircle}>
                  <Ionicons name="cart" size={18} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.cartItemsText}>
                    {totalItems} {totalItems === 1 ? 'Item' : 'Items'}
                  </Text>
                  <Text style={styles.cartTotalText}>৳{subtotal.toFixed(2)}</Text>
                </View>
              </View>
              <View style={styles.viewCartAction}>
                <Text style={styles.viewCartText}>View Cart</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onPrimary} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
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
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
    maxWidth: 200,
  },
  headerRightPlaceholder: {
    width: 60,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  bannerBackground: {
    height: 90,
    backgroundColor: colors.primary,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  bannerBackText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyDetailsHeader: {
    padding: 14,
    paddingTop: 0,
    alignItems: 'center',
    marginTop: -30,
    gap: 6,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  pharmacyNameText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
    textAlign: 'center',
  },
  addressText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  bgOpen: {
    backgroundColor: '#D1FAE5',
  },
  textOpen: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 11.5,
  },
  bgClosed: {
    backgroundColor: '#FEF2F2',
  },
  textClosed: {
    color: '#991B1B',
    fontWeight: '700',
    fontSize: 11.5,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    marginTop: 4,
  },
  badge_success: {
    backgroundColor: '#D1FAE5',
  },
  badgeText_success: {
    fontSize: 11.5,
    color: '#065F46',
    fontWeight: '600',
  },
  badge_danger: {
    backgroundColor: '#FEE2E2',
  },
  badgeText_danger: {
    fontSize: 11.5,
    color: '#991B1B',
    fontWeight: '600',
  },
  badge_warning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText_warning: {
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
  },
  badge_info: {
    backgroundColor: '#E0F2FE',
  },
  badgeText_info: {
    fontSize: 11.5,
    color: '#0369A1',
    fontWeight: '600',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    lineHeight: 16,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#065F46',
    fontSize: 12.5,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13,
    color: colors.onSurface,
  },
  chipsContainer: {
    gap: 8,
    paddingBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  medicinesSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptyBox: {
    padding: 24,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  medicinesList: {
    gap: 10,
  },
  medicineCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
    alignItems: 'center',
  },
  medicineIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medicineInfo: {
    flex: 1,
  },
  medicineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  medicineName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  stockBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#065F46',
  },
  genericText: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  strengthText: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  medicineFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  btnDisabled: {
    backgroundColor: '#CBD5E1',
  },
  addToCartText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  floatingCartButton: {
    width: '100%',
    maxWidth: 390,
    height: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 4,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cartIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
  },
  cartTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  viewCartAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCartText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
