import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, shadows } from '@theme/colors';
import { graphqlRequest } from '@/api/graphqlClient';
import { useSessionStore } from '@store/sessionStore';
import { graphQLConfig } from '@/config/env';

const REQUEST_DISPENSE_MUTATION = `
  mutation RequestDispense($input: DispenseRequestInput!) {
    requestDispense(input: $input) {
      id
      silo
      qty
    }
  }
`;

export const DemoScreen: React.FC = () => {
  const { width } = useWindowDimensions();
  const isMobile = width < 600;
  const [isDispensing, setIsDispensing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const patient = useSessionStore((state) => state.patient);

  const handleDispense = async () => {
    const patientId = patient?.id || graphQLConfig.patientId;
    if (!patientId) {
      setStatus('error');
      setErrorMessage('No patient ID configured');
      return;
    }

    setIsDispensing(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      await graphqlRequest(REQUEST_DISPENSE_MUTATION, {
        input: {
          patientId,
          silo: 0,
          qty: 1,
        },
      });

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send dispense request');
    } finally {
      setIsDispensing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={[styles.content, isMobile && styles.contentMobile]}>
        <View style={[styles.headerCard, isMobile && styles.headerCardMobile]}>
          <Text style={styles.title}>Symposium Demo</Text>
          <Text style={styles.subTitle}>Press the button to dispense one pill</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.dispenseButton,
              isDispensing && styles.dispenseButtonDisabled,
            ]}
            onPress={handleDispense}
            disabled={isDispensing}
            activeOpacity={0.8}
          >
            <Text style={styles.dispenseButtonText}>
              {isDispensing ? 'Dispensing...' : 'DISPENSE'}
            </Text>
          </TouchableOpacity>

          {status === 'success' && (
            <View style={styles.statusCard}>
              <Text style={styles.successText}>Dispense request sent!</Text>
            </View>
          )}

          {status === 'error' && (
            <View style={[styles.statusCard, styles.errorCard]}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 32,
  },
  contentMobile: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 24,
  },
  headerCard: {
    padding: 24,
    backgroundColor: colors.card,
    borderRadius: 24,
    gap: 8,
    ...shadows.card,
  },
  headerCardMobile: {
    padding: 16,
    gap: 6,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  dispenseButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.card,
  },
  dispenseButtonDisabled: {
    backgroundColor: colors.surfaceAlt,
  },
  dispenseButtonText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  statusCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    paddingHorizontal: 24,
    ...shadows.card,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  successText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
});
