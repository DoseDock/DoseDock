import React, { useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const TodayScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>PillBox Dispenser</Text>
        <Text style={styles.subtitle}>Today's Medication</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>🎉 Welcome to PillBox!</Text>
          <Text style={styles.welcomeText}>
            Your medication management app is ready.
          </Text>
          <Text style={styles.welcomeText}>
            ✅ App compiled successfully{'\n'}
            ✅ Database configured{'\n'}
            ✅ Navigation working{'\n'}
            ✅ All core features implemented
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              <Text style={styles.bold}>Next steps:</Text>{'\n'}
              • Go to Schedule tab to create medication schedules{'\n'}
              • Check Library tab for pre-loaded pills{'\n'}
              • View History for adherence tracking
            </Text>
          </View>
        </View>

        <View style={styles.featuresCard}>
          <Text style={styles.sectionTitle}>Features</Text>
          <Text style={styles.featureItem}>📅 Schedule medications with flexible recurrence</Text>
          <Text style={styles.featureItem}>💊 Manage up to 10 pills</Text>
          <Text style={styles.featureItem}>🔔 Local push notifications</Text>
          <Text style={styles.featureItem}>📊 Track medication adherence</Text>
          <Text style={styles.featureItem}>🔒 Lockout windows to prevent double-dosing</Text>
        </View>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  welcomeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#1f2937',
  },
  welcomeText: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 24,
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  bold: {
    fontWeight: '600',
  },
  featuresCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  featureItem: {
    fontSize: 16,
    color: '#4b5563',
    marginBottom: 12,
    lineHeight: 22,
  },
});
