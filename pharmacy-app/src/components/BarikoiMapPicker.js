import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Platform } from 'react-native';

let MapView, Marker, UrlTile;
if (Platform.OS !== 'web') {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
  UrlTile = Maps.UrlTile;
}

const BARIKOI_API_KEY = process.env.EXPO_PUBLIC_BARIKOI_API_KEY || 'bkoi_a95a6dd9c533fe33c278cb55fc8b355e4e1d21046d92c24f1c617018a544cf7a';

export default function BarikoiMapPicker({ latitude, longitude, onLocationSelect }) {
  const containerRef = useRef(null);

  const initialLat = typeof latitude === 'number' && !isNaN(latitude) ? latitude : 23.8103;
  const initialLng = typeof longitude === 'number' && !isNaN(longitude) ? longitude : 90.4125;

  const [markerCoord, setMarkerCoord] = useState({
    latitude: initialLat,
    longitude: initialLng,
  });

  useEffect(() => {
    if (typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude)) {
      setMarkerCoord({ latitude, longitude });
    }
  }, [latitude, longitude]);

  const handleNativeLocationSelect = (lat, lng) => {
    setMarkerCoord({ latitude: lat, longitude: lng });

    fetch(`https://barikoi.com/api/v1/api/search/reverse/geocode/server/${BARIKOI_API_KEY}/geocode?latitude=${lat}&longitude=${lng}`)
      .then((res) => res.json())
      .then((data) => {
        const address =
          (data && data.place && data.place.address) ||
          (data && data.address) ||
          (data && data.place_name) ||
          `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        if (onLocationSelect) {
          onLocationSelect(lat, lng, address);
        }
      })
      .catch(() => {
        if (onLocationSelect) {
          onLocationSelect(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Build HTML content for Leaflet map with Barikoi Tiles & Reverse Geocoding API
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; }
            .leaflet-[#006b32] { filter: hue-rotate(120deg); }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            var apiKey = "${BARIKOI_API_KEY}";
            var lat = ${initialLat};
            var lng = ${initialLng};

            var map = L.map('map').setView([lat, lng], 14);

            // Barikoi / OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 19,
              attribution: '© Barikoi / OpenStreetMap'
            }).addTo(map);

            var marker = L.marker([lat, lng], { draggable: true }).addTo(map);

            function reverseGeocode(l1, l2) {
              fetch('https://barikoi.com/api/v1/api/search/reverse/geocode/server/' + apiKey + '/geocode?latitude=' + l1 + '&longitude=' + l2)
                .then(res => res.json())
                .then(data => {
                  var address = (data && data.place && data.place.address) || (data && data.address) || (data && data.place_name) || (l1.toFixed(5) + ', ' + l2.toFixed(5));
                  window.parent.postMessage(JSON.stringify({
                    type: 'LOCATION_SELECTED',
                    latitude: l1,
                    longitude: l2,
                    address: address
                  }), '*');
                })
                .catch(err => {
                  window.parent.postMessage(JSON.stringify({
                    type: 'LOCATION_SELECTED',
                    latitude: l1,
                    longitude: l2,
                    address: l1.toFixed(5) + ', ' + l2.toFixed(5)
                  }), '*');
                });
            }

            marker.on('dragend', function(e) {
              var coord = e.target.getLatLng();
              reverseGeocode(coord.lat, coord.lng);
            });

            map.on('click', function(e) {
              marker.setLatLng(e.latlng);
              reverseGeocode(e.latlng.lat, e.latlng.lng);
            });
          </script>
        </body>
        </html>
      `;

      const iframe = document.createElement('iframe');
      iframe.srcdoc = htmlContent;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '12px';

      const handleMessage = (event) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          if (data && data.type === 'LOCATION_SELECTED' && onLocationSelect) {
            onLocationSelect(data.latitude, data.longitude, data.address);
          }
        } catch (e) {
          // ignore non-JSON messages
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
    }
  }, [initialLat, initialLng]);

  if (Platform.OS === 'web') {
    return <View ref={containerRef} style={styles.mapContainer} />;
  }

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.nativeMap}
        mapType="none"
        initialRegion={{
          latitude: initialLat,
          longitude: initialLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          handleNativeLocationSelect(lat, lng);
        }}
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        <Marker
          coordinate={markerCoord}
          draggable
          onDragEnd={(e) => {
            const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
            handleNativeLocationSelect(lat, lng);
          }}
          title="Store Location"
          description="Drag or tap map to set store location"
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  nativeMap: {
    width: '100%',
    height: '100%',
  },
});
