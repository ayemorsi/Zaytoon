// Edge Function: process-donations
// Charges the user's linked bank account via Stripe ACH for a pending donation batch,
// then creates per-charity donation records based on the user's allocation split.
//
// Called by: plaid-webhook (threshold trigger), stripe-webhook (Friday cron in Story 007)
// Auth: service-role secret (internal calls only — not user-facing)
//
// Deploy: npx supabase functions deploy process-donations

import { errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { stripePost } from '../_shared/stripe.ts';
import { plaidPost } from '../_shared/plaid.ts';

// ─── Stripe response shapes (minimal) ─────────────────────────────────────────

interface StripeCustomer {
  id: string;
  object: 'customer';
}

interface StripeBankAccount {
  id: string; // ba_xxx
  object: 'bank_account';
}

interface StripeCharge {
  id: string; // ch_xxx
  object: 'charge';
  status: string;
}

// ─── Plaid processor token response ───────────────────────────────────────────

interface PlaidProcessorTokenResponse {
  processor_token: string; // btok_xxx
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Verify internal service-role key (not a user JWT)
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return errorResponse('Unauthorized', 401);
  }

  let batchId: string;
  try {
    const body = await req.json();
    batchId = body.batch_id;
    if (!batchId) return errorResponse('batch_id is required', 400);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  const admin = getAdminClient();

  // ── 1. Fetch the batch ─────────────────────────────────────────────────────
  const { data: batch, error: batchErr } = await admin
    .from('donation_batches')
    .select('id, user_id, total_amount, status, trigger_type')
    .eq('id', batchId)
    .single();

  if (batchErr || !batch) {
    return errorResponse(`Batch not found: ${batchId}`, 404);
  }

  if (batch.status !== 'pending') {
    console.log(`[process-donations] Batch ${batchId} is already ${batch.status} — skipping`);
    return jsonResponse({ ok: true, skipped: true });
  }

  const userId = batch.user_id;
  const amountCents = Math.round(batch.total_amount * 100);

  // ── 2. Fetch linked account ────────────────────────────────────────────────
  const { data: account, error: accErr } = await admin
    .from('linked_accounts')
    .select('id, plaid_access_token, plaid_account_id, stripe_bank_account_id, institution_name')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (accErr || !account) {
    console.error(`[process-donations] No active linked account for user ${userId}`);
    await admin.from('donation_batches').update({ status: 'failed' }).eq('id', batchId);
    return errorResponse('No linked account found', 422);
  }

  // ── 3. Get or create Stripe Customer ──────────────────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, full_name')
    .eq('id', userId)
    .single();

  let stripeCustomerId = profile?.stripe_customer_id ?? null;

  if (!stripeCustomerId) {
    const customer = await stripePost<StripeCustomer>('/customers', {
      description: `Zaytoon donor ${userId}`,
      name: profile?.full_name ?? undefined,
      metadata: { user_id: userId },
    });
    stripeCustomerId = customer.id;

    await admin
      .from('profiles')
      .update({ stripe_customer_id: stripeCustomerId })
      .eq('id', userId);

    console.log(`[process-donations] Created Stripe customer ${stripeCustomerId} for user ${userId}`);
  }

  // ── 4. Get or create Stripe bank account source ────────────────────────────
  let stripeBankAccountId = account.stripe_bank_account_id ?? null;

  if (!stripeBankAccountId) {
    if (!account.plaid_account_id) {
      console.error(`[process-donations] plaid_account_id missing for linked account ${account.id}`);
      await admin.from('donation_batches').update({ status: 'failed' }).eq('id', batchId);
      return errorResponse('plaid_account_id not set on linked account', 422);
    }

    // Get a one-time Plaid processor token for Stripe
    const processorData = await plaidPost<PlaidProcessorTokenResponse>(
      '/processor/stripe/bank_account_token/create',
      {
        access_token: account.plaid_access_token,
        account_id: account.plaid_account_id,
        processor: 'stripe',
      }
    );

    // Attach bank account to Stripe Customer
    const bankAccount = await stripePost<StripeBankAccount>(
      `/customers/${stripeCustomerId}/sources`,
      { source: processorData.processor_token }
    );

    stripeBankAccountId = bankAccount.id;

    await admin
      .from('linked_accounts')
      .update({ stripe_bank_account_id: stripeBankAccountId })
      .eq('id', account.id);

    console.log(`[process-donations] Attached Stripe bank account ${stripeBankAccountId}`);
  }

  // ── 5. Create Stripe charge (ACH debit) ────────────────────────────────────
  let charge: StripeCharge;
  try {
    charge = await stripePost<StripeCharge>('/charges', {
      amount: amountCents,
      currency: 'usd',
      customer: stripeCustomerId,
      source: stripeBankAccountId,
      description: `Zaytoon charitable donation — batch ${batchId}`,
      metadata: { batch_id: batchId, user_id: userId },
    });
  } catch (err) {
    console.error('[process-donations] Stripe charge failed:', err);
    await admin.from('donation_batches').update({ status: 'failed' }).eq('id', batchId);
    return errorResponse('Stripe charge creation failed', 502);
  }

  // ── 6. Update batch to processing ─────────────────────────────────────────
  await admin
    .from('donation_batches')
    .update({ stripe_payment_intent_id: charge.id, status: 'processing' })
    .eq('id', batchId);

  // ── 7. Build per-charity donation rows ────────────────────────────────────
  const { data: allocations } = await admin
    .from('user_charity_allocations')
    .select('nonprofit_id, split_percentage')
    .eq('user_id', userId);

  const charities = allocations ?? [];

  let donationRows: Array<{
    batch_id: string;
    user_id: string;
    nonprofit_id: string;
    amount: number;
    status: string;
  }>;

  if (charities.length === 0) {
    // No allocations — nothing to split; batch still processes but no donations created yet
    console.warn(`[process-donations] User ${userId} has no charity allocations`);
    donationRows = [];
  } else {
    // Calculate split: use split_percentage if non-zero, otherwise equal split
    const hasCustomSplit = charities.some((c) => c.split_percentage > 0);

    donationRows = charities.map((c) => {
      const fraction = hasCustomSplit
        ? c.split_percentage / 100
        : 1 / charities.length;

      const amount = Math.round(batch.total_amount * fraction * 100) / 100;
      return {
        batch_id: batchId,
        user_id: userId,
        nonprofit_id: c.nonprofit_id,
        amount,
        status: 'pending',
      };
    });

    // Fix rounding: adjust last row so total equals batch amount
    const sumSoFar = donationRows.reduce((s, r) => s + r.amount, 0);
    const diff = Math.round((batch.total_amount - sumSoFar) * 100) / 100;
    if (diff !== 0 && donationRows.length > 0) {
      donationRows[donationRows.length - 1].amount =
        Math.round((donationRows[donationRows.length - 1].amount + diff) * 100) / 100;
    }
  }

  if (donationRows.length > 0) {
    const { error: donErr } = await admin.from('donations').insert(donationRows);
    if (donErr) {
      console.error('[process-donations] Failed to insert donations:', donErr);
    }
  }

  console.log(
    `[process-donations] Batch ${batchId}: charge ${charge.id} created, ` +
    `${donationRows.length} donation rows inserted`
  );

  return jsonResponse({ ok: true, charge_id: charge.id });
});
