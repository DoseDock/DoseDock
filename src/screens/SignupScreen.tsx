import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
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
  const [phone, setPhone] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patients, setPatients] = useState<GraphQLPatient[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [smsConsent, setSmsConsent] = useState(false);

  const setUser = useSessionStore((state) => state.setUser);
  const setPatient = useSessionStore((state) => state.setPatient);

  const validateLogin = () => {
    const nextErrors: Record<string, string> = {};

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Enter your email address.';
    }
    if (!trimmedPassword) {
      nextErrors.password = 'Enter your password.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSignup = () => {
    const nextErrors: Record<string, string> = {};

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!normalizedEmail) {
      nextErrors.email = 'Enter an email address.';
    }
    if (!trimmedPassword) {
      nextErrors.password = 'Enter a password.';
    } else if (trimmedPassword.length < 6) {
      nextErrors.password = 'Password must be at least 6 characters.';
    }
    if (!trimmedFullName) {
      nextErrors.fullName = 'Enter your full name.';
    }
    if (!trimmedPhone) {
      nextErrors.phone = 'Enter your phone number.';
    }
    if (!trimmedFirstName) {
      nextErrors.firstName = 'Enter the patient first name.';
    }
    if (!trimmedLastName) {
      nextErrors.lastName = 'Enter the patient last name.';
    }
    if (!smsConsent) {
      nextErrors.smsConsent = 'Please allow SMS notifications to continue.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateNewPatient = () => {
    const nextErrors: Record<string, string> = {};

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName) {
      nextErrors.newPatientFirstName = 'Enter the patient first name.';
    }
    if (!trimmedLastName) {
      nextErrors.newPatientLastName = 'Enter the patient last name.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validateLogin()) return;

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

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
        phone: user.phone,
        timezone: user.timezone,
      };
      setUser(sessionUser);

      setIsLoadingPatients(true);
      const userPatients = await fetchPatientsForUser(user.id);
      setPatients(userPatients);
      setErrors({});

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
      setErrors({
        form: error?.message || 'Invalid email or password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
      setIsLoadingPatients(false);
    }
  };

  const performSignup = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedFullName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    setIsSubmitting(true);
    try {
      let user = await fetchUserByEmail(normalizedEmail);
      if (user) {
        setErrors({
          email: 'An account with this email already exists. Please log in instead.',
        });
        setMode('login');
        return;
      }

      user = await upsertUserProfile({
        email: normalizedEmail,
        fullName: trimmedFullName,
        phone: trimmedPhone,
        timezone: timezone || DEFAULT_TIMEZONE,
        password: trimmedPassword,
      });

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        timezone: user.timezone,
      };

      setUser(sessionUser);
      setCurrentUser(sessionUser);

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

      setErrors({});
      setPatient(sessionPatient);
    } catch (error: any) {
      console.error('Signup error:', error);
      setErrors({
        form: error?.message || 'Unable to create account. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async () => {
    if (!validateSignup()) return;
    await performSignup();
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
    if (!validateNewPatient()) return;

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

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
      setErrors({});

      const sessionPatient: SessionPatient = {
        id: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        timezone: patient.timezone,
      };
      setPatient(sessionPatient);
    } catch (error: any) {
      setErrors({
        form: error?.message || 'Unable to create patient.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setPhone('');
    setFirstName('');
    setLastName('');
    setTimezone(DEFAULT_TIMEZONE);
    setPatients([]);
    setCurrentUser(null);
    setErrors({});
    setSmsConsent(false);
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    resetForm();
  };

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
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, errors.newPatientFirstName ? styles.inputError : null]}
                  value={firstName}
                  onChangeText={(text) => {
                    setFirstName(text);
                    setErrors((prev) => ({
                      ...prev,
                      newPatientFirstName: '',
                      form: '',
                    }));
                  }}
                  editable={!isSubmitting}
                />
                {errors.newPatientFirstName ? (
                  <Text style={styles.errorText}>{errors.newPatientFirstName}</Text>
                ) : null}
              </View>

              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Last Name *</Text>
                <TextInput
                  nativeID="new-patient-lastName"
                  placeholder="Stone"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, errors.newPatientLastName ? styles.inputError : null]}
                  value={lastName}
                  onChangeText={(text) => {
                    setLastName(text);
                    setErrors((prev) => ({
                      ...prev,
                      newPatientLastName: '',
                      form: '',
                    }));
                  }}
                  editable={!isSubmitting}
                />
                {errors.newPatientLastName ? (
                  <Text style={styles.errorText}>{errors.newPatientLastName}</Text>
                ) : null}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Timezone</Text>
              <TextInput
                nativeID="new-patient-timezone"
                placeholder="America/New_York"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={timezone}
                onChangeText={(text) => {
                  setTimezone(text);
                  setErrors((prev) => ({ ...prev, form: '' }));
                }}
                editable={!isSubmitting}
              />
            </View>

            {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Welcome to DoseDock</Text>
        <Text style={styles.subtitle}>
          {mode === 'login'
            ? 'Log in to access your patient profiles.'
            : 'Sign up to start managing medications.'}
        </Text>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.modeButtonText, mode === 'login' && styles.modeButtonTextActive]}>
              Log In
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeButton, mode === 'signup' && styles.modeButtonActive]}
            onPress={() => switchMode('signup')}
          >
            <Text style={[styles.modeButtonText, mode === 'signup' && styles.modeButtonTextActive]}>
              Sign Up
            </Text>
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
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, errors.email ? styles.inputError : null]}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrors((prev) => ({ ...prev, email: '', form: '' }));
              }}
              editable={!isSubmitting}
            />
            {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              nativeID="auth-password"
              autoComplete={mode === 'login' ? 'password' : 'password-new'}
              secureTextEntry
              placeholder={mode === 'login' ? 'Enter your password' : 'At least 6 characters'}
              placeholderTextColor={colors.textSecondary}
              style={[styles.input, errors.password ? styles.inputError : null]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setErrors((prev) => ({ ...prev, password: '', form: '' }));
              }}
              editable={!isSubmitting}
            />
            {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
          </View>

          {mode === 'signup' && (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Your Full Name *</Text>
                <TextInput
                  nativeID="signup-fullName"
                  autoComplete="name"
                  placeholder="Your Name"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, errors.fullName ? styles.inputError : null]}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    setErrors((prev) => ({ ...prev, fullName: '', form: '' }));
                  }}
                  editable={!isSubmitting}
                />
                {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Caregiver Phone *</Text>
                <TextInput
                  nativeID="signup-phone"
                  keyboardType="phone-pad"
                  placeholder="+14165551234"
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.input, errors.phone ? styles.inputError : null]}
                  value={phone}
                  onChangeText={(text) => {
                    setPhone(text);
                    setErrors((prev) => ({ ...prev, phone: '', form: '' }));
                  }}
                  editable={!isSubmitting}
                />
                <Text style={styles.hint}>Use full international format for SMS delivery.</Text>
                {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
              </View>

              <View style={styles.field}>
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => {
                    setSmsConsent((prev) => !prev);
                    setErrors((prev) => ({ ...prev, smsConsent: '', form: '' }));
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.checkbox, smsConsent && styles.checkboxChecked]}>
                    {smsConsent ? <Text style={styles.checkboxCheck}>✓</Text> : null}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    I agree to receive SMS messages at this phone number for medication reminders,
                    refill alerts, and caregiver notifications.
                  </Text>
                </TouchableOpacity>
                {errors.smsConsent ? <Text style={styles.errorText}>{errors.smsConsent}</Text> : null}
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
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, errors.firstName ? styles.inputError : null]}
                    value={firstName}
                    onChangeText={(text) => {
                      setFirstName(text);
                      setErrors((prev) => ({ ...prev, firstName: '', form: '' }));
                    }}
                    editable={!isSubmitting}
                  />
                  {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                </View>

                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Patient Last Name *</Text>
                  <TextInput
                    nativeID="patient-lastName"
                    autoComplete="family-name"
                    placeholder="Stone"
                    placeholderTextColor={colors.textSecondary}
                    style={[styles.input, errors.lastName ? styles.inputError : null]}
                    value={lastName}
                    onChangeText={(text) => {
                      setLastName(text);
                      setErrors((prev) => ({ ...prev, lastName: '', form: '' }));
                    }}
                    editable={!isSubmitting}
                  />
                  {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Timezone</Text>
                <TextInput
                  nativeID="signup-timezone"
                  placeholder="America/New_York"
                  placeholderTextColor={colors.textSecondary}
                  style={styles.input}
                  value={timezone}
                  onChangeText={(text) => {
                    setTimezone(text);
                    setErrors((prev) => ({ ...prev, form: '' }));
                  }}
                  editable={!isSubmitting}
                />
                <Text style={styles.hint}>Defaults to your browser timezone if left empty.</Text>
              </View>
            </>
          )}

          {errors.form ? <Text style={styles.formError}>{errors.form}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
            onPress={mode === 'login' ? handleLogin : handleSignup}
            disabled={isSubmitting || isLoadingPatients}
          >
            {isSubmitting || isLoadingPatients ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Log In' : 'Sign Up & Continue'}
              </Text>
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
  inputError: {
    borderColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  formError: {
    fontSize: 13,
    color: '#DC2626',
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
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 6,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  checkboxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});