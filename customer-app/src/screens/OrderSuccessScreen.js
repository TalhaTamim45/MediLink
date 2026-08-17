import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function OrderSuccessScreen({ orderId, onContinueShopping, onViewOrders }) {
  const [infoToast, setInfoToast] = useState('');

  const handleViewOrders = () => {
    if (onViewOrders) {
      onViewOrders();
    } else {
      setInfoToast('Orders page coming soon.');
      setTimeout(() => setInfoToast(''), 2500);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Order Confirmation</Text>
        </View>

        {/* Info Toast */}
        {infoToast ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
            <Text style={styles.infoText}>{infoToast}</Text>
          </View>
        ) : null}

        {/* Success Card */}
        <View style={styles.contentContainer}>
          <View style={styles.cardContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name="checkmark-circle" size={72} color="#10B981" />
            </View>

            <Text style={styles.successTitle}>Order Placed Successfully</Text>
            <Text style={styles.successSubtitle}>
              Thank you for ordering with MediLink! Your fulfilling pharmacy has received your order.
            </Text>

            {/* Order Details Badge */}
            <View style={styles.orderCard}>
              <View style={styles.orderRow}>
                <Ionicons name="receipt-outline" size={18} color={colors.primary} />
                <Text style={styles.orderLabel}>Order ID:</Text>
                <Text style={styles.orderValue}>#{orderId || 'ML-849201'}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.orderRow}>
                <Ionicons name="time-outline" size={18} color={colors.primary} />
                <Text style={styles.orderLabel}>Estimated Delivery:</Text>
                <Text style={styles.deliveryValue}>30–45 minutes</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={onContinueShopping}
                activeOpacity={0.85}
              >
                <Ionicons name="home-outline" size={18} color={colors.onPrimary} style={{ marginRight: 6 }} />
                <Text style={styles.primaryButtonText}>Continue Shopping</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleViewOrders}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={18} color={colors.primary} style={{ marginRight: 6 }} />
                <Text style={styles.secondaryButtonText}>View Orders</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    maxWidth: scale(390),
    height: verticalScale(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(14),
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: scale(1),
    borderBottomColor: '#E2E8F0',
    zIndex: 10,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  infoBanner: {
    width: '100%',
    maxWidth: scale(390),
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginTop: verticalScale(10),
    gap: scale(8),
  },
  infoText: {
    flex: 1,
    color: '#0369A1',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    width: '100%',
    maxWidth: scale(390),
  },
  cardContainer: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(20),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(32),
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: scale(0), height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  iconCircle: {
    width: scale(90),
    height: verticalScale(90),
    borderRadius: scale(45),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(18),
  },
  successTitle: {
    fontSize: moderateScale(21),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(8),
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: verticalScale(20),
    lineHeight: moderateScale(20),
  },
  orderCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    marginBottom: verticalScale(24),
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  orderLabel: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  orderValue: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 'auto',
  },
  deliveryValue: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: '#059669',
    marginLeft: 'auto',
  },
  divider: {
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
    marginVertical: verticalScale(12),
  },
  buttonGroup: {
    width: '100%',
    gap: scale(10),
  },
  primaryButton: {
    height: verticalScale(48),
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  secondaryButton: {
    height: verticalScale(48),
    width: '100%',
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderRadius: scale(12),
    borderWidth: scale(1),
    borderColor: 'rgba(0, 106, 94, 0.2)',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: moderateScale(14.5),
    fontWeight: '600',
  },
});
