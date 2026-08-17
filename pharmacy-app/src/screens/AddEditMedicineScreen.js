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
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import odooApi from '../config/odooApi';
import { scale, verticalScale, moderateScale, wp, hp } from '../utils/responsive';



const CATEGORIES = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Injection',
  'Ointment',
  'Suppository',
  'Eye/Ear Drops',
  'Supplements',
];

export default function AddEditMedicineScreen({ pharmacy, medicineToEdit, onBack, onSaveSuccess }) {
  const isEditing = !!medicineToEdit;

  const [medicineName, setMedicineName] = useState(medicineToEdit?.medicineName || '');
  const [genericName, setGenericName] = useState(medicineToEdit?.genericName || '');
  const [brand, setBrand] = useState(medicineToEdit?.brand || '');
  const [category, setCategory] = useState(medicineToEdit?.category || 'Tablet');
  const [strength, setStrength] = useState(medicineToEdit?.strength || '');
  const [dosageForm, setDosageForm] = useState(medicineToEdit?.dosageForm || 'Tablet');
  const [description, setDescription] = useState(medicineToEdit?.description || '');
  const [price, setPrice] = useState(medicineToEdit?.price != null ? String(medicineToEdit.price) : '');
  const [stock, setStock] = useState(medicineToEdit?.stock != null ? String(medicineToEdit.stock) : '');
  const [prescriptionRequired, setPrescriptionRequired] = useState(!!medicineToEdit?.prescriptionRequired);
  const [isActive, setIsActive] = useState(medicineToEdit?.isActive !== false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const validateForm = () => {
    if (!medicineName.trim()) {
      setErrorMsg('Medicine Name is required.');
      return false;
    }
    if (!genericName.trim()) {
      setErrorMsg('Generic Name is required.');
      return false;
    }
    if (!category.trim()) {
      setErrorMsg('Category is required.');
      return false;
    }
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setErrorMsg('Price must be a valid number greater than 0.');
      return false;
    }
    const numStock = Number(stock);
    if (isNaN(numStock) || numStock < 0) {
      setErrorMsg('Stock Quantity cannot be negative.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (isLoading) return;
    setErrorMsg('');

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const pId = pharmacy?.id;
      if (!pId) {
        throw new Error('Pharmacy partner ID missing.');
      }

      const odooMedicineData = {
        name: medicineName.trim(),
        generic_name: genericName.trim(),
        strength: strength.trim(),
        prescription_required: !!prescriptionRequired,
        pharmacy_id: pId,
        stock: Math.floor(Number(stock)),
        list_price: Number(price),
        active: !!isActive,
        sale_ok: true,
      };

      if (isEditing) {
        await odooApi.write('product.template', medicineToEdit.id, odooMedicineData);
      } else {
        await odooApi.create('product.template', odooMedicineData);
      }

      if (onSaveSuccess) {
        onSaveSuccess(isEditing ? 'Medicine updated successfully!' : 'Medicine added successfully!');
      }
    } catch (err) {
      console.log('Error saving medicine:', err);
      setErrorMsg(err.message || 'Failed to save medicine. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.outerContainer}>
        {/* Top Header */}
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <Text style={styles.backBtnText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Medicine' : 'Add New Medicine'}
          </Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.cardContainer}>
            {/* Error Alert */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#991B1B" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Form Card */}
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Medicine Details</Text>

              <View style={styles.formGroup}>
                <Text style={styles.fieldLabel}>Medicine Name *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="e.g. Napa Extra"
                  value={medicineName}
                  onChangeText={setMedicineName}
                />

                <Text style={styles.fieldLabel}>Generic Name *</Text>
                <TextInput
                  style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="e.g. Paracetamol + Caffeine"
                  value={genericName}
                  onChangeText={setGenericName}
                />

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Brand Name</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      placeholder="e.g. Beximco Pharma"
                      value={brand}
                      onChangeText={setBrand}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Strength</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      placeholder="e.g. 500mg"
                      value={strength}
                      onChangeText={setStrength}
                    />
                  </View>
                </View>

                {/* Category Selection Chips */}
                <Text style={styles.fieldLabel}>Category *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[styles.chip, isSelected && styles.chipActive]}
                        onPress={() => setCategory(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={styles.twoColRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Price (৳) *</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      placeholder="e.g. 35.00"
                      keyboardType="decimal-pad"
                      value={price}
                      onChangeText={setPrice}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>Stock Quantity *</Text>
                    <TextInput
                      style={[styles.input, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                      placeholder="e.g. 100"
                      keyboardType="number-pad"
                      value={stock}
                      onChangeText={setStock}
                    />
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea, Platform.OS === 'web' && { outlineStyle: 'none' }]}
                  placeholder="Usage instructions or indication details..."
                  multiline
                  numberOfLines={3}
                  value={description}
                  onChangeText={setDescription}
                />

                {/* Switches */}
                <View style={styles.switchBox}>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Prescription Required</Text>
                      <Text style={styles.switchSub}>Customer must present prescription at delivery</Text>
                    </View>
                    <Switch
                      value={prescriptionRequired}
                      onValueChange={setPrescriptionRequired}
                      trackColor={{ false: '#CBD5E1', true: colors.primaryContainer }}
                      thumbColor={prescriptionRequired ? colors.primary : '#F1F5F9'}
                    />
                  </View>

                  <View style={[styles.switchRow, { borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 10 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.switchTitle}>Medicine Active</Text>
                      <Text style={styles.switchSub}>Visible to customers for ordering</Text>
                    </View>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: '#CBD5E1', true: colors.primaryContainer }}
                      thumbColor={isActive ? colors.primary : '#F1F5F9'}
                    />
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.saveBtnText}>
                        {isEditing ? 'Update Medicine' : 'Save New Medicine'}
                      </Text>
                    </>
                  )}
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
  headerBar: {
    width: '100%',
    maxWidth: scale(700),
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
  scrollContent: {
    width: '100%',
    flexGrow: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(20),
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: scale(700),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: scale(1),
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: verticalScale(14),
    gap: scale(8),
  },
  errorText: {
    color: '#991B1B',
    fontSize: moderateScale(13),
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: scale(16),
    padding: scale(20),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: verticalScale(14),
  },
  formGroup: {
    gap: scale(12),
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
  },
  textArea: {
    height: verticalScale(72),
    paddingVertical: verticalScale(8),
  },
  twoColRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  chipsRow: {
    flexDirection: 'row',
    gap: scale(8),
    paddingVertical: verticalScale(4),
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderWidth: scale(1),
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  switchBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: scale(1),
    borderColor: '#E2E8F0',
    gap: scale(12),
    marginVertical: verticalScale(4),
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: scale(10),
  },
  switchTitle: {
    fontSize: moderateScale(13.5),
    fontWeight: '700',
    color: colors.onSurface,
  },
  switchSub: {
    fontSize: moderateScale(11.5),
    color: colors.onSurfaceVariant,
  },
  saveBtn: {
    height: verticalScale(48),
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
});
