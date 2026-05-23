import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type ImpactStory = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  cause_tag: string;
  created_at: string;
  nonprofits: { name: string } | null;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 24) return hours <= 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export default function ImpactScreen() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  const [totalDonated, setTotalDonated] = useState(0);
  const [donationCount, setDonationCount] = useState(0);
  const [nonprofitCount, setNonprofitCount] = useState(0);
  const [stories, setStories] = useState<ImpactStory[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [dRes, npRes, allocRes] = await Promise.all([
        supabase.from('donations').select('amount').eq('user_id', user.id).eq('status', 'completed'),
        supabase.from('user_charity_allocations').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('user_charity_allocations').select('nonprofit_id').eq('user_id', user.id),
      ]);
      const total = (dRes.data ?? []).reduce((s: number, d: any) => s + d.amount, 0);
      setTotalDonated(Math.round(total * 100) / 100);
      setDonationCount(dRes.data?.length ?? 0);
      setNonprofitCount(npRes.count ?? 0);

      const ids = (allocRes.data ?? []).map((a: any) => a.nonprofit_id);
      const baseQ = supabase
        .from('impact_stories')
        .select('*, nonprofits(name)')
        .order('created_at', { ascending: false });
      const { data: storyData } = ids.length
        ? await baseQ.in('nonprofit_id', ids).limit(5)
        : await baseQ.limit(3);
      setStories((storyData ?? []) as ImpactStory[]);
    }
    load();
  }, []);

  // Impact equivalents (rough estimates)
  const mealsEquivalent = Math.floor(totalDonated / 0.5);
  const familiesEquivalent = Math.floor(totalDonated / 25);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: c.primary }]}>Your spare change is adding up</Text>
          <Text style={[styles.subtitle, { color: c.textMuted }]}>Passive Sadaqah, Lasting Impact.</Text>
        </View>

        <View style={styles.content}>
          {/* Total Donated Hero */}
          <View style={[styles.heroCard, { backgroundColor: c.primary }]}>
            <View style={[styles.heroBg, { backgroundColor: c.primaryContainer }]} />
            <View style={styles.heroHeader}>
              <Text style={[styles.heroLabel, { color: c.primaryFixed }]}>Total Donated</Text>
              <View style={[styles.trendBadge, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.trendText}>📈 Growing</Text>
              </View>
            </View>
            <Text style={[styles.heroAmount, { color: c.onPrimary }]}>${totalDonated.toFixed(2)}</Text>
            <View style={styles.heroFooter}>
              <Text style={[styles.heroFooterText, { color: c.primaryFixedDim }]}>
                Across {nonprofitCount} verified nonprofit{nonprofitCount !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Bento stats */}
          <View style={styles.bentoGrid}>
            <View style={[styles.bentoCard, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.bentoIcon, { backgroundColor: c.secondaryContainer }]}>
                <Text style={styles.bentoEmoji}>🍽️</Text>
              </View>
              <Text style={[styles.bentoValue, { color: c.primary }]}>{mealsEquivalent}</Text>
              <Text style={[styles.bentoLabel, { color: c.textMuted }]}>Meals Funded</Text>
            </View>

            <View style={[styles.bentoCard, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.bentoIcon, { backgroundColor: c.tertiaryFixed }]}>
                <Text style={styles.bentoEmoji}>👨‍👩‍👧</Text>
              </View>
              <Text style={[styles.bentoValue, { color: c.primary }]}>{familiesEquivalent}</Text>
              <Text style={[styles.bentoLabel, { color: c.textMuted }]}>Families Supported</Text>
            </View>

            <View style={[styles.bentoCard, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.bentoIcon, { backgroundColor: c.primaryFixed }]}>
                <Text style={styles.bentoEmoji}>💳</Text>
              </View>
              <Text style={[styles.bentoValue, { color: c.primary }]}>{donationCount}</Text>
              <Text style={[styles.bentoLabel, { color: c.textMuted }]}>Donations Made</Text>
            </View>

            <View style={[styles.bentoCard, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.bentoIcon, { backgroundColor: c.secondaryContainer }]}>
                <Text style={styles.bentoEmoji}>🤲</Text>
              </View>
              <Text style={[styles.bentoValue, { color: c.primary }]}>{nonprofitCount}</Text>
              <Text style={[styles.bentoLabel, { color: c.textMuted }]}>Nonprofits Helped</Text>
            </View>
          </View>

          {/* Impact message */}
          <View style={[styles.quoteCard, { backgroundColor: c.primaryFixed }]}>
            <Text style={styles.quoteEmoji}>🫒</Text>
            <Text style={[styles.quoteText, { color: c.primary }]}>
              "The best deeds are those done consistently, even if small."
            </Text>
            <Text style={[styles.quoteAttr, { color: c.textMuted }]}>— Prophet Muhammad ﷺ</Text>
          </View>

          {/* Impact Updates */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.primary }]}>Impact Updates</Text>
            <Text style={[styles.sectionSub, { color: c.textMuted }]}>Stories from your aid</Text>

            {stories.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: c.surfaceWhite }]}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={[styles.emptyText, { color: c.textMuted }]}>
                  Impact updates will appear here once your nonprofits share stories.
                </Text>
              </View>
            ) : (
              stories.map((update) => (
                <View key={update.id} style={[styles.updateCard, { backgroundColor: c.surfaceWhite }]}>
                  <View style={[styles.updateIcon, { backgroundColor: c.secondaryContainer }]}>
                    <Text style={styles.updateEmoji}>{update.emoji}</Text>
                  </View>
                  <View style={styles.updateInfo}>
                    <Text style={[styles.updateOrg, { color: c.primary }]}>
                      {update.nonprofits?.name ?? ''}
                    </Text>
                    <Text style={[styles.updateTitle, { color: c.onSurface }]}>{update.title}</Text>
                    <Text style={[styles.updateBody, { color: c.textMuted }]} numberOfLines={3}>{update.body}</Text>
                    <View style={styles.updateMeta}>
                      <View style={[styles.updateTag, { backgroundColor: c.surfaceContainer }]}>
                        <Text style={[styles.updateTagText, { color: c.textMuted }]}>{update.cause_tag}</Text>
                      </View>
                      <Text style={[styles.updateAgo, { color: c.textMuted }]}>{timeAgo(update.created_at)}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: DesignSpacing.containerMargin, paddingTop: 20, paddingBottom: 4, gap: 4 },
  title: { fontSize: 26, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { fontSize: 14 },
  content: { paddingHorizontal: DesignSpacing.containerMargin, paddingBottom: 32, gap: DesignSpacing.stackGapMd, marginTop: 16 },
  heroCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    overflow: 'hidden',
    gap: 6,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  heroBg: {
    position: 'absolute',
    right: -40,
    top: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.3,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { fontSize: 14, fontWeight: '500' },
  trendBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
  trendText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  heroAmount: { fontSize: 48, fontWeight: '800', letterSpacing: -1.5 },
  heroFooter: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
  heroFooterText: { fontSize: 13 },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: DesignSpacing.stackGapMd },
  bentoCard: {
    width: '47%',
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    gap: 6,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  bentoIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  bentoEmoji: { fontSize: 20 },
  bentoValue: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  bentoLabel: { fontSize: 13 },
  quoteCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    gap: 8,
  },
  quoteEmoji: { fontSize: 32 },
  quoteText: { fontSize: 16, fontWeight: '600', textAlign: 'center', lineHeight: 24, fontStyle: 'italic' },
  quoteAttr: { fontSize: 13 },
  section: { gap: DesignSpacing.stackGapMd },
  emptyCard: {
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    gap: 10,
  },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700' },
  sectionSub: { fontSize: 13, marginTop: -8 },
  updateCard: {
    flexDirection: 'row',
    gap: 12,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  updateIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  updateEmoji: { fontSize: 22 },
  updateInfo: { flex: 1, gap: 4 },
  updateOrg: { fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },
  updateTitle: { fontSize: 15, fontWeight: '700' },
  updateBody: { fontSize: 13, lineHeight: 18 },
  updateMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  updateTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  updateTagText: { fontSize: 11, fontWeight: '600' },
  updateAgo: { fontSize: 12 },
});
