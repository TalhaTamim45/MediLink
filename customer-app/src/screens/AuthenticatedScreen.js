import React from 'react';
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

export default function AuthenticatedScreen({ userProfile, onLogout }) {
  const handleLogout = async () => {
    try {
      // Direct call to trigger local session clear
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.cardContainer}>
          {/* Header Icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark-circle" size={48} color="#10B981" />
          </View>

          {/* Success Title */}
          <Text style={styles.title}>Login Successful</Text>

          <View style={styles.badge}>
            <Text style={styles.badgeText}>CUSTOMER ACCOUNT</Text>
          </View>

          <View style={styles.divider} />

          {/* Customer Details */}
          <View style={styles.detailsContainer}>
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={20} color={colors.primary} />
              <View style={styles.detailTextGroup}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>
                  {userProfile?.fullName || 'Customer User'}
                </Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <View style={styles.detailTextGroup}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>
                  {userProfile?.email || 'N/A'}
                </Text>
              </View>
            </View>
          </View>

          {/* Logout Button */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.onPrimary} style={styles.logoutIcon} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
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
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(28),
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: scale(0), height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: scale(72),
    height: verticalScale(72),
    borderRadius: scale(36),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(16),
  },
  title: {
    fontSize: moderateScale(22),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(6),
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  badge: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
  },
  badgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.8,
  },
  divider: {
    width: '100%',
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
    marginBottom: verticalScale(20),
  },
  detailsContainer: {
    width: '100%',
    gap: scale(16),
    marginBottom: verticalScale(24),
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: scale(12),
    borderRadius: scale(12),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  detailTextGroup: {
    marginLeft: scale(12),
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(11),
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    marginBottom: verticalScale(2),
  },
  detailValue: {
    fontSize: moderateScale(14.5),
    fontWeight: '600',
    color: colors.onSurface,
  },
  logoutButton: {
    width: '100%',
    height: verticalScale(48),
    backgroundColor: '#DC2626',
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  logoutIcon: {
    marginRight: scale(8),
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
});
