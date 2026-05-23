import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/lib/supabase';

export default function CompleteScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const store = useOnboardingStore();
  const [loading, setLoading] = useState(false);

  async function handleStartGiving() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ onboarding_complete: true }).eq('id', user.id);
    }
    store.reset();
    setLoading(false);
    router.replace('/(app)/');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.backgroundWarm }]}>
      <View style={styles.container}>
        {/* Celebration */}
        <View style={styles.celebration}>
          <Text style={styles.celebrationEmoji}>🎉</Text>
          <Text style={[styles.title, { color: c.primary }]}>You're all set!</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>
            Your quiet impact starts now. Every purchase brings you closer to your next donation.
          </Text>
        </View>

        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: c.surfaceWhite }]}>
          <Text style={[styles.summaryTitle, { color: c.onSurface }]}>Your setup</Text>

          <View style={styles.summaryRows}>
            <SummaryRow
              emoji="🏦"
              label="Connected account"
              value={store.linkedAccountId ? `${store.linkedAccountName} ••••${store.linkedAccountMask}` : 'Not connected yet'}
              colors={c}
            />
            <SummaryRow
              emoji="⚡"
              label="Donate when I reach"
              value={`$${store.threshold}`}
              colors={c}
            />
            <SummaryRow
              emoji="🛑"
              label="Monthly cap"
              value={`$${store.monthlyCap}`}
              colors={c}
            />
            <SummaryRow
              emoji={store.schedule === 'weekly_friday' ? '🕌' : '⚡'}
              label="Schedule"
              value={store.schedule === 'weekly_friday' ? 'Every Friday' : 'When threshold reached'}
              colors={c}
            />
            <SummaryRow
              emoji="🤲"
              label="Nonprofits"
              value={`${store.selectedCharityIds.length} selected`}
              colors={c}
            />
          </View>
        </View>

        {/* Trust note */}
        <View style={[styles.trustNote, { backgroundColor: c.primaryFixed }]}>
          <Text style={[styles.trustText, { color: c.primary }]}>
            🛡️ Your donations only go to verified nonprofit organizations. We never take a cut.
          </Text>
        </View>

        <Pressable
          style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.disabled]}
          onPress={handleStartGiving}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={c.onPrimary} />
          ) : (
            <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Start Giving 🫒</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({ emoji, label, value, colors: c }: {
  emoji: string;
  label: string;
  value: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <Text style={[styles.summaryLabel, { color: c.textMuted }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: c.onSurface }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    gap: DesignSpacing.stackGapLg,
    justifyContent: 'center',
  },
  celebration: { alignItems: 'center', gap: 12 },
  celebrationEmoji: { fontSize: 64 },
  title: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 24, textAlign: 'center', maxWidth: 280 },
  summaryCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    gap: DesignSpacing.stackGapMd,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  summaryRows: { gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  summaryEmoji: { fontSize: 16, width: 24 },
  summaryLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  trustNote: {
    padding: 16,
    borderRadius: BorderRadius.xl,
  },
  trustText: { fontSize: 13, lineHeight: 20, fontWeight: '500', textAlign: 'center' },
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
  primaryBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },
  disabled: { opacity: 0.6 },
});
