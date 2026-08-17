import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar as RNStatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import PharmacyDetailsScreen from './src/screens/PharmacyDetailsScreen';
import PharmacyMapScreen from './src/screens/PharmacyMapScreen';
import MedicineDetailsScreen from './src/screens/MedicineDetailsScreen';
import CartScreen from './src/screens/CartScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import OrderSuccessScreen from './src/screens/OrderSuccessScreen';
import MyOrdersScreen from './src/screens/MyOrdersScreen';
import OrderDetailsScreen from './src/screens/OrderDetailsScreen';
import { CartProvider, useCart } from './src/context/CartContext';
import { colors } from './src/theme/colors';

function AppContent() {
  const { cartItems, clearCart } = useCart();
  const [currentScreen, setCurrentScreen] = useState('login');
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [selectedPharmacy, setSelectedPharmacy] = useState(null);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [previousTab, setPreviousTab] = useState('home');
  const [createdOrderId, setCreatedOrderId] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // Pharmacy Change Modal State
  const [pendingPharmacyChange, setPendingPharmacyChange] = useState(null);

  useEffect(() => {
    // Load persisted selected pharmacy on mount
    AsyncStorage.getItem('@selected_pharmacy')
      .then((data) => {
        if (data) {
          try {
            setSelectedPharmacy(JSON.parse(data));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  const handleLoginSuccess = (profile) => {
    setUserProfile(profile);
    setActiveTab('home');
    setCurrentScreen('authenticated');
  };

  const handleLogout = () => {
    setUserProfile(null);
    setActiveTab('home');
    setSelectedPharmacy(null);
    setCurrentScreen('login');
  };

  const handleNavigateTab = (tabKey) => {
    if (tabKey === 'home' || tabKey === 'search') {
      setActiveTab(tabKey);
    } else if (tabKey === 'orders' || tabKey === 'myOrders') {
      setPreviousTab(activeTab || 'home');
      setActiveTab('myOrders');
    }
  };

  const handleOpenMyOrders = () => {
    setPreviousTab(activeTab || 'home');
    setActiveTab('myOrders');
  };

  const handleSelectOrder = (order) => {
    const oId = order.id || order.orderId;
    setSelectedOrderId(oId);
    setPreviousTab(activeTab || 'myOrders');
    setActiveTab('orderDetails');
  };

  const handleBackFromOrders = () => {
    setActiveTab(previousTab || 'home');
  };

  const handleBackFromOrderDetails = () => {
    setActiveTab('myOrders');
  };

  const executePharmacyChange = (newPharm) => {
    setSelectedPharmacy(newPharm);
    AsyncStorage.setItem('@selected_pharmacy', JSON.stringify(newPharm)).catch(() => {});
  };

  const handleSelectPharmacy = (pharmacy, targetTab = 'home') => {
    const currentPUid = selectedPharmacy?.pharmacyUid || selectedPharmacy?.id;
    const newPUid = pharmacy?.pharmacyUid || pharmacy?.id;

    if (currentPUid && newPUid && currentPUid !== newPUid && cartItems.length > 0) {
      // Prompt confirmation if cart has items from another pharmacy
      setPendingPharmacyChange({ pharmacy, targetTab });
      return;
    }

    executePharmacyChange(pharmacy);
    if (targetTab === 'pharmacyDetails') {
      setPreviousTab(activeTab || 'home');
      setActiveTab('pharmacyDetails');
    } else {
      setActiveTab(targetTab || 'home');
    }
  };

  const confirmPharmacyChange = () => {
    if (pendingPharmacyChange) {
      clearCart();
      executePharmacyChange(pendingPharmacyChange.pharmacy);
      if (pendingPharmacyChange.targetTab === 'pharmacyDetails') {
        setPreviousTab(activeTab || 'home');
        setActiveTab('pharmacyDetails');
      } else {
        setActiveTab(pendingPharmacyChange.targetTab || 'home');
      }
      setPendingPharmacyChange(null);
    }
  };

  const handleBackFromPharmacyDetails = () => {
    setActiveTab(previousTab || 'home');
  };

  const handleOpenCart = () => {
    setPreviousTab(activeTab || 'pharmacyDetails');
    setActiveTab('cart');
  };

  const handleBackFromCart = () => {
    if (previousTab === 'pharmacyDetails' && selectedPharmacy) {
      setActiveTab('pharmacyDetails');
    } else {
      setActiveTab(previousTab || 'home');
    }
  };

  const handleProceedCheckout = () => {
    setActiveTab('checkout');
  };

  const handleOrderPlacedSuccess = (orderId) => {
    setCreatedOrderId(orderId);
    setActiveTab('orderSuccess');
  };

  const handleContinueShopping = () => {
    setPreviousTab('home');
    setActiveTab('home');
  };

  return (
    <View style={{ flex: 1, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0, paddingBottom: Platform.OS === 'android' ? 20 : 0, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="dark" translucent={true} />
      {currentScreen === 'login' && (
        <LoginScreen
          onNavigateToRegister={() => setCurrentScreen('register')}
          onLoginSuccess={handleLoginSuccess}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
          onNavigateToLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'home' && (
        <HomeScreen
          userProfile={userProfile}
          selectedPharmacy={selectedPharmacy}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
          onLogout={handleLogout}
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          onSelectPharmacy={(p) => handleSelectPharmacy(p, 'pharmacyDetails')}
          onOpenMedicineDetails={(med) => {
            setSelectedMedicine(med);
            setActiveTab('medicineDetails');
          }}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'search' && (
        <SearchScreen
          userProfile={userProfile}
          selectedPharmacy={selectedPharmacy}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
          onLogout={handleLogout}
          activeTab={activeTab}
          onNavigateTab={handleNavigateTab}
          onSelectPharmacy={(p) => handleSelectPharmacy(p, 'pharmacyDetails')}
          onOpenMedicineDetails={(med) => {
            setSelectedMedicine(med);
            setActiveTab('medicineDetails');
          }}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'myOrders' && (
        <MyOrdersScreen
          onBack={handleBackFromOrders}
          onSelectOrder={handleSelectOrder}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'orderDetails' && (
        <OrderDetailsScreen
          orderId={selectedOrderId}
          selectedPharmacy={selectedPharmacy}
          userProfile={userProfile}
          onBack={handleBackFromOrderDetails}
          onOpenCart={handleOpenCart}
          onNavigateToCart={() => setActiveTab('cart')}
          onSelectPharmacy={(p) => handleSelectPharmacy(p, 'home')}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'pharmacyMap' && (
        <PharmacyMapScreen
          userProfile={userProfile}
          selectedPharmacy={selectedPharmacy}
          onPharmacySelected={(pharmData) => handleSelectPharmacy(pharmData, 'home')}
          onNavigateToPharmacyDetails={(pharmData) => handleSelectPharmacy(pharmData, 'pharmacyDetails')}
          onBack={() => setActiveTab('home')}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'pharmacyDetails' && (
        <PharmacyDetailsScreen
          pharmacyData={selectedPharmacy}
          onBack={handleBackFromPharmacyDetails}
          onOpenCart={handleOpenCart}
          onOpenMedicineDetails={(med) => {
            setSelectedMedicine(med);
            setActiveTab('medicineDetails');
          }}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'medicineDetails' && (
        <MedicineDetailsScreen
          medicine={selectedMedicine}
          selectedPharmacy={selectedPharmacy}
          onBack={() => setActiveTab(previousTab || 'pharmacyDetails')}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
          onOpenCart={handleOpenCart}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'cart' && (
        <CartScreen
          selectedPharmacy={selectedPharmacy}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
          onBack={handleBackFromCart}
          onProceedCheckout={handleProceedCheckout}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'checkout' && (
        <CheckoutScreen
          userProfile={userProfile}
          selectedPharmacy={selectedPharmacy}
          onOpenPharmacyMap={() => setActiveTab('pharmacyMap')}
          onBack={() => setActiveTab('cart')}
          onOrderPlaced={handleOrderPlacedSuccess}
        />
      )}

      {currentScreen === 'authenticated' && activeTab === 'orderSuccess' && (
        <OrderSuccessScreen
          orderId={createdOrderId}
          onContinueShopping={handleContinueShopping}
          onViewOrders={handleOpenMyOrders}
        />
      )}

      {/* Confirmation Modal for Clearing Cart on Pharmacy Change */}
      {pendingPharmacyChange ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Clear Current Cart?</Text>
            <Text style={styles.modalSub}>
              Changing pharmacy will clear your current cart items. Do you want to proceed?
            </Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setPendingPharmacyChange(null)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmPharmacyChange}
              >
                <Text style={styles.modalConfirmBtnText}>Clear Cart & Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.onSurface,
  },
  modalSub: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalConfirmBtn: {
    flex: 1.3,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
