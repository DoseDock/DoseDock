import React, { useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { colors } from '@theme/colors';
import { TimePicker } from './TimePicker';

type PillOption = {
  id: string;
  label: string;
};

export type ScheduleFrequency = 'once' | 'daily' | 'weekly';

interface ScheduleModalProps {
  visible: boolean;
  selectedDate: string;
  pillOptions: PillOption[];
  onClose: () => void;
  onSave: (schedule: {
    pillId: string;
    times: string[];
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
  const [pillId, setPillId] = useState('');
  const [times, setTimes] = useState<string[]>(['09:00']);
  const [frequency, setFrequency] = useState<ScheduleFrequency>('daily');

  useEffect(() => {
    if (visible) {
      setPillId('');
      setTimes(['09:00']);
      setFrequency('once');
    }
  }, [visible]);


  const handleSave = () => {
    if (!pillId) {
      alert('Please select a medication from the list.');
      return;
    }
    if (times.length === 0) {
      alert('Please add at least one time');
      return;
    }

    // Validate all times format (HH:MM)
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    for (const t of times) {
      if (!timeRegex.test(t)) {
        alert(`Invalid time format: ${t}. Please use HH:MM format.`);
        return;
      }
    }

    onSave({ pillId, times, frequency });
    onClose();
  };

  const handleCancel = () => {
    setTimes(['09:00']);
    setPillId('');
    onClose();
  };

  const addTime = () => {
    setTimes([...times, '09:00']);
  };

  const removeTime = (index: number) => {
    if (times.length > 1) {
      setTimes(times.filter((_, i) => i !== index));
    }
  };

  const updateTime = (index: number, newTime: string) => {
    const updated = [...times];
    updated[index] = newTime;
    setTimes(updated);
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
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                  weekday: isSmallMobile ? 'short' : 'long',
                  month: isSmallMobile ? 'short' : 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>Medication *</Text>
              {pillOptions.length === 0 ? (
                <Text style={styles.emptyText}>
                  No medications assigned to silos. Please assign medications to silos first in the Device screen.
                </Text>
              ) : (
                <View style={styles.dropdownList}>
                  {pillOptions.map((pill) => (
                    <TouchableOpacity
                      key={pill.id}
                      style={[
                        styles.dropdownItem,
                        pillId === pill.id && styles.dropdownItemActive,
                      ]}
                      onPress={() => setPillId(pill.id)}
                    >
                      <View style={[styles.radioCircle, pillId === pill.id && styles.radioCircleActive]}>
                        {pillId === pill.id && <View style={styles.radioInner} />}
                      </View>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          pillId === pill.id && styles.dropdownItemTextActive,
                        ]}
                      >
                        {pill.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
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
              <View style={styles.timeLabelRow}>
                <Text style={[styles.label, isSmallMobile && styles.labelSmall]}>
                  Time{times.length > 1 ? 's' : ''} *
                </Text>
                <TouchableOpacity style={styles.addTimeButton} onPress={addTime}>
                  <Text style={styles.addTimeButtonText}>+ Add Time</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.hint, isSmallMobile && styles.hintSmall, { marginBottom: 12 }]}>
                {times.length > 1
                  ? 'Each time creates a separate schedule for this medication'
                  : 'Tap "+ Add Time" to schedule at multiple times per day'}
              </Text>
              {times.map((t, index) => (
                <View key={index} style={styles.timeRow}>
                  <View style={styles.timePickerWrapper}>
                    <TimePicker value={t} onChange={(newTime) => updateTime(index, newTime)} />
                  </View>
                  {times.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeTimeButton}
                      onPress={() => removeTime(index)}
                    >
                      <Text style={styles.removeTimeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
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
  dropdownList: {
    gap: 8,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    gap: 12,
  },
  dropdownItemActive: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleActive: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  dropdownItemText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  dropdownItemTextActive: {
    color: colors.textPrimary,
    fontWeight: '600',
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
  timeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addTimeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  addTimeButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  timePickerWrapper: {
    flex: 1,
  },
  removeTimeButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeTimeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500',
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
