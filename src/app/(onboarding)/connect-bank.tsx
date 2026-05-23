import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import { create, open, dismissLink, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { createLinkToken, exchangeToken } from '@/lib/plaid';

const TRUST_POINTS = [
  { emoji: '🔒', title: 'Bank-level encryption', body: 'Your credentials are never stored by Zaytoon.' },
  { emoji: '🛡️', title: 'Secure Connection', body: 'Industry-standard protocols power every connection.' },
  { emoji: '❌', title: 'Disconnect anytime', body: "Remove your account whenever you'd like." },
];

export default function ConnectBankScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const setLinkedAccount = useOnboardingStore((s) => s.setLinkedAccount);
  const linkedAccountId = useOnboardingStore((s) => s.linkedAccountId);
  const linkedAccountName = useOnboardingStore((s) => s.linkedAccountName);
  const linkedAccountMask = useOnboardingStore((s) => s.linkedAccountMask);
  const [connected, setConnected] = useState(!!linkedAccountId);
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    setLoading(true);
    try {
      const linkToken = await createLinkToken();

      // Initialise the Plaid Link SDK with the token
      create({ token: linkToken });

      // Open the Plaid Link flow
      open({
        onSuccess: async (success: LinkSuccess) => {
          const { publicToken, metadata } = success;
          const institutionId = metadata.institution?.id ?? null;

          try {
            const account = await exchangeToken(publicToken, institutionId);
            setLinkedAccount(account.id, account.institution_name, account.mask);
            setConnected(true);
          } catch (err) {
            Alert.alert('Connection failed', (err as Error).message ?? 'Please try again.');
          } finally {
            setLoading(false);
          }
        },
        onExit: (_exit: LinkExit) => {
          // User cancelled — not an error
          setLoading(false);
        },
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Could not start bank connection.');
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Icon */}
        <View style={styles.iconArea}>
          <View style={[styles.iconCircle, { backgroundColor: c.primaryFixed }]}>
            <Text style={styles.iconEmoji}>🏦</Text>
          </View>
        </View>

        <Text style={[styles.title, { color: c.onSurface }]}>Connect your card securely</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          Zaytoon tracks eligible transactions to calculate round-ups. We only use this to automate your giving.
        </Text>

        {/* Trust points */}
        <View style={styles.trustList}>
          {TRUST_POINTS.map((p) => (
            <View key={p.title} style={[styles.trustRow, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.trustIcon, { backgroundColor: c.secondaryContainer }]}>
                <Text style={styles.trustEmoji}>{p.emoji}</Text>
              </View>
              <View style={styles.trustText}>
                <Text style={[styles.trustTitle, { color: c.onSurface }]}>{p.title}</Text>
                <Text style={[styles.trustBody, { color: c.textMuted }]}>{p.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Connected state */}
        {connected && (
          <View style={[styles.connectedBadge, { backgroundColor: c.primaryFixed }]}>
            <Text style={styles.connectedEmoji}>✅</Text>
            <Text style={[styles.connectedText, { color: c.primary }]}>
              {linkedAccountName} ••••{linkedAccountMask} connected
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom actions */}
      <View style={[styles.footer, { backgroundColor: c.surface }]}>
        {!connected ? (
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleConnect}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={c.onPrimary} />
              : <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Connect securely</Text>
            }
          </Pressable>
        ) : null}

        <Pressable
          style={[styles.primaryBtn, connected ? { backgroundColor: c.primary } : styles.secondaryBtn]}
          onPress={() => router.push('/(onboarding)/preferences')}
        >
          <Text style={[styles.primaryBtnText, connected ? { color: c.onPrimary } : { color: c.primary }]}>
            {connected ? 'Continue →' : 'Skip for now'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 20,
    alignItems: 'center',
  },
  iconArea: { alignItems: 'center', marginTop: 32, marginBottom: 24 },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: { fontSize: 44 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', letterSpacing: -0.3, marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 300, marginBottom: 32 },
  trustList: { gap: DesignSpacing.stackGapMd, width: '100%' },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  trustIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trustEmoji: { fontSize: 20 },
  trustText: { flex: 1, gap: 2 },
  trustTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20 },
  trustBody: { fontSize: 13, lineHeight: 18 },
  connectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 16,
    borderRadius: BorderRadius.xl,
    marginTop: 24,
    width: '100%',
  },
  connectedEmoji: { fontSize: 20 },
  connectedText: { fontSize: 15, fontWeight: '600' },
  footer: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    paddingTop: 12,
    gap: DesignSpacing.stackGapMd,
  },
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
  secondaryBtn: { borderWidth: 0, backgroundColor: 'transparent' },
  primaryBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
