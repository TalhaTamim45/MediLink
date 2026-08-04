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
import { auth, db } from '../config/firebase';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

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
      // 1. Firebase Authentication login
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = userCredential.user.uid;

      // 2. Read pharmacy document from Firestore pharmacies/{uid}
      const pharmacyDocRef = doc(db, 'pharmacies', uid);
      const pharmacyDocSnap = await getDoc(pharmacyDocRef);

      if (!pharmacyDocSnap.exists()) {
        await signOut(auth);
        setErrorMessage('Pharmacy profile not found. Please register your pharmacy.');
        return;
      }

      const pharmacyData = pharmacyDocSnap.data() || {};

      // Confirm role is 'pharmacy'
      if (pharmacyData.role !== 'pharmacy') {
        await signOut(auth);
        setErrorMessage('Access denied. This portal is for pharmacy accounts only.');
        return;
      }

      // Check approval status
      const status = pharmacyData.approvalStatus;

      if (status === 'pending') {
        await signOut(auth);
        setNoticeMessage('Your pharmacy is awaiting admin approval.');
        return;
      }

      if (status === 'rejected') {
        await signOut(auth);
        setErrorMessage('Your pharmacy registration was rejected. Please contact support.');
        return;
      }

      if (status === 'approved') {
        const fullPharmacy = { uid, ...pharmacyData };
        if (onLoginSuccess) {
          onLoginSuccess(fullPharmacy);
        }
      } else {
        await signOut(auth);
        setErrorMessage('Unknown account approval status.');
      }
    } catch (error) {
      console.log('Pharmacy Login Error:', error);
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setErrorMessage('Invalid email or password.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email format.');
      } else {
        setErrorMessage(error.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        <ScrollView
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  outerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  brandSubtitle: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  noticeText: {
    flex: 1,
    color: '#0369A1',
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
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  formGroup: {
    gap: 12,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginBottom: -4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 13.5,
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  loginButton: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
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
    gap: 8,
  },
  loginButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  footerText: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  registerLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
