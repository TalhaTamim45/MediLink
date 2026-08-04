import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors } from '../theme/colors';
import { db } from '../config/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import BarikoiMapPicker from '../components/BarikoiMapPicker';

export default function PharmacyLocationScreen({ pharmacy, onBack }) {
  const [selectedLat, setSelectedLat] = useState(
    typeof pharmacy?.latitude === 'number' ? pharmacy.latitude : null
  );
  const [selectedLng, setSelectedLng] = useState(
    typeof pharmacy?.longitude === 'number' ? pharmacy.longitude : null
  );
  const [selectedAddress, setSelectedAddress] = useState(
    pharmacy?.locationAddress || pharmacy?.address || ''
  );

  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLocationSelect = (lat, lng, address) => {
    setSelectedLat(Number(lat));
    setSelectedLng(Number(lng));
    if (address) {
      setSelectedAddress(address);
    }
    setErrorMsg('');
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    setErrorMsg('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Location permission denied. Please select your store location manually on the map.');
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;

      setSelectedLat(Number(lat));
      setSelectedLng(Number(lng));

      // Attempt Barikoi Reverse Geocode API
      const apiKey = process.env.EXPO_PUBLIC_BARIKOI_API_KEY || 'bkoi_a95a6dd9c533fe33c278cb55fc8b355e4e1d21046d92c24f1c617018a544cf7a';
      fetch(`https://barikoi.com/api/v1/api/search/reverse/geocode/server/${apiKey}/geocode?latitude=${lat}&longitude=${lng}`)
        .then(res => res.json())
        .then(data => {
          const addr = (data && data.place && data.place.address) || (data && data.address) || (data && data.place_name);
          if (addr) setSelectedAddress(addr);
        })
        .catch(() => {});

    } catch (err) {
      console.log('Error getting GPS location:', err);
      setErrorMsg('Failed to detect device location. You can tap the map to pick your location.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleSaveLocation = async () => {
    if (selectedLat == null || selectedLng == null) {
      setErrorMsg('Please tap or select a store location on the map before saving.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (!pharmacy?.uid) {
        throw new Error('Pharmacy UID missing');
      }

      const pharmacyRef = doc(db, 'pharmacies', pharmacy.uid);
      await updateDoc(pharmacyRef, {
        latitude: Number(selectedLat),
        longitude: Number(selectedLng),
        locationAddress: selectedAddress.trim() || pharmacy.address || 'Dhaka, Bangladesh',
        locationUpdatedAt: serverTimestamp(),
      });

      setSuccessMsg('Store location saved successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.log('Error saving store location:', err);
      setErrorMsg('Failed to save store location. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={colors.primary} />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Store Location</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            {/* Banner Notifications */}
            {successMsg ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#065F46" />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            ) : null}

            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {selectedLat == null || selectedLng == null ? (
              <View style={styles.warningBanner}>
                <Ionicons name="warning-outline" size={18} color="#92400E" />
                <Text style={styles.warningText}>
                  Location not set. Tap the Barikoi Map below or use GPS to select your store location.
                </Text>
              </View>
            ) : null}

            {/* Store Info Card */}
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Pharmacy Location Details</Text>
              <Text style={styles.pharmacyNameText}>{pharmacy?.pharmacyName}</Text>

              {/* Map Component */}
              <View style={styles.mapBox}>
                <BarikoiMapPicker
                  latitude={selectedLat}
                  longitude={selectedLng}
                  onLocationSelect={handleLocationSelect}
                />
              </View>

              {/* GPS Button */}
              <TouchableOpacity
                style={styles.gpsBtn}
                onPress={handleUseCurrentLocation}
                disabled={isGettingLocation}
                activeOpacity={0.8}
              >
                {isGettingLocation ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <Ionicons name="navigate-outline" size={18} color={colors.primary} />
                    <Text style={styles.gpsBtnText}>Use My Current GPS Location</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Location Coordinates & Address Output */}
              <View style={styles.detailsBox}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Latitude:</Text>
                  <Text style={styles.detailVal}>
                    {selectedLat != null ? selectedLat.toFixed(6) : 'Not selected'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Longitude:</Text>
                  <Text style={styles.detailVal}>
                    {selectedLng != null ? selectedLng.toFixed(6) : 'Not selected'}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location Address:</Text>
                  <Text style={styles.detailVal} numberOfLines={2}>
                    {selectedAddress || 'Tap map to detect address'}
                  </Text>
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (selectedLat == null || isSaving) && styles.saveBtnDisabled,
                ]}
                onPress={handleSaveLocation}
                disabled={selectedLat == null || isSaving}
                activeOpacity={0.85}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.saveBtnText}>Save Store Location</Text>
                  </>
                )}
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
    backgroundColor: colors.background,
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerBar: {
    width: '100%',
    maxWidth: 800,
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 800,
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
    fontWeight: '500',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  warningText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  infoCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  pharmacyNameText: {
    fontSize: 13.5,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 14,
  },
  mapBox: {
    marginBottom: 14,
  },
  gpsBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 10,
    height: 44,
    marginBottom: 14,
  },
  gpsBtnText: {
    color: colors.primary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  detailVal: {
    fontSize: 13.5,
    color: colors.onSurface,
    fontWeight: '700',
    flex: 1,
    textAlign: 'right',
  },
  saveBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
