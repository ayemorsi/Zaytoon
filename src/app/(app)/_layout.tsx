import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: {
          backgroundColor: c.surfaceWhite,
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="giving/index"
        options={{
          title: 'Giving',
          tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="nonprofits/index"
        options={{
          title: 'Nonprofits',
          tabBarIcon: ({ color, size }) => <Ionicons name="business" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="impact/index"
        options={{
          title: 'Impact',
          tabBarIcon: ({ color, size }) => <Ionicons name="leaf" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />

      {/* Hide all sub-screens from the tab bar */}
      <Tabs.Screen name="nonprofits/[id]" options={{ href: null }} />
      <Tabs.Screen name="settings/profile" options={{ href: null }} />
      <Tabs.Screen name="settings/charities" options={{ href: null }} />
      <Tabs.Screen name="settings/linked-accounts" options={{ href: null }} />
      <Tabs.Screen name="settings/notifications" options={{ href: null }} />
      <Tabs.Screen name="settings/preferences" options={{ href: null }} />
      <Tabs.Screen name="settings/tax-receipts" options={{ href: null }} />
      <Tabs.Screen name="settings/help" options={{ href: null }} />
    </Tabs>
  );
}
