import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  return (
    <NativeTabs
      backgroundColor={c.surfaceWhite}
      indicatorColor={c.secondaryContainer}
      labelStyle={{ selected: { color: c.primary } }}>

      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sfSymbol="house.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="giving/index">
        <NativeTabs.Trigger.Label>Giving</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sfSymbol="heart.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="nonprofits/index">
        <NativeTabs.Trigger.Label>Nonprofits</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sfSymbol="building.columns.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="impact/index">
        <NativeTabs.Trigger.Label>Impact</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sfSymbol="leaf.fill" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings/index">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sfSymbol="gearshape.fill" />
      </NativeTabs.Trigger>

    </NativeTabs>
  );
}
