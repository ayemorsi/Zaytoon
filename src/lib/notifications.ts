// App-side push notification setup
// Uses Expo Push Service — no Firebase config needed for v1.
// Physical device required for real tokens (no-op on simulators).

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// How to display a notification when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * Requests push permission, fetches the Expo push token, and saves it to the
 * user's profile row in Supabase. Safe to call multiple times — skips if
 * permission is denied or the device is a simulator.
 */
export async function registerForPushNotifications(): Promise<void> {
  // Push tokens only work on physical devices
  if (!Device.isDevice) {
    console.log('[notifications] Skipping push registration — not a physical device');
    return;
  }

  // Android 13+ requires explicit permission
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#284726',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[notifications] Push permission denied');
    return;
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    await saveTokenToProfile(tokenData.data);
  } catch (err) {
    console.error('[notifications] Failed to get push token:', err);
  }
}

async function saveTokenToProfile(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('profiles')
    .update({ expo_push_token: token })
    .eq('id', user.id);

  if (error) {
    console.error('[notifications] Failed to save push token:', error);
  } else {
    console.log('[notifications] Push token saved');
  }
}

/**
 * Subscribes to token refresh events. Call once at app startup; returns the
 * subscription so the caller can unsubscribe on cleanup.
 */
export function subscribeToPushTokenRefresh(): Notifications.Subscription {
  return Notifications.addPushTokenListener(({ data: token }) => {
    saveTokenToProfile(token);
  });
}

/**
 * Returns a subscription that fires whenever a notification is tapped.
 * Use this to navigate to the relevant screen.
 */
export function subscribeToNotificationResponse(
  handler: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(handler);
}
