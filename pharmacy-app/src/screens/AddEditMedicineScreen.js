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
import { db } from '../config/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

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
      const pUid = pharmacy?.uid;
      const pName = pharmacy?.pharmacyName || 'MediLink Pharmacy';

      if (!pUid) {
        throw new Error('Pharmacy UID missing.');
      }

      const medicineData = {
        pharmacyUid: pUid,
        pharmacyName: pName,
        medicineName: medicineName.trim(),
        genericName: genericName.trim(),
        brand: brand.trim() || 'Generic Brand',
        category: category.trim(),
        strength: strength.trim(),
        dosageForm: dosageForm.trim(),
        description: description.trim(),
        price: Number(price),
        stock: Math.floor(Number(stock)),
        prescriptionRequired: !!prescriptionRequired,
        isActive: !!isActive,
        updatedAt: serverTimestamp(),
      };

      if (isEditing) {
        const medRef = doc(db, 'medicines', medicineToEdit.id);
        await updateDoc(medRef, medicineData);
      } else {
        medicineData.createdAt = serverTimestamp();
        await addDoc(collection(db, 'medicines'), medicineData);
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

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

const styles = StyleSheet.create({
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
    maxWidth: 700,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 106, 94, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: 'center',
  },
  cardContainer: {
    width: '100%',
    maxWidth: 700,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  formCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onSurface,
    marginBottom: 14,
  },
  formGroup: {
    gap: 12,
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
  },
  textArea: {
    height: 72,
    paddingVertical: 8,
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  switchBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 12,
    marginVertical: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  switchTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.onSurface,
  },
  switchSub: {
    fontSize: 11.5,
    color: colors.onSurfaceVariant,
  },
  saveBtn: {
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
