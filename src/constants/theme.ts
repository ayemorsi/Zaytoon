import '@/global.css';

import { Platform } from 'react-native';

// Zaytoon Design System — matches the web design system color tokens exactly
export const Colors = {
  light: {
    // Core surfaces
    surface: '#f6fbf4',
    surfaceContainerLow: '#f0f5ee',
    surfaceContainer: '#ebefe8',
    surfaceContainerHigh: '#e5e9e3',
    surfaceContainerHighest: '#dfe4dd',
    surfaceVariant: '#dfe4dd',
    surfaceWhite: '#FFFFFF',
    surfaceDim: '#d7dbd5',
    backgroundWarm: '#F8F4EA',

    // Primary (Deep Olive Green)
    primary: '#284726',
    onPrimary: '#ffffff',
    primaryContainer: '#3f5f3b',
    onPrimaryContainer: '#b3d7aa',
    primaryFixed: '#c7edbe',
    primaryFixedDim: '#acd0a3',

    // Secondary (Sage)
    secondary: '#53634a',
    onSecondary: '#ffffff',
    secondaryContainer: '#d4e5c5',
    onSecondaryContainer: '#58674e',
    secondaryFixed: '#d7e8c8',
    secondaryFixedDim: '#bbccad',

    // Tertiary (Gold/Amber)
    tertiary: '#533d00',
    onTertiary: '#ffffff',
    tertiaryContainer: '#705300',
    onTertiaryContainer: '#f3c86c',
    tertiaryFixed: '#ffdf9e',
    tertiaryFixedDim: '#ebc165',

    // On-surface
    onSurface: '#181d19',
    onSurfaceVariant: '#434840',
    textMuted: '#6F766D',

    // Utility
    outline: '#73796f',
    outlineVariant: '#c3c8bd',
    error: '#ba1a1a',
    onError: '#ffffff',
    errorContainer: '#ffdad6',
    onErrorContainer: '#93000a',

    // Semantic
    successFresh: '#4CAF50',
    warningAmber: '#F5B942',

    // Inverse
    inverseSurface: '#2d322d',
    inverseOnSurface: '#eef2eb',
    inversePrimary: '#acd0a3',

    // Legacy aliases for existing components
    text: '#181d19',
    background: '#f6fbf4',
    backgroundElement: '#ebefe8',
    backgroundSelected: '#d4e5c5',
    textSecondary: '#6F766D',
    card: '#FFFFFF',
    border: '#c3c8bd',
    danger: '#ba1a1a',
  },
  dark: {
    surface: '#0e1410',
    surfaceContainerLow: '#141a14',
    surfaceContainer: '#1a221a',
    surfaceContainerHigh: '#202820',
    surfaceContainerHighest: '#272e27',
    surfaceVariant: '#3a4239',
    surfaceWhite: '#1a221a',
    surfaceDim: '#0e1410',
    backgroundWarm: '#131008',

    primary: '#acd0a3',
    onPrimary: '#0f2910',
    primaryContainer: '#253e22',
    onPrimaryContainer: '#c7edbe',
    primaryFixed: '#c7edbe',
    primaryFixedDim: '#acd0a3',

    secondary: '#bbccad',
    onSecondary: '#263620',
    secondaryContainer: '#3c4b33',
    onSecondaryContainer: '#d7e8c8',
    secondaryFixed: '#d7e8c8',
    secondaryFixedDim: '#bbccad',

    tertiary: '#ebc165',
    onTertiary: '#2c1f00',
    tertiaryContainer: '#3e2d00',
    onTertiaryContainer: '#ffdf9e',
    tertiaryFixed: '#ffdf9e',
    tertiaryFixedDim: '#ebc165',

    onSurface: '#dde5db',
    onSurfaceVariant: '#c3c8bd',
    textMuted: '#9aa196',

    outline: '#8d9389',
    outlineVariant: '#3a4239',
    error: '#ffb4ab',
    onError: '#690005',
    errorContainer: '#93000a',
    onErrorContainer: '#ffb4ab',

    successFresh: '#66BB6A',
    warningAmber: '#F5B942',

    inverseSurface: '#dde5db',
    inverseOnSurface: '#2d322d',
    inversePrimary: '#284726',

    text: '#dde5db',
    background: '#0e1410',
    backgroundElement: '#1a221a',
    backgroundSelected: '#3c4b33',
    textSecondary: '#9aa196',
    card: '#1a221a',
    border: '#3a4239',
    danger: '#ffb4ab',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

// Zaytoon-specific spacing tokens (matching design system)
export const DesignSpacing = {
  containerMargin: 20,
  cardPadding: 20,
  stackGapSm: 8,
  stackGapMd: 16,
  stackGapLg: 24,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
