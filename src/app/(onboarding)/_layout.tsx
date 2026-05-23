import { Stack, useSegments } from 'expo-router';
import { useColorScheme, View, Text, StyleSheet } from 'react-native';

import { Colors, DesignSpacing } from '@/constants/theme';

const STEPS = [
  'connect-bank',
  'preferences',
  'select-causes',
  'select-charities',
  'complete',
];

export default function OnboardingLayout() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  const segments = useSegments();
  const currentStep = segments[segments.length - 1] as string;
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = stepIndex >= 0 ? (stepIndex + 1) / STEPS.length : 0;

  return (
    <>
      {/* Progress bar */}
      <View style={[styles.progressContainer, { backgroundColor: c.surface }]}>
        <View style={[styles.progressTrack, { backgroundColor: c.surfaceContainerHigh }]}>
          <View
            style={[styles.progressFill, { backgroundColor: c.primary, width: `${progress * 100}%` }]}
          />
        </View>
        <Text style={[styles.stepLabel, { color: c.textMuted }]}>
          {stepIndex >= 0 ? `Step ${stepIndex + 1} of ${STEPS.length}` : ''}
        </Text>
      </View>

      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.surface },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  progressContainer: {
    paddingTop: 56,
    paddingHorizontal: DesignSpacing.containerMargin,
    paddingBottom: 8,
    gap: 6,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
