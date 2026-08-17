import React, { useState } from 'react';
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
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function PharmacyLoginScreen({ onNavigateToRegister, onLoginSuccess, initialNotice = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState(initialNotice);

  const validateForm = () => {
    if (!email.trim()) {
      setErrorMessage('Email address is required.');
      return false;
    }
    if (!password) {
      setErrorMessage('Password is required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    console.log('LOGIN_PRESS_CONFIRMED');
    if (isLoading) return;

    setErrorMessage('');
    setNoticeMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Odoo API login
      const result = await odooApi.login(email.trim(), password);
      
      // 2. Fetch Odoo Partner details to verify they are a pharmacy
      const partnerResult = await odooApi.searchRead(
        'res.partner',
        [['id', '=', result.partner_id || result.uid]],
        ['name', 'is_pharmacy', 'pharmacy_license', 'latitude', 'longitude', 'opening_hours']
      );

      if (!partnerResult.records || partnerResult.records.length === 0) {
        await odooApi.logout();
        setErrorMessage('Pharmacy profile not found.');
        return;
      }

      const partner = partnerResult.records[0];

      if (!partner.is_pharmacy) {
        await odooApi.logout();
        setErrorMessage('Access denied. This portal is for pharmacy accounts only.');
        return;
      }

      const fullPharmacy = {
        uid: result.uid,
        pharmacyUid: result.uid,
        id: partner.id,
        name: partner.name,
        pharmacyName: partner.name,
        role: 'pharmacy',
        approvalStatus: 'approved',
        pharmacyLicense: partner.pharmacy_license,
        latitude: partner.latitude,
        longitude: partner.longitude,
        openingHours: partner.opening_hours,
      };

      if (onLoginSuccess) {
        onLoginSuccess(fullPharmacy);
      }
    } catch (error) {
      console.log('Pharmacy Login Error:', error);
      setErrorMessage(error.message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <ScrollView style={{ width: '100%' }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Branding Header */}
            <View style={styles.brandHeader}>
              <View style={styles.logoBadge}>
                <Ionicons name="medical" size={32} color={colors.primary} />
              </View>
              <Text style={styles.brandTitle}>MediLink Pharmacy</Text>
              <Text style={styles.brandSubtitle}>Pharmacy Owner Partner Portal</Text>
            </View>

            {/* Notice Banner */}
            {noticeMessage ? (
              <View style={styles.noticeBanner}>
                <Ionicons name="time-outline" size={18} color="#0369A1" />
                <Text style={styles.noticeText}>{noticeMessage}</Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Login Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Sign In to Your Pharmacy</Text>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Email Address *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="pharmacy@medilink.com"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <Text style={styles.fieldLabel}>Password *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Enter your password"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Login Button */}
              <Pressable
                onPress={handleLogin}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.loginButton,
                  pressed && styles.loginButtonPressed,
                  isLoading && styles.loginButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                    <Text style={styles.loginButtonText}>Signing In...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </Pressable>

              {/* Footer Switch to Register */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Don't have a pharmacy account? </Text>
                <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
                  <Text style={styles.registerLinkText}>Register Pharmacy</Text>
                </TouchableOpacity>
              </View>
            </View>
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
    backgroundColor: colors.background,
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(390),
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: verticalScale(24),
  },
  logoBadge: {
    width: scale(64),
    height: verticalScale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  brandTitle: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  brandSubtitle: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(4),
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  noticeText: {
    flex: 1,
    color: '#0369A1',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
    gap: scale(8),
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: scale(0), height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: moderateScale(17),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(16),
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  formGroup: {
    gap: scale(12),
    marginBottom: verticalScale(20),
  },
  fieldLabel: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(10),
    height: verticalScale(44),
    paddingHorizontal: scale(12),
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  loginButton: {
    height: verticalScale(48),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  loginButtonPressed: {
    opacity: 0.85,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  loginButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(18),
  },
  footerText: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  registerLinkText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.primary,
  },
});
