import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StripeProvider } from '@stripe/stripe-react-native';

import { supabase } from '@/lib/supabase';
import { STRIPE_PUBLISHABLE_KEY } from '@/lib/stripe';
import {
  registerForPushNotifications,
  subscribeToPushTokenRefresh,
  subscribeToNotificationResponse,
} from '@/lib/notifications';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthGate />
        </ThemeProvider>
      </QueryClientProvider>
    </StripeProvider>
  );
}

function AuthGate() {
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        await loadProfile(session.user.id);
        registerForPushNotifications();
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) {
          await loadProfile(session.user.id);
          registerForPushNotifications();
        } else {
          setOnboardingComplete(false);
        }
      }
    );

    // Refresh token when it changes (e.g. after reinstall)
    const tokenSub = subscribeToPushTokenRefresh();

    // Handle notification taps — navigate to relevant screen
    const responseSub = subscribeToNotificationResponse((response) => {
      const data = response.notification.request.content.data as Record<string, string> | undefined;
      if (data?.screen === 'linked-accounts') {
        router.push('/(app)/settings/linked-accounts');
      }
    });

    return () => {
      subscription.unsubscribe();
      tokenSub.remove();
      responseSub.remove();
    };
  }, []);

  async function loadProfile(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', userId)
      .single();
    setOnboardingComplete(profile?.onboarding_complete ?? false);
  }

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';
    const inApp = segments[0] === '(app)';

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && !onboardingComplete && !inOnboarding) {
      router.replace('/(onboarding)/connect-bank');
    } else if (session && onboardingComplete && (inAuth || inOnboarding)) {
      router.replace('/(app)/');
    }
  }, [session, onboardingComplete, loading, segments]);

  return <Slot />;
}
