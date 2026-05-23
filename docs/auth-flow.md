# Zaytoon — Auth Flow

**Version:** 1.0
**Date:** 2026-05-23

---

## 1. Auth Stack Overview

| Layer | Technology |
|---|---|
| Auth provider | Supabase Auth |
| Google OAuth | `expo-auth-session` + Supabase OAuth redirect |
| Apple Sign-In | `expo-apple-authentication` + Supabase `signInWithIdToken` |
| Phone OTP | Supabase Auth phone provider (Twilio SMS) |
| Email/Password | Supabase Auth native |
| Token storage | `expo-secure-store` |
| Session management | Supabase JS client (`@supabase/supabase-js`) |

---

## 2. Supabase Client Setup

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from '@/types/database.types';

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : secureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
```

---

## 3. Root Layout Auth Guard

```ts
// src/app/_layout.tsx (simplified logic)
import { useEffect, useState } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const [session, setSession] = useState(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', session.user.id)
          .single();
        setOnboardingComplete(profile?.onboarding_complete ?? false);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', session.user.id)
            .single();
          setOnboardingComplete(profile?.onboarding_complete ?? false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && !onboardingComplete && !inOnboarding) {
      router.replace('/(onboarding)/connect-bank');
    } else if (session && onboardingComplete && (inAuth || inOnboarding)) {
      router.replace('/(app)/');
    }
  }, [session, onboardingComplete, loading, segments]);

  if (loading) return <SplashScreen />;
  return <Slot />;
}
```

---

## 4. Auth Methods

### 4.1 Email / Password

#### Sign Up
```
User enters email + password
  ↓
supabase.auth.signUp({ email, password })
  ↓
Supabase sends verification email (optional — can disable for v1)
  ↓
On success: insert row into profiles table (via DB trigger)
  ↓
Auth state change fires → root layout redirects to onboarding
```

#### Login
```
User enters email + password
  ↓
supabase.auth.signInWithPassword({ email, password })
  ↓
On success: session stored in SecureStore
  ↓
Auth state change fires → root layout routes based on onboarding_complete
```

#### Forgot Password
```
User enters email
  ↓
supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'zaytoonapp://reset-password'
})
  ↓
User clicks link in email → deep link opens app
  ↓
supabase.auth.updateUser({ password: newPassword })
```

---

### 4.2 Google OAuth

```ts
// src/app/(auth)/login.tsx
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({ scheme: 'zaytoonapp' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (data?.url) {
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      // Parse tokens from URL and set session
      const url = new URL(result.url);
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');
      if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }
    }
  }
}
```

**Supabase Dashboard config required:**
- Enable Google provider
- Set Authorized Redirect URIs to include `zaytoonapp://`
- Add Google OAuth credentials (Client ID + Secret)

---

### 4.3 Apple Sign-In

```ts
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase';

async function signInWithApple() {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (credential.identityToken) {
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    // Auth state change handles routing
  }
}
```

**Requirements:**
- Apple Sign-In capability added in Xcode / EAS credentials
- Bundle ID registered with Apple for Sign-In
- Enable Apple provider in Supabase Dashboard

---

### 4.4 Phone OTP

```
Step 1 — Request OTP:
  User enters phone number (+1XXXXXXXXXX)
  ↓
  supabase.auth.signInWithOtp({ phone: '+1XXXXXXXXXX' })
  ↓
  Twilio sends SMS with 6-digit code
  ↓
  Navigate to verify-otp screen

Step 2 — Verify OTP:
  User enters 6-digit code
  ↓
  supabase.auth.verifyOtp({ phone, token, type: 'sms' })
  ↓
  On success: session created → routing based on onboarding_complete
```

**Supabase Dashboard config required:**
- Enable Phone provider
- Connect Twilio account (Account SID, Auth Token, From number)

---

## 5. Profile Creation (DB Trigger)

When `auth.users` row is created, a Postgres trigger auto-creates a `profiles` row:

```sql
-- Migration: create_profile_on_signup.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 6. Sign Out

```ts
async function signOut() {
  await supabase.auth.signOut();
  // Auth state change fires → root layout redirects to (auth)/welcome
  // SecureStore tokens are cleared automatically by Supabase client
}
```

---

## 7. Auth UI Screens

### Welcome Screen (`/(auth)/welcome`)
- Zaytoon logo + tagline
- "Get Started" button → login screen
- Brief value prop: "Round up your purchases. Change the world."

### Login Screen (`/(auth)/login`)
```
┌─────────────────────────────────┐
│         [Zaytoon Logo]          │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Continue with Google   │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Continue with Apple    │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Continue with Phone    │    │
│  └─────────────────────────┘    │
│                                 │
│         ──── or ────            │
│                                 │
│  Email ________________________ │
│  Password _____________________ │
│                                 │
│  [          Sign In           ] │
│                                 │
│  Forgot password?               │
│  Don't have an account? Sign up │
└─────────────────────────────────┘
```

### Sign Up Screen (`/(auth)/signup`)
- Full name, email, password, confirm password
- Terms of Service + Privacy Policy checkbox (required)
- "Create Account" button

### Verify OTP Screen (`/(auth)/verify-otp`)
- Phone number display (masked)
- 6-digit OTP input (auto-advance between digits)
- Resend code (60s cooldown)
- Change phone number link

---

## 8. Session Token Lifecycle

```
Sign in → Supabase issues:
  - access_token (JWT, 1 hour expiry)
  - refresh_token (long-lived, stored in SecureStore)

Supabase JS client:
  - Auto-refreshes access_token before expiry
  - Uses refresh_token to get new access_token
  - If refresh fails → signOut() → redirect to (auth)/welcome

App startup:
  - Reads session from SecureStore (via Supabase client)
  - If session expired, attempts refresh
  - If refresh fails, clears session → unauthenticated
```

---

## 9. Security Considerations

- All tokens stored in `expo-secure-store` (hardware-backed encryption on iOS/Android)
- No tokens in AsyncStorage or state
- Supabase RLS ensures users cannot access other users' data even with valid JWT
- OAuth redirect scheme `zaytoonapp://` is registered in `app.json`
- Phone numbers stored in Supabase Auth (not `profiles` table) to minimize PII exposure
- All API calls over HTTPS/TLS
