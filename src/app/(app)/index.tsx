import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Profile, DonationPreferences, RoundupTransaction } from '@/types/app.types';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<DonationPreferences | null>(null);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalDonated, setTotalDonated] = useState(0);
  const [recentRoundups, setRecentRoundups] = useState<RoundupTransaction[]>([]);
  const [charityCount, setCharityCount] = useState(0);
  const [hasLinkedAccount, setHasLinkedAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function loadDashboard() {
    setError(false);
    try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [profileRes, prefsRes, pendingRes, totalRes, recentRes, charityRes, linkedRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('donation_preferences').select('*').eq('user_id', user.id).single(),
      supabase.from('roundup_transactions').select('roundup_amount, status').eq('user_id', user.id).in('status', ['pending', 'included_in_batch']),
      supabase.from('donations').select('amount').eq('user_id', user.id).eq('status', 'completed'),
      supabase.from('roundup_transactions').select('*').eq('user_id', user.id).order('transacted_at', { ascending: false }).limit(10),
      supabase.from('user_charity_allocations').select('id', { count: 'exact' }).eq('user_id', user.id),
      supabase.from('linked_accounts').select('id', { count: 'exact' }).eq('user_id', user.id).eq('is_active', true),
    ]);

    if (profileRes.data) setProfile(profileRes.data as Profile);
    if (prefsRes.data) setPrefs(prefsRes.data as DonationPreferences);

    const balance = (pendingRes.data ?? []).reduce((sum: number, r: any) => sum + (r.roundup_amount ?? 0), 0);
    setPendingBalance(Math.round(balance * 100) / 100);

    const total = (totalRes.data ?? []).reduce((sum: number, d: any) => sum + (d.amount ?? 0), 0);
    setTotalDonated(Math.round(total * 100) / 100);

    setRecentRoundups((recentRes.data ?? []) as RoundupTransaction[]);
    setCharityCount(charityRes.count ?? 0);
    setHasLinkedAccount((linkedRes.count ?? 0) > 0);
    setLoading(false);
    } catch {
      setError(true);
      setLoading(false);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadDashboard(); }, []));

  async function togglePause() {
    if (!prefs) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const newPaused = !prefs.is_paused;
    setPrefs({ ...prefs, is_paused: newPaused });
    await supabase.from('donation_preferences').update({ is_paused: newPaused }).eq('user_id', user.id);
  }

  const threshold = prefs?.threshold_amount ?? 5;
  const progress = Math.min(pendingBalance / threshold, 1);
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Friend';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: c.primary }]}>{getGreeting()}, {firstName}</Text>
            <Text style={[styles.headerSub, { color: c.textMuted }]}>Your quiet impact this month.</Text>
          </View>
          <Pressable
            style={[styles.notifBtn, { backgroundColor: c.surfaceContainerLow }]}
            onPress={() => router.push('/(app)/settings/notifications')}
          >
            <Ionicons name="notifications-outline" size={20} color={c.primary} />
          </Pressable>
        </View>

        {/* Error banner */}
        {error && (
          <View style={[styles.pausedBanner, { backgroundColor: c.errorContainer, borderColor: c.error }]}>
            <Text style={[styles.pausedText, { color: c.error }]}>
              Could not load dashboard.{' '}
              <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }} onPress={loadDashboard}>Tap to retry.</Text>
            </Text>
          </View>
        )}

        {/* Paused banner */}
        {prefs?.is_paused && (
          <View style={[styles.pausedBanner, { backgroundColor: c.warningAmber + '22', borderColor: c.warningAmber }]}>
            <Text style={[styles.pausedText, { color: c.onSurface }]}>
              Giving is paused. Round-ups are not being collected.
            </Text>
          </View>
        )}

        <View style={styles.content}>

          {/* Total Impact Card */}
          <View style={[styles.impactCard, { backgroundColor: c.surfaceWhite }]}>
            <View style={[styles.impactBg, { backgroundColor: c.secondaryContainer }]} />
            <Text style={[styles.impactLabel, { color: c.textMuted }]}>Total Impact</Text>
            <Text style={[styles.impactAmount, { color: c.primary }]}>
              ${totalDonated.toFixed(2)}
            </Text>
            <Text style={[styles.impactSub, { color: c.primary }]}>
              toward sadaqah this month
            </Text>
          </View>

          {/* Bento: Next donation + Balance */}
          <View style={styles.bentoRow}>
            <View style={[styles.bentoCard, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.bentoIcon, { backgroundColor: c.secondaryContainer }]}>
                <Ionicons name="calendar-outline" size={20} color={c.primary} />
              </View>
              <Text style={[styles.bentoLabel, { color: c.textMuted }]}>Processing</Text>
              <Text style={[styles.bentoValue, { color: c.primary }]}>
                {prefs?.schedule === 'weekly_friday' ? 'Friday' : `$${threshold} threshold`}
              </Text>
            </View>

            <View style={[styles.bentoCard, { backgroundColor: c.primary }]}>
              <View style={[styles.bentoIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Ionicons name="wallet-outline" size={20} color={c.onPrimary} />
              </View>
              <Text style={[styles.bentoLabel, { color: c.primaryFixed }]}>Balance</Text>
              <Text style={[styles.bentoValue, { color: c.onPrimary }]}>
                ${pendingBalance.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Monthly Cap Tracker */}
          <View style={[styles.capCard, { backgroundColor: c.surfaceWhite }]}>
            <View style={styles.capHeader}>
              <View>
                <Text style={[styles.capTitle, { color: c.primary }]}>Monthly Cap</Text>
                <Text style={[styles.capSub, { color: c.textMuted }]}>Stay within your goals</Text>
              </View>
              <Text style={[styles.capAmounts, { color: c.primary }]}>
                ${totalDonated.toFixed(0)}
                <Text style={[styles.capTotal, { color: c.textMuted }]}>/${prefs?.monthly_cap ?? 50}</Text>
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: c.surfaceContainerHigh }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: c.primary, width: `${Math.min((totalDonated / (prefs?.monthly_cap ?? 50)) * 100, 100)}%` },
                ]}
              />
            </View>
            <View style={styles.capFooter}>
              <Text style={[styles.capFooterText, { color: c.textMuted }]}>
                {Math.round((totalDonated / (prefs?.monthly_cap ?? 50)) * 100)}% reached
              </Text>
              <Pressable onPress={togglePause} style={styles.pauseBtn}>
                <Ionicons
                  name={prefs?.is_paused ? 'play-circle' : 'pause-circle'}
                  size={16}
                  color={prefs?.is_paused ? c.successFresh : c.danger}
                />
                <Text style={[styles.pauseLink, { color: prefs?.is_paused ? c.successFresh : c.danger }]}>
                  {prefs?.is_paused ? 'Resume' : 'Pause'}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Total Given', value: `$${totalDonated.toFixed(2)}` },
              { label: 'Nonprofits', value: `${charityCount}` },
              { label: 'Round-ups', value: `${recentRoundups.length}` },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: c.surfaceWhite }]}>
                <Text style={[styles.statValue, { color: c.primary }]}>{stat.value}</Text>
                <Text style={[styles.statLabel, { color: c.textMuted }]}>{stat.label}</Text>
              </View>
            ))}
          </View>

          {/* Recent Round-ups */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: c.primary }]}>Recent Round-ups</Text>
              <Pressable onPress={() => router.push('/(app)/giving/')}>
                <Text style={[styles.sectionLink, { color: c.primary }]}>View All</Text>
              </Pressable>
            </View>

            {recentRoundups.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: c.surfaceWhite }]}>
                {hasLinkedAccount ? (
                  <>
                    <Ionicons name="checkmark-circle" size={44} color={c.successFresh} />
                    <Text style={[styles.emptyTitle, { color: c.onSurface }]}>Bank connected</Text>
                    <Text style={[styles.emptyBody, { color: c.textMuted }]}>
                      Your account is linked. Round-ups will appear here as you make purchases.
                    </Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="card-outline" size={44} color={c.primary} />
                    <Text style={[styles.emptyTitle, { color: c.onSurface }]}>Connect your bank</Text>
                    <Text style={[styles.emptyBody, { color: c.textMuted }]}>
                      Link your bank or card to start tracking round-ups automatically.
                    </Text>
                    <Pressable
                      style={[styles.emptyBtn, { backgroundColor: c.primary }]}
                      onPress={() => router.push('/(app)/settings/linked-accounts')}
                    >
                      <Text style={[styles.emptyBtnText, { color: c.onPrimary }]}>Connect Account</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ) : (
              <View style={[styles.roundupList, { backgroundColor: c.surfaceWhite }]}>
                {recentRoundups.slice(0, 5).map((tx, i) => (
                  <View
                    key={tx.id}
                    style={[
                      styles.roundupRow,
                      i < Math.min(recentRoundups.length, 5) - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: c.surfaceContainerHigh,
                      },
                    ]}
                  >
                    <View style={[styles.merchantIcon, { backgroundColor: c.surfaceContainerLow }]}>
                      <Ionicons name="bag-outline" size={22} color={c.primary} />
                    </View>
                    <View style={styles.roundupInfo}>
                      <Text style={[styles.merchantName, { color: c.onSurface }]}>
                        {tx.merchant_name ?? 'Purchase'}
                      </Text>
                      <Text style={[styles.roundupDate, { color: c.textMuted }]}>
                        {new Date(tx.transacted_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })} · ${tx.transaction_amount.toFixed(2)} purchase
                      </Text>
                    </View>
                    <Text style={[styles.roundupAmount, { color: c.primary }]}>
                      +${tx.roundup_amount.toFixed(2)}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 16,
    paddingBottom: 8,
  },
  greeting: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  headerSub: { fontSize: 15, marginTop: 2 },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedBanner: {
    marginHorizontal: DesignSpacing.containerMargin,
    padding: 12,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: 8,
  },
  pausedText: { fontSize: 13, fontWeight: '500' },
  content: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    gap: DesignSpacing.stackGapMd,
  },
  impactCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    gap: 4,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  impactBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 120,
    height: 120,
    borderBottomLeftRadius: 100,
  },
  impactLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  impactAmount: { fontSize: 40, fontWeight: '700', letterSpacing: -1, marginVertical: 4 },
  impactSub: { fontSize: 14, fontWeight: '500' },
  bentoRow: { flexDirection: 'row', gap: DesignSpacing.stackGapMd },
  bentoCard: {
    flex: 1,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    gap: 8,
    aspectRatio: 1,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  bentoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoLabel: { fontSize: 12, fontWeight: '500' },
  bentoValue: { fontSize: 17, fontWeight: '700' },
  capCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    gap: 12,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  capHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  capTitle: { fontSize: 17, fontWeight: '700' },
  capSub: { fontSize: 13, marginTop: 2 },
  capAmounts: { fontSize: 20, fontWeight: '700' },
  capTotal: { fontSize: 14, fontWeight: '400' },
  progressTrack: { height: 12, borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6 },
  capFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  capFooterText: { fontSize: 12 },
  pauseBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pauseLink: { fontSize: 13, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: DesignSpacing.stackGapMd },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, fontWeight: '500', textAlign: 'center' },
  section: { gap: DesignSpacing.stackGapMd },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  sectionLink: { fontSize: 13, fontWeight: '600' },
  emptyState: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700' },
  roundupList: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  roundupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  merchantIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundupInfo: { flex: 1, gap: 2 },
  merchantName: { fontSize: 15, fontWeight: '600' },
  roundupDate: { fontSize: 12 },
  roundupAmount: { fontSize: 15, fontWeight: '700' },
});
