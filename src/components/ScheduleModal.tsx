import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@theme/colors';

type PillOption = {
  id: string;
  name: string;
};

interface ScheduleModalProps {
  visible: boolean;
  selectedDate: string;
  pillOptions: PillOption[];
  onClose: () => void;
  onSave: (schedule: {
    pillId: string;
    time: string;
    providerNotes: string;
    personalNotes: string;
  }) => void;
}

export const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  onClose,
  selectedDate,
  pillOptions,
  onSave,
}) => {
  const [search, setSearch] = useState('');
  const [pillId, setPillId] = useState('');
  const [time, setTime] = useState('');
  const [providerNotes, setProviderNotes] = useState('');
  const [personalNotes, setPersonalNotes] = useState('');

  useEffect(() => {
    if (visible) {
      setSearch('');
      setPillId('');
      setTime('');
      setProviderNotes('');
      setPersonalNotes('');
    }
  }, [visible]);

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase();
    return pillOptions.filter((pill) => pill.name.toLowerCase().includes(query));
  }, [pillOptions, search]);

  const handleSave = () => {
    if (!pillId || !time) {
      alert('Select a medication and specify a time');
      return;
    }

    onSave({ pillId, time, providerNotes, personalNotes });
    onClose();
  };

  const handleCancel = () => {
    setTime('');
    setSearch('');
    setPillId('');
    setProviderNotes('');
    setPersonalNotes('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Schedule Medication</Text>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <View style={styles.field}>
              <Text style={styles.label}>Scheduled Date</Text>
              <Text style={styles.dateValue}>
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Medication *</Text>
              <TextInput
                style={styles.input}
                value={search}
                onChangeText={setSearch}
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
                    onPress={() => setPillId(pill.id)}
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
                  <Text style={styles.emptyText}>No mapped medications found.</Text>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Time *</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM (e.g., 09:00, 14:30)"
                placeholderTextColor="#9ca3af"
              />
              <Text style={styles.hint}>24-hour format: HH:MM</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Provider Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={providerNotes}
                onChangeText={setProviderNotes}
                placeholder="Clinical instructions"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Personal Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={personalNotes}
                onChangeText={setPersonalNotes}
                placeholder="Reminders for yourself"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
            >
              <Text style={styles.saveButtonText}>Save Schedule</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.textSecondary,
  },
  content: {
    padding: 20,
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
  dateValue: {
    fontSize: 16,
    color: colors.textPrimary,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
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
  footer: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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



