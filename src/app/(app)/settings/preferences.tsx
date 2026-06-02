import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { ThresholdAmount, DonationSchedule } from '@/types/app.types';
import { Ionicons } from '@expo/vector-icons';

const THRESHOLD_OPTIONS: ThresholdAmount[] = [5, 10, 25];
const CAP_OPTIONS = [10, 25, 50, 100];

export default function EditPreferencesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [threshold, setThreshold] = useState<ThresholdAmount>(5);
  const [monthlyCap, setMonthlyCap] = useState(25);
  const [schedule, setSchedule] = useState<DonationSchedule>('threshold');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: prefs } = await supabase
        .from('donation_preferences')
        .select('threshold_amount, monthly_cap, schedule')
        .eq('user_id', user.id)
        .single();

      if (prefs) {
        setThreshold((prefs.threshold_amount as ThresholdAmount) ?? 5);
        setMonthlyCap(prefs.monthly_cap ?? 25);
        setSchedule((prefs.schedule as DonationSchedule) ?? 'threshold');
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSave() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('donation_preferences').upsert({
        user_id: user.id,
        threshold_amount: threshold,
        monthly_cap: monthlyCap,
        schedule,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1200);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
        <ActivityIndicator color={c.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Giving Preferences</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Threshold */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.onSurface }]}>Donate when I reach</Text>
          <Text style={[styles.sectionHint, { color: c.textMuted }]}>
            Round-ups will process once your balance hits this amount.
          </Text>
          <View style={styles.chipRow}>
            {THRESHOLD_OPTIONS.map((t) => (
              <Pressable
                key={t}
                style={[
                  styles.chip,
                  { borderColor: c.outlineVariant, backgroundColor: c.surfaceWhite },
                  threshold === t && { backgroundColor: c.primary, borderColor: c.primary },
                ]}
                onPress={() => setThreshold(t)}
              >
                <Text style={[
                  styles.chipText,
                  { color: c.onSurface },
                  threshold === t && { color: c.onPrimary },
                ]}>
                  ${t}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Monthly cap */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.onSurface }]}>Monthly giving cap</Text>
          <Text style={[styles.sectionHint, { color: c.textMuted }]}>
            We'll pause round-ups once you reach this limit each month.
          </Text>
          <View style={styles.capGrid}>
            {CAP_OPTIONS.map((cap) => (
              <Pressable
                key={cap}
                style={[
                  styles.capCard,
                  { borderColor: c.outlineVariant, backgroundColor: c.surfaceWhite },
                  monthlyCap === cap && { backgroundColor: c.primary, borderColor: c.primary },
                ]}
                onPress={() => setMonthlyCap(cap)}
              >
                <Text style={[
                  styles.capAmount,
                  { color: c.onSurface },
                  monthlyCap === cap && { color: c.onPrimary },
                ]}>
                  ${cap}
                </Text>
                <Text style={[
                  styles.capPer,
                  { color: c.textMuted },
                  monthlyCap === cap && { color: c.onPrimary },
                ]}>
                  / month
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.onSurface }]}>Donation schedule</Text>
          <View style={styles.scheduleStack}>
            {([
              {
                value: 'threshold' as DonationSchedule,
                emoji: '⚡',
                title: 'When I reach my threshold',
                body: 'Process as soon as your balance is ready.',
              },
              {
                value: 'weekly_friday' as DonationSchedule,
                emoji: '🕌',
                title: 'Every Friday',
                body: 'A weekly moment of giving, aligned with Jummah.',
              },
            ] as const).map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.scheduleCard,
                  { borderColor: c.outlineVariant, backgroundColor: c.surfaceWhite },
                  schedule === opt.value && { borderColor: c.primary, backgroundColor: c.primaryFixed },
                ]}
                onPress={() => setSchedule(opt.value)}
              >
                <Text style={styles.scheduleEmoji}>{opt.emoji}</Text>
                <View style={styles.scheduleText}>
                  <Text style={[styles.scheduleTitle, { color: c.onSurface }]}>{opt.title}</Text>
                  <Text style={[styles.scheduleBody, { color: c.textMuted }]}>{opt.body}</Text>
                </View>
                <View style={[
                  styles.radio,
                  { borderColor: schedule === opt.value ? c.primary : c.outlineVariant },
                ]}>
                  {schedule === opt.value && (
                    <View style={[styles.radioInner, { backgroundColor: c.primary }]} />
                  )}
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface }]}>
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: saved ? c.successFresh : c.primary },
            saving && { opacity: 0.7 },
          ]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color={c.onPrimary} />
            : <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>
                {saved ? '✓ Saved' : 'Save Changes'}
              </Text>
          }
        </Pressable>
      </View>
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
  scroll: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 24,
    paddingBottom: 20,
  },
  section: { marginBottom: 28, gap: 8 },
  sectionLabel: { fontSize: 17, fontWeight: '600' },
  sectionHint: { fontSize: 13, lineHeight: 18 },
  chipRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  chip: {
    flex: 1,
    height: 52,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { fontSize: 18, fontWeight: '700' },
  capGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  capCard: {
    width: '47%',
    padding: 20,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  capAmount: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  capPer: { fontSize: 13 },
  scheduleStack: { gap: DesignSpacing.stackGapMd, marginTop: 4 },
  scheduleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
  },
  scheduleEmoji: { fontSize: 24 },
  scheduleText: { flex: 1, gap: 2 },
  scheduleTitle: { fontSize: 15, fontWeight: '600' },
  scheduleBody: { fontSize: 13, lineHeight: 18 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  footer: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    paddingTop: 12,
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
  primaryBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.3 },
});
