import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { calculateHaversineDistance } from '../utils/distance';
import BarikoiCustomerMap, { isValidCoord } from '../components/BarikoiCustomerMap';
import {
  isApprovedPharmacy,
  getDeliveryStatus,
  formatDistanceText,
} from '../utils/pharmacyValidation';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function PharmacyMapScreen({
  userProfile,
  selectedPharmacy,
  onPharmacySelected,
  onViewPharmacyDetails,
  onNavigateToPharmacyDetails,
  onBack,
}) {
  const [pharmacies, setPharmacies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerLocation, setCustomerLocation] = useState(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // 1. Fetch approved pharmacies from Odoo API instead of Firestore
  useEffect(() => {
    setIsLoading(true);
    setErrorMsg('');

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
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading pharmacies for map from Odoo:', err);
        setErrorMsg('Failed to load approved pharmacies.');
        setIsLoading(false);
      }
    };

    fetchPharmacies();
  }, []);

  const handleRequestGPS = async () => {
    setIsGettingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Location permission denied. You can still view all approved pharmacies.');
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

  // Allow store selection regardless of distance (Safeguard #6, #9, #11)
  const handleSelectPharmacy = async (pharmacy, dist) => {
    if (!pharmacy) return;

    const payload = {
      pharmacyUid: pharmacy.id || pharmacy.pharmacyUid || pharmacy.uid,
      pharmacyName: pharmacy.pharmacyName || 'Pharmacy',
      address: pharmacy.address || pharmacy.locationAddress || 'Dhaka',
      latitude: isValidCoord(pharmacy.latitude, pharmacy.longitude) ? Number(pharmacy.latitude) : null,
      longitude: isValidCoord(pharmacy.latitude, pharmacy.longitude) ? Number(pharmacy.longitude) : null,
      deliveryRadius: pharmacy.deliveryRadius != null ? Number(pharmacy.deliveryRadius) : null,
      distance: dist != null ? dist : null,
      phone: pharmacy.phone || '',
      isOpen: pharmacy.isOpen !== false,
    };

    try {
      await AsyncStorage.setItem('@selected_pharmacy', JSON.stringify(payload));
    } catch (e) {
      console.log('AsyncStorage save error:', e);
    }

    if (onPharmacySelected) {
      onPharmacySelected(payload);
    }
  };

  const handleViewCatalogPress = (pharmacy) => {
    const handler = onViewPharmacyDetails || onNavigateToPharmacyDetails;
    if (handler) {
      handler(pharmacy);
    }
  };

  // Filter and sort pharmacies using useMemo (Safeguard #13)
  const processedPharmacies = useMemo(() => {
    const hasLocation = customerLocation && isValidCoord(customerLocation.latitude, customerLocation.longitude);
    const q = searchQuery.toLowerCase().trim();

    const list = pharmacies
      .filter((p) => {
        if (!q) return true;
        const nameMatch = (p.pharmacyName || '').toLowerCase().includes(q);
        const addressMatch = (p.address || p.locationAddress || '').toLowerCase().includes(q);
        return nameMatch || addressMatch;
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Partner Pharmacy</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainContainer}>
            {/* Search Bar & GPS Button */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputBox}>
                <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} />
                <TextInput
                  style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Search pharmacy or area..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                />
              </View>

              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={handleRequestGPS}
                disabled={isGettingGps}
                activeOpacity={0.8}
              >
                {isGettingGps ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons name="navigate" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            </View>

            {/* Location Alert Banner */}
            {customerLocation == null ? (
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle-outline" size={18} color="#0369A1" />
                <Text style={styles.infoText}>
                  GPS location disabled. Showing all approved pharmacies sorted alphabetically.
                </Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Barikoi Map Component */}
            <View style={styles.mapBox}>
              <BarikoiCustomerMap
                pharmacies={processedPharmacies}
                customerLocation={customerLocation}
                selectedPharmacyId={selectedPharmacy?.pharmacyUid || selectedPharmacy?.id}
                onSelectPharmacy={(p) => {
                  const dist =
                    customerLocation && isValidCoord(customerLocation.latitude, customerLocation.longitude)
                      ? calculateHaversineDistance(
                          customerLocation.latitude,
                          customerLocation.longitude,
                          p.latitude,
                          p.longitude
                        )
                      : null;
                  handleSelectPharmacy(p, dist);
                }}
              />
            </View>

            {/* Approved Pharmacies Header */}
            <View style={styles.listHeader}>
              <Ionicons name="storefront-outline" size={20} color={colors.primary} />
              <Text style={styles.listTitle}>
                All Approved Pharmacies ({processedPharmacies.length})
              </Text>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching available pharmacies...</Text>
              </View>
            ) : processedPharmacies.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="storefront-outline" size={36} color={colors.outline} />
                <Text style={styles.emptyTitle}>No approved pharmacies are available yet.</Text>
                <Text style={styles.emptySubtext}>
                  No approved pharmacies match your search query.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {processedPharmacies.map((pharmacy) => {
                  const pUid = pharmacy.id || pharmacy.pharmacyUid;
                  const isSelected = (selectedPharmacy?.pharmacyUid || selectedPharmacy?.id) === pUid;
                  const isClosed = pharmacy.isOpen === false;

                  const distText = formatDistanceText(pharmacy.distance);
                  const deliveryInfo = pharmacy.deliveryInfo;

                  return (
                    <View
                      key={pUid}
                      style={[styles.pharmacyCard, isSelected && styles.pharmacyCardSelected]}
                    >
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pharmacyName}>{pharmacy.pharmacyName}</Text>
                          <Text style={styles.pharmacyAddress}>
                            {pharmacy.address || pharmacy.locationAddress || 'Dhaka'}
                          </Text>
                        </View>

                        {isSelected && (
                          <View style={styles.selectedBadge}>
                            <Ionicons name="checkmark-circle" size={14} color="#059669" />
                            <Text style={styles.selectedBadgeText}>Selected</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.metricsRow}>
                        {distText ? (
                          <View style={styles.metricPill}>
                            <Ionicons name="navigate-outline" size={12} color={colors.primary} />
                            <Text style={styles.metricText}>{distText}</Text>
                          </View>
                        ) : null}

                        <View style={[styles.metricPill, isClosed ? styles.bgClosed : styles.bgOpen]}>
                          <Text style={[styles.metricText, isClosed ? styles.textClosed : styles.textOpen]}>
                            {isClosed ? 'Currently Closed' : 'Open Now'}
                          </Text>
                        </View>

                        <View style={[styles.deliveryBadge, styles[`badge_${deliveryInfo.badgeType}`]]}>
                          <Text style={[styles.deliveryBadgeText, styles[`badgeText_${deliveryInfo.badgeType}`]]}>
                            {deliveryInfo.statusText}
                            {deliveryInfo.hasRadius ? ` (${deliveryInfo.radiusNum} km)` : ''}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardActions}>
                        <TouchableOpacity
                          style={styles.viewBtn}
                          onPress={() => handleViewCatalogPress(pharmacy)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.viewBtnText}>View Catalog</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.selectBtn,
                            isSelected && styles.selectBtnActive,
                          ]}
                          onPress={() => handleSelectPharmacy(pharmacy, pharmacy.distance)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.selectBtnText}>
                            {isSelected ? 'Selected Store' : 'Select Store'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
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
  },
  backBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  scrollContent: {
    width: '100%',
    maxWidth: scale(600),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
  },
  mainContainer: {
    gap: scale(12),
  },
  searchRow: {
    flexDirection: 'row',
    gap: scale(10),
    alignItems: 'center',
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(12),
    height: verticalScale(44),
    paddingHorizontal: scale(12),
    gap: scale(8),
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
  },
  gpsBtn: {
    width: scale(44),
    height: verticalScale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: 'rgba(0, 106, 94, 0.2)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(8),
  },
  infoText: {
    fontSize: moderateScale(12.5),
    color: '#0369A1',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(10),
    gap: scale(8),
  },
  errorText: {
    fontSize: moderateScale(12.5),
    color: '#991B1B',
    flex: 1,
  },
  mapBox: {
    height: verticalScale(220),
    borderRadius: scale(14),
    overflow: 'hidden',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(6),
  },
  listTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: colors.onSurface,
  },
  loadingBox: {
    paddingVertical: verticalScale(30),
    alignItems: 'center',
    gap: scale(8),
  },
  loadingText: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: verticalScale(32),
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
  cardsList: {
    gap: scale(12),
  },
  pharmacyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    padding: scale(12),
    gap: scale(10),
  },
  pharmacyCardSelected: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(0, 106, 94, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pharmacyName: {
    fontSize: moderateScale(14.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  pharmacyAddress: {
    fontSize: moderateScale(12),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(12),
    gap: scale(4),
  },
  selectedBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#065F46',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    gap: scale(4),
  },
  metricText: {
    fontSize: moderateScale(11),
    color: colors.onSurfaceVariant,
  },
  bgOpen: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  textOpen: {
    color: '#065F46',
    fontWeight: '700',
  },
  bgClosed: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  textClosed: {
    color: '#991B1B',
    fontWeight: '700',
  },
  deliveryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(6),
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
  cardActions: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(2),
  },
  viewBtn: {
    flex: 1,
    height: verticalScale(36),
    borderRadius: scale(8),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  selectBtn: {
    flex: 1.2,
    height: verticalScale(36),
    borderRadius: scale(8),
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnActive: {
    backgroundColor: '#059669',
  },
  selectBtnText: {
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
