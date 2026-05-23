import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from 'react-native';

import { Colors, DesignSpacing, BorderRadius } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.backgroundWarm }]}>
      <View style={styles.container}>
        {/* Logo area */}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: c.primaryContainer }]}>
            <Text style={[styles.logoEmoji]}>🫒</Text>
          </View>
          <Text style={[styles.wordmark, { color: c.primary }]}>Zaytoon</Text>
          <Text style={[styles.tagline, { color: c.onSurfaceVariant }]}>
            Turn spare change into lasting impact.
          </Text>
        </View>

        {/* Value props */}
        <View style={styles.valueProps}>
          {VALUE_PROPS.map((prop) => (
            <View key={prop.emoji} style={[styles.propRow, { backgroundColor: c.surfaceWhite }]}>
              <View style={[styles.propIcon, { backgroundColor: c.secondaryContainer }]}>
                <Text style={styles.propEmoji}>{prop.emoji}</Text>
              </View>
              <View style={styles.propText}>
                <Text style={[styles.propTitle, { color: c.onSurface }]}>{prop.title}</Text>
                <Text style={[styles.propBody, { color: c.textMuted }]}>{prop.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={[styles.primaryBtnText, { color: c.onPrimary }]}>Get Started</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={[styles.secondaryBtnText, { color: c.primary }]}>
              Already have an account? Sign in
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const VALUE_PROPS = [
  {
    emoji: '💳',
    title: 'Passive Giving',
    body: 'Round up everyday purchases and turn spare change into sadaqah.',
  },
  {
    emoji: '🛡️',
    title: 'Trusted Causes Only',
    body: 'Donations go to vetted, verified nonprofits. No random campaigns.',
  },
  {
    emoji: '⚙️',
    title: 'Total Control',
    body: 'Set a monthly cap. Pause anytime. You decide.',
  },
];

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingVertical: DesignSpacing.stackGapLg,
    justifyContent: 'space-between',
  },
  logoArea: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 24,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoEmoji: { fontSize: 48 },
  wordmark: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
  },
  valueProps: { gap: DesignSpacing.stackGapMd },
  propRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: DesignSpacing.cardPadding,
    borderRadius: BorderRadius.xxl,
    shadowColor: '#1F2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 20,
    elevation: 2,
  },
  propIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  propEmoji: { fontSize: 22 },
  propText: { flex: 1, gap: 2 },
  propTitle: { fontSize: 16, fontWeight: '600', lineHeight: 22 },
  propBody: { fontSize: 13, lineHeight: 18 },
  actions: { gap: DesignSpacing.stackGapMd },
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
  secondaryBtn: { alignItems: 'center', paddingVertical: 8 },
  secondaryBtnText: { fontSize: 14, fontWeight: '600' },
});
