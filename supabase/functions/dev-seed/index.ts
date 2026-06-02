// Edge Function: dev-seed
// Seeds fake round-up transactions for a user to enable local/staging testing
// without needing real Plaid transactions flowing in.
//
// Auth: user JWT (Bearer token in Authorization header)
// Body: { "count": 10, "trigger_donation": true }
//
// Deploy: npx supabase functions deploy dev-seed

import { corsHeaders, errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts';

const MERCHANTS = [
  'Starbucks',
  'Chipotle',
  'Amazon',
  'Target',
  'Uber',
  'Whole Foods',
  'CVS',
  'Netflix',
];

function randomAmount(): number {
  // Random amount between $1.10 and $19.90, two decimal places
  const raw = 1.1 + Math.random() * (19.9 - 1.1);
  return Math.round(raw * 100) / 100;
}

function roundUp(amount: number): number {
  const ru = Math.ceil(amount) - amount;
  return Math.round(ru * 100) / 100;
}

function transactedAt(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

Deno.serve(async (req: Request) => {
  // CORS pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const userId = await getUserFromRequest(req);
  if (!userId) {
    return errorResponse('Unauthorized — provide a valid user JWT', 401);
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let count = 10;
  let triggerDonation = false;

  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.count === 'number' && body.count > 0) {
      count = Math.min(Math.floor(body.count), 100); // cap at 100
    }
    if (typeof body.trigger_donation === 'boolean') {
      triggerDonation = body.trigger_donation;
    }
  } catch {
    // no body or invalid JSON — use defaults
  }

  const admin = getAdminClient();

  // ── Fetch linked account (any, prefer active) ────────────────────────────
  const { data: accountRows, error: accErr } = await admin
    .from('linked_accounts')
    .select('id, is_active')
    .eq('user_id', userId)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(5);

  if (accErr) {
    console.error('[dev-seed] linked_accounts query error:', accErr);
    return errorResponse('Failed to fetch linked accounts', 500);
  }

  console.log('[dev-seed] linked accounts found:', JSON.stringify(accountRows));

  const linkedAccountId = accountRows && accountRows.length > 0
    ? accountRows[0].id
    : null;

  if (!linkedAccountId) {
    return errorResponse('No linked account found for this user. Connect a bank account first in Settings.', 400);
  }

  // ── Build fake transaction rows ───────────────────────────────────────────
  const now = Date.now();
  const rows: Array<{
    user_id: string;
    linked_account_id: string;
    plaid_transaction_id: string;
    merchant_name: string;
    transaction_amount: number;
    roundup_amount: number;
    transacted_at: string;
    status: string;
  }> = [];

  for (let i = 0; i < count; i++) {
    const amount = randomAmount();
    const ru = roundUp(amount);
    if (ru === 0) {
      // Whole-dollar amount — skip (matches spec)
      continue;
    }

    const daysAgo = Math.floor((i / count) * 7); // spread over last 7 days
    rows.push({
      user_id: userId,
      linked_account_id: linkedAccountId,
      plaid_transaction_id: `dev_test_${now}_${i}`,
      merchant_name: MERCHANTS[i % MERCHANTS.length],
      transaction_amount: amount,
      roundup_amount: ru,
      transacted_at: transactedAt(daysAgo),
      status: 'pending',
    });
  }

  // ── Upsert transactions ───────────────────────────────────────────────────
  const { error: upsertErr } = await admin
    .from('roundup_transactions')
    .upsert(rows, { onConflict: 'plaid_transaction_id' });

  if (upsertErr) {
    console.error('[dev-seed] upsert error:', upsertErr);
    return errorResponse(`Failed to insert transactions: ${upsertErr.message}`, 500);
  }

  const inserted = rows.length;
  console.log(`[dev-seed] Inserted ${inserted} fake transactions for user ${userId}`);

  // ── Compute pending total ─────────────────────────────────────────────────
  const { data: pendingRows, error: pendingErr } = await admin
    .from('roundup_transactions')
    .select('roundup_amount')
    .eq('user_id', userId)
    .eq('status', 'pending');

  if (pendingErr) {
    console.error('[dev-seed] pending sum error:', pendingErr);
    return errorResponse('Failed to compute pending total', 500);
  }

  const pendingTotal = (pendingRows ?? []).reduce(
    (sum: number, r: { roundup_amount: number }) => sum + r.roundup_amount,
    0
  );
  const pendingTotalRounded = Math.round(pendingTotal * 100) / 100;

  // ── Optionally trigger a donation batch ───────────────────────────────────
  let batchCreated = false;
  let batchId: string | null = null;

  // Fetch user donation preferences
  const { data: prefs } = await admin
    .from('donation_preferences')
    .select('threshold_amount, monthly_cap, is_paused')
    .eq('user_id', userId)
    .single();

  const threshold = prefs?.threshold_amount ?? null;
  const isPaused = prefs?.is_paused ?? false;

  const shouldTrigger =
    triggerDonation ||
    (threshold !== null && pendingTotalRounded >= threshold);

  if (shouldTrigger && !isPaused && pendingTotalRounded > 0) {
    // Create a donation batch
    const { data: batchRow, error: batchErr } = await admin
      .from('donation_batches')
      .insert({
        user_id: userId,
        status: 'pending',
        trigger_type: 'threshold',
        total_amount: pendingTotalRounded,
      })
      .select('id')
      .single();

    if (batchErr || !batchRow) {
      console.error('[dev-seed] batch insert error:', batchErr);
      return errorResponse('Failed to create donation batch', 500);
    }

    batchId = batchRow.id;
    batchCreated = true;

    // Mark transactions as included_in_batch
    const { error: markErr } = await admin
      .from('roundup_transactions')
      .update({ status: 'included_in_batch' })
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (markErr) {
      console.error('[dev-seed] Failed to mark transactions included_in_batch:', markErr);
    }

    // Call process-donations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    try {
      const processRes = await fetch(`${supabaseUrl}/functions/v1/process-donations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ batch_id: batchId }),
      });

      const processBody = await processRes.json().catch(() => ({}));
      console.log(`[dev-seed] process-donations response (${processRes.status}):`, processBody);
    } catch (err) {
      console.error('[dev-seed] Failed to call process-donations:', err);
      // Non-fatal — batch was created, caller can retry
    }
  }

  return jsonResponse({
    inserted,
    pending_total: pendingTotalRounded,
    batch_created: batchCreated,
    batch_id: batchId,
  });
});
