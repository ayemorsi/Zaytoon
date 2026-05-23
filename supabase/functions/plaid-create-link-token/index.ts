// Edge Function: plaid-create-link-token
// Creates a Plaid link_token for the authenticated user.
// The app uses this token to open the Plaid Link SDK.
//
// Deploy: npx supabase functions deploy plaid-create-link-token

import { corsHeaders, errorResponse, jsonResponse, plaidPost } from '../_shared/plaid.ts';
import { getUserFromRequest } from '../_shared/supabase-admin.ts';

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

  try {
    const data = await plaidPost<{ link_token: string; expiration: string }>('/link/token/create', {
      client_name: 'Zaytoon',
      country_codes: ['US'],
      language: 'en',
      user: {
        client_user_id: userId,
      },
      products: ['transactions'],
      // webhook will receive TRANSACTIONS_SYNC events
      webhook: `${Deno.env.get('SUPABASE_URL')}/functions/v1/plaid-webhook`,
    });

    return jsonResponse({ link_token: data.link_token, expiration: data.expiration });
  } catch (err) {
    console.error('[plaid-create-link-token]', err);
    return errorResponse('Failed to create link token', 500);
  }
});
