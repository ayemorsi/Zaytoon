// Edge Function: plaid-create-link-token
// Creates a Plaid link_token for the authenticated user.
// Accepts an optional `linked_account_id` to create a token in update mode
// (re-authenticates an existing item without creating a new one).
//
// Deploy: npx supabase functions deploy plaid-create-link-token

import { corsHeaders, errorResponse, jsonResponse, plaidPost } from '../_shared/plaid.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts';

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify authenticated user
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  // Optional: linked_account_id triggers update mode for re-linking expired accounts
  let linkedAccountId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    linkedAccountId = body.linked_account_id ?? null;
  } catch {
    // No body or invalid JSON — treat as a fresh link
  }

  let accessTokenForUpdate: string | null = null;

  if (linkedAccountId) {
    // Verify the account belongs to this user and retrieve access token
    const admin = getAdminClient();
    const { data: account, error } = await admin
      .from('linked_accounts')
      .select('plaid_access_token')
      .eq('id', linkedAccountId)
      .eq('user_id', userId)
      .single();

    if (error || !account) {
      return errorResponse('Account not found', 404);
    }
    accessTokenForUpdate = account.plaid_access_token;
  }

  try {
    const linkTokenBody: Record<string, unknown> = {
      client_name: 'Zaytoon',
      country_codes: ['US'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
    };

    if (accessTokenForUpdate) {
      // Update mode: re-authenticate existing item, no new products needed
      linkTokenBody.access_token = accessTokenForUpdate;
    } else {
      // Fresh link: request transaction access
      linkTokenBody.products = ['transactions'];
    }

    const data = await plaidPost<{ link_token: string; expiration: string }>(
      '/link/token/create',
      linkTokenBody
    );

    return jsonResponse({
      link_token: data.link_token,
      expiration: data.expiration,
      is_update_mode: !!accessTokenForUpdate,
    });
  } catch (err) {
    console.error('[plaid-create-link-token]', err);
    return errorResponse('Failed to create link token', 500);
  }
});
