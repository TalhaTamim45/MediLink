import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';

export default function LoginScreen({ onNavigateToRegister, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = () => {
    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (isLoading) return;

    setErrorMessage('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 1. Call Odoo API Login
      const result = await odooApi.login(email.trim(), password);
      
      const fullProfile = {
        uid: result.uid,
        fullName: result.name,
        name: result.name,
        email: result.login,
        role: 'customer',
        latitude: null,
        longitude: null,
      };

      // 2. Login successful -> Notify parent component
      if (onLoginSuccess) {
        onLoginSuccess(fullProfile);
      }
    } catch (error) {
      console.log('Odoo Login Error:', error.message);
      setErrorMessage(error.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToRegister = () => {
    console.log('[LoginScreen] Create Account pressed -> Navigating to RegisterScreen');
    if (onNavigateToRegister) {
      onNavigateToRegister();
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
          {/* Main Card Container */}
          <View style={styles.cardContainer}>
            {/* Header & Logo Section */}
            <View style={styles.header}>
              <View style={styles.logoCircle}>
                <Ionicons name="medical" size={36} color={colors.primary} />
              </View>
              <Text style={styles.title}>MediLink</Text>
              <Text style={styles.subtitle}>
                Sign in to your healthcare account
              </Text>
            </View>

            {/* Error Message Banner */}
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Login Form */}
            <View style={styles.form}>
              {/* Email / Phone Input */}
              <View
                style={[
                  styles.inputWrapper,
                  isEmailFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={isEmailFocused ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Email or Phone Number"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setIsEmailFocused(true)}
                  onBlur={() => setIsEmailFocused(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password Input */}
              <View
                style={[
                  styles.inputWrapper,
                  isPasswordFocused && styles.inputWrapperFocused,
                ]}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={isPasswordFocused ? colors.primary : colors.onSurfaceVariant}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    Platform.OS === 'web' && { outlineStyle: 'none' },
                  ]}
                  placeholder="Password"
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
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

              {/* Forgot Password Link */}
              <View style={styles.forgotPasswordContainer}>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  isLoading && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={colors.onPrimary} />
                    <Text style={styles.loginButtonText}>Logging in...</Text>
                  </View>
                ) : (
                  <Text style={styles.loginButtonText}>Login</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login Button */}
            <TouchableOpacity style={styles.googleButton} activeOpacity={0.8}>
              <MaterialCommunityIcons
                name="google"
                size={18}
                color="#4285F4"
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Register Link Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Don't have an account?{' '}
                <Text
                  style={styles.createAccountText}
                  onPress={handleGoToRegister}
                  accessibilityRole="link"
                >
                  Create Account
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
    height: scale(68),
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
    marginBottom: 4,
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
  form: {
    width: '100%',
    gap: verticalScale(14),
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
  },
  inputWrapperFocused: {
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: moderateScale(14.5),
    color: colors.onSurface,
    paddingVertical: 0,
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
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: verticalScale(2),
    marginBottom: verticalScale(2),
  },
  forgotPasswordText: {
    fontSize: moderateScale(13),
    fontWeight: '500',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  loginButton: {
    height: verticalScale(48),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(4),
    shadowColor: colors.primary,
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  loginButtonText: {
    color: colors.onPrimary,
    fontSize: moderateScale(15),
    fontWeight: '600',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: verticalScale(16),
  },
  dividerLine: {
    flex: 1,
    height: verticalScale(1),
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    marginHorizontal: scale(10),
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: '#94A3B8',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  googleButton: {
    height: verticalScale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(12),
  },
  googleIcon: {
    marginRight: scale(8),
  },
  googleButtonText: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: colors.onSurface,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  footer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(18),
  },
  footerText: {
    fontSize: moderateScale(13.5),
    color: colors.onSurfaceVariant,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    textAlign: 'center',
  },
  createAccountText: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.primary,
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', textDecorationLine: 'underline' } : {}),
  },
});
