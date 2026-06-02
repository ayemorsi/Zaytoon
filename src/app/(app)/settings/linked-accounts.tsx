// Linked Accounts screen — manage connected bank accounts
// Note: react-native-plaid-link-sdk requires EAS Build (not Expo Go)

import {
  View, Text, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { create, open, LinkSuccess, LinkExit } from 'react-native-plaid-link-sdk';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { createLinkToken, exchangeToken } from '@/lib/plaid';
import type { LinkedAccount } from '@/types/app.types';
import { Ionicons } from '@expo/vector-icons';

export default function LinkedAccountsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [accounts, setAccounts] = useState<LinkedAccount[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [addingAccount, setAddingAccount] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [reconnectingId, setReconnectingId] = useState<string | null>(null);

  async function loadAccounts() {
    setLoadingData(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoadingData(false); return; }

    // Load all accounts (active and inactive) so user can reconnect broken ones
    const { data } = await supabase
      .from('linked_accounts')
      .select('id, institution_name, mask, account_type, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setAccounts((data ?? []) as LinkedAccount[]);
    setLoadingData(false);
  }

  useEffect(() => { loadAccounts(); }, []);

  async function handleRemove(accountId: string, institutionName: string) {
    Alert.alert(
      'Remove Account',
      `Remove ${institutionName}? Round-ups from this account will stop.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(accountId);
            await supabase
              .from('linked_accounts')
              .update({ is_active: false })
              .eq('id', accountId);
            await loadAccounts();
            setRemovingId(null);
          },
        },
      ]
    );
  }

  async function openPlaidLink(linkedAccountId?: string) {
    try {
      let linkToken: string;
      try {
        linkToken = await createLinkToken(linkedAccountId);
      } catch (err) {
        Alert.alert('Token Error', (err as Error).message ?? 'Could not get link token from server.');
        setAddingAccount(false);
        setReconnectingId(null);
        return;
      }
      create({ token: linkToken });

      open({
        onSuccess: async (success: LinkSuccess) => {
          const { publicToken, metadata } = success;
          const institutionId = metadata.institution?.id ?? null;
          try {
            await exchangeToken(publicToken, institutionId);
            await loadAccounts();
          } catch (err) {
            Alert.alert('Connection failed', (err as Error).message ?? 'Please try again.');
          } finally {
            setAddingAccount(false);
            setReconnectingId(null);
          }
        },
        onExit: (_exit: LinkExit) => {
          setAddingAccount(false);
          setReconnectingId(null);
        },
      });
    } catch (err) {
      Alert.alert('Error', (err as Error).message ?? 'Could not start bank connection.');
      setAddingAccount(false);
      setReconnectingId(null);
    }
  }

  async function handleAddAccount() {
    setAddingAccount(true);
    await openPlaidLink();
  }

  async function handleReconnect(accountId: string) {
    setReconnectingId(accountId);
    await openPlaidLink(accountId);
  }

  const activeAccounts = accounts.filter((a) => a.is_active);
  const inactiveAccounts = accounts.filter((a) => !a.is_active);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Linked Accounts</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Connected Accounts</Text>

        {loadingData ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
        ) : activeAccounts.length === 0 && inactiveAccounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: c.surfaceWhite }]}>
            <Text style={styles.emptyEmoji}>🏦</Text>
            <Text style={[styles.emptyTitle, { color: c.onSurface }]}>No accounts connected</Text>
            <Text style={[styles.emptyBody, { color: c.textMuted }]}>
              Connect a bank account to start automating your round-ups.
            </Text>
          </View>
        ) : (
          <>
            {activeAccounts.length > 0 && (
              <View style={[styles.card, { backgroundColor: c.surfaceWhite }]}>
                {activeAccounts.map((acc, idx) => (
                  <View
                    key={acc.id}
                    style={[
                      styles.accountRow,
                      idx < activeAccounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.outlineVariant },
                    ]}
                  >
                    <View style={[styles.bankIcon, { backgroundColor: c.secondaryContainer }]}>
                      <Text style={styles.bankEmoji}>🏦</Text>
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={[styles.bankName, { color: c.onSurface }]}>{acc.institution_name}</Text>
                      <Text style={[styles.accountMeta, { color: c.textMuted }]}>
                        {acc.account_type} ••••{acc.mask}
                      </Text>
                    </View>
                    {removingId === acc.id ? (
                      <ActivityIndicator color={c.error} size="small" />
                    ) : (
                      <Pressable
                        style={styles.removeBtn}
                        onPress={() => handleRemove(acc.id, acc.institution_name)}
                        hitSlop={8}
                      >
                        <Text style={[styles.removeText, { color: c.error }]}>Remove</Text>
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
            )}

            {inactiveAccounts.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: c.textMuted, marginTop: 4 }]}>
                  Needs Attention
                </Text>
                <View style={[styles.card, { backgroundColor: c.surfaceWhite }]}>
                  {inactiveAccounts.map((acc, idx) => (
                    <View
                      key={acc.id}
                      style={[
                        styles.accountRow,
                        idx < inactiveAccounts.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.outlineVariant },
                      ]}
                    >
                      <View style={[styles.bankIcon, { backgroundColor: c.errorContainer }]}>
                        <Text style={styles.bankEmoji}>⚠️</Text>
                      </View>
                      <View style={styles.accountInfo}>
                        <Text style={[styles.bankName, { color: c.onSurface }]}>{acc.institution_name}</Text>
                        <Text style={[styles.accountMeta, { color: c.error }]}>
                          Connection lost · ••••{acc.mask}
                        </Text>
                      </View>
                      {reconnectingId === acc.id ? (
                        <ActivityIndicator color={c.primary} size="small" />
                      ) : (
                        <Pressable
                          style={[styles.reconnectBtn, { backgroundColor: c.primaryContainer }]}
                          onPress={() => handleReconnect(acc.id)}
                          hitSlop={8}
                        >
                          <Text style={[styles.reconnectText, { color: c.primary }]}>Reconnect</Text>
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* Add another account */}
        <Pressable
          style={[
            styles.addBtn,
            { borderColor: c.primary, opacity: addingAccount ? 0.6 : 1 },
          ]}
          onPress={handleAddAccount}
          disabled={addingAccount}
        >
          {addingAccount
            ? <ActivityIndicator color={c.primary} />
            : (
              <>
                <Text style={[styles.addBtnPlus, { color: c.primary }]}>+</Text>
                <Text style={[styles.addBtnText, { color: c.primary }]}>Add another account</Text>
              </>
            )
          }
        </Pressable>

        <Text style={[styles.disclaimer, { color: c.textMuted }]}>
          Zaytoon uses Plaid to securely connect to your bank. Your login credentials are never stored.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 60 },
  backText: { fontSize: 17, fontWeight: '500' },
  navTitle: { fontSize: 17, fontWeight: '700' },
  content: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 24,
    paddingBottom: 48,
    gap: DesignSpacing.stackGapMd,
  },
  sectionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: DesignSpacing.cardPadding,
    paddingVertical: 16,
  },
  bankIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankEmoji: { fontSize: 22 },
  accountInfo: { flex: 1 },
  bankName: { fontSize: 15, fontWeight: '600' },
  accountMeta: { fontSize: 13, marginTop: 2 },
  removeBtn: { paddingVertical: 4 },
  removeText: { fontSize: 14, fontWeight: '600' },
  reconnectBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: BorderRadius.md },
  reconnectText: { fontSize: 13, fontWeight: '700' },
  emptyCard: {
    borderRadius: BorderRadius.xxl,
    padding: 32,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  addBtnPlus: { fontSize: 22, fontWeight: '300' },
  addBtnText: { fontSize: 15, fontWeight: '600' },
  disclaimer: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});
