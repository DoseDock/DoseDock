import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@theme/colors';
import { useSessionStore } from '@store/sessionStore';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const user = useSessionStore((state) => state.user);
  const patient = useSessionStore((state) => state.patient);
  const logout = useSessionStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    setLogoutModalVisible(false);
    // Navigation will automatically switch to SignupScreen via AppNavigator
  };

  const showLogoutModal = () => {
    setLogoutModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView style={styles.content}>
        {user && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Account</Text>
            <Text style={styles.cardText}>Signed in as: {user.fullName}</Text>
            <Text style={styles.cardText}>Email: {user.email}</Text>
            {patient && (
              <Text style={styles.cardText}>
                Patient: {patient.firstName} {patient.lastName}
              </Text>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>App Settings</Text>
          <Text style={styles.cardText}>
            Configure notifications, quiet hours, and security settings.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('HardwareMapping')}
          accessibilityLabel="Hardware integration"
        >
          <Text style={styles.cardTitle}>Hardware Integration</Text>
          <Text style={styles.cardText}>
            Map pill serial numbers to silo slots and configure trapdoor timings.
          </Text>
          <Text style={styles.linkText}>Open Hardware Mapping →</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={showLogoutModal}>
          <Text style={styles.logoutButtonText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Log Out</Text>
            <Text style={styles.modalText}>
              Are you sure you want to log out? You'll need to sign in again to access your patient's
              medications.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setLogoutModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleLogout}
              >
                <Text style={styles.modalButtonConfirmText}>Log Out</Text>
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
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  linkText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  modalText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: colors.danger,
  },
  modalButtonCancelText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
