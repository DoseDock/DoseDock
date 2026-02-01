import React, { useState, useCallback } from 'react';
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
import {
  createPatientForUser,
  fetchPatientsForUser,
  fetchUserByEmail,
  GraphQLPatient,
  login,
  upsertUserProfile,
} from '@/api/auth';
import { useSessionStore, type SessionPatient, type SessionUser } from '@store/sessionStore';

const guessTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const DEFAULT_TIMEZONE = guessTimezone();

type Mode = 'login' | 'signup';

export const SignupScreen: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patients, setPatients] = useState<GraphQLPatient[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; fullName: string } | null>(null);

  const setUser = useSessionStore((state) => state.setUser);
  const setPatient = useSessionStore((state) => state.setPatient);

  const handleLogin = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter your email address.');
      return;
    }
    if (!trimmedPassword) {
      Alert.alert('Password required', 'Enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login({
        email: normalizedEmail,
        password: trimmedPassword,
      });

      setCurrentUser(user);
      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        timezone: user.timezone,
      };
      setUser(sessionUser);
      setIsLoadingPatients(true);
      const userPatients = await fetchPatientsForUser(user.id);
      setPatients(userPatients);

      if (userPatients.length === 1) {
        const sessionPatient: SessionPatient = {
          id: userPatients[0].id,
          firstName: userPatients[0].firstName,
          lastName: userPatients[0].lastName,
          timezone: userPatients[0].timezone,
        };
        setPatient(sessionPatient);
      }
    } catch (error: any) {
      Alert.alert('Login failed', error?.message || 'Invalid email or password. Please try again.');
    } finally {
      setIsSubmitting(false);
      setIsLoadingPatients(false);
    }
  };

  const handleSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!normalizedEmail) {
      Alert.alert('Email required', 'Enter an email address.');
      return;
    }
    if (!trimmedPassword) {
      Alert.alert('Password required', 'Enter a password.');
      return;
    }
    if (trimmedPassword.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters.');
      return;
    }
    if (!trimmedFullName) {
      Alert.alert('Name required', 'Enter your full name.');
      return;
    }
    if (!trimmedFirstName || !trimmedLastName) {
      Alert.alert('Patient name required', 'Enter the patient\'s first and last name.');
      return;
    }

    setIsSubmitting(true);
    try {
      let user = await fetchUserByEmail(normalizedEmail);
      if (user) {
        Alert.alert(
          'Account exists',
          'An account with this email already exists. Please log in instead.',
          [{ text: 'OK', onPress: () => setMode('login') }]
        );
        setIsSubmitting(false);
        return;
      }

      user = await upsertUserProfile({
        email: normalizedEmail,
        fullName: trimmedFullName,
        timezone: timezone || DEFAULT_TIMEZONE,
        password: trimmedPassword,
      });
      setUser(user);
      setCurrentUser(user);

      const patient = await createPatientForUser({
        userId: user.id,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        timezone: timezone || DEFAULT_TIMEZONE,
      });

      const sessionPatient: SessionPatient = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        timezone: patient.timezone,
      };
      setPatient(sessionPatient);
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Signup error:', error);
      Alert.alert('Signup failed', error?.message || 'Unable to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleSelectPatient = (patient: GraphQLPatient) => {
    const sessionPatient: SessionPatient = {
      id: patient.id,
      firstName: patient.firstName,
      lastName: patient.lastName,
      timezone: patient.timezone,
    };
    setPatient(sessionPatient);
  };

  const handleCreateNewPatient = async () => {
    if (!currentUser) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      Alert.alert('Patient name required', 'Enter the patient\'s first and last name.');
      return;
    }

    setIsSubmitting(true);
    try {
      const patient = await createPatientForUser({
        userId: currentUser.id,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        timezone: timezone || DEFAULT_TIMEZONE,
      });

      setPatients((prev) => [...prev, patient]);
      setFirstName('');
      setLastName('');
      const sessionPatient: SessionPatient = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        timezone: patient.timezone,
      };
      setPatient(sessionPatient);
    } catch (error: any) {
      Alert.alert('Create patient failed', error?.message || 'Unable to create patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setFirstName('');
    setLastName('');
    setTimezone(DEFAULT_TIMEZONE);
    setPatients([]);
    setCurrentUser(null);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    resetForm();
  };

  // If user is logged in and has patients, show patient selection
  if (currentUser && patients.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Select Patient</Text>
          <Text style={styles.subtitle}>Choose a patient to manage medications for.</Text>
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Your Patients</Text>
              <TouchableOpacity onPress={resetForm}>
                <Text style={styles.link}>Not {currentUser.fullName}? Log out</Text>
              </TouchableOpacity>
            </View>

            {patients.map((patient) => (
              <TouchableOpacity
                key={patient.id}
                style={styles.patientCard}
                onPress={() => handleSelectPatient(patient)}
              >
                <Text style={styles.patientName}>
                  {patient.firstName} {patient.lastName}
                </Text>
                <Text style={styles.patientMeta}>{patient.timezone}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.divider} />

            <Text style={styles.sectionTitle}>Add New Patient</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>First Name *</Text>
                <TextInput
                  nativeID="new-patient-firstName"
                  placeholder="Ava"
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  editable={!isSubmitting}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  nativeID="new-patient-lastName"
                  placeholder="Stone"
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  editable={!isSubmitting}
                />
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Timezone</Text>
              <TextInput
                nativeID="new-patient-timezone"
                placeholder="America/New_York"
                style={styles.input}
                value={timezone}
                onChangeText={setTimezone}
                editable={!isSubmitting}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
              onPress={handleCreateNewPatient}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Add Patient</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main login/signup form
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to PillBox</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ? 'Log in to access your patient profiles.' : 'Sign up to start managing medications.'}
        </Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>Log In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>Sign Up</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>{mode === 'login' ? 'Log In' : 'Create Account'}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              nativeID="auth-email"
              autoComplete="email"
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              nativeID="auth-password"
              autoComplete={mode === 'login' ? 'password' : 'password-new'}
              secureTextEntry
              placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              editable={!isSubmitting}
            />
          </View>

          {mode === 'signup' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Your Full Name *</Text>
                <TextInput
                  nativeID="signup-fullName"
                  autoComplete="name"
                  placeholder="Your Name"
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
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
                    value={firstName}
                    onChangeText={setFirstName}
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
                    value={lastName}
                    onChangeText={setLastName}
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
                  value={timezone}
                  onChangeText={setTimezone}
                  editable={!isSubmitting}
                />
                <Text style={styles.hint}>Defaults to your browser timezone if left empty.</Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={mode === 'login' ? handleLogin : handleSignup}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>{mode === 'login' ? 'Log In' : 'Sign Up & Continue'}</Text>
            )}
          </TouchableOpacity>
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
    gap: 4,
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
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeButtonTextActive: {
    color: colors.textPrimary,
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
  patientCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  patientMeta: {
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  link: {
    color: colors.accent,
    fontSize: 14,
  },
});
