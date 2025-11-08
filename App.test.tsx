import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>🎉 PillBox Dispenser</Text>
      <Text style={styles.subtitle}>React Native is Working!</Text>
      <Text style={styles.text}>
        ✅ App compiled successfully{'\n'}
        ✅ React rendering working{'\n'}
        ✅ Styles loading correctly{'\n'}
        ✅ Ready to add features!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    color: '#3b82f6',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 28,
  },
});

