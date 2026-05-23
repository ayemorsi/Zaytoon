// App-side Plaid helpers — call Supabase Edge Functions (never call Plaid directly from app)

import { supabase } from './supabase';
import type { LinkedAccount } from '@/types/app.types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Calls the `plaid-create-link-token` Edge Function.
 * Returns the link_token needed to open the Plaid Link SDK.
 */
export async function createLinkToken(): Promise<string> {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/plaid-create-link-token`, {
    method: 'POST',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to create link token');
  return data.link_token as string;
}

/**
 * Calls the `plaid-exchange-token` Edge Function.
 * Exchanges the one-time public_token for stored credentials and returns safe account metadata.
 */
export async function exchangeToken(
  publicToken: string,
  institutionId?: string | null
): Promise<LinkedAccount> {
  const headers = await authHeaders();
  const res = await fetch(`${SUPABASE_URL}/functions/v1/plaid-exchange-token`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ public_token: publicToken, institution_id: institutionId ?? null }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to link account');
  return data.account as LinkedAccount;
}
