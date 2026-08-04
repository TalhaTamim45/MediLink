import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import PharmacyOrdersScreen from './PharmacyOrdersScreen';

export default function PharmacyDashboardScreen({ pharmacy, onLogout, onOpenLocation, onOpenMedicines }) {
  const [isOpen, setIsOpen] = useState(pharmacy?.isOpen !== false);
  const [isTogglingStore, setIsTogglingStore] = useState(false);
  const [orders, setOrders] = useState([]);

  const handleToggleStoreStatus = async (newValue) => {
    if (isTogglingStore) return;
    setIsOpen(newValue);
    setIsTogglingStore(true);

    try {
      if (pharmacy?.uid) {
        const pharmacyRef = doc(db, 'pharmacies', pharmacy.uid);
        await updateDoc(pharmacyRef, {
          isOpen: newValue,
          updatedAt: new Date(),
        });
      }
    } catch (err) {
      console.log('Error updating store status:', err);
      // Revert if update fails
      setIsOpen(!newValue);
    } finally {
      setIsTogglingStore(false);
    }
  };

  // Compute metrics from live orders
  const newOrdersCount = orders.filter((o) => o.status === 'Pending' || !o.status).length;
  const preparingCount = orders.filter((o) => o.status === 'Accepted' || o.status === 'Preparing').length;
  const readyCount = orders.filter((o) => o.status === 'Ready for Delivery').length;
  const completedCount = orders.filter((o) => o.status === 'Delivered').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Mobile Top Header Bar */}
        <View style={styles.mobileHeaderBar}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBadge}>
                <Ionicons name="medical" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pharmacyTitle} numberOfLines={1}>
                  {pharmacy?.pharmacyName || 'MediLink Pharmacy'}
                </Text>
                <View style={styles.ownerRow}>
                  <Text style={styles.ownerText} numberOfLines={1}>
                    {pharmacy?.ownerName || 'Pharmacy Owner'}
                  </Text>
                  <View style={styles.approvedBadge}>
                    <Text style={styles.approvedBadgeText}>Approved</Text>
                  </View>
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={styles.logoutIconButton}
              onPress={onLogout}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Logout"
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>

          {/* Mobile Quick Action Buttons Bar */}
          <View style={styles.actionPillsRow}>
            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={onOpenMedicines}
              activeOpacity={0.8}
            >
              <Ionicons name="medkit-outline" size={15} color={colors.primary} />
              <Text style={styles.actionPillText}>Medicines</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionPillBtn}
              onPress={onOpenLocation}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={15} color={colors.primary} />
              <Text style={styles.actionPillText}>Location</Text>
            </TouchableOpacity>

            <View style={[styles.statusTogglePill, isOpen ? styles.pillOpen : styles.pillClosed]}>
              <Text style={[styles.statusPillText, isOpen ? styles.textOpen : styles.textClosed]}>
                {isOpen ? 'Open' : 'Closed'}
              </Text>
              {isTogglingStore ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Switch
                  value={isOpen}
                  onValueChange={handleToggleStoreStatus}
                  trackColor={{ false: '#CBD5E1', true: 'rgba(0, 106, 94, 0.3)' }}
                  thumbColor={isOpen ? colors.primary : '#94A3B8'}
                  style={Platform.OS === 'web' ? { transform: [{ scale: 0.8 }] } : {}}
                />
              )}
            </View>
          </View>
        </View>

        {/* Scrollable Mobile Body */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mainContainer}>
            {/* Mobile 2x2 Metric Grid */}
            <View style={styles.metricsGrid}>
              {/* Card 1: New Orders */}
              <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardLabel}>New Orders</Text>
                  <View style={[styles.cardIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="alert-circle-outline" size={18} color="#D97706" />
                  </View>
                </View>
                <Text style={styles.cardValue}>{newOrdersCount}</Text>
                <Text style={styles.cardSubtext}>Awaiting acceptance</Text>
              </View>

              {/* Card 2: Preparing */}
              <View style={[styles.summaryCard, { borderLeftColor: '#0284C7' }]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardLabel}>Preparing</Text>
                  <View style={[styles.cardIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="flame-outline" size={18} color="#0284C7" />
                  </View>
                </View>
                <Text style={styles.cardValue}>{preparingCount}</Text>
                <Text style={styles.cardSubtext}>In progress</Text>
              </View>

              {/* Card 3: Ready */}
              <View style={[styles.summaryCard, { borderLeftColor: '#7C3AED' }]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardLabel}>Ready</Text>
                  <View style={[styles.cardIconCircle, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="cube-outline" size={18} color="#7C3AED" />
                  </View>
                </View>
                <Text style={styles.cardValue}>{readyCount}</Text>
                <Text style={styles.cardSubtext}>Ready for delivery</Text>
              </View>

              {/* Card 4: Completed */}
              <View style={[styles.summaryCard, { borderLeftColor: '#059669' }]}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.cardLabel}>Completed</Text>
                  <View style={[styles.cardIconCircle, { backgroundColor: '#D1FAE5' }]}>
                    <Ionicons name="checkmark-done-outline" size={18} color="#059669" />
                  </View>
                </View>
                <Text style={styles.cardValue}>{completedCount}</Text>
                <Text style={styles.cardSubtext}>Delivered orders</Text>
              </View>
            </View>

            {/* Section Header */}
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="list-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Live Customer Orders</Text>
            </View>

            {/* Real-time Orders Feed */}
            <PharmacyOrdersScreen pharmacy={pharmacy} onOrdersChange={setOrders} />
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
    width: '100%',
  },
  mobileHeaderBar: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    gap: 10,
    zIndex: 10,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pharmacyTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: colors.primary,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 1,
  },
  ownerText: {
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
    maxWidth: 120,
  },
  approvedBadge: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  logoutIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionPillBtn: {
    flex: 1,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderColor: colors.primary,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  statusTogglePill: {
    flex: 1.2,
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillOpen: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  pillClosed: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  textOpen: {
    color: colors.primary,
  },
  textClosed: {
    color: '#64748B',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    width: '100%',
  },
  mainContainer: {
    width: '100%',
    maxWidth: 430,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  cardIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.onSurface,
  },
  cardSubtext: {
    fontSize: 10.5,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onSurface,
  },
});
