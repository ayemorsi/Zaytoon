import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { RoundupTransaction, DonationBatch } from '@/types/app.types';

type Filter = 'all' | 'pending' | 'completed';

export default function GivingScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [filter, setFilter] = useState<Filter>('all');
  const [roundups, setRoundups] = useState<RoundupTransaction[]>([]);
  const [batches, setBatches] = useState<DonationBatch[]>([]);
  const [monthlyTotal, setMonthlyTotal] = useState(0);
  const [error, setError] = useState(false);

  async function load() {
    setError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [ruRes, batchRes, monthRes] = await Promise.all([
        supabase.from('roundup_transactions').select('*').eq('user_id', user.id).order('transacted_at', { ascending: false }).limit(30),
        supabase.from('donation_batches').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('donations').select('amount').eq('user_id', user.id).eq('status', 'completed').gte('created_at', startOfMonth),
      ]);

      setRoundups((ruRes.data ?? []) as RoundupTransaction[]);
      setBatches((batchRes.data ?? []) as DonationBatch[]);
      const total = (monthRes.data ?? []).reduce((s: number, d: any) => s + d.amount, 0);
      setMonthlyTotal(Math.round(total * 100) / 100);
    } catch {
      setError(true);
    }
  }

  useEffect(() => { load(); }, []);

  const pendingBalance = roundups
    .filter((r) => r.status === 'pending')
    .reduce((s, r) => s + r.roundup_amount, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.onSurface }]}>Giving History</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Track your everyday impact.</Text>
        </View>

        {error && (
          <Pressable
            style={[styles.errorBanner, { backgroundColor: c.errorContainer }]}
            onPress={load}
          >
            <Text style={[styles.errorText, { color: c.error }]}>
              Could not load giving history. Tap to retry.
            </Text>
          </Pressable>
        )}

        {/* Summary Card */}
        <View style={styles.content}>
          <View style={[styles.summaryCard, { backgroundColor: c.primary }]}>
            <View style={[styles.summaryBg, { backgroundColor: c.primaryContainer }]} />
            <Text style={[styles.summaryLabel, { color: c.primaryFixed }]}>Total donated this month</Text>
            <Text style={[styles.summaryAmount, { color: c.onPrimary }]}>${monthlyTotal.toFixed(2)}</Text>
            <View style={styles.summaryFooter}>
              <Text style={[styles.summaryFooterText, { color: c.primaryFixedDim }]}>Supporting verified nonprofits</Text>
              <Text style={styles.verifiedIcon}>✓</Text>
            </View>
          </View>

          {/* Filters */}
          <View style={styles.filterRow}>
            {(['all', 'pending', 'completed'] as Filter[]).map((f) => (
              <Pressable
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: c.surfaceContainerLow },
                  filter === f && { backgroundColor: c.primary },
                ]}
                onPress={() => setFilter(f)}
              >
                <Text style={[
                  styles.filterText,
                  { color: c.textMuted },
                  filter === f && { color: c.onPrimary },
                ]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Pending Round-ups */}
          {(filter === 'all' || filter === 'pending') && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: c.onSurface }]}>Pending Round-ups</Text>
                <View style={[styles.badge, { backgroundColor: c.surfaceContainer }]}>
                  <Text style={[styles.badgeText, { color: c.textMuted }]}>This Week</Text>
                </View>
              </View>
              {roundups.filter((r) => r.status === 'pending' || r.status === 'included_in_batch').length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: c.surfaceWhite }]}>
                  <Text style={[styles.emptyText, { color: c.textMuted }]}>No pending round-ups yet.</Text>
                </View>
              ) : (
                <View style={[styles.listCard, { backgroundColor: c.surfaceWhite }]}>
                  {roundups.filter((r) => r.status === 'pending' || r.status === 'included_in_batch').slice(0, 10).map((tx, i, arr) => (
                    <View
                      key={tx.id}
                      style={[styles.txRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceContainerHigh }]}
                    >
                      <View style={[styles.txIcon, { backgroundColor: tx.status === 'included_in_batch' ? c.tertiaryFixed : c.secondaryContainer }]}>
                        <Ionicons name={tx.status === 'included_in_batch' ? 'time-outline' : 'bag-outline'} size={22} color={c.primary} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={[styles.txName, { color: c.onSurface }]}>{tx.merchant_name ?? 'Purchase'}</Text>
                        <Text style={[styles.txDate, { color: c.textMuted }]}>
                          {new Date(tx.transacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {' · '}${tx.transaction_amount.toFixed(2)} purchase
                          {tx.status === 'included_in_batch' ? ' · Processing' : ''}
                        </Text>
                      </View>
                      <Text style={[styles.txAmount, { color: c.primary }]}>+${tx.roundup_amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Processed Donations */}
          {(filter === 'all' || filter === 'completed') && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionTitle, { color: c.onSurface }]}>Processed Donations</Text>
                <View style={[styles.badge, { backgroundColor: c.surfaceContainer }]}>
                  <Text style={[styles.badgeText, { color: c.textMuted }]}>Completed</Text>
                </View>
              </View>
              {batches.length === 0 ? (
                <View style={[styles.emptyCard, { backgroundColor: c.surfaceWhite }]}>
                  <Text style={[styles.emptyText, { color: c.textMuted }]}>No donations processed yet.</Text>
                </View>
              ) : (
                <View style={[styles.listCard, { backgroundColor: c.surfaceWhite }]}>
                  {batches.map((batch, i, arr) => {
                    const isCompleted = batch.status === 'completed';
                    const isFailed = batch.status === 'failed';
                    const iconName = isCompleted ? 'checkmark-circle' : isFailed ? 'close-circle' : 'time-outline';
                    const iconColor = isCompleted ? c.successFresh : isFailed ? c.error : c.warningAmber;
                    const iconBg = isCompleted ? c.tertiaryFixed : isFailed ? c.errorContainer : c.surfaceContainer;
                    const statusLabel = isCompleted ? '✓ Sent' : isFailed ? 'Failed' : 'Processing…';
                    const statusColor = isCompleted ? c.successFresh : isFailed ? c.error : c.warningAmber;
                    return (
                      <View
                        key={batch.id}
                        style={[styles.txRow, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.surfaceContainerHigh }]}
                      >
                        <View style={[styles.txIcon, { backgroundColor: iconBg }]}>
                          <Ionicons name={iconName} size={22} color={iconColor} />
                        </View>
                        <View style={styles.txInfo}>
                          <Text style={[styles.txName, { color: c.onSurface }]}>
                            {batch.trigger_type === 'scheduled_friday' ? 'Friday Donation' : 'Threshold Donation'}
                          </Text>
                          <Text style={[styles.txDate, { color: c.textMuted }]}>
                            {batch.processed_at ? new Date(batch.processed_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : new Date(batch.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                          </Text>
                        </View>
                        <View style={styles.txRight}>
                          <Text style={[styles.txAmount, { color: c.onSurface }]}>${batch.total_amount.toFixed(2)}</Text>
                          <Text style={[styles.txStatus, { color: statusColor }]}>{statusLabel}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {/* Fee explanation */}
          <View style={[styles.infoNote, { backgroundColor: c.surfaceContainerLow }]}>
            <Ionicons name="information-circle-outline" size={18} color={c.textMuted} />
            <Text style={[styles.infoText, { color: c.textMuted }]}>
              Round-ups are grouped and processed together to maximize the sadaqah that reaches your chosen causes.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 20,
    paddingBottom: 4,
    gap: 4,
  },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14 },
  content: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    gap: DesignSpacing.stackGapMd,
    marginTop: 16,
  },
  summaryCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    gap: 4,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  summaryBg: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.5,
  },
  summaryLabel: { fontSize: 13, fontWeight: '500' },
  summaryAmount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, marginVertical: 4 },
  summaryFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  summaryFooterText: { fontSize: 13 },
  verifiedIcon: { color: '#fff', fontSize: 14 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
  },
  filterText: { fontSize: 13, fontWeight: '600' },
  section: { gap: DesignSpacing.stackGapSm },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  badgeText: { fontSize: 12, fontWeight: '500' },
  emptyCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14 },
  listCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  txIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1, gap: 2 },
  txName: { fontSize: 15, fontWeight: '600' },
  txDate: { fontSize: 12 },
  txRight: { alignItems: 'flex-end', gap: 2 },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txStatus: { fontSize: 11, fontWeight: '600' },
  infoNote: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderRadius: BorderRadius.xl,
    alignItems: 'flex-start',
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 18 },
  errorBanner: {
    marginHorizontal: DesignSpacing.containerMargin,
    padding: 12,
    borderRadius: BorderRadius.lg,
    marginBottom: 4,
  },
  errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
