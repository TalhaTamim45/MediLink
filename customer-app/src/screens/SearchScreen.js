import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { auth, db } from '../config/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { calculateHaversineDistance } from '../utils/distance';
import { isValidCoord } from '../components/BarikoiCustomerMap';
import {
  isApprovedPharmacy,
  getDeliveryStatus,
  formatDistanceText,
} from '../utils/pharmacyValidation';

export default function SearchScreen({
  userProfile,
  selectedPharmacy,
  onOpenPharmacyMap,
  onOpenMedicineDetails,
  onLogout,
  onNavigateTab,
  activeTab = 'search',
  onSelectPharmacy,
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [infoBanner, setInfoBanner] = useState('');
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);

  // Firestore real-time data
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true);
  const [pharmacyError, setPharmacyError] = useState('');

  const [liveMedicines, setLiveMedicines] = useState([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);

  const [customerLocation, setCustomerLocation] = useState(null);

  const pUid = selectedPharmacy?.pharmacyUid || selectedPharmacy?.id;
  const selectedPharmacyName = selectedPharmacy?.pharmacyName || selectedPharmacy?.name;

  // 1. Subscribe to Firestore approved pharmacies collection (Safeguard #1)
  useEffect(() => {
    setIsLoadingPharmacies(true);
    setPharmacyError('');

    const unsubscribe = onSnapshot(
      collection(db, 'pharmacies'),
      (snapshot) => {
        let totalDocs = snapshot.docs.length;
        let approvedCount = 0;
        let validCoordCount = 0;

        const docs = snapshot.docs
          .map((d) => {
            const data = d.data() || {};
            const numLat = data.latitude != null ? Number(data.latitude) : NaN;
            const numLng = data.longitude != null ? Number(data.longitude) : NaN;

            if (data.approvalStatus === 'approved') approvedCount++;
            if (isValidCoord(numLat, numLng)) validCoordCount++;

            return {
              id: d.id,
              pharmacyUid: d.id,
              ...data,
              latitude: numLat,
              longitude: numLng,
            };
          })
          .filter(isApprovedPharmacy);

        if (__DEV__) {
          console.log(
            `[SearchScreen Dev Log] Total pharmacy docs: ${totalDocs}, Approved: ${approvedCount}, Valid coords: ${validCoordCount}, Visible: ${docs.length}`
          );
        }

        setPharmacies(docs);
        setIsLoadingPharmacies(false);
      },
      (err) => {
        console.error('Error listening to pharmacies in SearchScreen:', err);
        setPharmacyError('Failed to load approved pharmacies.');
        setIsLoadingPharmacies(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Subscribe to selected pharmacy medicines (Safeguard #1, #7)
  useEffect(() => {
    if (!pUid) {
      setLiveMedicines([]);
      setIsLoadingMedicines(false);
      return;
    }

    setIsLoadingMedicines(true);
    const q = query(collection(db, 'medicines'), where('pharmacyUid', '==', pUid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs
          .map((d) => ({ id: d.id, medicineId: d.id, ...d.data() }))
          .filter((m) => m.isActive !== false && (m.stock || 0) > 0);

        setLiveMedicines(docs);
        setIsLoadingMedicines(false);
      },
      (err) => {
        console.error('Error fetching search medicines:', err);
        setIsLoadingMedicines(false);
      }
    );

    return () => unsubscribe();
  }, [pUid]);

  // 3. Get customer location
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted && loc?.coords && isValidCoord(loc.coords.latitude, loc.coords.longitude)) {
            setCustomerLocation({
              latitude: Number(loc.coords.latitude),
              longitude: Number(loc.coords.longitude),
            });
          }
        }
      } catch (e) {}
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // 4. Process and filter pharmacies using useMemo (Safeguard #8, #13, #15)
  const filteredPharmacies = useMemo(() => {
    const hasLocation = customerLocation && isValidCoord(customerLocation.latitude, customerLocation.longitude);
    const q = searchQuery.toLowerCase().trim();

    const list = pharmacies
      .filter((p) => {
        if (!q) return true;
        const nameMatch = (p.pharmacyName || '').toLowerCase().includes(q);
        const ownerMatch = (p.ownerName || '').toLowerCase().includes(q);
        const addressMatch = (p.address || p.locationAddress || '').toLowerCase().includes(q);
        const phoneMatch = (p.phone || '').toLowerCase().includes(q);
        const emailMatch = (p.email || '').toLowerCase().includes(q);

        return nameMatch || ownerMatch || addressMatch || phoneMatch || emailMatch;
      })
      .map((p) => {
        const dist = hasLocation
          ? calculateHaversineDistance(customerLocation.latitude, customerLocation.longitude, p.latitude, p.longitude)
          : null;
        const deliveryInfo = getDeliveryStatus(dist, p.deliveryRadius);
        return { ...p, distance: dist, deliveryInfo };
      });

    if (hasLocation) {
      list.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    } else {
      list.sort((a, b) => (a.pharmacyName || '').localeCompare(b.pharmacyName || ''));
    }

    return list;
  }, [pharmacies, searchQuery, customerLocation]);

  // 5. Process and filter medicines using useMemo (Safeguard #7, #8, #13)
  const filteredMedicines = useMemo(() => {
    if (!pUid || !liveMedicines.length) return [];
    const q = searchQuery.toLowerCase().trim();

    return liveMedicines.filter((m) => {
      if (!q) return true;
      const nameMatch = (m.medicineName || m.name || '').toLowerCase().includes(q);
      const genericMatch = (m.genericName || m.generic || '').toLowerCase().includes(q);
      const brandMatch = (m.brand || m.company || '').toLowerCase().includes(q);
      const categoryMatch = (m.category || '').toLowerCase().includes(q);

      return nameMatch || genericMatch || brandMatch || categoryMatch;
    });
  }, [liveMedicines, searchQuery, pUid]);

  const handleTabPress = (tabKey) => {
    if (tabKey === 'home' || tabKey === 'search') {
      setInfoBanner('');
      if (onNavigateTab) {
        onNavigateTab(tabKey);
      }
    } else {
      setInfoBanner('Coming soon.');
      setTimeout(() => setInfoBanner(''), 2500);
    }
  };

  const handlePharmacyClick = (pharmacy) => {
    if (onSelectPharmacy) {
      onSelectPharmacy(pharmacy, 'pharmacyDetails');
    }
  };

  const handleLogout = async () => {
    try {
      setIsProfileMenuVisible(false);
      await signOut(auth);
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      if (onLogout) {
        onLogout();
      }
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Main Content Scroll View */}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Search</Text>
              <TouchableOpacity
                style={styles.profileMenuButton}
                onPress={() => setIsProfileMenuVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Notification Toast */}
            {infoBanner ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                <Text style={styles.infoText}>{infoBanner}</Text>
              </View>
            ) : null}

            {/* Search Input Bar */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                placeholder={
                  selectedPharmacy
                    ? `Search pharmacy or medicines in ${selectedPharmacyName}...`
                    : 'Search pharmacy name, area, or owner...'
                }
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

            {/* ---------------------------------------------------- */}
            {/* SECTION 1: APPROVED PHARMACIES (Safeguard #8)        */}
            {/* ---------------------------------------------------- */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Approved Pharmacies ({filteredPharmacies.length})</Text>
              <TouchableOpacity onPress={onOpenPharmacyMap}>
                <Text style={styles.seeAllText}>View Map</Text>
              </TouchableOpacity>
            </View>

            {pharmacyError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{pharmacyError}</Text>
              </View>
            ) : null}

            {isLoadingPharmacies ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading registered pharmacies...</Text>
              </View>
            ) : filteredPharmacies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={36} color={colors.outline} />
                <Text style={styles.emptyTitle}>No approved pharmacies are available yet.</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery ? `No pharmacies matching "${searchQuery}"` : 'No registered pharmacies available.'}
                </Text>
              </View>
            ) : (
              <View style={styles.pharmaciesList}>
                {filteredPharmacies.map((pharmacy) => {
                  const pId = pharmacy.pharmacyUid || pharmacy.id;
                  const isSelected = selectedPharmacy?.pharmacyUid === pId || selectedPharmacy?.id === pId;
                  const isClosed = pharmacy.isOpen === false;

                  const distText = formatDistanceText(pharmacy.distance);
                  const deliveryInfo = pharmacy.deliveryInfo;

                  return (
                    <TouchableOpacity
                      key={pId}
                      style={[styles.pharmacyCard, isSelected && styles.pharmacyCardSelected]}
                      onPress={() => handlePharmacyClick(pharmacy)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.pharmacyHeaderRow}>
                        <View style={styles.pharmacyIconBox}>
                          <Ionicons name="medical-outline" size={24} color={colors.primary} />
                        </View>
                        <View style={styles.pharmacyInfoGroup}>
                          <View style={styles.pharmacyTitleRow}>
                            <Text style={styles.pharmacyName}>{pharmacy.pharmacyName}</Text>
                            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                          </View>
                          <Text style={styles.addressText} numberOfLines={1}>
                            {pharmacy.address || pharmacy.locationAddress || 'Dhaka, Bangladesh'}
                          </Text>
                          <View style={styles.pharmacyMetaRow}>
                            <View style={[styles.statusTag, isClosed ? styles.statusClosed : styles.statusOpen]}>
                              <Text style={[styles.statusTagText, isClosed ? styles.statusClosedText : styles.statusOpenText]}>
                                {isClosed ? 'Currently Closed' : 'Open Now'}
                              </Text>
                            </View>
                            {distText ? (
                              <>
                                <Text style={styles.dotSeparator}>•</Text>
                                <Text style={styles.distanceText}>{distText}</Text>
                              </>
                            ) : null}
                          </View>
                        </View>
                      </View>

                      {/* Delivery Status Badge Row */}
                      <View style={styles.pharmacyFooterRow}>
                        <View style={[styles.deliveryBadge, styles[`badge_${deliveryInfo.badgeType}`]]}>
                          <Ionicons
                            name={
                              deliveryInfo.badgeType === 'success'
                                ? 'checkmark-circle-outline'
                                : deliveryInfo.badgeType === 'danger'
                                ? 'warning-outline'
                                : 'information-circle-outline'
                            }
                            size={12}
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

                        <View style={styles.viewPharmacyButton}>
                          <Text style={styles.viewPharmacyText}>
                            {isSelected ? 'Current Store' : 'Browse Medicines'}
                          </Text>
                          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ---------------------------------------------------- */}
            {/* SECTION 2: MEDICINES FROM SELECTED STORE (Safeguard #8)*/}
            {/* ---------------------------------------------------- */}
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>
                {selectedPharmacy
                  ? `Medicines from ${selectedPharmacyName}`
                  : 'Select a Partner Store to View Medicines'}
              </Text>
            </View>

            {!selectedPharmacy ? (
              <View style={styles.promptStoreBox}>
                <Ionicons name="storefront-outline" size={32} color={colors.primary} />
                <Text style={styles.promptStoreTitle}>No Pharmacy Selected</Text>
                <Text style={styles.promptStoreSub}>
                  Select any approved pharmacy from the list above or open map to browse catalog & search items.
                </Text>
                <TouchableOpacity style={styles.promptMapBtn} onPress={onOpenPharmacyMap} activeOpacity={0.85}>
                  <Text style={styles.promptMapBtnText}>Open Pharmacy Map</Text>
                </TouchableOpacity>
              </View>
            ) : isLoadingMedicines ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Loading inventory for {selectedPharmacyName}...</Text>
              </View>
            ) : filteredMedicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="medkit-outline" size={32} color={colors.outline} />
                <Text style={styles.emptyTitle}>No Medicines Listed</Text>
                <Text style={styles.emptySubtext}>
                  {searchQuery
                    ? `No medicines in ${selectedPharmacyName} match "${searchQuery}"`
                    : `${selectedPharmacyName} has not listed active in-stock medicines yet.`}
                </Text>
              </View>
            ) : (
              <View style={styles.medicinesList}>
                {filteredMedicines.map((med) => {
                  const priceVal = Number(med.price ?? med.unitPrice ?? 0);
                  const nameStr = med.medicineName || med.name || 'Medicine';

                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={styles.medicineCard}
                      onPress={() => onOpenMedicineDetails && onOpenMedicineDetails(med)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.medicineIconBox}>
                        <Ionicons name="medkit-outline" size={24} color={colors.primary} />
                      </View>
                      <View style={styles.medicineInfoGroup}>
                        <View style={styles.medicineTitleRow}>
                          <Text style={styles.medicineName}>{nameStr}</Text>
                          <View style={styles.stockBadge}>
                            <Text style={styles.stockBadgeText}>In Stock ({med.stock})</Text>
                          </View>
                        </View>
                        <Text style={styles.medicineGeneric}>Generic: {med.genericName || med.generic || 'N/A'}</Text>
                        <Text style={styles.medicineCompany}>Brand: {med.brand || med.company || 'Generic'}</Text>

                        <View style={styles.medicineFooterRow}>
                          <Text style={styles.medicinePrice}>৳{priceVal.toFixed(2)}</Text>
                          <TouchableOpacity
                            style={styles.addButton}
                            onPress={() => onOpenMedicineDetails && onOpenMedicineDetails(med)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.addButtonText}>View Details</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('home')} activeOpacity={0.8}>
              <Ionicons name="home-outline" size={20} color={activeTab === 'home' ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('search')} activeOpacity={0.8}>
              <Ionicons name="search" size={20} color={activeTab === 'search' ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.navLabel, activeTab === 'search' && styles.navLabelActive]}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('orders')} activeOpacity={0.8}>
              <Ionicons name="receipt-outline" size={20} color={activeTab === 'orders' ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.navLabel, activeTab === 'orders' && styles.navLabelActive]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.navItem} onPress={() => handleTabPress('profile')} activeOpacity={0.8}>
              <Ionicons name="person-outline" size={20} color={activeTab === 'profile' ? colors.primary : colors.onSurfaceVariant} />
              <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile / Logout Menu Modal */}
        <Modal
          visible={isProfileMenuVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setIsProfileMenuVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setIsProfileMenuVisible(false)}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalAvatar}>
                  <Ionicons name="person" size={24} color={colors.primary} />
                </View>
                <View style={styles.modalHeaderInfo}>
                  <Text style={styles.modalUserName}>
                    {userProfile?.fullName || 'Customer User'}
                  </Text>
                  <Text style={styles.modalUserEmail}>
                    {userProfile?.email || auth.currentUser?.email || ''}
                  </Text>
                </View>
              </View>

              <View style={styles.modalDivider} />

              <TouchableOpacity
                style={styles.modalLogoutButton}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out-outline" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
  },
  profileMenuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
    gap: 8,
  },
  infoText: {
    flex: 1,
    color: '#0369A1',
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
    height: 46,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: colors.onSurface,
    paddingVertical: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: '#991B1B',
    flex: 1,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 16,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  pharmaciesList: {
    gap: 10,
  },
  pharmacyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  pharmacyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 106, 94, 0.03)',
  },
  pharmacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  pharmacyIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyInfoGroup: {
    flex: 1,
  },
  pharmacyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pharmacyName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.onSurface,
  },
  addressText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  pharmacyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusOpenText: {
    color: '#065F46',
    fontSize: 10.5,
    fontWeight: '700',
  },
  statusClosed: {
    backgroundColor: '#FEF2F2',
  },
  statusClosedText: {
    color: '#991B1B',
    fontSize: 10.5,
    fontWeight: '700',
  },
  dotSeparator: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  distanceText: {
    fontSize: 11.5,
    color: colors.primary,
    fontWeight: '600',
  },
  pharmacyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginTop: 4,
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  badge_success: {
    backgroundColor: '#D1FAE5',
  },
  badgeText_success: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  badge_danger: {
    backgroundColor: '#FEE2E2',
  },
  badgeText_danger: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '600',
  },
  badge_warning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText_warning: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
  badge_info: {
    backgroundColor: '#E0F2FE',
  },
  badgeText_info: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '600',
  },
  viewPharmacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewPharmacyText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  promptStoreBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 20,
    gap: 8,
  },
  promptStoreTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  promptStoreSub: {
    fontSize: 12.5,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  promptMapBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  promptMapBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
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
  medicineInfoGroup: {
    flex: 1,
  },
  medicineTitleRow: {
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
  medicineGeneric: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  medicineCompany: {
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
  medicinePrice: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
  },
  addButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
  },
  bottomNav: {
    width: '100%',
    maxWidth: 390,
    height: 58,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navLabel: {
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalUserEmail: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 14,
  },
  modalLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
  },
  modalLogoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
