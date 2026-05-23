import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as AppleAuthentication from 'expo-apple-authentication';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleEmailLogin() {
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  }

  async function handleAppleLogin() {
    setLoading(true);
    setError('');
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) throw new Error('No identity token returned from Apple.');
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) setError(error.message);
    } catch (err: any) {
      if (err?.code !== 'ERR_REQUEST_CANCELED') setError(err?.message ?? 'Apple Sign-In failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const redirectTo = makeRedirectUri({ scheme: 'zaytoonapp' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success') {
        const url = new URL(result.url);
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
    setLoading(false);
  }

  async function handleForgotPassword() {
    if (!email) {
      Alert.alert('Enter your email', 'Please enter your email address first.');
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'zaytoonapp://reset-password',
    });
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Check your email', "We've sent you a password reset link.");
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfaceWhite }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={[styles.backText, { color: c.onSurfaceVariant }]}>←</Text>
        </Pressable>

        <Text style={[styles.title, { color: c.primary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>Sign in to your account</Text>

        {/* OAuth buttons */}
        <View style={styles.oauthStack}>
          <Pressable
            style={[styles.oauthBtn, { borderColor: c.outlineVariant, backgroundColor: c.surfaceContainerLow }]}
            onPress={handleGoogleLogin}
          >
            <Text style={styles.oauthIcon}>G</Text>
            <Text style={[styles.oauthText, { color: c.onSurface }]}>Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={BorderRadius.lg}
              style={styles.appleBtn}
              onPress={handleAppleLogin}
            />
          )}

          <Pressable
            style={[styles.oauthBtn, { borderColor: c.outlineVariant, backgroundColor: c.surfaceContainerLow }]}
            onPress={() => router.push('/(auth)/verify-otp')}
          >
            <Text style={styles.oauthIcon}>📱</Text>
            <Text style={[styles.oauthText, { color: c.onSurface }]}>Continue with Phone</Text>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: c.outlineVariant }]} />
          <Text style={[styles.dividerText, { color: c.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: c.outlineVariant }]} />
        </View>

        {/* Email form */}
        <View style={styles.form}>
          {error ? (
            <View style={[styles.errorBanner, { backgroundColor: c.errorContainer }]}>
              <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceContainerLow, color: c.onSurface, borderColor: c.outlineVariant }]}
              placeholder="you@example.com"
              placeholderTextColor={c.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: c.onSurfaceVariant }]}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, { backgroundColor: c.surfaceContainerLow, color: c.onSurface, borderColor: c.outlineVariant }]}
                placeholder="••••••••"
                placeholderTextColor={c.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                <Text style={{ color: c.textMuted }}>{showPassword ? '👁️' : '🙈'}</Text>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={handleForgotPassword} style={styles.forgotRow}>
            <Text style={[styles.forgotText, { color: c.primary }]}>Forgot password?</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
            onPress={handleEmailLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={c.onPrimary} />
            ) : (
              <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Sign In</Text>
            )}
          </Pressable>
        </View>

        <Pressable style={styles.signupRow} onPress={() => router.push('/(auth)/signup')}>
          <Text style={[styles.signupText, { color: c.textMuted }]}>
            Don't have an account?{' '}
            <Text style={{ color: c.primary, fontWeight: '700' }}>Sign up</Text>
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
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
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 32 },
  oauthStack: { gap: DesignSpacing.stackGapMd },
  appleBtn: { height: 50 },
  oauthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  oauthIcon: { fontSize: 18, width: 24, textAlign: 'center' },
  oauthText: { fontSize: 15, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontWeight: '500' },
  form: { gap: DesignSpacing.stackGapMd },
  errorBanner: {
    padding: 12,
    borderRadius: BorderRadius.md,
  },
  errorText: { fontSize: 14, fontWeight: '500' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  input: {
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotRow: { alignSelf: 'flex-end' },
  forgotText: { fontSize: 13, fontWeight: '600' },
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
  signupRow: { alignItems: 'center', marginTop: 24 },
  signupText: { fontSize: 14, lineHeight: 20 },
});
