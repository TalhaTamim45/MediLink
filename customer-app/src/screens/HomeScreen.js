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
  Image,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { calculateHaversineDistance } from '../utils/distance';
import { isValidCoord } from '../components/BarikoiCustomerMap';
import {
  isApprovedPharmacy,
  getDeliveryStatus,
  formatDistanceText,
} from '../utils/pharmacyValidation';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function HomeScreen({
  userProfile,
  selectedPharmacy,
  onOpenPharmacyMap,
  onLogout,
  activeTab = 'home',
  onNavigateTab,
  onSelectPharmacy,
  onOpenMedicineDetails,
}) {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoadingPharmacies, setIsLoadingPharmacies] = useState(true);
  const [pharmacyError, setPharmacyError] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isProfileMenuVisible, setIsProfileMenuVisible] = useState(false);
  const [infoBanner, setInfoBanner] = useState('');
  const [liveMedicines, setLiveMedicines] = useState([]);
  const [isLoadingMedicines, setIsLoadingMedicines] = useState(false);
  const [medicineError, setMedicineError] = useState('');

  // 1. Subscribe/Fetch approved pharmacies from Odoo API
  useEffect(() => {
    setIsLoadingPharmacies(true);
    setPharmacyError('');

    const fetchPharmacies = async () => {
      try {
        const result = await odooApi.searchRead(
          'res.partner',
          [['is_pharmacy', '=', true]],
          ['name', 'pharmacy_license', 'latitude', 'longitude', 'opening_hours']
        );
        
        const docs = result.records.map((p) => {
          const numLat = p.latitude != null ? Number(p.latitude) : NaN;
          const numLng = p.longitude != null ? Number(p.longitude) : NaN;
          
          return {
            id: p.id,
            pharmacyUid: p.id,
            pharmacyName: p.name,
            name: p.name,
            approvalStatus: 'approved',
            latitude: numLat,
            longitude: numLng,
            pharmacyLicense: p.pharmacy_license,
            openingHours: p.opening_hours,
            deliveryRadius: 10.0, // Default 10km
            isOpen: true
          };
        });

        setPharmacies(docs);
        setIsLoadingPharmacies(false);
      } catch (err) {
        console.error('Error loading pharmacies from Odoo:', err);
        setPharmacyError('Failed to load approved pharmacies.');
        setIsLoadingPharmacies(false);
      }
    };

    fetchPharmacies();
  }, []);

  // 1b. Fetch all medicines stocked by any pharmacy
  useEffect(() => {
    setIsLoadingMedicines(true);
    setMedicineError('');

    const fetchMedicines = async () => {
      try {
        const result = await odooApi.searchRead(
          'product.product',
          [['sale_ok', '=', true], ['pharmacy_id', '!=', false]],
          ['name', 'list_price', 'generic_name', 'strength', 'prescription_required', 'pharmacy_id']
        );
        
        const docs = result.records.map((m) => {
          const price = Number(m.list_price ?? 0);
          return {
            id: m.id,
            medicineId: m.id,
            medicineName: m.name,
            name: m.name,
            price: price,
            unitPrice: price,
            genericName: m.generic_name || '',
            generic: m.generic_name || '',
            strength: m.strength || '',
            prescriptionRequired: !!m.prescription_required,
            stock: 100, // Default display stock
            pharmacyId: m.pharmacy_id ? m.pharmacy_id[0] : null,
            pharmacyName: m.pharmacy_id ? m.pharmacy_id[1] : ''
          };
        });

        setLiveMedicines(docs);
        setIsLoadingMedicines(false);
      } catch (err) {
        console.error('Error fetching home medicines from Odoo:', err);
        setMedicineError('Failed to load medicines.');
        setIsLoadingMedicines(false);
      }
    };

    fetchMedicines();
  }, []);

  const handleMedicineClick = (med) => {
    const matchedPharmacy = pharmacies.find(p => p.id === med.pharmacyId);
    if (matchedPharmacy) {
      onSelectPharmacy(matchedPharmacy);
      setTimeout(() => {
        onOpenMedicineDetails(med);
      }, 100);
    } else {
      // Fallback: if pharmacy not fully fetched yet in local state
      const mockPharmacy = {
        id: med.pharmacyId,
        pharmacyUid: med.pharmacyId,
        pharmacyName: med.pharmacyName,
        name: med.pharmacyName,
        approvalStatus: 'approved',
        isOpen: true,
        deliveryRadius: 10.0
      };
      onSelectPharmacy(mockPharmacy);
      setTimeout(() => {
        onOpenMedicineDetails(med);
      }, 100);
    }
  };

  // 2. Request GPS location safely
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
      } catch (err) {
        console.log('GPS init check error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRequestGPS = async () => {
    setIsGettingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setInfoBanner('Location permission denied. Showing all approved pharmacies alphabetically.');
        setTimeout(() => setInfoBanner(''), 4000);
        setCustomerLocation(null);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc?.coords && isValidCoord(loc.coords.latitude, loc.coords.longitude)) {
        setCustomerLocation({
          latitude: Number(loc.coords.latitude),
          longitude: Number(loc.coords.longitude),
        });
      } else {
        setCustomerLocation(null);
      }
    } catch (err) {
      console.log('GPS Error:', err);
      setCustomerLocation(null);
    } finally {
      setIsGettingGps(false);
    }
  };

  // 3. Process, calculate distances, and sort pharmacies using useMemo
  const processedPharmacies = useMemo(() => {
    const hasLocation = customerLocation && isValidCoord(customerLocation.latitude, customerLocation.longitude);

    let list = pharmacies.map((p) => {
      const dist = hasLocation
        ? calculateHaversineDistance(customerLocation.latitude, customerLocation.longitude, p.latitude, p.longitude)
        : null;
      const deliveryInfo = getDeliveryStatus(dist, p.deliveryRadius);

      return {
        ...p,
        distance: dist,
        deliveryInfo,
      };
    });

    // Local Search Filter for Pharmacies
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => 
        (p.pharmacyName || p.name || '').toLowerCase().includes(q) ||
        (p.address || '').toLowerCase().includes(q)
      );
    }

    if (hasLocation) {
      // Sort nearest first, farthest last
      list.sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    } else {
      // Sort alphabetically by pharmacyName
      list.sort((a, b) => (a.pharmacyName || '').localeCompare(b.pharmacyName || ''));
    }

    return list;
  }, [pharmacies, customerLocation, searchQuery]);

  // 3b. Local Search Filter for Medicines
  const filteredMedicines = useMemo(() => {
    if (!searchQuery.trim()) return liveMedicines;
    const q = searchQuery.toLowerCase().trim();
    return liveMedicines.filter((m) =>
      (m.name || '').toLowerCase().includes(q) ||
      (m.genericName || '').toLowerCase().includes(q) ||
      (m.pharmacyName || '').toLowerCase().includes(q)
    );
  }, [liveMedicines, searchQuery]);

  // Extract first name for greeting
  const getFirstName = () => {
    if (userProfile?.fullName) {
      return userProfile.fullName.trim().split(' ')[0];
    }
    return 'Customer';
  };

  const handleTabPress = (tabKey) => {
    if (tabKey === 'home' || tabKey === 'search' || tabKey === 'orders' || tabKey === 'myOrders') {
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
      await odooApi.logout();
    } catch (error) {
      console.log('Logout error:', error);
    } finally {
      if (onLogout) {
        onLogout();
      }
    }
  };

  // Handle HomeScreen search input
  const handleHomeSearchSubmit = () => {
    if (!selectedPharmacy) {
      setInfoBanner('Please select a partner pharmacy first to search its medicines.');
      setTimeout(() => setInfoBanner(''), 3500);
      onOpenPharmacyMap();
    } else {
      onSelectPharmacy(selectedPharmacy, 'pharmacyDetails');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Main Content Scroll View */}
        <ScrollView style={{ width: '100%' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={20} color={colors.primary} />
                </View>
                <View style={styles.headerTextGroup}>
                  <Text style={styles.greetingText}>Hello, {getFirstName()}!</Text>
                  <TouchableOpacity style={styles.locationRow} onPress={handleRequestGPS} activeOpacity={0.7}>
                    <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                    <Text style={styles.locationText}>
                      {customerLocation ? 'GPS Location Set' : 'Tap to enable GPS distance'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Profile Avatar / Menu Button */}
              <TouchableOpacity
                style={styles.profileMenuButton}
                onPress={() => setIsProfileMenuVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="ellipsis-vertical" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Selected Pharmacy Banner Card (Actionable with two distinct buttons) */}
            <View style={styles.pharmacyBannerCard}>
              <View style={styles.pharmacyBannerLeft}>
                <Ionicons name="storefront" size={26} color={colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pharmacyBannerTitle}>
                    {selectedPharmacy ? selectedPharmacy.pharmacyName : 'No Pharmacy Selected'}
                  </Text>
                  <Text style={styles.pharmacyBannerSub} numberOfLines={1}>
                    {selectedPharmacy
                      ? (selectedPharmacy.address || selectedPharmacy.locationAddress || 'Dhaka, Bangladesh')
                      : 'Choose a partner pharmacy to order medicines'}
                  </Text>
                </View>
              </View>

              {/* Action Buttons: View Medicines & Change Pharmacy */}
              <View style={styles.bannerActionsCol}>
                {selectedPharmacy ? (
                  <>
                    <TouchableOpacity
                      style={styles.bannerViewBtn}
                      onPress={() => onSelectPharmacy && onSelectPharmacy(selectedPharmacy, 'pharmacyDetails')}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="medkit-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.bannerBtnText}>View Medicines</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.bannerChangeBtn}
                      onPress={onOpenPharmacyMap}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="map-outline" size={13} color={colors.primary} />
                      <Text style={styles.bannerChangeBtnText}>Change Store</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.bannerViewBtn}
                    onPress={onOpenPharmacyMap}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="map-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.bannerBtnText}>Select Store</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Information Toast Banner */}
            {infoBanner ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                <Text style={styles.infoText}>{infoBanner}</Text>
              </View>
            ) : null}

            {/* Search Section (Local filter search) */}
            <View style={styles.searchContainer}>
              <Ionicons
                name="search-outline"
                size={18}
                color={colors.onSurfaceVariant}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  Platform.OS === 'web' && { outlineStyle: 'none' },
                ]}
                placeholder="Search medicines or pharmacy name..."
                placeholderTextColor="rgba(62, 73, 70, 0.55)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: scale(6) }} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity activeOpacity={0.7} onPress={() => Keyboard.dismiss()}>
                <Ionicons name="arrow-forward-circle" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions Grid */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity
                style={styles.actionCardPrimary}
                onPress={() => handleTabPress('action')}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text" size={26} color={colors.primary} />
                <Text style={styles.actionCardTitlePrimary}>Upload{'\n'}Prescription</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  if (selectedPharmacy) {
                    onSelectPharmacy(selectedPharmacy, 'pharmacyDetails');
                  } else {
                    onOpenPharmacyMap();
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="medkit-outline" size={26} color="#0284C7" />
                <Text style={styles.actionCardTitle}>Browse{'\n'}Medicines</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={onOpenPharmacyMap}
                activeOpacity={0.8}
              >
                <Ionicons name="location-outline" size={26} color="#7C3AED" />
                <Text style={styles.actionCardTitle}>Find Nearby{'\n'}Pharmacy</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => handleTabPress('orders')}
                activeOpacity={0.8}
              >
                <Ionicons name="receipt-outline" size={26} color="#EA580C" />
                <Text style={styles.actionCardTitle}>My{'\n'}Orders</Text>
              </TouchableOpacity>
            </View>

            {/* MEDICINES AVAILABLE SECTION */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>Medicines Available Nearby</Text>
            </View>

            {isLoadingMedicines ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching available medicines...</Text>
              </View>
            ) : medicineError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{medicineError}</Text>
              </View>
            ) : filteredMedicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="medkit-outline" size={32} color={colors.outline} />
                <Text style={styles.emptyTitle}>No medicines listed yet.</Text>
              </View>
            ) : (
              <View style={styles.medicinesGrid}>
                {filteredMedicines.map((med) => {
                  return (
                    <TouchableOpacity
                      key={med.id}
                      style={styles.medicineGridCard}
                      onPress={() => handleMedicineClick(med)}
                      activeOpacity={0.85}
                    >
                      <Image
                        source={{ uri: `http://localhost:8069/web/image/product.product/${med.id}/image_256` }}
                        style={styles.medicineGridImage}
                        defaultSource={require('../../assets/favicon.png')}
                      />
                      <View style={styles.medicineGridInfo}>
                        <Text style={styles.medicineGridName} numberOfLines={1}>
                          {med.name}
                        </Text>
                        <Text style={styles.medicineGridGeneric} numberOfLines={1}>
                          {med.genericName} {med.strength}
                        </Text>
                        <Text style={styles.medicineGridStore} numberOfLines={1}>
                          🏪 {med.pharmacyName}
                        </Text>
                        <View style={styles.medicineGridFooter}>
                          <Text style={styles.medicineGridPrice}>৳{med.price.toFixed(2)}</Text>
                          <View style={styles.detailsIconCircle}>
                            <Ionicons name="add" size={16} color="#FFFFFF" />
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* ALL APPROVED PHARMACIES SECTION */}
            <View style={[styles.sectionHeader, { marginTop: 22 }]}>
              <Text style={styles.sectionTitle}>All Approved Pharmacies</Text>
              <TouchableOpacity onPress={onOpenPharmacyMap} activeOpacity={0.7}>
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
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching real approved pharmacies...</Text>
              </View>
            ) : processedPharmacies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={36} color={colors.outline} />
                <Text style={styles.emptyTitle}>No approved pharmacies are available yet.</Text>
                <Text style={styles.emptySubtext}>
                  Registered partner pharmacies will appear here once approved by administrator.
                </Text>
              </View>
            ) : (
              <View style={styles.pharmaciesList}>
                {processedPharmacies.map((pharmacy) => {
                  const pUid = pharmacy.pharmacyUid || pharmacy.id;
                  const isSelected = selectedPharmacy?.pharmacyUid === pUid || selectedPharmacy?.id === pUid;
                  const isClosed = pharmacy.isOpen === false;

                  const distText = formatDistanceText(pharmacy.distance);
                  const deliveryInfo = pharmacy.deliveryInfo;

                  return (
                    <TouchableOpacity
                      key={pUid}
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

                          {/* Status & Distance Meta Row */}
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

                      {/* Delivery Radius Badge Row */}
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
          </View>
        </ScrollView>

        {/* Bottom Navigation Bar */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress('home')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="home"
                size={20}
                color={activeTab === 'home' ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress('search')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={activeTab === 'search' ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.navLabel, activeTab === 'search' && styles.navLabelActive]}>Search</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress('orders')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="receipt-outline"
                size={20}
                color={activeTab === 'orders' ? colors.primary : colors.onSurfaceVariant}
              />
              <Text style={[styles.navLabel, activeTab === 'orders' && styles.navLabelActive]}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navItem}
              onPress={() => handleTabPress('profile')}
              activeOpacity={0.8}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color={activeTab === 'profile' ? colors.primary : colors.onSurfaceVariant}
              />
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
                    {userProfile?.email || ''}
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
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(80),
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(390),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: verticalScale(16),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  avatarCircle: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextGroup: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    marginTop: verticalScale(1),
  },
  locationText: {
    fontSize: moderateScale(11.5),
    color: colors.primary,
    fontWeight: '500',
  },
  profileMenuButton: {
    width: scale(36),
    height: verticalScale(36),
    borderRadius: scale(18),
    backgroundColor: colors.surfaceContainerLowest,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  pharmacyBannerCard: {
    backgroundColor: 'rgba(0, 106, 94, 0.05)',
    borderWidth: scale(1),
    borderColor: colors.primary,
    borderRadius: scale(14),
    padding: scale(12),
    marginBottom: verticalScale(14),
    gap: scale(10),
  },
  pharmacyBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  pharmacyBannerTitle: {
    fontSize: moderateScale(14.5),
    fontWeight: '700',
    color: colors.primary,
  },
  pharmacyBannerSub: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  bannerActionsCol: {
    flexDirection: 'row',
    gap: scale(8),
    width: '100%',
  },
  bannerViewBtn: {
    flex: 1.2,
    height: verticalScale(34),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: scale(8),
    gap: scale(4),
  },
  bannerBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bannerChangeBtn: {
    flex: 1,
    height: verticalScale(34),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: scale(1),
    borderColor: colors.primary,
    borderRadius: scale(8),
    gap: scale(4),
  },
  bannerChangeBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  infoText: {
    flex: 1,
    color: '#0369A1',
    fontSize: moderateScale(12.5),
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(12),
    height: verticalScale(46),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(18),
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
    paddingVertical: verticalScale(0),
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  seeAllText: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: colors.primary,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: verticalScale(10),
  },
  actionCardPrimary: {
    flex: 1,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderRadius: scale(12),
    padding: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scale(1),
    borderColor: 'rgba(0, 106, 94, 0.2)',
  },
  actionCardTitlePrimary: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(12),
    padding: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  actionCardTitle: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(10),
    marginBottom: verticalScale(12),
    gap: scale(8),
  },
  errorText: {
    fontSize: moderateScale(12.5),
    color: '#991B1B',
    flex: 1,
  },
  loadingBox: {
    paddingVertical: verticalScale(32),
    alignItems: 'center',
    gap: scale(8),
  },
  loadingText: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: verticalScale(36),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    paddingHorizontal: scale(20),
    gap: scale(8),
  },
  emptyTitle: {
    fontSize: moderateScale(14.5),
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  pharmaciesList: {
    gap: scale(12),
  },
  pharmacyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    padding: scale(12),
    gap: scale(8),
  },
  pharmacyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 106, 94, 0.03)',
  },
  pharmacyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  pharmacyIconBox: {
    width: scale(40),
    height: verticalScale(40),
    borderRadius: scale(10),
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
    gap: scale(4),
  },
  pharmacyName: {
    fontSize: moderateScale(14.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  addressText: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  pharmacyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: verticalScale(4),
  },
  statusTag: {
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(4),
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusOpenText: {
    color: '#065F46',
    fontSize: moderateScale(10.5),
    fontWeight: '700',
  },
  statusClosed: {
    backgroundColor: '#FEF2F2',
  },
  statusClosedText: {
    color: '#991B1B',
    fontSize: moderateScale(10.5),
    fontWeight: '700',
  },
  dotSeparator: {
    fontSize: moderateScale(10),
    color: colors.onSurfaceVariant,
  },
  distanceText: {
    fontSize: moderateScale(11.5),
    color: colors.primary,
    fontWeight: '600',
  },
  pharmacyFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(8),
    borderTopWidth: scale(1),
    borderTopColor: '#F1F5F9',
    marginTop: verticalScale(4),
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
    gap: scale(4),
  },
  badge_success: {
    backgroundColor: '#D1FAE5',
  },
  badgeText_success: {
    fontSize: moderateScale(11),
    color: '#065F46',
    fontWeight: '600',
  },
  badge_danger: {
    backgroundColor: '#FEE2E2',
  },
  badgeText_danger: {
    fontSize: moderateScale(11),
    color: '#991B1B',
    fontWeight: '600',
  },
  badge_warning: {
    backgroundColor: '#FEF3C7',
  },
  badgeText_warning: {
    fontSize: moderateScale(11),
    color: '#92400E',
    fontWeight: '600',
  },
  badge_info: {
    backgroundColor: '#E0F2FE',
  },
  badgeText_info: {
    fontSize: moderateScale(11),
    color: '#0369A1',
    fontWeight: '600',
  },
  viewPharmacyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
  },
  viewPharmacyText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.primary,
  },
  medicinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: scale(2),
    width: '100%',
  },
  medicineGridCard: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: scale(10),
    marginBottom: verticalScale(12),
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  medicineGridImage: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#F8FAFC',
    marginBottom: verticalScale(6),
  },
  medicineGridInfo: {
    width: '100%',
  },
  medicineGridName: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.onSurface,
  },
  medicineGridGeneric: {
    fontSize: moderateScale(10),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(1),
  },
  medicineGridStore: {
    fontSize: moderateScale(9),
    color: colors.primary,
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  medicineGridFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: verticalScale(6),
    width: '100%',
  },
  medicineGridPrice: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.onSurface,
  },
  detailsIconCircle: {
    width: scale(22),
    height: verticalScale(22),
    borderRadius: scale(11),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavContainer: {
    position: 'absolute',
    bottom: verticalScale(0),
    left: scale(0),
    right: scale(0),
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: scale(1),
    borderTopColor: '#E2E8F0',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'android' ? verticalScale(20) : 0,
  },
  bottomNav: {
    width: '100%',
    maxWidth: scale(390),
    height: verticalScale(58),
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(4),
  },
  navLabel: {
    fontSize: moderateScale(11),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
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
    padding: scale(16),
  },
  modalContent: {
    width: '100%',
    maxWidth: scale(320),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(18),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  modalAvatar: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(22),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeaderInfo: {
    flex: 1,
  },
  modalUserName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalUserEmail: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(1),
  },
  modalDivider: {
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(14),
  },
  modalLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: verticalScale(10),
    backgroundColor: '#FEF2F2',
    borderRadius: scale(10),
  },
  modalLogoutText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#DC2626',
  },
});
