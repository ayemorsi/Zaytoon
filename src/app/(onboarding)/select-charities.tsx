import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState, useEffect } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { supabase } from '@/lib/supabase';
import type { Nonprofit } from '@/types/app.types';

// Seed data shown when no DB connection / empty table
const SEED_NONPROFITS: Nonprofit[] = [
  {
    id: '1',
    name: 'Islamic Relief USA',
    slug: 'islamic-relief-usa',
    description: 'Providing emergency relief and sustainable development to communities in need.',
    mission: 'To create a world where hope and dignity flourish.',
    logo_url: null,
    website_url: 'https://irusa.org',
    ein: '95-4453134',
    is_verified: true,
    is_active: true,
    cause_categories: ['food', 'medical', 'disaster_relief'],
  },
  {
    id: '2',
    name: 'Helping Hand for Relief & Development',
    slug: 'hhrd',
    description: 'Providing humanitarian aid and development programs worldwide.',
    mission: 'To serve the most vulnerable communities globally.',
    logo_url: null,
    website_url: 'https://hhrd.org',
    ein: '36-4422146',
    is_verified: true,
    is_active: true,
    cause_categories: ['food', 'education', 'orphans'],
  },
  {
    id: '3',
    name: 'Zakat Foundation of America',
    slug: 'zakat-foundation',
    description: 'Serving the poor and marginalized through zakat and sadaqah.',
    mission: 'Transforming lives through the power of giving.',
    logo_url: null,
    website_url: 'https://zakat.org',
    ein: '36-4476204',
    is_verified: true,
    is_active: true,
    cause_categories: ['food', 'medical', 'refugees'],
  },
  {
    id: '4',
    name: 'Penny Appeal USA',
    slug: 'penny-appeal-usa',
    description: 'Tackling poverty and disease with a focus on water, food, and education.',
    mission: 'Big impact from small change.',
    logo_url: null,
    website_url: 'https://pennyappealusa.org',
    ein: '82-1751907',
    is_verified: true,
    is_active: true,
    cause_categories: ['clean_water', 'education', 'orphans'],
  },
  {
    id: '5',
    name: 'Masjid Al-Nour Foundation',
    slug: 'masjid-al-nour',
    description: 'Supporting mosque-based community programs and spiritual education.',
    mission: 'Building stronger Muslim communities through faith and service.',
    logo_url: null,
    website_url: null,
    ein: '84-3625910',
    is_verified: true,
    is_active: true,
    cause_categories: ['masjids', 'education'],
  },
];

const CAUSE_LABELS: Record<string, string> = {
  food: 'Food', medical: 'Medical', education: 'Education',
  disaster_relief: 'Disaster Relief', masjids: 'Masjids', orphans: 'Orphans',
  clean_water: 'Water', refugees: 'Refugees',
};

export default function SelectCharitiesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const store = useOnboardingStore();
  const [nonprofits, setNonprofits] = useState<Nonprofit[]>(SEED_NONPROFITS);
  const [selected, setSelected] = useState<string[]>(store.selectedCharityIds);

  useEffect(() => {
    // Try to load from DB; fall back to seed data
    supabase
      .from('nonprofits')
      .select('*')
      .eq('is_active', true)
      .eq('is_verified', true)
      .then(({ data }) => {
        if (data && data.length > 0) setNonprofits(data as Nonprofit[]);
      });
  }, []);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleContinue() {
    store.setSelectedCharities(selected);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && selected.length > 0) {
      await supabase.from('user_charity_allocations').delete().eq('user_id', user.id);
      await supabase.from('user_charity_allocations').insert(
        selected.map((id) => ({ user_id: user.id, nonprofit_id: id, split_percentage: 0 }))
      );
    }

    router.push('/(onboarding)/complete');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.onSurface }]}>Choose your nonprofits</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          Your donations will be split equally among your selected organizations.
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
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface }]}>
        <Text style={[styles.selectionCount, { color: c.textMuted }]}>
          {selected.length === 0
            ? 'Select at least one nonprofit'
            : `${selected.length} nonprofit${selected.length > 1 ? 's' : ''} selected`}
        </Text>
        <Pressable
          style={[
            styles.primaryBtn,
            { backgroundColor: c.primary },
            selected.length === 0 && styles.disabled,
          ]}
          onPress={handleContinue}
          disabled={selected.length === 0}
        >
          <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Continue →</Text>
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
  },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.3, marginTop: 24, marginBottom: 8 },
  body: { fontSize: 16, lineHeight: 24, marginBottom: 24 },
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
  disabled: { opacity: 0.4 },
});
