// Shared Expo Push Notification helper for Supabase Edge Functions (Deno)
// Sends via the Expo Push API — no Firebase credentials needed.

import { getAdminClient } from './supabase-admin.ts';

type NotifType =
  | 'donation_completed'
  | 'donation_failed'
  | 'threshold_reached'
  | 'item_error';

// Maps notification type to the preference column name on profiles
const PREF_COLUMN: Record<NotifType, string> = {
  donation_completed: 'notif_donation_completed',
  donation_failed:    'notif_donation_failed',
  threshold_reached:  'notif_threshold_reached',
  item_error:         'notif_item_error',
};

/**
 * Fetches the user's push token and preference for the given type,
 * then sends a push notification if both are present/enabled.
 */
export async function sendNotificationToUser(
  userId: string,
  type: NotifType,
  title: string,
  body: string,
  data: Record<string, unknown> = {},
  admin: ReturnType<typeof getAdminClient>
): Promise<void> {
  const prefCol = PREF_COLUMN[type];

  const { data: profile } = await admin
    .from('profiles')
    .select(`expo_push_token, ${prefCol}`)
    .eq('id', userId)
    .single();

  if (!profile?.expo_push_token) return;

  // Check per-type preference (default true if column is missing / null)
  const enabled = profile[prefCol as keyof typeof profile] !== false;
  if (!enabled) return;

  await sendExpoPush({
    to: profile.expo_push_token,
    title,
    body,
    data,
    sound: 'default',
  });
}

// ─── Expo Push API ────────────────────────────────────────────────────────────

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

async function sendExpoPush(message: ExpoPushMessage): Promise<void> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`[push] Expo push API error ${res.status}: ${text}`);
    } else {
      const json = await res.json();
      const ticket = json?.data;
      if (ticket?.status === 'error') {
        console.error('[push] Expo push ticket error:', ticket.details);
      }
    }
  } catch (err) {
    console.error('[push] Failed to send push notification:', err);
  }
}
