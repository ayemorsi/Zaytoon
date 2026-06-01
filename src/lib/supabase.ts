import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import type { Database } from '@/types/database.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!SUPABASE_URL || SUPABASE_URL === 'https://your-project.supabase.co') {
  console.error(
    '\n\n⚠️  EXPO_PUBLIC_SUPABASE_URL is not set.\n' +
    'Copy .env.example → .env and fill in your Supabase project URL and anon key.\n' +
    'Get them from: supabase.com → your project → Settings → API\n\n'
  );
}

const secureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: Platform.OS === 'web' ? undefined : secureStoreAdapter,
      autoRefreshToken: !!SUPABASE_URL && SUPABASE_URL !== 'https://your-project.supabase.co',
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
