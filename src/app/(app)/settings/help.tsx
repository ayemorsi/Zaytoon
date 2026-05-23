import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';

const FAQS = [
  {
    q: 'How do round-ups work?',
    a: 'Every time you make a purchase with your linked bank account, Zaytoon rounds the amount up to the nearest dollar and adds the difference to your pending balance. For example, a $4.73 purchase adds $0.27 to your balance.',
  },
  {
    q: 'When are my donations processed?',
    a: 'Donations are batched and processed when your pending balance reaches your threshold (e.g. $5, $10, or $25), or every Friday if you chose the weekly schedule. This keeps transfer fees low so more of your money goes to charity.',
  },
  {
    q: 'How do I pause or stop giving?',
    a: 'Go to Settings → Giving Activity and toggle "Pause Round-ups". Your balance is preserved and no new round-ups will be added until you resume. You can also disconnect your bank account under Connected Card.',
  },
  {
    q: 'Which nonprofits receive my donations?',
    a: 'Only the nonprofits you selected during onboarding or in Settings → My Charities. All nonprofits on Zaytoon are 501(c)(3) verified — we display their EIN on every profile. We never take a cut.',
  },
  {
    q: 'Is Zaytoon free?',
    a: 'Yes. Zaytoon charges no fees to donors. We absorb Plaid and Stripe ACH transfer costs so 100% of your round-ups reach the nonprofits you choose.',
  },
  {
    q: 'How do I get a tax receipt?',
    a: 'Go to Settings → Tax Receipts. You can generate and download a PDF summary of your annual giving, which you can use for tax deduction purposes.',
  },
  {
    q: 'How do I disconnect my bank account?',
    a: 'Go to Settings → Connected Card. Tap "Disconnect" next to the account you want to remove. This stops new round-ups immediately. Any pending balance is not processed after disconnection.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <View style={[styles.topBar, { borderBottomColor: c.outlineVariant }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={[styles.backText, { color: c.primary }]}>‹ Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: c.onSurface }]}>Help & FAQ</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { color: c.textMuted }]}>
          Common questions about how Zaytoon works.
        </Text>

        <View style={styles.list}>
          {FAQS.map((item) => {
            const open = expanded === item.q;
            return (
              <Pressable
                key={item.q}
                style={[styles.item, { backgroundColor: c.surfaceWhite, borderColor: open ? c.primary : c.outlineVariant }]}
                onPress={() => setExpanded(open ? null : item.q)}
              >
                <View style={styles.itemHeader}>
                  <Text style={[styles.question, { color: c.onSurface }]}>{item.q}</Text>
                  <Text style={[styles.chevron, { color: c.textMuted }]}>{open ? '−' : '+'}</Text>
                </View>
                {open && (
                  <Text style={[styles.answer, { color: c.textMuted }]}>{item.a}</Text>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={[styles.contactCard, { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant }]}>
          <Text style={[styles.contactTitle, { color: c.onSurface }]}>Still have questions?</Text>
          <Text style={[styles.contactBody, { color: c.textMuted }]}>
            Our team is happy to help. Reach us at{' '}
            <Text
              style={[styles.contactLink, { color: c.primary }]}
              onPress={() => Linking.openURL('mailto:support@zaytoon.app')}
            >
              support@zaytoon.app
            </Text>
          </Text>
        </View>
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
  scroll: {
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingTop: 20,
    paddingBottom: 40,
    gap: DesignSpacing.stackGapMd,
  },
  intro: { fontSize: 14, lineHeight: 20 },
  list: { gap: DesignSpacing.stackGapSm },
  item: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1.5,
    padding: DesignSpacing.cardPadding,
    gap: 10,
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  question: { fontSize: 15, fontWeight: '600', flex: 1, lineHeight: 22 },
  chevron: { fontSize: 20, fontWeight: '400', width: 20, textAlign: 'center' },
  answer: { fontSize: 14, lineHeight: 21 },
  contactCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    padding: DesignSpacing.cardPadding,
    gap: 6,
    marginTop: 4,
  },
  contactTitle: { fontSize: 15, fontWeight: '700' },
  contactBody: { fontSize: 14, lineHeight: 21 },
  contactLink: { fontWeight: '600' },
});
