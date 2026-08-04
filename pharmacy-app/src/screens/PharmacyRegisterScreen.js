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
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function PharmacyRegisterScreen({ onNavigateToLogin, onRegisterSuccess }) {
  const [pharmacyName, setPharmacyName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [address, setAddress] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    if (
      !pharmacyName.trim() ||
      !ownerName.trim() ||
      !email.trim() ||
      !phone.trim() ||
      !tradeLicense.trim() ||
      !address.trim() ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage('All fields are required.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return false;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    console.log('REGISTER_PRESS_CONFIRMED');
    if (isLoading) return;

    setErrorMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Create Firebase Auth User
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );
      const uid = userCredential.user.uid;

      // 2. Save Pharmacy Profile in Firestore pharmacies/{uid}
      const pharmacyData = {
        uid,
        pharmacyName: pharmacyName.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        tradeLicense: tradeLicense.trim(),
        address: address.trim(),
        role: 'pharmacy',
        approvalStatus: 'pending',
        isOpen: true,
        latitude: null,
        longitude: null,
        deliveryRadius: 5,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'pharmacies', uid), pharmacyData);

      console.log('Pharmacy profile created successfully in Firestore:', uid);

      // Sign out so pending user stays signed out until approval
      await signOut(auth);

      const successMsg = 'Registration successful. Your pharmacy is awaiting admin approval.';
      if (onRegisterSuccess) {
        onRegisterSuccess(successMsg);
      } else if (onNavigateToLogin) {
        onNavigateToLogin(successMsg);
      }
    } catch (error) {
      console.log('Pharmacy Registration Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('This email is already registered. Please login.');
      } else if (error.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email format.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('Password should be at least 6 characters.');
      } else {
        setErrorMessage(error.message || 'Registration failed. Please try again.');
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
                <Ionicons name="medical" size={28} color={colors.primary} />
              </View>
              <Text style={styles.brandTitle}>MediLink Pharmacy</Text>
              <Text style={styles.brandSubtitle}>Register Your Partner Pharmacy</Text>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Registration Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Pharmacy Partner Account</Text>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Pharmacy Name *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="e.g. Lazz Pharma - Dhanmondi"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={pharmacyName}
                  onChangeText={setPharmacyName}
                />

                <Text style={styles.fieldLabel}>Owner Full Name *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="e.g. Rafiqul Islam"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={ownerName}
                  onChangeText={setOwnerName}
                />

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

                <Text style={styles.fieldLabel}>Phone Number *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="+880 1700-000000"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <Text style={styles.fieldLabel}>Trade License Number *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="e.g. TR-8492015-DHK"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={tradeLicense}
                  onChangeText={setTradeLicense}
                />

                <Text style={styles.fieldLabel}>Full Address *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="House 45, Road 12, Dhanmondi, Dhaka"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={address}
                  onChangeText={setAddress}
                />

                <Text style={styles.fieldLabel}>Password *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                <Text style={styles.fieldLabel}>Confirm Password *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Re-enter password"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              {/* Submit Button */}
              <Pressable
                onPress={handleRegister}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                  isLoading && styles.createButtonDisabled,
                ]}
              >
                {isLoading ? (
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                    <Text style={styles.createButtonText}>Registering Pharmacy...</Text>
                  </View>
                ) : (
                  <Text style={styles.createButtonText}>Register Pharmacy</Text>
                )}
              </Pressable>

              {/* Footer Switch to Login */}
              <View style={styles.footerRow}>
                <Text style={styles.footerText}>Already registered your pharmacy? </Text>
                <TouchableOpacity onPress={() => onNavigateToLogin('')} activeOpacity={0.7}>
                  <Text style={styles.loginLinkText}>Sign In</Text>
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
    paddingVertical: 24,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  brandSubtitle: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
  createButton: {
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
  createButtonPressed: {
    opacity: 0.85,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  createButtonText: {
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
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
