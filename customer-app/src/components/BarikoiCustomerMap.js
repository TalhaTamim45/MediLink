import React, { useEffect, useRef, useState, Component } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

const DEFAULT_CENTER = {
  latitude: 23.8103,
  longitude: 90.4125,
};

export function isValidCoord(lat, lng) {
  const nLat = Number(lat);
  const nLng = Number(lng);
  return (
    typeof nLat === 'number' &&
    typeof nLng === 'number' &&
    Number.isFinite(nLat) &&
    Number.isFinite(nLng) &&
    nLat >= -90 &&
    nLat <= 90 &&
    nLng >= -180 &&
    nLng <= 180
  );
}

// Error Boundary Component to catch any rendering errors
export class MapErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MapErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.fallbackBox}>
          <Ionicons name="map-outline" size={32} color={colors.outline} />
          <Text style={styles.fallbackText}>
            Map could not be loaded. You can still select a pharmacy from the list below.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.retryBtnText}>Retry Map</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

function BarikoiCustomerMapInner({
  pharmacies = [],
  customerLocation,
  selectedPharmacyId,
  onSelectPharmacy,
}) {
  const containerRef = useRef(null);
  const [mapError, setMapError] = useState(false);

  // Validate customer location
  const hasCustLoc =
    customerLocation != null &&
    isValidCoord(customerLocation.latitude, customerLocation.longitude);

  const centerLat = hasCustLoc ? Number(customerLocation.latitude) : DEFAULT_CENTER.latitude;
  const centerLng = hasCustLoc ? Number(customerLocation.longitude) : DEFAULT_CENTER.longitude;

  // Filter and sanitize valid pharmacy coordinates
  const validPharmacies = (Array.isArray(pharmacies) ? pharmacies : [])
    .map((p) => {
      const lat = Number(p?.latitude);
      const lng = Number(p?.longitude);
      return {
        id: String(p?.id || p?.pharmacyUid || ''),
        pharmacyName: String(p?.pharmacyName || 'Pharmacy'),
        address: String(p?.address || p?.locationAddress || 'Dhaka'),
        latitude: lat,
        longitude: lng,
        rawPharmacy: p,
      };
    })
    .filter((p) => isValidCoord(p.latitude, p.longitude));

  // Serialize map data into string to prevent iframe re-renders when object references change
  const mapDataKey = JSON.stringify({
    centerLat,
    centerLng,
    hasCustLoc,
    selectedPharmacyId: selectedPharmacyId || '',
    markers: validPharmacies.map((vp) => ({
      id: vp.id,
      pharmacyName: vp.pharmacyName,
      address: vp.address,
      latitude: vp.latitude,
      longitude: vp.longitude,
    })),
  });

  useEffect(() => {
    if (__DEV__) {
      console.log('Valid map pharmacies count:', validPharmacies.length);
    }

    if (Platform.OS === 'web') {
      try {
        const sanitizedData = JSON.stringify(
          validPharmacies.map((vp) => ({
            id: vp.id,
            pharmacyName: vp.pharmacyName,
            address: vp.address,
            latitude: vp.latitude,
            longitude: vp.longitude,
          }))
        );

        const custMarkerJs = hasCustLoc
          ? `
            var custIcon = L.divIcon({
              className: 'cust-pin',
              html: '<div style="background-color:#0284c7; width:18px; height:18px; border-radius:9px; border:3px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>'
            });
            L.marker([${centerLat}, ${centerLng}], { icon: custIcon }).addTo(map).bindPopup('<b>Your Location</b>');
          `
          : '';

        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
            <style>
              html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #e2e8f0; }
              .pharmacy-popup { font-family: sans-serif; padding: 4px; }
              .pharmacy-title { font-weight: bold; color: #006b32; font-size: 14px; margin-bottom: 2px; }
              .pharmacy-sub { font-size: 11.5px; color: #475569; margin-bottom: 6px; }
              .select-btn { background: #006b32; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 11px; width: 100%; }
              .select-btn:hover { background: #005225; }
            </style>
          </head>
          <body>
            <div id="map"></div>
            <script>
              try {
                var centerLat = ${centerLat};
                var centerLng = ${centerLng};
                var map = L.map('map').setView([centerLat, centerLng], 12);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                  maxZoom: 19,
                  attribution: '© Barikoi / OpenStreetMap'
                }).addTo(map);

                ${custMarkerJs}

                var pharmaciesData = ${sanitizedData};
                var selectedId = "${selectedPharmacyId || ''}";

                pharmaciesData.forEach(function(p) {
                  if (typeof p.latitude === 'number' && typeof p.longitude === 'number' && !isNaN(p.latitude) && !isNaN(p.longitude)) {
                    var isSel = (p.id === selectedId);
                    var marker = L.marker([p.latitude, p.longitude]).addTo(map);
                    
                    var popupContent = '<div class="pharmacy-popup">' +
                      '<div class="pharmacy-title">' + (p.pharmacyName || 'Pharmacy') + '</div>' +
                      '<div class="pharmacy-sub">' + (p.address || 'Dhaka') + '</div>' +
                      '<button class="select-btn" onclick="selectPharm(\\'' + p.id + '\\')">' + (isSel ? 'Selected Store' : 'Select This Pharmacy') + '</button>' +
                      '</div>';

                    marker.bindPopup(popupContent);
                  }
                });

                function selectPharm(id) {
                  window.parent.postMessage(JSON.stringify({
                    type: 'PHARMACY_CLICKED',
                    pharmacyId: id
                  }), '*');
                }
              } catch(e) {
                console.error("Leaflet map internal script error:", e);
              }
            </script>
          </body>
          </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.srcdoc = htmlContent;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '14px';

        const handleMessage = (event) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            if (data && data.type === 'PHARMACY_CLICKED' && data.pharmacyId) {
              const found = validPharmacies.find((vp) => vp.id === data.pharmacyId);
              if (found && onSelectPharmacy) {
                onSelectPharmacy(found.rawPharmacy);
              }
            }
          } catch (error) {
            console.error('Invalid map message:', error);
          }
        };

        window.addEventListener('message', handleMessage);

        if (containerRef.current) {
          containerRef.current.innerHTML = '';
          containerRef.current.appendChild(iframe);
        }

        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (err) {
        console.error('Error initializing web iframe map:', err);
        setMapError(true);
      }
    }
  }, [mapDataKey]);

  if (mapError) {
    return (
      <View style={styles.fallbackBox}>
        <Ionicons name="map-outline" size={32} color={colors.outline} />
        <Text style={styles.fallbackText}>
          Map could not be loaded. You can still select a pharmacy from the list below.
        </Text>
      </View>
    );
  }

  return <View ref={containerRef} style={styles.mapContainer} />;
}

export default function BarikoiCustomerMap(props) {
  return (
    <MapErrorBoundary>
      <BarikoiCustomerMapInner {...props} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  fallbackBox: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  fallbackText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
