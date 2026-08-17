import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';


export default function MedicineManagementScreen({ pharmacy, onBack, onOpenAdd, onOpenEdit }) {
  const [medicines, setMedicines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('All'); // 'All' | 'Active' | 'Inactive' | 'Out of Stock'

  // Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  const fetchMedicines = async () => {
    if (!pharmacy?.id) return;
    try {
      const result = await odooApi.searchRead(
        'product.template',
        [['pharmacy_id', '=', pharmacy.id], '|', ['active', '=', true], ['active', '=', false]],
        ['name', 'generic_name', 'strength', 'list_price', 'stock', 'prescription_required', 'active']
      );

      if (result.records) {
        const docs = result.records.map((rec) => ({
          id: rec.id,
          medicineName: rec.name,
          genericName: rec.generic_name || '',
          strength: rec.strength || '',
          price: rec.list_price || 0,
          stock: rec.stock || 0,
          prescriptionRequired: rec.prescription_required || false,
          isActive: rec.active,
          brand: 'Generic Brand',
        }));

        docs.sort((a, b) => (a.medicineName || '').localeCompare(b.medicineName || ''));
        setMedicines(docs);
      }
    } catch (err) {
      console.log('Error fetching medicines:', err);
      setErrorMsg('Failed to load medicine catalog from Odoo.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setErrorMsg('');
    fetchMedicines();
  }, [pharmacy?.id]);

  const handleToggleActive = async (medicine) => {
    try {
      await odooApi.write('product.template', medicine.id, {
        active: !medicine.isActive,
      });
      setSuccessToast(`"${medicine.medicineName}" status updated.`);
      setTimeout(() => setSuccessToast(''), 3000);
      fetchMedicines();
    } catch (err) {
      console.log('Error toggling active status:', err);
      alert('Failed to update medicine status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);

    try {
      await odooApi.unlink('product.template', deleteTarget.id);
      setSuccessToast(`Deleted "${deleteTarget.medicineName}" from catalog.`);
      setTimeout(() => setSuccessToast(''), 3000);
      setDeleteTarget(null);
      fetchMedicines();
    } catch (err) {
      console.log('Error deleting medicine:', err);
      alert('Failed to delete medicine document.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter medicines
  const filteredMedicines = medicines.filter((m) => {
    // 1. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = m.medicineName?.toLowerCase().includes(q);
      const genericMatch = m.genericName?.toLowerCase().includes(q);
      const brandMatch = m.brand?.toLowerCase().includes(q);
      if (!nameMatch && !genericMatch && !brandMatch) return false;
    }

    // 2. Tab Filter
    if (activeTab === 'All') return true;
    if (activeTab === 'Active') return m.isActive !== false;
    if (activeTab === 'Inactive') return m.isActive === false;
    if (activeTab === 'Out of Stock') return (m.stock || 0) <= 0;
    return true;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Header Bar */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backBtnText}>Dashboard</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Medicine Catalog</Text>

          <TouchableOpacity style={styles.addBtn} onPress={onOpenAdd} activeOpacity={0.85}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.mainContainer}>
            {/* Success Toast */}
            {successToast ? (
              <View style={styles.toastBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#065F46" />
                <Text style={styles.toastText}>{successToast}</Text>
              </View>
            ) : null}

            {/* Error Banner */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Search Input & Add Action */}
            <View style={styles.searchRow}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} />
                <TextInput
                  style={[styles.searchInput, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Search name, generic, or brand..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="rgba(62, 73, 70, 0.55)"
                />
              </View>
            </View>

            {/* Status Filter Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsRow}>
              {[
                { id: 'All', label: 'All Medicines', count: medicines.length },
                { id: 'Active', label: 'Active', count: medicines.filter(m => m.isActive !== false).length },
                { id: 'Inactive', label: 'Inactive', count: medicines.filter(m => m.isActive === false).length },
                { id: 'Out of Stock', label: 'Out of Stock', count: medicines.filter(m => (m.stock || 0) <= 0).length },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[styles.tabChip, isActive && styles.tabChipActive]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.tabChipText, isActive && styles.tabChipTextActive]}>
                      {tab.label}
                    </Text>
                    {tab.count > 0 ? (
                      <View style={[styles.badgeCircle, isActive && styles.badgeCircleActive]}>
                        <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                          {tab.count}
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Content Body */}
            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching medicine catalog...</Text>
              </View>
            ) : filteredMedicines.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="medkit-outline" size={40} color={colors.outline} />
                <Text style={styles.emptyTitle}>No Medicines Found</Text>
                <Text style={styles.emptySubtext}>
                  No items match your "{activeTab}" filter. Click "Add" above to list new medicines.
                </Text>
              </View>
            ) : (
              <View style={styles.medicinesList}>
                {filteredMedicines.map((item) => {
                  const isOutOfStock = (item.stock || 0) <= 0;
                  const isActive = item.isActive !== false;

                  return (
                    <View key={item.id} style={styles.medicineCard}>
                      <View style={styles.cardHeader}>
                        <View style={{ flex: 1 }}>
                          <View style={styles.titleRow}>
                            <Text style={styles.medNameText}>{item.medicineName}</Text>
                            {item.strength ? (
                              <View style={styles.strengthTag}>
                                <Text style={styles.strengthTagText}>{item.strength}</Text>
                              </View>
                            ) : null}
                          </View>
                          <Text style={styles.genericText}>Generic: {item.genericName}</Text>
                          <Text style={styles.brandText}>Brand: {item.brand || 'Generic'}</Text>
                        </View>

                        <View style={styles.badgeColumn}>
                          <View
                            style={[
                              styles.statusBadge,
                              isActive ? styles.badgeActive : styles.badgeInactive,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusBadgeText,
                                isActive ? styles.badgeActiveText : styles.badgeInactiveText,
                              ]}
                            >
                              {isActive ? 'Active' : 'Inactive'}
                            </Text>
                          </View>

                          {item.prescriptionRequired && (
                            <View style={styles.rxBadge}>
                              <Text style={styles.rxBadgeText}>Rx Required</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      <View style={styles.detailsRow}>
                        <View style={styles.detailPill}>
                          <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                          <Text style={styles.detailPillText}>৳{(item.price || 0).toFixed(2)}</Text>
                        </View>

                        <View
                          style={[
                            styles.detailPill,
                            isOutOfStock ? styles.pillWarning : styles.pillSuccess,
                          ]}
                        >
                          <Ionicons
                            name="cube-outline"
                            size={13}
                            color={isOutOfStock ? '#991B1B' : '#065F46'}
                          />
                          <Text
                            style={[
                              styles.detailPillText,
                              isOutOfStock ? { color: '#991B1B' } : { color: '#065F46' },
                            ]}
                          >
                            Stock: {item.stock || 0}
                          </Text>
                        </View>

                        <View style={styles.detailPill}>
                          <Ionicons name="apps-outline" size={13} color={colors.onSurfaceVariant} />
                          <Text style={styles.detailPillText}>{item.category || 'Tablet'}</Text>
                        </View>
                      </View>

                      {/* Card Action Controls */}
                      <View style={styles.cardFooter}>
                        <View style={styles.activeToggleRow}>
                          <Text style={styles.toggleLabel}>Active</Text>
                          <Switch
                            value={isActive}
                            onValueChange={() => handleToggleActive(item)}
                            trackColor={{ false: '#CBD5E1', true: colors.primaryContainer }}
                            thumbColor={isActive ? colors.primary : '#F1F5F9'}
                          />
                        </View>

                        <View style={styles.actionBtnsGroup}>
                          <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => onOpenEdit && onOpenEdit(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="create-outline" size={15} color={colors.primary} />
                            <Text style={styles.editBtnText}>Edit</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => setDeleteTarget(item)}
                            activeOpacity={0.7}
                          >
                            <Ionicons name="trash-outline" size={15} color="#991B1B" />
                            <Text style={styles.deleteBtnText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Delete Confirmation Dialog */}
        {deleteTarget ? (
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <Ionicons name="warning-outline" size={32} color="#DC2626" />
              <Text style={styles.modalTitle}>Delete Medicine?</Text>
              <Text style={styles.modalSub}>
                Are you sure you want to delete <Text style={{ fontWeight: '700' }}>"{deleteTarget.medicineName}"</Text> from your catalog? This action cannot be undone.
              </Text>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setDeleteTarget(null)}
                  disabled={isDeleting}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={handleDeleteConfirm}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalConfirmBtnText}>Delete Medicine</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
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
  headerBar: {
    width: '100%',
    maxWidth: scale(800),
    height: verticalScale(54),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: scale(1),
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  backBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: colors.primary,
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  mainContainer: {
    width: '100%',
    maxWidth: scale(800),
  },
  toastBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  toastText: {
    color: '#065F46',
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
    padding: scale(10),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '500',
  },
  searchRow: {
    marginBottom: verticalScale(12),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    height: verticalScale(44),
    gap: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: moderateScale(13.5),
    color: colors.onSurface,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingBottom: verticalScale(14),
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(7),
    borderRadius: scale(20),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    gap: scale(6),
  },
  tabChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabChipText: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  badgeCircle: {
    backgroundColor: '#CBD5E1',
    borderRadius: scale(10),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1),
  },
  badgeCircleActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  badgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.onSurface,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  loadingBox: {
    paddingVertical: verticalScale(40),
    alignItems: 'center',
    gap: scale(8),
  },
  loadingText: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(32),
    alignItems: 'center',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
    marginTop: verticalScale(8),
  },
  emptySubtext: {
    fontSize: moderateScale(12.5),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: verticalScale(4),
  },
  medicinesList: {
    gap: scale(12),
  },
  medicineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: scale(0), height: verticalScale(2) },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: scale(10),
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    flexWrap: 'wrap',
  },
  medNameText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.onSurface,
  },
  strengthTag: {
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    borderWidth: scale(1),
    borderColor: colors.primary,
    borderRadius: scale(6),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(1),
  },
  strengthTagText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: colors.primary,
  },
  genericText: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    marginTop: verticalScale(2),
  },
  brandText: {
    fontSize: moderateScale(12),
    color: '#64748B',
    marginTop: verticalScale(1),
  },
  badgeColumn: {
    alignItems: 'flex-end',
    gap: scale(4),
  },
  statusBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: scale(10),
    borderWidth: scale(1),
  },
  badgeActive: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  badgeActiveText: {
    color: '#065F46',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  badgeInactive: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  badgeInactiveText: {
    color: '#64748B',
    fontSize: moderateScale(11),
    fontWeight: '700',
  },
  rxBadge: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
    borderWidth: scale(1),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(6),
  },
  rxBadgeText: {
    fontSize: moderateScale(10.5),
    fontWeight: '700',
    color: '#92400E',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginVertical: verticalScale(12),
    flexWrap: 'wrap',
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#F8FAFC',
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    borderRadius: scale(8),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
  },
  pillSuccess: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  pillWarning: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  detailPillText: {
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: verticalScale(10),
    borderTopWidth: scale(1),
    borderTopColor: '#F1F5F9',
    marginTop: verticalScale(4),
  },
  activeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  toggleLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  actionBtnsGroup: {
    flexDirection: 'row',
    gap: scale(8),
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: 'rgba(0, 106, 94, 0.08)',
    borderWidth: scale(1),
    borderColor: colors.primary,
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
  },
  editBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: colors.primary,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#FEE2E2',
    borderWidth: scale(1),
    borderColor: '#FCA5A5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(8),
  },
  deleteBtnText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#991B1B',
  },
  modalOverlay: {
    position: 'absolute',
    top: verticalScale(0),
    left: scale(0),
    right: scale(0),
    bottom: verticalScale(0),
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(16),
    zIndex: 50,
  },
  modalCard: {
    width: '100%',
    maxWidth: scale(400),
    backgroundColor: '#FFFFFF',
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
    gap: scale(10),
  },
  modalTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: colors.onSurface,
  },
  modalSub: {
    fontSize: moderateScale(13),
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginTop: verticalScale(10),
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: verticalScale(42),
    borderRadius: scale(10),
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  modalConfirmBtn: {
    flex: 1,
    height: verticalScale(42),
    borderRadius: scale(10),
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
