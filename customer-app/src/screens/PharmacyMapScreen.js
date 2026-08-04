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
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { calculateHaversineDistance } from '../utils/distance';
import BarikoiCustomerMap, { isValidCoord } from '../components/BarikoiCustomerMap';
import {
  isApprovedPharmacy,
  getDeliveryStatus,
  formatDistanceText,
} from '../utils/pharmacyValidation';

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

  // 1. Subscribe to Firestore approved pharmacies collection with cleanup (Safeguard #1)
  useEffect(() => {
    setIsLoading(true);
    setErrorMsg('');

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
            `[PharmacyMapScreen Dev Log] Total pharmacy docs: ${totalDocs}, Approved: ${approvedCount}, Valid coords: ${validCoordCount}, Visible: ${docs.length}`
          );
        }

        setPharmacies(docs);
        setIsLoading(false);
      },
      (err) => {
        console.error('Error fetching pharmacies for map:', err);
        setErrorMsg('Failed to load approved pharmacies from Firestore.');
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  scrollContent: {
    width: '100%',
    maxWidth: 600,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mainContainer: {
    gap: 12,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchInputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    height: 44,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 13.5,
    color: colors.onSurface,
  },
  gpsBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 106, 94, 0.2)',
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  infoText: {
    fontSize: 12.5,
    color: '#0369A1',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  errorText: {
    fontSize: 12.5,
    color: '#991B1B',
    flex: 1,
  },
  mapBox: {
    height: 220,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
  loadingBox: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  cardsList: {
    gap: 12,
  },
  pharmacyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
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
    fontSize: 14.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  pharmacyAddress: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  selectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  metricText: {
    fontSize: 11,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
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
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  viewBtn: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  selectBtn: {
    flex: 1.2,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectBtnActive: {
    backgroundColor: '#059669',
  },
  selectBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
