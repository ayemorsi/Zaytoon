import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { CAUSE_CATEGORIES } from '@/types/app.types';
import type { Nonprofit } from '@/types/app.types';

// Seed nonprofits for dev/empty state
const SEED: Nonprofit[] = [
  { id: '1', name: 'Islamic Relief USA', slug: 'islamic-relief-usa', description: 'Providing emergency relief and sustainable development to communities in need globally.', mission: '', logo_url: null, website_url: null, ein: '95-4453134', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'disaster_relief'] },
  { id: '2', name: 'Helping Hand for Relief & Development', slug: 'hhrd', description: 'Providing humanitarian aid and development programs to vulnerable communities worldwide.', mission: '', logo_url: null, website_url: null, ein: '36-4422146', is_verified: true, is_active: true, cause_categories: ['food', 'education', 'orphans'] },
  { id: '3', name: 'Zakat Foundation of America', slug: 'zakat-foundation', description: 'Serving the poor through zakat and sadaqah, transforming lives one gift at a time.', mission: '', logo_url: null, website_url: null, ein: '36-4476204', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'refugees'] },
  { id: '4', name: 'Penny Appeal USA', slug: 'penny-appeal-usa', description: 'Tackling poverty with water, food, and education projects around the world.', mission: '', logo_url: null, website_url: null, ein: '82-1751907', is_verified: true, is_active: true, cause_categories: ['clean_water', 'education', 'orphans'] },
  { id: '5', name: 'Masjid Al-Nour Foundation', slug: 'masjid-al-nour', description: 'Supporting mosque-based community programs and Islamic education.', mission: '', logo_url: null, website_url: null, ein: '84-3625910', is_verified: true, is_active: true, cause_categories: ['masjids', 'education'] },
];

const CAUSE_LABELS: Record<string, string> = {
  food: 'Food', medical: 'Medical', education: 'Education',
  disaster_relief: 'Disaster Relief', masjids: 'Masjids', orphans: 'Orphans',
  clean_water: 'Clean Water', refugees: 'Refugees',
};

export default function NonprofitsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [nonprofits, setNonprofits] = useState<Nonprofit[]>(SEED);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [userSelections, setUserSelections] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const [npRes, userRes] = await Promise.all([
        supabase.from('nonprofits').select('*').eq('is_active', true).eq('is_verified', true),
        supabase.auth.getUser().then(({ data: { user } }) =>
          user ? supabase.from('user_charity_allocations').select('nonprofit_id').eq('user_id', user.id) : Promise.resolve({ data: [] })
        ),
      ]);
      if (npRes.data && npRes.data.length > 0) setNonprofits(npRes.data as Nonprofit[]);
      setUserSelections((userRes.data ?? []).map((r: any) => r.nonprofit_id));
    }
    load();
  }, []);

  async function toggleSelection(npId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (userSelections.includes(npId)) {
      setUserSelections((prev) => prev.filter((x) => x !== npId));
      await supabase.from('user_charity_allocations').delete().eq('user_id', user.id).eq('nonprofit_id', npId);
    } else {
      setUserSelections((prev) => [...prev, npId]);
      await supabase.from('user_charity_allocations').insert({ user_id: user.id, nonprofit_id: npId, split_percentage: 0 });
    }
  }

  const filtered = nonprofits.filter((np) => {
    const matchesFilter = selectedFilter === 'all' || (np.cause_categories ?? []).includes(selectedFilter as any);
    const matchesSearch = search === '' || np.name.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.primary }]}>Support Verified Nonprofits</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Choose where your quiet impact flows.</Text>
        </View>

        <View style={styles.content}>
          {/* Search */}
          <View style={[styles.searchBar, { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant }]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={[styles.searchInput, { color: c.onSurface }]}
              placeholder="Search nonprofits…"
              placeholderTextColor={c.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Filter chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <View style={styles.filterRow}>
              <FilterChip label="All" value="all" selected={selectedFilter} onPress={setSelectedFilter} colors={c} />
              {CAUSE_CATEGORIES.map((cat) => (
                <FilterChip key={cat.id} label={cat.label} value={cat.id} selected={selectedFilter} onPress={setSelectedFilter} colors={c} emoji={cat.emoji} />
              ))}
            </View>
          </ScrollView>

          {/* Nonprofit list */}
          <View style={styles.list}>
            {filtered.map((np) => {
              const isSelected = userSelections.includes(np.id);
              return (
                <Pressable key={np.id} style={[styles.card, { backgroundColor: c.surfaceWhite, borderColor: isSelected ? c.primary : c.outlineVariant }]} onPress={() => router.push(`/(app)/nonprofits/${np.id}`)}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.logo, { backgroundColor: c.surfaceContainerHigh }]}>
                      <Text style={styles.logoEmoji}>🤲</Text>
                    </View>
                    <View style={styles.cardInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.cardName, { color: c.primary }]} numberOfLines={1}>{np.name}</Text>
                        {np.is_verified && <Text style={[styles.verifiedBadge, { color: c.warningAmber }]}>★ Verified</Text>}
                      </View>
                      <View style={styles.tags}>
                        {(np.cause_categories ?? []).slice(0, 3).map((cat) => (
                          <View key={cat} style={[styles.tag, { backgroundColor: c.surfaceContainer }]}>
                            <Text style={[styles.tagText, { color: c.textMuted }]}>{CAUSE_LABELS[cat] ?? cat}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.desc, { color: c.onSurfaceVariant }]} numberOfLines={2}>{np.description}</Text>

                  {np.ein && (
                    <Text style={[styles.ein, { color: c.outline }]}>EIN: {np.ein} · 501(c)(3) Verified</Text>
                  )}

                  <Pressable
                    style={[
                      styles.selectBtn,
                      isSelected
                        ? { backgroundColor: c.primary }
                        : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: c.primary },
                    ]}
                    onPress={(e) => { e.stopPropagation(); toggleSelection(np.id); }}
                  >
                    <Text style={[styles.selectBtnText, { color: isSelected ? c.onPrimary : c.primary }]}>
                      {isSelected ? '✓ Supporting' : 'Select to Support'}
                    </Text>
                  </Pressable>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, value, selected, onPress, colors: c, emoji }: {
  label: string; value: string; selected: string;
  onPress: (v: string) => void; colors: typeof Colors.light; emoji?: string;
}) {
  const isSelected = selected === value;
  return (
    <Pressable
      style={[
        styles.chip,
        { backgroundColor: isSelected ? c.primary : c.secondaryContainer },
      ]}
      onPress={() => onPress(value)}
    >
      {emoji && <Text style={styles.chipEmoji}>{emoji}</Text>}
      <Text style={[styles.chipText, { color: isSelected ? c.onPrimary : c.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: DesignSpacing.containerMargin, paddingTop: 20, paddingBottom: 4, gap: 4 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14 },
  content: { paddingHorizontal: DesignSpacing.containerMargin, paddingBottom: 32, gap: DesignSpacing.stackGapMd, marginTop: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
  },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16 },
  filterScroll: { marginHorizontal: -DesignSpacing.containerMargin },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: DesignSpacing.containerMargin, paddingBottom: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.full },
  chipEmoji: { fontSize: 14 },
  chipText: { fontSize: 13, fontWeight: '600' },
  list: { gap: DesignSpacing.stackGapMd },
  card: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    gap: 10,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  logo: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  logoEmoji: { fontSize: 22 },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1 },
  verifiedBadge: { fontSize: 12, fontWeight: '700' },
  tags: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  tagText: { fontSize: 11, fontWeight: '600' },
  desc: { fontSize: 14, lineHeight: 20 },
  ein: { fontSize: 11, fontWeight: '500' },
  selectBtn: {
    height: 44,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  selectBtnText: { fontSize: 14, fontWeight: '700', letterSpacing: 0.2 },
});
