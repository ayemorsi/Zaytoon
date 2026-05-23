import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Profile, DonationPreferences, LinkedAccount } from '@/types/app.types';

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<DonationPreferences | null>(null);
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccount[]>([]);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [pRes, prefRes, accRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('donation_preferences').select('*').eq('user_id', user.id).single(),
        supabase.from('linked_accounts').select('*').eq('user_id', user.id).eq('is_active', true),
      ]);
      if (pRes.data) setProfile(pRes.data as Profile);
      if (prefRes.data) setPrefs(prefRes.data as DonationPreferences);
      setLinkedAccounts((accRes.data ?? []) as LinkedAccount[]);
    }
    load();
  }, []);

  async function togglePause(val: boolean) {
    if (!prefs) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updated = { ...prefs, is_paused: val };
    setPrefs(updated);
    await supabase.from('donation_preferences').update({ is_paused: val }).eq('user_id', user.id);
  }

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'This cannot be undone',
              'All your giving history, linked accounts, and preferences will be permanently deleted.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: confirmDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  }

  async function confirmDeleteAccount() {
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { await supabase.auth.signOut(); return; }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
      const res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        Alert.alert('Error', data.error ?? 'Could not delete account. Please try again.');
        setDeletingAccount(false);
        return;
      }

      await supabase.auth.signOut();
    } catch {
      Alert.alert('Error', 'Could not delete account. Please try again.');
      setDeletingAccount(false);
    }
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'ZA';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.topBar}>
          <View style={[styles.avatar, { backgroundColor: c.secondaryContainer }]}>
            <Text style={[styles.avatarText, { color: c.primary }]}>{initials}</Text>
          </View>
          <Text style={[styles.wordmark, { color: c.primary }]}>Zaytoon</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.pageTitle, { color: c.onSurface }]}>Settings</Text>

          {/* Account group */}
          <SettingsGroup title="Account" colors={c}>
            <SettingsRow
              emoji="👤"
              title="Account Information"
              subtitle={profile?.full_name ?? 'Loading…'}
              chevron
              onPress={() => router.push('/(app)/settings/profile')}
              colors={c}
            />
            <SettingsRow
              emoji="🤲"
              title="My Charities"
              subtitle="Edit your nonprofit selections"
              chevron
              onPress={() => router.push('/(app)/settings/charities')}
              colors={c}
            />
            <SettingsRow
              emoji="🏦"
              title="Connected Card"
              subtitle={linkedAccounts.length > 0
                ? `${linkedAccounts[0].institution_name} ••••${linkedAccounts[0].mask}`
                : 'No account connected'}
              chevron
              onPress={() => router.push('/(app)/settings/linked-accounts')}
              colors={c}
              last
            />
          </SettingsGroup>

          {/* Giving */}
          <SettingsGroup title="Giving Activity" colors={c}>
            <SettingsRow
              emoji="💰"
              title="Giving Preferences"
              subtitle={prefs ? `$${prefs.threshold_amount} threshold · $${prefs.monthly_cap}/mo cap` : '—'}
              chevron
              onPress={() => router.push('/(app)/settings/preferences')}
              colors={c}
            />
            <View style={[styles.settingsRow, styles.last]}>
              <View style={[styles.rowIcon, { backgroundColor: c.surfaceContainer }]}>
                <Text>⏸</Text>
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowTitle, { color: c.onSurface }]}>Pause Round-ups</Text>
                <Text style={[styles.rowSub, { color: c.textMuted }]}>Temporarily halt giving</Text>
              </View>
              <Switch
                value={prefs?.is_paused ?? false}
                onValueChange={togglePause}
                trackColor={{ false: c.outlineVariant, true: c.primary }}
                thumbColor="#fff"
              />
            </View>
          </SettingsGroup>

          {/* Preferences */}
          <SettingsGroup title="Preferences & Documents" colors={c}>
            <SettingsRow
              emoji="🔔"
              title="Notification Preferences"
              chevron
              onPress={() => router.push('/(app)/settings/notifications')}
              colors={c}
            />
            <SettingsRow
              emoji="🧾"
              title="Tax Receipts"
              subtitle="Download annual summaries"
              chevron
              onPress={() => router.push('/(app)/settings/tax-receipts')}
              colors={c}
              last
            />
          </SettingsGroup>

          {/* Support */}
          <SettingsGroup title="Support" colors={c}>
            <SettingsRow
              emoji="❓"
              title="Help & FAQ"
              chevron
              onPress={() => {}}
              colors={c}
              last
            />
          </SettingsGroup>

          {/* Sign out */}
          <Pressable
            style={[styles.signOutBtn, { borderColor: c.error }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutText, { color: c.error }]}>Sign Out</Text>
          </Pressable>

          {/* Danger Zone */}
          <View style={styles.dangerZone}>
            <Text style={[styles.dangerLabel, { color: c.textMuted }]}>Danger Zone</Text>
            <Pressable
              style={[styles.deleteBtn, { borderColor: c.error }]}
              onPress={handleDeleteAccount}
              disabled={deletingAccount}
            >
              {deletingAccount
                ? <ActivityIndicator color={c.error} size="small" />
                : <Text style={[styles.signOutText, { color: c.error }]}>Delete Account</Text>
              }
            </Pressable>
            <Text style={[styles.deleteNote, { color: c.textMuted }]}>
              Permanently deletes your account and all giving history. This cannot be undone.
            </Text>
          </View>

          <Text style={[styles.version, { color: c.outline }]}>Zaytoon v1.0.0 · For the sake of Allah</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsGroup({ title, children, colors: c }: { title: string; children: React.ReactNode; colors: typeof Colors.light }) {
  return (
    <View style={styles.group}>
      <Text style={[styles.groupTitle, { color: c.textMuted }]}>{title}</Text>
      <View style={[styles.groupCard, { backgroundColor: c.surfaceWhite }]}>
        {children}
      </View>
    </View>
  );
}

function SettingsRow({ emoji, title, subtitle, chevron, onPress, colors: c, last }: {
  emoji: string; title: string; subtitle?: string; chevron?: boolean;
  onPress: () => void; colors: typeof Colors.light; last?: boolean;
}) {
  return (
    <Pressable
      style={[styles.settingsRow, !last && { borderBottomWidth: 1, borderBottomColor: c.surfaceContainerHigh }]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: c.surfaceContainer }]}>
        <Text>{emoji}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: c.onSurface }]}>{title}</Text>
        {subtitle && <Text style={[styles.rowSub, { color: c.textMuted }]}>{subtitle}</Text>}
      </View>
      {chevron && <Text style={[styles.chevron, { color: c.outline }]}>›</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 12,
    paddingBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  wordmark: { fontSize: 20, fontWeight: '700', letterSpacing: -0.3 },
  content: { paddingHorizontal: DesignSpacing.containerMargin, paddingBottom: 40, gap: DesignSpacing.stackGapLg },
  pageTitle: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5, marginTop: 8 },
  group: { gap: 8 },
  groupTitle: { fontSize: 14, fontWeight: '600', paddingHorizontal: 4 },
  groupCard: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: DesignSpacing.cardPadding,
    paddingVertical: 14,
    gap: 14,
  },
  last: {},
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowSub: { fontSize: 13, marginTop: 2 },
  chevron: { fontSize: 22, fontWeight: '300' },
  signOutBtn: {
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: { fontSize: 14, fontWeight: '700' },
  dangerZone: { gap: 8 },
  dangerLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 4 },
  deleteBtn: {
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteNote: { fontSize: 12, lineHeight: 16, textAlign: 'center', paddingHorizontal: 8 },
  version: { textAlign: 'center', fontSize: 12 },
});
