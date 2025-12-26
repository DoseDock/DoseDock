import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@theme/colors';
import { createPatientForUser, fetchPatientsForUser, fetchUserByEmail, login, upsertUserProfile } from '@/api/auth';
import { useSessionStore } from '@store/sessionStore';
import { isGraphQLAvailable } from '@/config/env';

type AuthMode = 'login' | 'signup';

const guessTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const DEFAULT_TIMEZONE = guessTimezone();

export const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    firstName: '',
    lastName: '',
    timezone: DEFAULT_TIMEZONE,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setUser = useSessionStore((state) => state.setUser);
  const setPatient = useSessionStore((state) => state.setPatient);

  const handleSkipLogin = () => {
    // Set mock user and patient for local development
    const mockUser = {
      id: 'dev-user-001',
      email: 'dev@localhost',
      fullName: 'Dev User',
      timezone: DEFAULT_TIMEZONE,
    };
    const mockPatient = {
      id: 'dev-patient-001',
      userId: 'dev-user-001',
      firstName: 'Test',
      lastName: 'Patient',
      timezone: DEFAULT_TIMEZONE,
    };
    setUser(mockUser);
    setPatient(mockPatient);
  };

  const handleLogin = async () => {
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email) {
      Alert.alert('Email required', 'Enter your email address.');
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Login with email and password
      const user = await login({ email, password });
      setUser(user);

      // Step 2: Fetch patients for this user
      const patients = await fetchPatientsForUser(user.id);

      if (patients.length === 0) {
        Alert.alert('No patients', 'No patients found for this account. Please sign up instead.');
        setIsSubmitting(false);
        return;
      }

      // Auto-select if only one patient, otherwise pick the first
      // (In a more complete implementation, you'd show a patient picker)
      const patient = patients[0];
      setPatient(patient);
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Invalid email or password. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const fullName = form.fullName.trim();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();

    if (!email) {
      Alert.alert('Email required', 'Enter an email address.');
      return;
    }
    if (!password) {
      Alert.alert('Password required', 'Enter a password.');
      return;
    }
    if (!fullName) {
      Alert.alert('Name required', 'Enter your full name.');
      return;
    }
    if (!firstName || !lastName) {
      Alert.alert('Patient name required', 'Enter the patient\'s first and last name.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Get or create user with password
      let user = await fetchUserByEmail(email);
      if (!user) {
        user = await upsertUserProfile({
          email,
          fullName,
          password,
          timezone: form.timezone || DEFAULT_TIMEZONE,
        });
      }
      setUser(user);

      // Step 2: Create patient for this user
      const patient = await createPatientForUser({
        userId: user.id,
        firstName,
        lastName,
        timezone: form.timezone || DEFAULT_TIMEZONE,
      });

      // Step 3: Set patient and navigate (AppNavigator will detect this)
      setPatient(patient);
    } catch (error: any) {
      Alert.alert('Signup failed', error?.message || 'Unable to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to PillBox</Text>
        <Text style={styles.subtitle}>
          {mode === 'login'
            ? 'Log in to manage your medications.'
            : 'Sign up to start managing medications for your patient.'}
        </Text>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
            onPress={() => setMode('login')}
          >
            <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>
              Log In
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          {mode === 'login' ? (
            <>
              <Text style={styles.sectionTitle}>Log In</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your credentials to access your account.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  nativeID="login-email"
                  autoComplete="email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  style={styles.input}
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  nativeID="login-password"
                  autoComplete="password"
                  secureTextEntry
                  placeholder="Enter your password"
                  style={styles.input}
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={handleLogin}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Log In</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Create Account</Text>
              <Text style={styles.sectionSubtitle}>
                Enter your information and the patient you'll be managing medications for.
              </Text>

              <View style={styles.field}>
                <Text style={styles.label}>Your Email *</Text>
                <TextInput
                  nativeID="signup-email"
                  autoComplete="email"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="caregiver@example.com"
                  style={styles.input}
                  value={form.email}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, email: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  nativeID="signup-password"
                  autoComplete="new-password"
                  secureTextEntry
                  placeholder="Create a password"
                  style={styles.input}
                  value={form.password}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, password: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Your Full Name *</Text>
                <TextInput
                  nativeID="signup-fullName"
                  autoComplete="name"
                  placeholder="Care Giver"
                  style={styles.input}
                  value={form.fullName}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, fullName: value }))}
                  editable={!isSubmitting}
                />
              </View>

              <View style={styles.divider} />

              <Text style={styles.sectionTitle}>Patient Information</Text>

              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Patient First Name *</Text>
                  <TextInput
                    nativeID="patient-firstName"
                    autoComplete="given-name"
                    placeholder="Ava"
                    style={styles.input}
                    value={form.firstName}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, firstName: value }))}
                    editable={!isSubmitting}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Patient Last Name *</Text>
                  <TextInput
                    nativeID="patient-lastName"
                    autoComplete="family-name"
                    placeholder="Stone"
                    style={styles.input}
                    value={form.lastName}
                    onChangeText={(value) => setForm((prev) => ({ ...prev, lastName: value }))}
                    editable={!isSubmitting}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Timezone</Text>
                <TextInput
                  nativeID="signup-timezone"
                  placeholder="America/New_York"
                  style={styles.input}
                  value={form.timezone}
                  onChangeText={(value) => setForm((prev) => ({ ...prev, timezone: value }))}
                  editable={!isSubmitting}
                />
                <Text style={styles.hint}>Defaults to your browser timezone if left empty.</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                onPress={handleSignup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Sign Up & Continue</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {!isGraphQLAvailable && (
            <>
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>

              <TouchableOpacity
                style={styles.devButton}
                onPress={handleSkipLogin}
              >
                <Text style={styles.devButtonText}>Skip Login (Dev Mode)</Text>
              </TouchableOpacity>
              <Text style={styles.devHint}>
                GraphQL is disabled. Use this to test with the local REST API.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    gap: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.card,
  },
  modeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  field: {
    gap: 6,
  },
  label: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  orText: {
    marginHorizontal: 12,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  devButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  devButtonText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  devHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
