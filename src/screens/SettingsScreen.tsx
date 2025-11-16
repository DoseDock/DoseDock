import React from 'react';
import { View, ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>
      <ScrollView style={styles.content}>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 16,
    color: '#6b7280',
  },
  linkText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
  },
});
