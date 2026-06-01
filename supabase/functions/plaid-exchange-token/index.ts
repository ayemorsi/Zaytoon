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

    // Check if this item_id already exists (re-link after expiry/revocation)
    const { data: existing } = await admin
      .from('linked_accounts')
      .select('id, institution_name, mask, account_type, plaid_access_token_id')
      .eq('plaid_item_id', item_id)
      .eq('user_id', userId)
      .maybeSingle();

    let linkedAccount: { id: string; institution_name: string; mask: string; account_type: string };

    if (existing) {
      // Re-link: rotate the vault secret in-place and restore the account
      const { error: vaultError } = await admin.rpc('update_plaid_access_token', {
        secret_id: existing.plaid_access_token_id,
        new_token: access_token,
      });
      if (vaultError) {
        console.error('[plaid-exchange-token] Vault update error:', vaultError);
        return errorResponse('Failed to secure account token', 500);
      }

      const { data: updated, error: updateError } = await admin
        .from('linked_accounts')
        .update({ is_active: true })
        .eq('id', existing.id)
        .select('id, institution_name, mask, account_type')
        .single();

      if (updateError || !updated) {
        console.error('[plaid-exchange-token] DB update error:', updateError);
        return errorResponse('Failed to restore account', 500);
      }
      linkedAccount = updated;
      console.log(`[plaid-exchange-token] Re-linked existing account ${existing.id}`);
    } else {
      // Fresh link: store token in vault, then insert row with the vault secret ID
      const { data: secretId, error: vaultError } = await admin.rpc('store_plaid_access_token', {
        token: access_token,
      });
      if (vaultError || !secretId) {
        console.error('[plaid-exchange-token] Vault store error:', vaultError);
        return errorResponse('Failed to secure account token', 500);
      }

      const { data: inserted, error: dbError } = await admin
        .from('linked_accounts')
        .insert({
          user_id: userId,
          plaid_item_id: item_id,
          plaid_access_token_id: secretId,
          plaid_account_id: plaidAccountId,
          institution_name: institutionName,
          mask,
          account_type: accountType,
          is_active: true,
        })
        .select('id, institution_name, mask, account_type')
        .single();

      if (dbError || !inserted) {
        console.error('[plaid-exchange-token] DB insert error:', dbError);
        return errorResponse('Failed to save account', 500);
      }
      linkedAccount = inserted;
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
