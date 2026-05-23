// Edge Function: plaid-exchange-token
// Exchanges a Plaid public_token for an access_token, then stores
// the linked account in the DB. Returns safe account metadata (never
// the raw access_token) to the app.
//
// Deploy: npx supabase functions deploy plaid-exchange-token

import { corsHeaders, errorResponse, jsonResponse, plaidPost } from '../_shared/plaid.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts';

interface ExchangeResponse {
  access_token: string;
  item_id: string;
  request_id: string;
}

interface AccountsResponse {
  accounts: Array<{
    account_id: string;
    mask: string;
    name: string;
    official_name: string | null;
    type: string;
    subtype: string | null;
  }>;
  item: {
    institution_id: string | null;
  };
}

interface InstitutionResponse {
  institution: {
    name: string;
    institution_id: string;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const userId = await getUserFromRequest(req);
  if (!userId) {
    return errorResponse('Unauthorized', 401);
  }

  let publicToken: string;
  let institutionId: string | null = null;
  let institutionName: string = 'Your Bank';

  try {
    const body = await req.json();
    publicToken = body.public_token;
    institutionId = body.institution_id ?? null;
    if (!publicToken) return errorResponse('public_token is required', 400);
  } catch {
    return errorResponse('Invalid request body', 400);
  }

  try {
    // 1. Exchange public_token → access_token
    const exchangeData = await plaidPost<ExchangeResponse>('/item/public_token/exchange', {
      public_token: publicToken,
    });

    const { access_token, item_id } = exchangeData;

    // 2. Get institution name if we have an ID
    if (institutionId) {
      try {
        const instData = await plaidPost<InstitutionResponse>('/institutions/get_by_id', {
          institution_id: institutionId,
          country_codes: ['US'],
        });
        institutionName = instData.institution.name;
      } catch {
        // Non-fatal — default name used
      }
    }

    // 3. Get account details (mask, type)
    const accountsData = await plaidPost<AccountsResponse>('/accounts/get', {
      access_token,
    });

    const primaryAccount = accountsData.accounts[0];
    const mask = primaryAccount?.mask ?? '0000';
    const accountType = primaryAccount?.subtype ?? primaryAccount?.type ?? 'checking';
    const plaidAccountId = primaryAccount?.account_id ?? null;

    // 4. Store in DB using service role (bypasses RLS)
    const admin = getAdminClient();

    const { data: linkedAccount, error: dbError } = await admin
      .from('linked_accounts')
      .insert({
        user_id: userId,
        plaid_item_id: item_id,
        plaid_access_token: access_token, // TODO: encrypt with Supabase Vault in production
        plaid_account_id: plaidAccountId,
        institution_name: institutionName,
        mask,
        account_type: accountType,
        is_active: true,
      })
      .select('id, institution_name, mask, account_type')
      .single();

    if (dbError) {
      console.error('[plaid-exchange-token] DB insert error:', dbError);
      return errorResponse('Failed to save account', 500);
    }

    // 5. Return safe metadata only (never the access_token)
    return jsonResponse({
      account: {
        id: linkedAccount.id,
        institution_name: linkedAccount.institution_name,
        mask: linkedAccount.mask,
        account_type: linkedAccount.account_type,
      },
    });
  } catch (err) {
    console.error('[plaid-exchange-token]', err);
    return errorResponse('Failed to link account. Please try again.', 500);
  }
});
