// Nonprofit detail screen
// Route: /(app)/nonprofits/[id]
// Navigated to by tapping a card in nonprofits/index.tsx

import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Nonprofit } from '@/types/app.types';

const CAUSE_LABELS: Record<string, string> = {
  food: 'Food Security', medical: 'Medical Aid', education: 'Education',
  disaster_relief: 'Disaster Relief', masjids: 'Masjids', orphans: 'Orphan Support',
  clean_water: 'Clean Water', refugees: 'Refugees',
};

const CAUSE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  food: 'restaurant-outline',
  medical: 'medkit-outline',
  education: 'book-outline',
  disaster_relief: 'warning-outline',
  masjids: 'business-outline',
  orphans: 'people-outline',
  clean_water: 'water-outline',
  refugees: 'home-outline',
};

// Seed data fallback (matches seeds in nonprofits/index.tsx)
const SEED: Nonprofit[] = [
  { id: '1', name: 'Islamic Relief USA', slug: 'islamic-relief-usa', description: 'Providing emergency relief and sustainable development to communities in need globally.', mission: 'To create a world where hope and dignity flourish.', logo_url: null, website_url: 'https://irusa.org', ein: '95-4453134', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'disaster_relief'] },
  { id: '2', name: 'Helping Hand for Relief & Development', slug: 'hhrd', description: 'Providing humanitarian aid and development programs to vulnerable communities worldwide.', mission: 'To serve the most vulnerable communities globally.', logo_url: null, website_url: 'https://hhrd.org', ein: '36-4422146', is_verified: true, is_active: true, cause_categories: ['food', 'education', 'orphans'] },
  { id: '3', name: 'Zakat Foundation of America', slug: 'zakat-foundation', description: 'Serving the poor and marginalized through zakat and sadaqah, transforming lives one gift at a time.', mission: 'Transforming lives through the power of giving.', logo_url: null, website_url: 'https://zakat.org', ein: '36-4476204', is_verified: true, is_active: true, cause_categories: ['food', 'medical', 'refugees'] },
  { id: '4', name: 'Penny Appeal USA', slug: 'penny-appeal-usa', description: 'Tackling poverty and disease with a focus on water, food, and education.', mission: 'Big impact from small change.', logo_url: null, website_url: 'https://pennyappealusa.org', ein: '82-1751907', is_verified: true, is_active: true, cause_categories: ['clean_water', 'education', 'orphans'] },
  { id: '5', name: 'Masjid Al-Nour Foundation', slug: 'masjid-al-nour', description: 'Supporting mosque-based community programs and Islamic education across communities.', mission: 'Building stronger Muslim communities through faith and service.', logo_url: null, website_url: null, ein: '84-3625910', is_verified: true, is_active: true, cause_categories: ['masjids', 'education'] },
];

export default function NonprofitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const router = useRouter();

  const [nonprofit, setNonprofit] = useState<Nonprofit | null>(null);
  const [isSupporting, setIsSupporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      const [npRes, allocRes] = await Promise.all([
        supabase.from('nonprofits').select('*').eq('id', id).single(),
        user
          ? supabase.from('user_charity_allocations')
              .select('nonprofit_id')
              .eq('user_id', user.id)
              .eq('nonprofit_id', id)
          : Promise.resolve({ data: [] }),
      ]);

      if (npRes.data) {
        setNonprofit(npRes.data as Nonprofit);
      } else {
        // Fallback to seed data
        const seed = SEED.find((s) => s.id === id);
        if (seed) setNonprofit(seed);
      }

      setIsSupporting(((allocRes as { data: unknown[] }).data ?? []).length > 0);
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleToggleSupport() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !nonprofit) return;

    setToggling(true);
    if (isSupporting) {
      await supabase
        .from('user_charity_allocations')
        .delete()
        .eq('user_id', user.id)
        .eq('nonprofit_id', nonprofit.id);
      setIsSupporting(false);
    } else {
      await supabase
        .from('user_charity_allocations')
        .insert({ user_id: user.id, nonprofit_id: nonprofit.id, split_percentage: 0 });
      setIsSupporting(true);
    }
    setToggling(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
          </Pressable>
        </View>
        <ActivityIndicator color={c.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  if (!nonprofit) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
        <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
          </Pressable>
        </View>
        <Text style={[styles.errorText, { color: c.textMuted }]}>Nonprofit not found.</Text>
      </SafeAreaView>
    );
  }

  const initials = nonprofit.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      {/* Header */}
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <View style={{flexDirection:'row',alignItems:'center',gap:2}}><Ionicons name="chevron-back" size={22} color={c.primary} /><Text style={[styles.backText, { color: c.primary }]}>Back</Text></View>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]} numberOfLines={1}>
          {nonprofit.name}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero card */}
        <View style={[styles.heroCard, { backgroundColor: c.surfaceWhite }]}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={[styles.logo, { backgroundColor: c.secondaryContainer }]}>
              <Text style={[styles.logoInitials, { color: c.primary }]}>{initials}</Text>
            </View>
            <View style={styles.heroInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.heroName, { color: c.onSurface }]}>{nonprofit.name}</Text>
              </View>
              {nonprofit.is_verified && (
                <View style={[styles.verifiedBadge, { backgroundColor: c.tertiaryFixed }]}>
                  <View style={{flexDirection:'row',alignItems:'center',gap:4}}><Ionicons name="shield-checkmark-outline" size={13} color="#7a5400" /><Text style={styles.verifiedText}>501(c)(3) Verified</Text></View>
                </View>
              )}
            </View>
          </View>

          {/* Cause category tags */}
          {(nonprofit.cause_categories ?? []).length > 0 && (
            <View style={styles.tags}>
              {(nonprofit.cause_categories ?? []).map((cat) => (
                <View key={cat} style={[styles.tag, { backgroundColor: c.surfaceContainer }]}>
                  <Ionicons name={CAUSE_ICONS[cat] ?? 'heart-outline'} size={13} color={c.textMuted} />
                  <Text style={[styles.tagText, { color: c.onSurface }]}>
                    {CAUSE_LABELS[cat] ?? cat}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Mission */}
        {!!nonprofit.mission && (
          <View style={[styles.section, { backgroundColor: c.surfaceWhite }]}>
            <Text style={[styles.sectionTitle, { color: c.primary }]}>Our Mission</Text>
            <Text style={[styles.sectionBody, { color: c.onSurface }]}>{nonprofit.mission}</Text>
          </View>
        )}

        {/* About */}
        <View style={[styles.section, { backgroundColor: c.surfaceWhite }]}>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>About</Text>
          <Text style={[styles.sectionBody, { color: c.onSurface }]}>{nonprofit.description}</Text>
        </View>

        {/* Trust info */}
        <View style={[styles.section, { backgroundColor: c.surfaceWhite }]}>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>Trust & Transparency</Text>
          {nonprofit.ein && (
            <View style={styles.trustRow}>
              <Ionicons name="document-outline" size={22} color={c.primary} />
              <View style={styles.trustInfo}>
                <Text style={[styles.trustLabel, { color: c.onSurface }]}>EIN</Text>
                <Text style={[styles.trustValue, { color: c.textMuted }]}>{nonprofit.ein}</Text>
              </View>
            </View>
          )}
          <View style={styles.trustRow}>
            <Ionicons name="shield-checkmark-outline" size={22} color={c.successFresh} />
            <View style={styles.trustInfo}>
              <Text style={[styles.trustLabel, { color: c.onSurface }]}>Verification Status</Text>
              <Text style={[styles.trustValue, { color: c.textMuted }]}>
                {nonprofit.is_verified ? 'Verified by Zaytoon' : 'Pending verification'}
              </Text>
            </View>
          </View>
          <View style={[styles.trustRow, { borderBottomWidth: 0 }]}>
            <Ionicons name="flag-outline" size={22} color={c.primary} />
            <View style={styles.trustInfo}>
              <Text style={[styles.trustLabel, { color: c.onSurface }]}>Country</Text>
              <Text style={[styles.trustValue, { color: c.textMuted }]}>United States</Text>
            </View>
          </View>
        </View>

        {/* Website */}
        {nonprofit.website_url && (
          <Pressable
            style={[styles.websiteBtn, { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant }]}
            onPress={() => Linking.openURL(nonprofit.website_url!)}
          >
            <Ionicons name="globe-outline" size={22} color={c.primary} />
            <Text style={[styles.websiteText, { color: c.primary }]}>Visit their website</Text>
            <Ionicons name="chevron-forward" size={20} color={c.primary} />
          </Pressable>
        )}

        {/* Spacer for sticky button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.stickyFooter, { backgroundColor: c.surface, borderTopColor: c.outlineVariant }]}>
        <Pressable
          style={[
            styles.supportBtn,
            isSupporting
              ? { backgroundColor: c.primaryContainer }
              : { backgroundColor: c.primary },
            toggling && { opacity: 0.7 },
          ]}
          onPress={handleToggleSupport}
          disabled={toggling}
        >
          {toggling
            ? <ActivityIndicator color={isSupporting ? c.primary : c.onPrimary} />
            : (
              <View style={{flexDirection:'row',alignItems:'center',gap:6}}>
                {isSupporting && <Ionicons name="checkmark-circle" size={18} color={c.primary} />}
                <Text style={[styles.supportBtnText, { color: isSupporting ? c.primary : c.onPrimary }]}>
                  {isSupporting ? 'Supporting — Tap to remove' : 'Add to My Giving'}
                </Text>
              </View>
            )
          }
        </Pressable>
        <Text style={[styles.supportNote, { color: c.textMuted }]}>
          {isSupporting
            ? 'This nonprofit is included in your equal giving split.'
            : 'Your round-ups will be split equally among all selected nonprofits.'}
        </Text>
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
  navTitle: { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  content: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 20,
    gap: DesignSpacing.stackGapMd,
  },
  heroCard: {
    borderRadius: BorderRadius.xxl,
    padding: DesignSpacing.cardPadding,
    gap: 16,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInitials: { fontSize: 22, fontWeight: '700' },
  heroInfo: { flex: 1, gap: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start' },
  heroName: { fontSize: 18, fontWeight: '700', lineHeight: 24, flex: 1 },
  verifiedBadge: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  verifiedText: { fontSize: 12, fontWeight: '700', color: '#7a5400' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
  },
  tagText: { fontSize: 12, fontWeight: '600' },
  section: {
    borderRadius: BorderRadius.xxl,
    padding: DesignSpacing.cardPadding,
    gap: 10,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionBody: { fontSize: 15, lineHeight: 24 },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  trustInfo: { flex: 1 },
  trustLabel: { fontSize: 14, fontWeight: '600' },
  trustValue: { fontSize: 13, marginTop: 2 },
  websiteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1,
  },
  websiteText: { flex: 1, fontSize: 15, fontWeight: '600' },
  errorText: { textAlign: 'center', marginTop: 48, fontSize: 16 },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    gap: 8,
  },
  supportBtn: {
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
  supportBtnText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  supportNote: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
