// Edge Function: plaid-webhook
// Receives Plaid webhook events, verifies the signature, syncs
// transactions, and inserts round-up records.
//
// Register this URL in Plaid Dashboard:
//   <SUPABASE_URL>/functions/v1/plaid-webhook
//
// Deploy: npx supabase functions deploy plaid-webhook

import { errorResponse, jsonResponse, plaidPost } from '../_shared/plaid.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { sendNotificationToUser } from '../_shared/push.ts';

// ─── Round-up calculation ─────────────────────────────────────────────────────

function calculateRoundup(transactionAmount: number): number {
  // Only round up purchases (positive amounts), skip credits/refunds
  if (transactionAmount <= 0) return 0;

  const roundedUp = Math.ceil(transactionAmount);
  const roundup = roundedUp - transactionAmount;

  // Skip whole dollar amounts
  if (roundup === 0) return 0;

  // Fix floating-point precision (e.g., 4.2 → ceil=5, roundup=0.7999... → 0.80)
  return Math.round(roundup * 100) / 100;
}

// ─── Plaid webhook signature verification ─────────────────────────────────────
// Plaid signs webhooks with a JWT in the `Plaid-Verification` header.
// We decode the JWT, fetch the signing key from Plaid, and verify.

async function verifyPlaidWebhook(req: Request): Promise<boolean> {
  const verificationToken = req.headers.get('Plaid-Verification');
  if (!verificationToken) {
    console.warn('[plaid-webhook] Missing Plaid-Verification header');
    return false;
  }

  try {
    // Decode JWT header to get key ID
    const [headerB64] = verificationToken.split('.');
    const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/')));
    const keyId = header.kid;

    if (!keyId) return false;

    // Fetch the verification key from Plaid
    const keyData = await plaidPost<{ key: JsonWebKey }>('/webhook_verification_key/get', {
      key_id: keyId,
    });

    // Import the key and verify the JWT
    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      keyData.key,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [, payloadB64, signatureB64] = verificationToken.split('.');
    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = Uint8Array.from(
      atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', cryptoKey, signature, signingInput);
    if (!valid) return false;

    // Check timestamp (must be < 5 minutes old)
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat;
    if (ageSeconds > 300) {
      console.warn('[plaid-webhook] Token too old:', ageSeconds, 'seconds');
      return false;
    }

    return true;
  } catch (err) {
    console.error('[plaid-webhook] Signature verification failed:', err);
    return false;
  }
}

// ─── Transaction sync ─────────────────────────────────────────────────────────

interface PlaidTransaction {
  transaction_id: string;
  account_id: string;
  amount: number; // positive = debit (purchase), negative = credit
  name: string;
  merchant_name: string | null;
  date: string;
  pending: boolean;
}

interface TransactionsSyncResponse {
  added: PlaidTransaction[];
  modified: PlaidTransaction[];
  removed: Array<{ transaction_id: string }>;
  next_cursor: string;
  has_more: boolean;
}

async function syncTransactions(
  accessToken: string,
  cursor: string | null,
  userId: string,
  linkedAccountId: string
): Promise<string> {
  const admin = getAdminClient();
  let nextCursor = cursor ?? '';
  let hasMore = true;
  let totalInserted = 0;

  while (hasMore) {
    const body: Record<string, unknown> = { access_token: accessToken };
    if (nextCursor) body.cursor = nextCursor;

    const syncData = await plaidPost<TransactionsSyncResponse>('/transactions/sync', body);

    const roundupsToInsert = [];

    for (const tx of syncData.added) {
      // Skip pending transactions — wait for posted
      if (tx.pending) continue;

      const roundup = calculateRoundup(tx.amount);
      if (roundup === 0) continue;

      roundupsToInsert.push({
        user_id: userId,
        linked_account_id: linkedAccountId,
        plaid_transaction_id: tx.transaction_id,
        transaction_amount: tx.amount,
        roundup_amount: roundup,
        merchant_name: tx.merchant_name ?? tx.name ?? null,
        transacted_at: new Date(tx.date).toISOString(),
        status: 'pending',
      });
    }

    if (roundupsToInsert.length > 0) {
      const { error } = await admin
        .from('roundup_transactions')
        .upsert(roundupsToInsert, { onConflict: 'plaid_transaction_id' });

      if (error) {
        console.error('[plaid-webhook] Failed to insert round-ups:', error);
      } else {
        totalInserted += roundupsToInsert.length;
      }
    }

    nextCursor = syncData.next_cursor;
    hasMore = syncData.has_more;
  }

  console.log(`[plaid-webhook] Inserted ${totalInserted} round-ups for user ${userId}`);
  return nextCursor;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' },
    });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify Plaid webhook signature
  // Clone request before reading body so we can read it again
  const bodyText = await req.text();
  const reqClone = new Request(req.url, {
    method: req.method,
    headers: req.headers,
    body: bodyText,
  });

  const isValid = await verifyPlaidWebhook(reqClone);
  if (!isValid) {
    console.error('[plaid-webhook] Invalid signature — rejecting');
    return errorResponse('Invalid webhook signature', 401);
  }

  let webhook: {
    webhook_type: string;
    webhook_code: string;
    item_id: string;
    error?: { error_code: string; error_message: string };
  };

  try {
    webhook = JSON.parse(bodyText);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const admin = getAdminClient();
  const { webhook_type, webhook_code, item_id } = webhook;

  console.log(`[plaid-webhook] ${webhook_type}/${webhook_code} for item ${item_id}`);

  // ── Handle TRANSACTIONS webhook ───────────────────────────────────────────
  if (webhook_type === 'TRANSACTIONS' && webhook_code === 'SYNC_UPDATES_AVAILABLE') {
    // Fetch the linked account for this item
    const { data: account, error: accError } = await admin
      .from('linked_accounts')
      .select('id, user_id, plaid_access_token_id, plaid_sync_cursor')
      .eq('plaid_item_id', item_id)
      .eq('is_active', true)
      .single();

    if (accError || !account) {
      console.error('[plaid-webhook] Account not found for item:', item_id);
      return jsonResponse({ received: true }); // Acknowledge to avoid Plaid retrying
    }

    // Decrypt the access token from vault
    const { data: accessToken, error: vaultError } = await admin.rpc('get_plaid_access_token', {
      secret_id: account.plaid_access_token_id,
    });
    if (vaultError || !accessToken) {
      console.error('[plaid-webhook] Vault read failed for account:', account.id, vaultError);
      return jsonResponse({ received: true });
    }

    try {
      const newCursor = await syncTransactions(
        accessToken,
        account.plaid_sync_cursor ?? null,
        account.user_id,
        account.id
      );

      // Update cursor for next sync
      await admin
        .from('linked_accounts')
        .update({ plaid_sync_cursor: newCursor })
        .eq('id', account.id);

      // Check threshold after inserting new round-ups
      await checkAndTriggerDonation(account.user_id, admin);

    } catch (err) {
      console.error('[plaid-webhook] Sync failed:', err);
      // Still acknowledge so Plaid doesn't retry immediately
    }
  }

  // ── Handle ITEM/ERROR (access revoked / token invalid) ───────────────────
  if (webhook_type === 'ITEM' && webhook_code === 'ERROR') {
    const { data: account } = await admin
      .from('linked_accounts')
      .select('id, user_id')
      .eq('plaid_item_id', item_id)
      .single();

    if (account) {
      await admin
        .from('linked_accounts')
        .update({ is_active: false })
        .eq('id', account.id);

      console.log(`[plaid-webhook] Marked account ${account.id} inactive due to ITEM error`);

      await sendNotificationToUser(
        account.user_id,
        'item_error',
        'Bank connection issue',
        'Your linked account needs attention. Tap to reconnect in Settings.',
        { screen: 'linked-accounts' },
        admin
      );
    }
  }

  // ── Handle ITEM/USER_PERMISSION_REVOKED (user removed access at bank) ────
  if (webhook_type === 'ITEM' && webhook_code === 'USER_PERMISSION_REVOKED') {
    const { data: account } = await admin
      .from('linked_accounts')
      .select('id, user_id')
      .eq('plaid_item_id', item_id)
      .single();

    if (account) {
      await admin
        .from('linked_accounts')
        .update({ is_active: false })
        .eq('id', account.id);

      console.log(`[plaid-webhook] Marked account ${account.id} inactive: user revoked permission`);

      await sendNotificationToUser(
        account.user_id,
        'item_error',
        'Bank access revoked',
        'Your bank connection was removed. Tap to reconnect in Settings.',
        { screen: 'linked-accounts' },
        admin
      );
    }
  }

  // ── Handle ITEM/PENDING_EXPIRATION (bank requires re-auth within 7 days) ─
  if (webhook_type === 'ITEM' && webhook_code === 'PENDING_EXPIRATION') {
    const { data: account } = await admin
      .from('linked_accounts')
      .select('id, user_id')
      .eq('plaid_item_id', item_id)
      .single();

    if (account) {
      // Account still works — just warn the user so they can re-auth before it expires
      console.log(`[plaid-webhook] Account ${account.id} pending expiration`);

      await sendNotificationToUser(
        account.user_id,
        'item_error',
        'Bank connection expiring soon',
        'Your bank connection expires in 7 days. Tap to reconnect now.',
        { screen: 'linked-accounts' },
        admin
      );
    }
  }

  // Always acknowledge webhook to Plaid
  return jsonResponse({ received: true });
});

// ─── Threshold check helper ───────────────────────────────────────────────────

async function checkAndTriggerDonation(
  userId: string,
  admin: ReturnType<typeof getAdminClient>
): Promise<void> {
  // Get user's preferences
  const { data: prefs } = await admin
    .from('donation_preferences')
    .select('threshold_amount, monthly_cap, is_paused')
    .eq('user_id', userId)
    .single();

  if (!prefs || prefs.is_paused) return;

  // Sum pending round-ups
  const { data: roundups } = await admin
    .from('roundup_transactions')
    .select('roundup_amount')
    .eq('user_id', userId)
    .eq('status', 'pending');

  const pendingTotal = (roundups ?? []).reduce((s, r) => s + r.roundup_amount, 0);

  if (pendingTotal < prefs.threshold_amount) return;

  // Check monthly cap
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: monthlyDonations } = await admin
    .from('donations')
    .select('amount')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', startOfMonth.toISOString());

  const monthlyTotal = (monthlyDonations ?? []).reduce((s, d) => s + d.amount, 0);
  if (monthlyTotal >= prefs.monthly_cap) {
    console.log(`[plaid-webhook] User ${userId} has reached monthly cap`);
    return;
  }

  // Create donation batch
  const donationAmount = Math.min(
    Math.round(pendingTotal * 100) / 100,
    prefs.monthly_cap - monthlyTotal
  );

  const { data: batch, error: batchError } = await admin
    .from('donation_batches')
    .insert({
      user_id: userId,
      total_amount: donationAmount,
      status: 'pending',
      trigger_type: 'threshold',
    })
    .select('id')
    .single();

  if (batchError || !batch) {
    console.error('[plaid-webhook] Failed to create batch:', batchError);
    return;
  }

  // Mark round-ups as included
  await admin
    .from('roundup_transactions')
    .update({ status: 'included_in_batch' })
    .eq('user_id', userId)
    .eq('status', 'pending');

  console.log(`[plaid-webhook] Created batch ${batch.id} for $${donationAmount} for user ${userId}`);

  // Notify user that threshold was reached and charge is being initiated
  await sendNotificationToUser(
    userId,
    'threshold_reached',
    'Threshold reached 🎉',
    `Your $${donationAmount.toFixed(2)} in round-ups is ready — charging your account now.`,
    { batch_id: batch.id },
    admin
  );

  // Trigger Stripe ACH charge via the process-donations Edge Function
  await triggerProcessDonations(batch.id);
}

// ─── Internal call to process-donations ──────────────────────────────────────

async function triggerProcessDonations(batchId: string): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/process-donations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ batch_id: batchId }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[plaid-webhook] process-donations failed (${res.status}): ${body}`);
    } else {
      console.log(`[plaid-webhook] process-donations triggered for batch ${batchId}`);
    }
  } catch (err) {
    console.error('[plaid-webhook] Failed to call process-donations:', err);
  }
}
