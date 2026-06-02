import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Nonprofit } from '@/types/app.types';
import { Ionicons } from '@expo/vector-icons';

const CAUSE_LABELS: Record<string, string> = {
  food: 'Food', medical: 'Medical', education: 'Education',
  disaster_relief: 'Disaster Relief', masjids: 'Masjids', orphans: 'Orphans',
  clean_water: 'Water', refugees: 'Refugees',
};

const SEED_NONPROFITS: Nonprofit[] = [
  { id: '1', name: 'Islamic Relief USA', slug: 'islamic-relief-usa', description: 'Providing emergency relief and sustainable development to communities in need.', mission: '', logo_url: null, website_url: null, ein: '95-4453134', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'disaster_relief'] },
  { id: '2', name: 'Helping Hand for Relief & Development', slug: 'hhrd', description: 'Providing humanitarian aid and development programs worldwide.', mission: '', logo_url: null, website_url: null, ein: '36-4422146', is_verified: true, is_active: true, cause_categories: ['food', 'education', 'orphans'] },
  { id: '3', name: 'Zakat Foundation of America', slug: 'zakat-foundation', description: 'Serving the poor and marginalized through zakat and sadaqah.', mission: '', logo_url: null, website_url: null, ein: '36-4476204', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'refugees'] },
  { id: '4', name: 'Penny Appeal USA', slug: 'penny-appeal-usa', description: 'Tackling poverty and disease with a focus on water, food, and education.', mission: '', logo_url: null, website_url: null, ein: '82-1751907', is_verified: true, is_active: true, cause_categories: ['clean_water', 'education', 'orphans'] },
  { id: '5', name: 'Masjid Al-Nour Foundation', slug: 'masjid-al-nour', description: 'Supporting mosque-based community programs and spiritual education.', mission: '', logo_url: null, website_url: null, ein: '84-3625910', is_verified: true, is_active: true, cause_categories: ['masjids', 'education'] },
];

export default function EditCharitiesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [nonprofits, setNonprofits] = useState<Nonprofit[]>(SEED_NONPROFITS);
  const [selected, setSelected] = useState<string[]>([]);
  const [splitMap, setSplitMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [npsRes, allocRes] = await Promise.all([
        supabase.from('nonprofits').select('*').eq('is_active', true).eq('is_verified', true),
        supabase.from('user_charity_allocations').select('nonprofit_id, split_percentage').eq('user_id', user.id),
      ]);

      if (npsRes.data && npsRes.data.length > 0) {
        setNonprofits(npsRes.data as Nonprofit[]);
      }
      const allocs = allocRes.data ?? [];
      const ids = allocs.map((a) => a.nonprofit_id);
      setSelected(ids);

      // If stored percentages are non-zero use them, otherwise default to equal split
      const hasCustom = allocs.some((a) => a.split_percentage > 0);
      if (hasCustom) {
        const map: Record<string, number> = {};
        allocs.forEach((a) => { map[a.nonprofit_id] = a.split_percentage; });
        setSplitMap(map);
      } else if (ids.length > 0) {
        const equal = Math.floor(100 / ids.length);
        const remainder = 100 - equal * ids.length;
        const map: Record<string, number> = {};
        ids.forEach((id, i) => { map[id] = equal + (i === 0 ? remainder : 0); });
        setSplitMap(map);
      }

      setLoading(false);
    }
    load();
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      // Rebalance split to equal whenever selection changes
      if (next.length === 0) { setSplitMap({}); return next; }
      const equal = Math.floor(100 / next.length);
      const remainder = 100 - equal * next.length;
      const map: Record<string, number> = {};
      next.forEach((sid, i) => { map[sid] = equal + (i === 0 ? remainder : 0); });
      setSplitMap(map);
      return next;
    });
  }

  function adjustSplit(id: string, delta: number) {
    setSplitMap((prev) => {
      const current = prev[id] ?? 0;
      const next = Math.max(0, Math.min(100, current + delta));
      return { ...prev, [id]: next };
    });
  }

  const splitTotal = selected.reduce((s, id) => s + (splitMap[id] ?? 0), 0);
  const splitValid = selected.length === 0 || splitTotal === 100;

  async function handleSave() {
    if (selected.length === 0 || !splitValid) return;
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('user_charity_allocations').delete().eq('user_id', user.id);
      await supabase.from('user_charity_allocations').insert(
        selected.map((id) => ({
          user_id: user.id,
          nonprofit_id: id,
          split_percentage: splitMap[id] ?? 0,
        }))
      );
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => { setSaved(false); router.back(); }, 1200);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>My Charities</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 48 }} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.subtitle, { color: c.textMuted }]}>
              Select nonprofits and adjust how your donations are split between them.
            </Text>

            <View style={styles.list}>
              {nonprofits.map((np) => {
                const isSelected = selected.includes(np.id);
                return (
                  <Pressable
                    key={np.id}
                    style={[
                      styles.card,
                      { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant },
                      isSelected && { borderColor: c.primary },
                    ]}
                    onPress={() => toggle(np.id)}
                  >
                    <View style={styles.cardHeader}>
                      <View style={[styles.logoPlaceholder, { backgroundColor: c.secondaryContainer }]}>
                        <Text style={styles.logoEmoji}>🤲</Text>
                      </View>
                      <View style={styles.cardInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.cardName, { color: c.onSurface }]}>{np.name}</Text>
                          {np.is_verified && (
                            <Text style={[styles.verifiedBadge, { color: c.warningAmber }]}>★</Text>
                          )}
                        </View>
                        <View style={styles.tags}>
                          {(np.cause_categories ?? []).slice(0, 3).map((cat) => (
                            <View key={cat} style={[styles.tag, { backgroundColor: c.surfaceContainer }]}>
                              <Text style={[styles.tagText, { color: c.textMuted }]}>
                                {CAUSE_LABELS[cat] ?? cat}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                      <View style={[
                        styles.selectCircle,
                        { borderColor: isSelected ? c.primary : c.outlineVariant },
                        isSelected && { backgroundColor: c.primary },
                      ]}>
                        {isSelected && <Text style={styles.selectCheck}>✓</Text>}
                      </View>
                    </View>
                    <Text style={[styles.cardDesc, { color: c.textMuted }]} numberOfLines={2}>
                      {np.description}
                    </Text>
                    {np.ein && (
                      <Text style={[styles.ein, { color: c.outline }]}>EIN: {np.ein}</Text>
                    )}
                    {isSelected && (
                      <View style={[styles.splitRow, { borderTopColor: c.outlineVariant }]}>
                        <Text style={[styles.splitLabel, { color: c.textMuted }]}>Split</Text>
                        <Pressable
                          style={[styles.splitBtn, { backgroundColor: c.surfaceContainer }]}
                          onPress={() => adjustSplit(np.id, -5)}
                          hitSlop={8}
                        >
                          <Text style={[styles.splitBtnText, { color: c.onSurface }]}>−</Text>
                        </Pressable>
                        <Text style={[styles.splitValue, { color: c.primary }]}>
                          {splitMap[np.id] ?? 0}%
                        </Text>
                        <Pressable
                          style={[styles.splitBtn, { backgroundColor: c.surfaceContainer }]}
                          onPress={() => adjustSplit(np.id, 5)}
                          hitSlop={8}
                        >
                          <Text style={[styles.splitBtnText, { color: c.onSurface }]}>+</Text>
                        </Pressable>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { backgroundColor: c.surface }]}>
            {selected.length === 0 ? (
              <Text style={[styles.selectionCount, { color: c.textMuted }]}>
                Select at least one nonprofit
              </Text>
            ) : (
              <Text style={[styles.selectionCount, { color: splitValid ? c.successFresh : c.error }]}>
                Total split: {splitTotal}%{splitValid ? ' ✓' : ' — must equal 100%'}
              </Text>
            )}
            <Pressable
              style={[
                styles.primaryBtn,
                { backgroundColor: saved ? c.successFresh : c.primary },
                (saving || selected.length === 0 || !splitValid) && { opacity: 0.5 },
              ]}
              onPress={handleSave}
              disabled={saving || selected.length === 0 || !splitValid}
            >
              {saving
                ? <ActivityIndicator color={c.onPrimary} />
                : <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>
                    {saved ? '✓ Saved' : 'Save Changes'}
                  </Text>
              }
            </Pressable>
          </View>
        </>
      )}
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
    paddingTop: 16,
    paddingBottom: 20,
  },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  list: { gap: DesignSpacing.stackGapMd },
  card: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardName: { fontSize: 15, fontWeight: '700', flex: 1 },
  verifiedBadge: { fontSize: 14 },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCheck: { color: '#fff', fontSize: 12, fontWeight: '700' },
  cardDesc: { fontSize: 13, lineHeight: 18 },
  ein: { fontSize: 11, fontWeight: '500' },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  splitLabel: { fontSize: 13, fontWeight: '600', marginRight: 'auto' },
  splitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitBtnText: { fontSize: 18, fontWeight: '500', lineHeight: 22 },
  splitValue: { fontSize: 16, fontWeight: '700', minWidth: 44, textAlign: 'center' },
  footer: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 8,
  },
  selectionCount: { fontSize: 13, textAlign: 'center' },
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
