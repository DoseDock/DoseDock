import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity, Modal, Alert, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@theme/colors';
import { useSessionStore } from '@store/sessionStore';

export const SettingsScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const isSmallMobile = width < 400;
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
      <View style={[styles.header, isMobile && styles.headerMobile]}>
        <Text style={[styles.title, isSmallMobile && styles.titleSmall]}>Settings</Text>
      </View>
      <ScrollView style={[styles.content, isMobile && styles.contentMobile]}>
        {user && (
          <View style={[styles.card, isMobile && styles.cardMobile]}>
            <Text style={[styles.cardTitle, isSmallMobile && styles.cardTitleSmall]}>Account</Text>
            <Text style={[styles.cardText, isSmallMobile && styles.cardTextSmall]}>Signed in as: {user.fullName}</Text>
            <Text style={[styles.cardText, isSmallMobile && styles.cardTextSmall]}>Email: {user.email}</Text>
            {patient && (
              <Text style={[styles.cardText, isSmallMobile && styles.cardTextSmall]}>
                Patient: {patient.firstName} {patient.lastName}
              </Text>
            )}
          </View>
        )}

        <View style={[styles.card, isMobile && styles.cardMobile]}>
          <Text style={[styles.cardTitle, isSmallMobile && styles.cardTitleSmall]}>App Settings</Text>
          <Text style={[styles.cardText, isSmallMobile && styles.cardTextSmall]}>
            Configure notifications, quiet hours, and security settings.
          </Text>
        </View>

        <TouchableOpacity style={[styles.logoutButton, isMobile && styles.logoutButtonMobile]} onPress={showLogoutModal}>
          <Text style={[styles.logoutButtonText, isSmallMobile && styles.logoutButtonTextSmall]}>Log Out</Text>
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
  headerMobile: {
    paddingHorizontal: 14,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  titleSmall: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  contentMobile: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardMobile: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  cardTitleSmall: {
    fontSize: 18,
    marginBottom: 6,
  },
  cardText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  cardTextSmall: {
    fontSize: 14,
    marginBottom: 3,
  },
  linkText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  linkTextSmall: {
    marginTop: 10,
    fontSize: 13,
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
  logoutButtonMobile: {
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 24,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButtonTextSmall: {
    fontSize: 15,
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
