import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

export default function SignupScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Name is required.';
    if (!email.includes('@')) errs.email = 'Enter a valid email.';
    if (password.length < 8) errs.password = 'Password must be at least 8 characters.';
    if (password !== confirmPassword) errs.confirmPassword = 'Passwords do not match.';
    if (!agreedToTerms) errs.terms = 'You must agree to the terms.';
    return errs;
  }

  async function handleSignup() {
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      setErrors({ general: error.message });
    }
    // On success, root layout auth guard redirects to onboarding
    setLoading(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfaceWhite }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={c.onSurfaceVariant} />
        </Pressable>

        <Text style={[styles.title, { color: c.primary }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          Start your journey of effortless giving.
        </Text>

        {errors.general ? (
          <View style={[styles.errorBanner, { backgroundColor: c.errorContainer }]}>
            <Text style={[styles.errorText, { color: c.error }]}>{errors.general}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Field
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="First Last"
            error={errors.fullName}
            colors={c}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
            colors={c}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 8 characters"
            secureTextEntry
            error={errors.password}
            colors={c}
          />
          <Field
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat password"
            secureTextEntry
            error={errors.confirmPassword}
            colors={c}
          />

          {/* Terms checkbox */}
          <Pressable
            style={styles.termsRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: c.outlineVariant },
              agreedToTerms && { backgroundColor: c.primary, borderColor: c.primary },
            ]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.termsText, { color: c.textMuted }]}>
              I agree to the{' '}
              <Text style={{ color: c.primary, fontWeight: '600' }}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={{ color: c.primary, fontWeight: '600' }}>Privacy Policy</Text>
            </Text>
          </Pressable>
          {errors.terms ? (
            <Text style={[styles.fieldError, { color: c.error }]}>{errors.terms}</Text>
          ) : null}

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.loginRow} onPress={() => router.push('/(auth)/login')}>
          <Text style={[styles.loginText, { color: c.textMuted }]}>
            Already have an account?{' '}
            <Text style={{ color: c.primary, fontWeight: '700' }}>Sign in</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  error,
  colors: c,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  error?: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: c.onSurfaceVariant }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: c.surfaceContainerLow, color: c.onSurface, borderColor: error ? c.error : c.outlineVariant },
        ]}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'words'}
        autoCorrect={false}
        secureTextEntry={secureTextEntry}
      />
      {error ? <Text style={[styles.fieldError, { color: c.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 40,
  },
  backBtn: { paddingVertical: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 24 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginBottom: 4, marginTop: 8 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 24 },
  errorBanner: { padding: 12, borderRadius: BorderRadius.md, marginBottom: 16 },
  errorText: { fontSize: 14, fontWeight: '500' },
  form: { gap: DesignSpacing.stackGapMd },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  fieldError: { fontSize: 12, fontWeight: '500' },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  termsText: { flex: 1, fontSize: 13, lineHeight: 20 },
  primaryBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 4,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.6 },
  loginRow: { alignItems: 'center', marginTop: 24 },
  loginText: { fontSize: 14, lineHeight: 20 },
});
