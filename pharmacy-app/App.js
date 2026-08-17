import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from './src/theme/colors';
import odooApi from './src/config/odooApi';
import PharmacyLoginScreen from './src/screens/PharmacyLoginScreen';
import PharmacyRegisterScreen from './src/screens/PharmacyRegisterScreen';

import PharmacyDashboardScreen from './src/screens/PharmacyDashboardScreen';
import PharmacyLocationScreen from './src/screens/PharmacyLocationScreen';
import MedicineManagementScreen from './src/screens/MedicineManagementScreen';
import AddEditMedicineScreen from './src/screens/AddEditMedicineScreen';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'register' | 'approved'
  const [initialNotice, setInitialNotice] = useState('');
  const [approvedPharmacy, setApprovedPharmacy] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'location' | 'medicines' | 'addEditMedicine'
  const [medicineToEdit, setMedicineToEdit] = useState(null);

  const handleNavigateToRegister = () => {
    setInitialNotice('');
    setCurrentScreen('register');
  };

  const handleNavigateToLogin = (notice = '') => {
    setInitialNotice(notice);
    setCurrentScreen('login');
  };

  const handleLoginSuccess = (pharmacyData) => {
    setApprovedPharmacy(pharmacyData);
    setActiveTab('dashboard');
    setCurrentScreen('approved');
  };

  const handleLogout = () => {
    try {
      odooApi.logout();
    } catch (e) {
      console.log('Logout error:', e);
    }
    setApprovedPharmacy(null);
    setInitialNotice('');
    setActiveTab('dashboard');
    setCurrentScreen('login');
  };

  let screenContent;
  if (currentScreen === 'register') {
    screenContent = (
      <PharmacyRegisterScreen
        onNavigateToLogin={handleNavigateToLogin}
        onRegisterSuccess={(msg) => handleNavigateToLogin(msg)}
      />
    );
  } else if (currentScreen === 'approved' && approvedPharmacy) {
    if (activeTab === 'location') {
      screenContent = (
        <PharmacyLocationScreen
          pharmacy={approvedPharmacy}
          onBack={() => setActiveTab('dashboard')}
        />
      );
    } else if (activeTab === 'medicines') {
      screenContent = (
        <MedicineManagementScreen
          pharmacy={approvedPharmacy}
          onBack={() => setActiveTab('dashboard')}
          onOpenAdd={() => {
            setMedicineToEdit(null);
            setActiveTab('addEditMedicine');
          }}
          onOpenEdit={(med) => {
            setMedicineToEdit(med);
            setActiveTab('addEditMedicine');
          }}
        />
      );
    } else if (activeTab === 'addEditMedicine') {
      screenContent = (
        <AddEditMedicineScreen
          pharmacy={approvedPharmacy}
          medicineToEdit={medicineToEdit}
          onBack={() => setActiveTab('medicines')}
          onSaveSuccess={() => {
            setMedicineToEdit(null);
            setActiveTab('medicines');
          }}
        />
      );
    } else {
      screenContent = (
        <PharmacyDashboardScreen
          pharmacy={approvedPharmacy}
          onLogout={handleLogout}
          onOpenLocation={() => setActiveTab('location')}
          onOpenMedicines={() => setActiveTab('medicines')}
        />
      );
    }
  } else {
    screenContent = (
      <PharmacyLoginScreen
        onNavigateToRegister={handleNavigateToRegister}
        onLoginSuccess={handleLoginSuccess}
        initialNotice={initialNotice}
      />
    );
  }

  return (
    <>
      <StatusBar style="dark" translucent={false} backgroundColor="#FFFFFF" />
      {screenContent}
    </>
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
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 390,
  },
  successCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'Inter, sans-serif' : undefined,
  },
  infoBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13.5,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: '600',
  },
  logoutButton: {
    width: '100%',
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  logoutButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
