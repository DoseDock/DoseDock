import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWindowDimensions } from 'react-native';
import { usePillStore } from '@store/pillStore';
import { useHardwareStore } from '@store/hardwareStore';
import { hardwareDispatcher } from '@device/hardwareDispatcher';
import { colors, shadows } from '@theme/colors';
import { fetchDimensionsByNdc, DailyMedDimensions } from '@services/dailymed';
import { seed } from '@data/seed';
import { isGraphQLAvailable } from '@/config/env';

const DEFAULT_NEW_MEDICATION = {
  name: '',
  color: '#6b7280',
  shape: 'round',
  cartridgeIndex: '0',
  stockCount: '30',
  lowStockThreshold: '5',
  maxDailyDose: '1',
};

export const HardwareMappingScreen: React.FC = () => {
  const { pills, loadPills, addPill } = usePillStore();
  const { profiles, loadProfiles, saveProfile } = useHardwareStore();
  const [selectedPillId, setSelectedPillId] = useState<string | null>(null);
  const [form, setForm] = useState({
    serialNumber: '',
    manufacturer: '',
    formFactor: 'tablet',
    siloSlot: '',
    trapdoorOpenMs: '1200',
    trapdoorHoldMs: '800',
    diameterMm: '',
    lengthMm: '',
    widthMm: '',
    heightMm: '',
    weightMg: '',
  });
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [autoFillData, setAutoFillData] = useState<DailyMedDimensions | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isCompact = screenWidth < 900;
  const selectedPill = selectedPillId ? pills.get(selectedPillId) : null;
  const selectedProfile = selectedPillId ? profiles[selectedPillId] : null;
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isSavingMedication, setIsSavingMedication] = useState(false);
  const [newMedicationForm, setNewMedicationForm] = useState({ ...DEFAULT_NEW_MEDICATION });
  const isGraphQLEnabled = isGraphQLAvailable;

  useEffect(() => {
    const bootstrap = async () => {
      await Promise.all([loadPills(), loadProfiles()]);
    };
    bootstrap();
  }, [loadPills, loadProfiles]);

  useEffect(() => {
    if (!selectedPillId && pills.size > 0) {
      const first = pills.values().next().value;
      if (first?.id) {
        setSelectedPillId(first.id);
      }
    }
  }, [pills, selectedPillId]);

  useEffect(() => {
    if (!selectedPillId) return;
    const profile = profiles[selectedPillId];
    if (profile) {
      setForm({
        serialNumber: profile.serialNumber,
        manufacturer: profile.manufacturer || '',
        formFactor: profile.formFactor || 'tablet',
        siloSlot: profile.siloSlot?.toString() || '',
        trapdoorOpenMs: (profile.trapdoorOpenMs ?? 1200).toString(),
        trapdoorHoldMs: (profile.trapdoorHoldMs ?? 800).toString(),
        diameterMm: profile.diameterMm?.toString() || '',
        lengthMm: profile.lengthMm?.toString() || '',
        widthMm: profile.widthMm?.toString() || '',
        heightMm: profile.heightMm?.toString() || '',
        weightMg: profile.weightMg?.toString() || '',
      });
      setAutoFillData(null);
    } else {
      setForm({
        serialNumber: '',
        manufacturer: '',
        formFactor: 'tablet',
        siloSlot: '',
        trapdoorOpenMs: '1200',
        trapdoorHoldMs: '800',
        diameterMm: '',
        lengthMm: '',
        widthMm: '',
        heightMm: '',
        weightMg: '',
      });
      setAutoFillData(null);
    }
  }, [selectedPillId, profiles]);

  const handleSelectPill = (pillId: string) => {
    setSelectedPillId(pillId);
  };

  const handleInputChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSeed = async () => {
    if (isGraphQLEnabled) {
      Alert.alert('Seed unavailable', 'Seeding sample data is only available in local/offline mode.');
      return;
    }
    try {
      setIsSeeding(true);
      await seed();
      await Promise.all([loadPills(), loadProfiles()]);
      Alert.alert('Seeded', 'Sample medications and mappings have been installed.');
    } catch (error: any) {
      Alert.alert('Seed failed', error?.message || 'Unable to seed database');
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSave = async () => {
    if (!selectedPillId) return;
    if (!form.serialNumber || !form.siloSlot) {
      Alert.alert('Missing fields', 'Serial number and silo slot are required');
      return;
    }

    await saveProfile({
      pillId: selectedPillId,
      serialNumber: form.serialNumber,
      manufacturer: form.manufacturer,
      formFactor: form.formFactor,
      siloSlot: Number(form.siloSlot),
      trapdoorOpenMs: Number(form.trapdoorOpenMs),
      trapdoorHoldMs: Number(form.trapdoorHoldMs),
      diameterMm: form.diameterMm ? Number(form.diameterMm) : null,
      lengthMm: form.lengthMm ? Number(form.lengthMm) : null,
      widthMm: form.widthMm ? Number(form.widthMm) : null,
      heightMm: form.heightMm ? Number(form.heightMm) : null,
      weightMg: form.weightMg ? Number(form.weightMg) : null,
    });

    Alert.alert('Saved', 'Hardware profile saved successfully');
  };

  const handleSimulate = async () => {
    if (!selectedPillId) return;
    const profile = profiles[selectedPillId];
    if (!profile) {
      Alert.alert('Save first', 'Please save the hardware profile before simulating');
      return;
    }
    const result = await hardwareDispatcher.previewCommand(profile);
    Alert.alert(result.ok ? 'Simulation ok' : 'Simulation failed', result.message);
  };

  const handleAutoFill = async () => {
    if (!form.serialNumber) {
      Alert.alert('Enter Serial', 'Provide an NDC or serial number first');
      return;
    }
    try {
      setIsAutoFilling(true);
      const autofill = await fetchDimensionsByNdc(form.serialNumber);
      setForm((prev) => ({
        ...prev,
        formFactor: autofill.formFactor || prev.formFactor,
        diameterMm: autofill.diameterMm?.toString() || prev.diameterMm,
        lengthMm: autofill.lengthMm?.toString() || prev.lengthMm,
      }));
      setAutoFillData(autofill);
      Alert.alert('Auto-fill complete', 'Dimensions imported from DailyMed');
    } catch (error: any) {
      Alert.alert('Auto-fill failed', error.message || 'Unable to fetch data');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleCreateMedication = async () => {
    if (!newMedicationForm.name.trim()) {
      Alert.alert('Missing name', 'Medication name is required.');
      return;
    }
    try {
      setIsSavingMedication(true);
      const payload = {
        name: newMedicationForm.name.trim(),
        color: newMedicationForm.color.trim() || '#6b7280',
        shape: newMedicationForm.shape.trim() || 'round',
        cartridgeIndex: Number(newMedicationForm.cartridgeIndex) || 0,
        stockCount: Number(newMedicationForm.stockCount) || 0,
        lowStockThreshold: Number(newMedicationForm.lowStockThreshold) || 0,
        maxDailyDose: Number(newMedicationForm.maxDailyDose) || 1,
        metadata: {},
      };
      const created = await addPill(payload);
      setNewMedicationForm({ ...DEFAULT_NEW_MEDICATION });
      setIsAddModalVisible(false);
      await Promise.all([loadPills(), loadProfiles()]);
      setSelectedPillId(created.id);
      Alert.alert('Medication added', `${created.name} has been added to the library.`);
    } catch (error: any) {
      Alert.alert('Create medication failed', error?.message || 'Unable to add medication');
    } finally {
      setIsSavingMedication(false);
    }
  };

  const handleNewMedicationChange = (key: keyof typeof newMedicationForm, value: string) => {
    setNewMedicationForm((prev) => ({ ...prev, [key]: value }));
  };

  const layout = (
    <View style={[styles.content, isCompact && styles.contentStack]}>
        <View style={[styles.sidebar, isCompact && styles.sidebarCompact]}>
          <Text style={styles.sidebarTitle}>Pill Library</Text>
          <TouchableOpacity style={styles.newMedButton} onPress={() => setIsAddModalVisible(true)}>
            <Text style={styles.newMedButtonText}>Add Medication</Text>
          </TouchableOpacity>
          {isGraphQLEnabled && (
            <Text style={styles.graphqlBanner}>Connected to backend GraphQL.</Text>
          )}
          <ScrollView>
            {Array.from(pills.values()).length === 0 ? (
              <View style={styles.emptyLibrary}>
                <Text style={styles.emptyLibraryText}>
                  {isGraphQLEnabled
                    ? 'No medications yet. Use “Add Medication” to create one in the backend.'
                    : 'No pills found. Seed the database or add medications first.'}
                </Text>
                {isGraphQLEnabled ? (
                  <Text style={styles.graphqlBannerSmall}>Changes are saved directly to GraphQL.</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.seedButton}
                    onPress={handleSeed}
                    disabled={isSeeding}
                  >
                    <Text style={styles.seedButtonText}>
                      {isSeeding ? 'Seeding…' : 'Seed Sample Data'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              Array.from(pills.values()).map((pill) => {
                const isActive = selectedPillId === pill.id;
                const mapped = Boolean(profiles[pill.id]);
                return (
                  <TouchableOpacity
                    key={pill.id}
                    style={[styles.pillButton, isActive && styles.pillButtonActive]}
                    onPress={() => handleSelectPill(pill.id)}
                  >
                    <View style={styles.pillButtonRow}>
                      <Text style={styles.pillButtonName}>{pill.name}</Text>
                      {mapped && <Text style={styles.badge}>Mapped</Text>}
                    </View>
                    <Text style={styles.pillButtonMeta}>Cartridge #{pill.cartridgeIndex}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>

        <View style={[styles.formArea, isCompact && styles.formAreaCompact]}>
          {selectedPillId ? (
            <>
              <Text style={styles.formTitle}>
                Configure {pills.get(selectedPillId)?.name || 'Medication'}
              </Text>
              {selectedPill && (
                <View style={styles.metaCard}>
                  <Text style={styles.metaTitle}>{selectedPill.name}</Text>
                  <Text style={styles.metaRow}>Cartridge #{selectedPill.cartridgeIndex}</Text>
                  <Text style={styles.metaRow}>Shape: {selectedPill.shape}</Text>
                  <Text style={styles.metaRow}>Color: {selectedPill.color}</Text>
                  {autoFillData?.color && (
                    <Text style={styles.metaRow}>Lookup Color: {autoFillData.color}</Text>
                  )}
                  {selectedProfile?.serialNumber && (
                    <Text style={styles.metaRow}>Serial: {selectedProfile.serialNumber}</Text>
                  )}
                </View>
              )}

              <ScrollView>
                <View style={styles.field}>
                  <Text style={styles.label}>Serial Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.serialNumber}
                    onChangeText={(value) => handleInputChange('serialNumber', value)}
                    placeholder="e.g., NDC-12345-6789"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Manufacturer</Text>
                    <TextInput
                      style={styles.input}
                      value={form.manufacturer}
                      onChangeText={(value) => handleInputChange('manufacturer', value)}
                      placeholder="Pfizer"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Form Factor</Text>
                    <TextInput
                      style={styles.input}
                      value={form.formFactor}
                      onChangeText={(value) => handleInputChange('formFactor', value)}
                      placeholder="tablet / capsule"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Silo Slot *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.siloSlot}
                    onChangeText={(value) => handleInputChange('siloSlot', value)}
                    keyboardType="numeric"
                    placeholder="0-31"
                  />
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Trapdoor Open (ms)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.trapdoorOpenMs}
                      onChangeText={(value) => handleInputChange('trapdoorOpenMs', value)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Hold Duration (ms)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.trapdoorHoldMs}
                      onChangeText={(value) => handleInputChange('trapdoorHoldMs', value)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Diameter (mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.diameterMm}
                      onChangeText={(value) => handleInputChange('diameterMm', value)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Length (mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.lengthMm}
                      onChangeText={(value) => handleInputChange('lengthMm', value)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.fieldRow}>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Width (mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.widthMm}
                      onChangeText={(value) => handleInputChange('widthMm', value)}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.fieldHalf}>
                    <Text style={styles.label}>Height (mm)</Text>
                    <TextInput
                      style={styles.input}
                      value={form.heightMm}
                      onChangeText={(value) => handleInputChange('heightMm', value)}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Weight (mg)</Text>
                  <TextInput
                    style={styles.input}
                    value={form.weightMg}
                    onChangeText={(value) => handleInputChange('weightMg', value)}
                    keyboardType="numeric"
                  />
                </View>

                <TouchableOpacity
                  style={styles.autoFillButton}
                  onPress={handleAutoFill}
                  disabled={isAutoFilling}
                >
                  {isAutoFilling ? (
                    <ActivityIndicator color={colors.textPrimary} />
                  ) : (
                    <Text style={styles.autoFillText}>Auto-fill via DailyMed</Text>
                  )}
                </TouchableOpacity>

                {autoFillData && (
                  <View style={styles.autoFillPreview}>
                    <Text style={styles.autoFillTitle}>Last lookup</Text>
                    <View style={styles.autoFillRow}>
                      <Text style={styles.autoFillLabel}>Shape</Text>
                      <Text style={styles.autoFillValue}>
                        {autoFillData.formFactor ?? 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.autoFillRow}>
                      <Text style={styles.autoFillLabel}>Diameter</Text>
                      <Text style={styles.autoFillValue}>
                        {autoFillData.diameterMm ? `${autoFillData.diameterMm} mm` : '—'}
                      </Text>
                    </View>
                    <View style={styles.autoFillRow}>
                      <Text style={styles.autoFillLabel}>Length</Text>
                      <Text style={styles.autoFillValue}>
                        {autoFillData.lengthMm ? `${autoFillData.lengthMm} mm` : '—'}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>

              <View style={styles.formFooter}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleSimulate}>
                  <Text style={styles.secondaryButtonText}>Simulate</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSave}>
                  <Text style={styles.primaryButtonText}>Save Mapping</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.emptyForm}>
              <Text style={styles.emptyFormTitle}>Select a pill to configure</Text>
              <Text style={styles.emptyFormText}>
                Choose a medication from the list to create a hardware mapping.
              </Text>
            </View>
          )}
        </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Hardware Mapping</Text>
        <Text style={styles.subtitle}>Link medications to silo trapdoors</Text>
      </View>

      {isCompact ? (
        <ScrollView contentContainerStyle={styles.compactScroll}>{layout}</ScrollView>
      ) : (
        layout
      )}
      <Modal
        visible={isAddModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <ScrollView>
              <View style={styles.field}>
                <Text style={styles.label}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newMedicationForm.name}
                  onChangeText={(value) => handleNewMedicationChange('name', value)}
                  placeholder="Metformin"
                />
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Color</Text>
                  <TextInput
                    style={styles.input}
                    value={newMedicationForm.color}
                    onChangeText={(value) => handleNewMedicationChange('color', value)}
                    placeholder="#6b7280"
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Shape</Text>
                  <TextInput
                    style={styles.input}
                    value={newMedicationForm.shape}
                    onChangeText={(value) => handleNewMedicationChange('shape', value)}
                    placeholder="round / capsule"
                  />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Cartridge Index</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newMedicationForm.cartridgeIndex}
                    onChangeText={(value) => handleNewMedicationChange('cartridgeIndex', value)}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Max Daily Dose</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newMedicationForm.maxDailyDose}
                    onChangeText={(value) => handleNewMedicationChange('maxDailyDose', value)}
                  />
                </View>
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Stock Count</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newMedicationForm.stockCount}
                    onChangeText={(value) => handleNewMedicationChange('stockCount', value)}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Low Stock Threshold</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={newMedicationForm.lowStockThreshold}
                    onChangeText={(value) => handleNewMedicationChange('lowStockThreshold', value)}
                  />
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setIsAddModalVisible(false);
                  setNewMedicationForm({ ...DEFAULT_NEW_MEDICATION });
                }}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, isSavingMedication && styles.disabledButton]}
                onPress={handleCreateMedication}
                disabled={isSavingMedication}
              >
                <Text style={styles.primaryButtonText}>
                  {isSavingMedication ? 'Saving…' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  contentStack: {
    flexDirection: 'column',
  },
  sidebar: {
    width: 260,
    backgroundColor: colors.surfaceAlt,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: 16,
  },
  sidebarCompact: {
    width: '100%',
    borderRightWidth: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 12,
  },
  compactScroll: {
    paddingBottom: 32,
  },
  sidebarTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: colors.textPrimary,
  },
  newMedButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    marginBottom: 12,
  },
  newMedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  graphqlBanner: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  graphqlBannerSmall: {
    color: colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  pillButton: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  pillButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  pillButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    backgroundColor: colors.accentSoft,
    color: colors.textPrimary,
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillButtonName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  pillButtonMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formArea: {
    flex: 1,
    padding: 20,
  },
  formAreaCompact: {
    width: '100%',
  },
  formTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: colors.textPrimary,
  },
  field: {
    marginBottom: 16,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.textSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.surfaceAlt,
    color: colors.textPrimary,
  },
  formFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  emptyForm: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFormTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  emptyFormText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  emptyLibrary: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    alignItems: 'center',
  },
  emptyLibraryText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  seedButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  seedButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  disabledButton: {
    opacity: 0.7,
  },
  metaCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  metaTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  metaRow: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  autoFillButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  autoFillText: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  autoFillPreview: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  autoFillTitle: {
    color: colors.textSecondary,
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 0.8,
  },
  autoFillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  autoFillLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  autoFillValue: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

