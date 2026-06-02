// Notification Preferences screen
// Reads and writes per-type notification toggles from profiles table.

import { View, Text, StyleSheet, ScrollView, Switch, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';

interface NotifPrefs {
  notif_donation_completed: boolean;
  notif_donation_failed: boolean;
  notif_threshold_reached: boolean;
  notif_item_error: boolean;
}

const NOTIF_ROWS: Array<{
  key: keyof NotifPrefs;
  emoji: string;
  title: string;
  subtitle: string;
}> = [
  {
    key: 'notif_donation_completed',
    emoji: '🫒',
    title: 'Donation Processed',
    subtitle: 'When your round-ups are charged and on the way to charity',
  },
  {
    key: 'notif_donation_failed',
    emoji: '⚠️',
    title: 'Donation Failed',
    subtitle: 'If a payment could not be processed — action may be needed',
  },
  {
    key: 'notif_threshold_reached',
    emoji: '🎉',
    title: 'Threshold Reached',
    subtitle: 'When your accumulated round-ups hit your giving threshold',
  },
  {
    key: 'notif_item_error',
    emoji: '🏦',
    title: 'Bank Connection Issue',
    subtitle: 'If your linked account needs to be reconnected',
  },
];

export default function NotificationsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [prefs, setPrefs] = useState<NotifPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<keyof NotifPrefs | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select(
          'notif_donation_completed, notif_donation_failed, notif_threshold_reached, notif_item_error'
        )
        .eq('id', user.id)
        .single();

      if (data) {
        setPrefs({
          notif_donation_completed: data.notif_donation_completed ?? true,
          notif_donation_failed:    data.notif_donation_failed ?? true,
          notif_threshold_reached:  data.notif_threshold_reached ?? true,
          notif_item_error:         data.notif_item_error ?? true,
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleToggle(key: keyof NotifPrefs, value: boolean) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    setSaving(key);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('profiles').update({ [key]: value }).eq('id', user.id);
    }
    setSaving(null);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Notifications</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>Alert Preferences</Text>

        {loading ? (
          <ActivityIndicator color={c.primary} style={{ marginTop: 32 }} />
        ) : (
          <View style={[styles.card, { backgroundColor: c.surfaceWhite }]}>
            {NOTIF_ROWS.map((row, idx) => (
              <View
                key={row.key}
                style={[
                  styles.prefRow,
                  idx < NOTIF_ROWS.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: c.outlineVariant,
                  },
                ]}
              >
                <View style={[styles.rowIcon, { backgroundColor: c.secondaryContainer }]}>
                  <Text style={styles.rowEmoji}>{row.emoji}</Text>
                </View>
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowTitle, { color: c.onSurface }]}>{row.title}</Text>
                  <Text style={[styles.rowSubtitle, { color: c.textMuted }]}>{row.subtitle}</Text>
                </View>
                {saving === row.key ? (
                  <ActivityIndicator color={c.primary} size="small" style={{ width: 51 }} />
                ) : (
                  <Switch
                    value={prefs?.[row.key] ?? true}
                    onValueChange={(val) => handleToggle(row.key, val)}
                    trackColor={{ false: c.outlineVariant, true: c.primary }}
                    thumbColor="#fff"
                  />
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.note, { color: c.textMuted }]}>
          Notification delivery requires a physical device and may take a few moments after an event occurs.
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: DesignSpacing.cardPadding,
    paddingVertical: 16,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowEmoji: { fontSize: 20 },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSubtitle: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', paddingHorizontal: 8 },
});
