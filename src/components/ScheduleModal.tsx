import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { colors } from '@theme/colors';

type PillOption = {
  id: string;
  name: string;
};

export type ScheduleFrequency = 'once' | 'daily' | 'weekly';

interface ScheduleModalProps {
  visible: boolean;
  selectedDate: string;
  pillOptions: PillOption[];
  onClose: () => void;
  onSave: (schedule: {
    pillId: string;
    time: string;
    frequency: ScheduleFrequency;
  }) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  selectedDate,
  pillOptions,
  onSave,
}) => {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 500;
  const isSmallMobile = width < 380;
  const [search, setSearch] = useState('');
  const [pillId, setPillId] = useState('');
  const [time, setTime] = useState('');
  const [frequency, setFrequency] = useState<ScheduleFrequency>('daily');

  useEffect(() => {
    if (visible) {
      setSearch('');
      setPillId('');
      setTime('');
      setFrequency('once');
    }
  }, [visible]);

  // Update search field when pillId changes (to show selected medication name)
  useEffect(() => {
    if (pillId) {
      const selectedPill = pillOptions.find((p) => p.id === pillId);
      if (selectedPill) {
        setSearch(selectedPill.name);
      }
    }
  }, [pillId, pillOptions]);

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    return pillOptions.filter((pill) => pill.name.toLowerCase().includes(query));
  }, [pillOptions, search]);

  // Auto-select medication when search exactly matches a medication name (case-insensitive)
  useEffect(() => {
    const trimmedSearch = search.trim();
    if (trimmedSearch && !pillId) {
      const exactMatch = pillOptions.find(
        (pill) => pill.name.toLowerCase().trim() === trimmedSearch.toLowerCase()
      );
      if (exactMatch) {
        setPillId(exactMatch.id);
      }
    } else if (!trimmedSearch && pillId) {
      // Clear selection if search is cleared
      setPillId('');
    }
  }, [search, pillOptions, pillId]);

  const handleSave = () => {
    if (!pillId) {
      if (search.trim()) {
        alert(
          `"${search}" is not available for scheduling. Only medications assigned to a silo can be scheduled. Please select a medication from the list below.`
        );
      } else {
        alert('Please select a medication from the list. Only medications assigned to a silo can be scheduled.');
      }
      return;
    }
    if (!time) {
      alert('Please specify a time in 24-hour format (HH:MM)');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      alert('Please enter time in 24-hour format (HH:MM), e.g., 09:00 or 14:30');
      return;
    }

    onSave({ pillId, time, frequency });
    onClose();
  };

  const handleCancel = () => {
    setTime('');
    setSearch('');
    setPillId('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, isMobile && styles.overlayMobile]}>
        <View style={[styles.modalContainer, isMobile && styles.modalContainerMobile, { maxHeight: height * 0.9 }]}>
          <View style={[styles.header, isMobile && styles.headerMobile]}>
            <Text style={[styles.headerTitle, isSmallMobile && styles.headerTitleSmall]}>Schedule Medication</Text>
            <TouchableOpacity onPress={handleCancel} style={[styles.closeButton, isSmallMobile && styles.closeButtonSmall]}>
              <Text style={[styles.closeButtonText, isSmallMobile && styles.closeButtonTextSmall]}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.content, isMobile && styles.contentMobile]}>
            <View style={styles.field}>
              <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>Scheduled Date</Text>
              <Text style={[styles.dateValue, isSmallMobile && styles.dateValueSmall]}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: isSmallMobile ? 'short' : 'long',
                  month: isSmallMobile ? 'short' : 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>Medication *</Text>
              <TextInput
                style={[styles.input, isSmallMobile && styles.inputSmall]}
                value={search}
                onChangeText={(text) => {
                  setSearch(text);
                  // Clear selection if user is typing and the selected pill is no longer in filtered results
                  if (pillId) {
                    const selectedPill = pillOptions.find((p) => p.id === pillId);
                    if (!selectedPill || !selectedPill.name.toLowerCase().includes(text.toLowerCase())) {
                      setPillId('');
                    }
                  }
                }}
                placeholder="Search medications..."
                placeholderTextColor="#9ca3af"
              />
              <View style={styles.optionList}>
                {filteredOptions.map((pill) => (
                  <TouchableOpacity
                    key={pill.id}
                    style={[
                      styles.optionButton,
                      pillId === pill.id && styles.optionButtonActive,
                    ]}
                    onPress={() => {
                      setPillId(pill.id);
                      setSearch(pill.name);
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        pillId === pill.id && styles.optionTextActive,
                      ]}
                    >
                      {pill.name}
                    </Text>
                  </TouchableOpacity>
                ))}
                {filteredOptions.length === 0 && (
                  <Text style={styles.emptyText}>
                    {search.trim()
                      ? `"${search}" not found. Only medications assigned to silos can be scheduled.${pillOptions.length > 0 ? ` Available: ${pillOptions.map(p => p.name).join(', ')}` : ''}`
                      : pillOptions.length === 0
                      ? 'No medications assigned to silos. Please assign medications to silos first in the Device screen.'
                      : 'No medications match your search.'}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>Frequency</Text>
              <View style={styles.frequencyRow}>
                {([['once', 'Once'], ['daily', 'Daily'], ['weekly', 'Weekly']] as const).map(([value, label]) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.frequencyButton,
                      frequency === value && styles.frequencyButtonActive,
                    ]}
                    onPress={() => setFrequency(value)}
                  >
                    <Text
                      style={[
                        styles.frequencyText,
                        frequency === value && styles.frequencyTextActive,
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>Time *</Text>
              <TextInput
                style={[styles.input, isSmallMobile && styles.inputSmall]}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM (e.g., 09:00, 14:30)"
                placeholderTextColor="#9ca3af"
              />
              <Text style={[styles.hint, isSmallMobile && styles.hintSmall]}>24-hour format: HH:MM</Text>
            </View>
          </ScrollView>

          <View style={[styles.footer, isMobile && styles.footerMobile]}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, isSmallMobile && styles.buttonSmall]}
              onPress={handleCancel}
            >
              <Text style={[styles.cancelButtonText, isSmallMobile && styles.buttonTextSmall]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, isSmallMobile && styles.buttonSmall]}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, isSmallMobile && styles.buttonTextSmall]}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlayMobile: {
    padding: 12,
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalContainerMobile: {
    borderRadius: 12,
    maxWidth: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerMobile: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerTitleSmall: {
    fontSize: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  closeButtonTextSmall: {
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  contentMobile: {
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  labelSmall: {
    fontSize: 14,
    marginBottom: 6,
  },
  dateValue: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateValueSmall: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
  },
  inputSmall: {
    padding: 10,
    fontSize: 14,
    borderRadius: 6,
  },
  frequencyRow: {
    flexDirection: 'row',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  frequencyText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  frequencyTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  optionList: {
    marginTop: 12,
    gap: 8,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  optionButtonActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  optionText: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  optionTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  hintSmall: {
    fontSize: 11,
    marginTop: 3,
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  footerMobile: {
    padding: 16,
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: {
    paddingVertical: 12,
    borderRadius: 6,
  },
  buttonTextSmall: {
    fontSize: 14,
  },
  cancelButton: {
    backgroundColor: colors.surfaceAlt,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
