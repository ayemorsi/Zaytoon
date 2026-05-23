# Story 007 — Push Notifications

**Epic:** Notifications (Epic 7)
**Status:** Ready for implementation

---

## Overview

Wire up Expo Push Notifications so users receive timely, per-preference alerts about their donations, account health, and giving milestones. Notification preferences are stored on the user's profile and exposed via a settings screen.

---

## Acceptance Criteria

### AC-1: Expo Push Notifications registered on app launch
- `expo-notifications` and `expo-device` installed
- `expo-notifications` config plugin added to `app.json`
- `src/lib/notifications.ts` requests permission (iOS: system dialog; Android: automatic on API <33)
- Expo push token retrieved and stored in `profiles.expo_push_token`
- Token refreshed if it changes (listener on `addPushTokenListener`)
- Token registration runs only on physical devices (no-op on simulators)
- Foreground notifications display as alerts with sound

### AC-2: DB migration — push token + notification preferences on profiles
- `profiles.expo_push_token text` — Expo push token, nullable
- `profiles.notif_donation_completed bool DEFAULT true`
- `profiles.notif_donation_failed bool DEFAULT true`
- `profiles.notif_threshold_reached bool DEFAULT true`
- `profiles.notif_item_error bool DEFAULT true`

### AC-3: Server-side push helper
- `supabase/functions/_shared/push.ts` — `sendNotificationToUser(userId, type, title, body, data?, admin)`:
  - Fetches `expo_push_token` + matching pref column from `profiles` via service role
  - Skips silently if token is null or pref is false
  - POSTs to `https://exp.host/--/api/v2/push/send`

### AC-4: `stripe-webhook` sends notifications
- `charge.succeeded` → `notif_donation_completed`: "Donation on its way 🫒" / "Your $X donation is being processed. JazakAllah khayran!"
- `charge.failed` → `notif_donation_failed`: "Action needed" / "We couldn't process your donation. Please check your bank account in Settings."

### AC-5: `plaid-webhook` sends notifications
- `ITEM/ERROR` → `notif_item_error`: "Bank connection issue" / "Your linked account needs attention. Tap to reconnect."
- After batch created in `checkAndTriggerDonation` → `notif_threshold_reached`: "Threshold reached 🎉" / "Your $X round-ups are ready — charging your account now."

### AC-6: Notification preferences settings screen
- `src/app/(app)/settings/notifications.tsx` — 4 toggles, each loads from / saves to `profiles`
- Settings "Notification Preferences" row navigates to this screen

### AC-7: `_layout.tsx` calls `registerForPushNotifications` after auth
- Called once when session is first established, re-called on token refresh

---

## Notification types summary

| Type | Trigger | Pref column |
|------|---------|-------------|
| Donation completed | `charge.succeeded` | `notif_donation_completed` |
| Donation failed | `charge.failed` | `notif_donation_failed` |
| Threshold reached | Batch created | `notif_threshold_reached` |
| Bank connection issue | `ITEM/ERROR` | `notif_item_error` |

---

## Notes
- Expo Push Service is used for v1 (abstracts APNs/FCM); no Firebase config required
- Physical device required for real push tokens — simulator gets a placeholder token (handled gracefully)
- `expo-device` used to gate token registration on physical devices only
- EAS Build required for production push delivery (same constraint as Plaid SDK)
