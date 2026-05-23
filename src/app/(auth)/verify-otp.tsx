import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState, useRef, useEffect } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function VerifyOtpScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const { phone } = useLocalSearchParams<{ phone: string }>();

  const [phoneInput, setPhoneInput] = useState(phone ?? '');
  const [step, setStep] = useState<'phone' | 'otp'>(phone ? 'otp' : 'phone');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);
  const refs = Array.from({ length: 6 }, () => useRef<TextInput>(null));

  useEffect(() => {
    if (resendCountdown > 0) {
      const t = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCountdown]);

  async function sendOtp() {
    if (phoneInput.length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setLoading(true);
    setError('');
    const formattedPhone = phoneInput.startsWith('+') ? phoneInput : `+1${phoneInput.replace(/\D/g, '')}`;
    const { error } = await supabase.auth.signInWithOtp({ phone: formattedPhone });
    if (error) {
      setError(error.message);
    } else {
      setStep('otp');
      setResendCountdown(60);
    }
    setLoading(false);
  }

  async function verifyOtp() {
    const token = otp.join('');
    if (token.length < 6) { setError('Enter the 6-digit code.'); return; }
    setLoading(true);
    setError('');
    const formattedPhone = phoneInput.startsWith('+') ? phoneInput : `+1${phoneInput.replace(/\D/g, '')}`;
    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token,
      type: 'sms',
    });
    if (error) setError(error.message);
    setLoading(false);
  }

  function handleOtpChange(val: string, idx: number) {
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) refs[idx + 1]?.current?.focus();
    if (!val && idx > 0) refs[idx - 1]?.current?.focus();
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surfaceWhite }]}>
      <View style={styles.container}>
        <Pressable style={styles.backBtn} onPress={() => step === 'otp' ? setStep('phone') : router.back()}>
          <Text style={[styles.backText, { color: c.onSurfaceVariant }]}>←</Text>
        </Pressable>

        {step === 'phone' ? (
          <>
            <Text style={[styles.title, { color: c.primary }]}>Enter your phone</Text>
            <Text style={[styles.subtitle, { color: c.textMuted }]}>
              We'll send you a 6-digit code to verify.
            </Text>

            <View style={[styles.phoneRow, { borderColor: c.outlineVariant, backgroundColor: c.surfaceContainerLow }]}>
              <Text style={[styles.countryCode, { color: c.onSurface }]}>🇺🇸 +1</Text>
              <TextInput
                style={[styles.phoneInput, { color: c.onSurface }]}
                placeholder="(555) 000-0000"
                placeholderTextColor={c.textMuted}
                value={phoneInput}
                onChangeText={setPhoneInput}
                keyboardType="phone-pad"
              />
            </View>

            {error ? <Text style={[styles.errorText, { color: c.error }]}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={c.onPrimary} /> : (
                <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Send Code</Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: c.primary }]}>Enter the code</Text>
            <Text style={[styles.subtitle, { color: c.textMuted }]}>
              Sent to {phoneInput.startsWith('+') ? phoneInput : `+1 ${phoneInput}`}
            </Text>

            <View style={styles.otpRow}>
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={refs[i]}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: digit ? c.primary : c.outlineVariant,
                      backgroundColor: c.surfaceContainerLow,
                      color: c.onSurface,
                    },
                  ]}
                  value={digit}
                  onChangeText={(v) => handleOtpChange(v, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            {error ? <Text style={[styles.errorText, { color: c.error }]}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
              onPress={verifyOtp}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color={c.onPrimary} /> : (
                <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Verify</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.resendBtn, resendCountdown > 0 && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={resendCountdown > 0}
            >
              <Text style={[styles.resendText, { color: resendCountdown > 0 ? c.textMuted : c.primary }]}>
                {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend code'}
              </Text>
            </Pressable>

            <Pressable onPress={() => setStep('phone')}>
              <Text style={[styles.changePhone, { color: c.textMuted }]}>Change phone number</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 40,
    gap: 16,
  },
  backBtn: { paddingVertical: 16, alignSelf: 'flex-start' },
  backText: { fontSize: 24 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 12,
  },
  countryCode: { fontSize: 16, fontWeight: '600' },
  phoneInput: { flex: 1, fontSize: 18 },
  otpRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginVertical: 8 },
  otpBox: {
    width: 48,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: { fontSize: 13, fontWeight: '500' },
  primaryBtn: {
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 4,
  },
  primaryBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
  btnDisabled: { opacity: 0.5 },
  resendBtn: { alignItems: 'center', paddingVertical: 4 },
  resendText: { fontSize: 14, fontWeight: '600' },
  changePhone: { textAlign: 'center', fontSize: 13 },
});
