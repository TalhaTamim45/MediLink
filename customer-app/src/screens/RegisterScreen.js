import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';



export default function RegisterScreen({ onNavigateToLogin }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [focusedField, setFocusedField] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return false;
    }
    if (!phone.trim()) {
      setErrorMessage('Please enter your phone number.');
      return false;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    if (isLoading) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // Create user account on Odoo
      await odooApi.register(
        email.trim(),
        password,
        fullName.trim(),
        phone.trim(),
        'customer'
      );

      setSuccessMessage('Account created successfully! Redirecting to login...');

      // Return to Login screen after a short delay
      setTimeout(() => {
        if (onNavigateToLogin) {
          onNavigateToLogin();
        }
      }, 1500);
    } catch (error) {
      console.log('Odoo Registration Error:', error.message);
      setErrorMessage(error.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={{ width: '100%' }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.cardContainer}>
            {/* Header Section */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons name="medical" size={36} color={colors.primary} />
              </View>
              <Text style={styles.title}>MediLink</Text>
              <Text style={styles.subtitle}>Create your account to continue</Text>
            </View>

            {/* Notification Messages */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {successMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#065F46" />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {/* Registration Form */}
            <View style={styles.form}>
              {/* Full Name Field */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'fullName' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={focusedField === 'fullName' ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Full Name"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  autoCapitalize="words"
                />
              </View>

              {/* Phone Number Field */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'phone' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={focusedField === 'phone' ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Phone Number (e.g. +8801700000000)"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={phone}
                  onChangeText={setPhone}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Email Address Field */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'email' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={focusedField === 'email' ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Email Address"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Field */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'password' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'password' ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconContainer}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm Password Field */}
              <View
                style={[
                  styles.inputWrapper,
                  focusedField === 'confirmPassword' && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={focusedField === 'confirmPassword' ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Confirm Password"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIconContainer}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>

              {/* Create Account Button */}
              <Pressable
                onPress={() => {
                  console.log("REGISTER_PRESS_CONFIRMED");
                  handleRegister();
                }}
                disabled={isLoading}
                style={({ pressed }) => [
                  styles.createButton,
                  pressed && styles.createButtonPressed,
                  isLoading && styles.createButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                <Text style={styles.createButtonText}>
                  {isLoading ? "Creating Account..." : "Create Account"}
                </Text>
              </Pressable>
            </View>

            {/* Back to Login Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text
                  style={styles.loginLinkText}
                  onPress={() => {
                    console.log('[RegisterScreen] Login clicked -> Navigating to LoginScreen');
                    if (onNavigateToLogin) {
                      onNavigateToLogin();
                    }
                  }}
                  accessibilityRole="link"
                >
                  Login
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = 
StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(24),
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(360),
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    paddingHorizontal: scale(22),
    paddingVertical: verticalScale(26),
    shadowColor: '#0F172A',
    shadowOffset: { width: scale(0), height: verticalScale(4) },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  header: {
    alignItems: 'center',
    marginBottom: verticalScale(20),
  },
  logoCircle: {
    width: scale(68),
    height: verticalScale(68),
    borderRadius: scale(34),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  title: {
    fontSize: moderateScale(24),
    fontWeight: '700',
    color: colors.primary,
    marginBottom: verticalScale(4),
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  subtitle: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    flex: 1,
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#6EE7B7',
    borderWidth: scale(1),
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  successText: {
    flex: 1,
    color: '#065F46',
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(12),
    height: verticalScale(48),
    paddingHorizontal: scale(12),
    marginBottom: verticalScale(14),
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: scale(1.5),
  },
  inputIcon: {
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(14.5),
    color: colors.onSurface,
    paddingVertical: verticalScale(0),
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  passwordInput: {
    paddingRight: scale(36),
  },
  eyeIconContainer: {
    position: 'absolute',
    right: scale(12),
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    height: verticalScale(48),
    width: '100%',
    backgroundColor: colors.primary, // Restored original green primary color
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(6),
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 20,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  createButtonPressed: {
    opacity: 0.85,
    backgroundColor: '#005349',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(18),
    flexWrap: 'wrap',
    zIndex: 10,
  },
  footerText: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  loginLinkPressable: {
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(8),
    borderRadius: scale(6),
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  loginLinkPressed: {
    opacity: 0.6,
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
  },
  loginLinkText: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', textDecorationLine: 'underline' } : {}),
  },
});
