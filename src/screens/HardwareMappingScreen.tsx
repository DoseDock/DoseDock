import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePillStore } from '@store/pillStore';
import { colors, shadows } from '@theme/colors';
import type { Pill } from '@types';

const SILO_COUNT = 3;

const PRESET_COLORS = [
  '#6EE7B7', '#FBBF24', '#93C5FD', '#F87171',
  '#A78BFA', '#FB923C', '#34D399', '#F472B6',
];

export const HardwareMappingScreen: React.FC = () => {
  const { pills, loadPills, addPill, updatePill, deletePill } = usePillStore();
  const [selectedSilo, setSelectedSilo] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMedName, setNewMedName] = useState('');
  const [newMedColor, setNewMedColor] = useState(PRESET_COLORS[0]);
  const [newMedStock, setNewMedStock] = useState('30');
  const [newMedMaxDose, setNewMedMaxDose] = useState('2');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadPills();
  }, [loadPills]);

  const pillForSilo = (index: number): Pill | undefined => {
    return Array.from(pills.values()).find((p) => p.cartridgeIndex === index);
  };

  const unassignedPills = Array.from(pills.values()).filter(
    (p) => p.cartridgeIndex == null || p.cartridgeIndex < 0 || p.cartridgeIndex >= SILO_COUNT
  );

  const allPillsList = Array.from(pills.values());

  const handleAssign = async (pill: Pill) => {
    if (selectedSilo === null) return;

    const current = pillForSilo(selectedSilo);
    if (current && current.id !== pill.id) {
      await updatePill(current.id, { cartridgeIndex: null });
    }

    await updatePill(pill.id, { cartridgeIndex: selectedSilo });
    await loadPills();
    setSelectedSilo(null);
    Alert.alert('Assigned', `${pill.name} is now in Silo ${selectedSilo}.`);
  };

  const handleUnassign = async (pill: Pill) => {
    await updatePill(pill.id, { cartridgeIndex: null });
    await loadPills();
    Alert.alert('Unassigned', `${pill.name} has been removed from its silo.`);
  };

  const handleDelete = (pill: Pill) => {
    Alert.alert(
      'Delete Medication',
      `Are you sure you want to delete ${pill.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePill(pill.id);
            await loadPills();
          },
        },
      ]
    );
  };

  const resetAddForm = () => {
    setNewMedName('');
    setNewMedColor(PRESET_COLORS[0]);
    setNewMedStock('30');
    setNewMedMaxDose('2');
  };

  const handleAddMedication = async () => {
    const name = newMedName.trim();
    if (!name) {
      Alert.alert('Name required', 'Enter a medication name.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPill({
        name,
        color: newMedColor,
        cartridgeIndex: null,
        stockCount: parseInt(newMedStock, 10) || 30,
        lowStockThreshold: 5,
        maxDailyDose: parseInt(newMedMaxDose, 10) || 2,
      });
      await loadPills();
      resetAddForm();
      setShowAddModal(false);
      Alert.alert('Added', `${name} has been created. Assign it to a silo.`);
    } catch (error: any) {
      Alert.alert('Failed', error?.message || 'Unable to create medication.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Silo Mapping</Text>
              <Text style={styles.subtitle}>
                Assign medications to the 3 dispenser silos
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.addButtonText}>+ Add Med</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* ---- Silo slots ---- */}
        {Array.from({ length: SILO_COUNT }, (_, i) => {
          const pill = pillForSilo(i);
          const isSelected = selectedSilo === i;
          return (
            <View
              key={i}
              style={[styles.siloCard, isSelected && styles.siloCardActive]}
            >
              <View style={styles.siloHeader}>
                <Text style={styles.siloLabel}>Silo {i}</Text>
                {pill ? (
                  <View style={styles.assignedRow}>
                    <View
                      style={[styles.colorDot, { backgroundColor: pill.color }]}
                    />
                    <Text style={styles.pillName}>{pill.name}</Text>
                    <Text style={styles.stockText}>
                      {pill.stockCount} pills
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.emptyText}>Empty</Text>
                )}
              </View>

              <View style={styles.siloActions}>
                {pill ? (
                  <>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDelete(pill)}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleUnassign(pill)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.assignButton,
                    isSelected && styles.assignButtonActive,
                  ]}
                  onPress={() => setSelectedSilo(isSelected ? null : i)}
                >
                  <Text
                    style={[
                      styles.assignButtonText,
                      isSelected && styles.assignButtonTextActive,
                    ]}
                  >
                    {isSelected ? 'Cancel' : pill ? 'Change' : 'Assign'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* ---- Medication picker (shown when a silo is selected) ---- */}
        {selectedSilo !== null && (
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>
              Select a medication for Silo {selectedSilo}
            </Text>

            {unassignedPills.length === 0 &&
            allPillsList.filter(
              (p) =>
                p.cartridgeIndex != null &&
                p.cartridgeIndex >= 0 &&
                p.cartridgeIndex < SILO_COUNT &&
                p.cartridgeIndex !== selectedSilo
            ).length === 0 ? (
              <View>
                <Text style={styles.emptyText}>
                  No medications available. Add one first.
                </Text>
                <TouchableOpacity
                  style={[styles.addButton, { marginTop: 10, alignSelf: 'flex-start' }]}
                  onPress={() => {
                    setSelectedSilo(null);
                    setShowAddModal(true);
                  }}
                >
                  <Text style={styles.addButtonText}>+ Add Medication</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {unassignedPills.map((pill) => (
                  <TouchableOpacity
                    key={pill.id}
                    style={styles.pickerRow}
                    onPress={() => handleAssign(pill)}
                  >
                    <View
                      style={[styles.colorDot, { backgroundColor: pill.color }]}
                    />
                    <Text style={styles.pickerRowText}>{pill.name}</Text>
                  </TouchableOpacity>
                ))}

                {allPillsList
                  .filter(
                    (p) =>
                      p.cartridgeIndex != null &&
                      p.cartridgeIndex >= 0 &&
                      p.cartridgeIndex < SILO_COUNT &&
                      p.cartridgeIndex !== selectedSilo
                  )
                  .map((pill) => (
                    <TouchableOpacity
                      key={pill.id}
                      style={[styles.pickerRow, styles.pickerRowReassign]}
                      onPress={() => handleAssign(pill)}
                    >
                      <View
                        style={[
                          styles.colorDot,
                          { backgroundColor: pill.color },
                        ]}
                      />
                      <Text style={styles.pickerRowText}>
                        {pill.name}{' '}
                        <Text style={styles.pickerRowHint}>
                          (currently Silo {pill.cartridgeIndex})
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </View>
        )}

        {/* ---- All medications list ---- */}
        {allPillsList.length > 0 && (
          <View style={styles.medListCard}>
            <Text style={styles.medListTitle}>All Medications</Text>
            {allPillsList.map((pill) => (
              <View key={pill.id} style={styles.medListRow}>
                <View style={[styles.colorDot, { backgroundColor: pill.color }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.medListName}>{pill.name}</Text>
                  <Text style={styles.medListMeta}>
                    {pill.cartridgeIndex != null && pill.cartridgeIndex >= 0 && pill.cartridgeIndex < SILO_COUNT
                      ? `Silo ${pill.cartridgeIndex}`
                      : 'Unassigned'}
                    {' · '}{pill.stockCount} pills · Max {pill.maxDailyDose}/day
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(pill)}>
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ---- Add Medication Modal ---- */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { resetAddForm(); setShowAddModal(false); }}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Medication</Text>
            <TouchableOpacity onPress={handleAddMedication} disabled={isSubmitting}>
              <Text style={[styles.modalSave, isSubmitting && { opacity: 0.5 }]}>
                {isSubmitting ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Medication Name *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="e.g. Metformin"
                placeholderTextColor={colors.textSecondary}
                value={newMedName}
                onChangeText={setNewMedName}
                autoFocus
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Color</Text>
              <View style={styles.colorRow}>
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      newMedColor === c && styles.colorOptionSelected,
                    ]}
                    onPress={() => setNewMedColor(c)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Stock Count</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="30"
                  placeholderTextColor={colors.textSecondary}
                  value={newMedStock}
                  onChangeText={setNewMedStock}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Max Daily Dose</Text>
                <TextInput
                  style={styles.fieldInput}
                  placeholder="2"
                  placeholderTextColor={colors.textSecondary}
                  value={newMedMaxDose}
                  onChangeText={setNewMedMaxDose}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <View style={styles.assignedRow}>
                <View style={[styles.colorDot, { backgroundColor: newMedColor, width: 20, height: 20, borderRadius: 10 }]} />
                <Text style={styles.pillName}>{newMedName || 'Medication Name'}</Text>
              </View>
              <Text style={styles.medListMeta}>
                {newMedStock || '0'} pills · Max {newMedMaxDose || '0'}/day
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: {
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 24,
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  content: { paddingHorizontal: 24, paddingVertical: 24, gap: 20, paddingBottom: 40 },

  addButton: {
    backgroundColor: colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  /* Silo card */
  siloCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  siloCardActive: { borderColor: colors.accent },
  siloHeader: { gap: 8, marginBottom: 12 },
  siloLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },
  pillName: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
  stockText: { fontSize: 13, color: colors.textSecondary },
  emptyText: { color: colors.textSecondary, fontSize: 14 },
  siloActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeButtonText: { color: colors.textSecondary, fontWeight: '600' },
  deleteButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  deleteButtonText: { color: '#F87171', fontWeight: '600', fontSize: 13 },
  assignButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  assignButtonActive: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  assignButtonText: { color: '#fff', fontWeight: '600' },
  assignButtonTextActive: { color: colors.textPrimary },

  /* Picker */
  pickerCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.accent,
    gap: 10,
    ...shadows.card,
  },
  pickerTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickerRowReassign: { opacity: 0.7 },
  pickerRowText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  pickerRowHint: { fontSize: 12, color: colors.textSecondary },

  /* All medications list */
  medListCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
    ...shadows.card,
  },
  medListTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary },
  medListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  medListName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  medListMeta: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  /* Modal */
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCancel: { color: colors.textSecondary, fontSize: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  modalSave: { color: colors.accent, fontSize: 16, fontWeight: '600' },
  modalContent: { padding: 20, gap: 20 },

  field: { gap: 6 },
  fieldLabel: { color: colors.textSecondary, fontWeight: '600', fontSize: 14 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
  },
  fieldRow: { flexDirection: 'row', gap: 12 },

  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: { borderColor: colors.textPrimary, borderWidth: 3 },

  previewCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  previewLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
});
