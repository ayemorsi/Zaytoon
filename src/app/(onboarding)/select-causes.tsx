import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';
import { useState } from 'react';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';
import { useOnboardingStore } from '@/stores/onboarding-store';
import { CAUSE_CATEGORIES } from '@/types/app.types';
import type { CauseCategory } from '@/types/app.types';

export default function SelectCausesScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const store = useOnboardingStore();
  const [selected, setSelected] = useState<CauseCategory[]>(store.selectedCauseIds);

  function toggle(id: CauseCategory) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleContinue() {
    store.setSelectedCauses(selected);
    router.push('/(onboarding)/select-charities');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.surface }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: c.onSurface }]}>What causes matter most to you?</Text>
        <Text style={[styles.body, { color: c.textMuted }]}>
          Choose one or more. We'll show you nonprofits that align with your values.
        </Text>

        <View style={styles.grid}>
          {CAUSE_CATEGORIES.map((cause) => {
            const isSelected = selected.includes(cause.id);
            return (
              <Pressable
                key={cause.id}
                style={[
                  styles.card,
                  { backgroundColor: c.surfaceWhite, borderColor: c.outlineVariant },
                  isSelected && { backgroundColor: c.primaryFixed, borderColor: c.primary },
                ]}
                onPress={() => toggle(cause.id)}
              >
                <Text style={styles.cardEmoji}>{cause.emoji}</Text>
                <Text style={[
                  styles.cardLabel,
                  { color: c.onSurface },
                  isSelected && { color: c.primary, fontWeight: '700' },
                ]}>
                  {cause.label}
                </Text>
                {isSelected && (
                  <View style={[styles.checkBadge, { backgroundColor: c.primary }]}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: c.surface }]}>
        <Text style={[styles.selectionCount, { color: c.textMuted }]}>
          {selected.length === 0
            ? 'Select at least one cause'
            : `${selected.length} cause${selected.length > 1 ? 's' : ''} selected`}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '47%',
    padding: 20,
    borderRadius: BorderRadius.xxl,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 8,
    position: 'relative',
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 1,
  },
  cardEmoji: { fontSize: 32 },
  cardLabel: { fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 18 },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '700' },
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
