// Edge Function: friday-cron
// Processes all users with schedule = 'weekly_friday' on every Friday at 6am UTC.
// Creates a donation batch for each user who has pending round-ups (any amount > $0),
// regardless of their threshold setting — Friday overrides the threshold.
//
// Triggered by: pg_cron via net.http_post (see migration 20260523000004_friday_cron.sql)
// Also callable manually for testing.
//
// Deploy: npx supabase functions deploy friday-cron

import { errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { sendNotificationToUser } from '../_shared/push.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  // Protect with service-role key
  const authHeader = req.headers.get('Authorization');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!authHeader || authHeader !== `Bearer ${serviceKey}`) {
    return errorResponse('Unauthorized', 401);
  }

  const admin = getAdminClient();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  // ── 1. Find all Friday-schedule users who are not paused ──────────────────
  const { data: fridayPrefs, error: prefsErr } = await admin
    .from('donation_preferences')
    .select('user_id, monthly_cap')
    .eq('schedule', 'weekly_friday')
    .eq('is_paused', false);

  if (prefsErr) {
    console.error('[friday-cron] Failed to query preferences:', prefsErr);
    return errorResponse('DB error', 500);
  }

  if (!fridayPrefs || fridayPrefs.length === 0) {
    console.log('[friday-cron] No Friday-schedule users found');
    return jsonResponse({ processed: 0 });
  }

  console.log(`[friday-cron] Processing ${fridayPrefs.length} Friday-schedule users`);

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  let processed = 0;

  for (const pref of fridayPrefs) {
    const userId = pref.user_id;

    try {
      // ── 2. Sum pending round-ups ──────────────────────────────────────────
      const { data: roundups } = await admin
        .from('roundup_transactions')
        .select('roundup_amount')
        .eq('user_id', userId)
        .eq('status', 'pending');

      const pendingTotal =
        Math.round((roundups ?? []).reduce((s, r) => s + r.roundup_amount, 0) * 100) / 100;

      if (pendingTotal === 0) {
        console.log(`[friday-cron] User ${userId}: $0 pending — skipping`);
        continue;
      }

      // ── 3. Check monthly cap ──────────────────────────────────────────────
      const { data: monthlyDonations } = await admin
        .from('donations')
        .select('amount')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .gte('created_at', startOfMonth.toISOString());

      const monthlyTotal =
        (monthlyDonations ?? []).reduce((s, d) => s + d.amount, 0);

      if (monthlyTotal >= pref.monthly_cap) {
        console.log(`[friday-cron] User ${userId}: monthly cap $${pref.monthly_cap} reached — skipping`);
        continue;
      }

      const donationAmount =
        Math.round(Math.min(pendingTotal, pref.monthly_cap - monthlyTotal) * 100) / 100;

      // ── 4. Create donation batch ──────────────────────────────────────────
      const { data: batch, error: batchErr } = await admin
        .from('donation_batches')
        .insert({
          user_id: userId,
          total_amount: donationAmount,
          status: 'pending',
          trigger_type: 'scheduled_friday',
        })
        .select('id')
        .single();

      if (batchErr || !batch) {
        console.error(`[friday-cron] Failed to create batch for user ${userId}:`, batchErr);
        continue;
      }

      // ── 5. Mark round-ups as included ────────────────────────────────────
      await admin
        .from('roundup_transactions')
        .update({ status: 'included_in_batch' })
        .eq('user_id', userId)
        .eq('status', 'pending');

      console.log(`[friday-cron] Created batch ${batch.id} for $${donationAmount} for user ${userId}`);

      // ── 6. Push notification ──────────────────────────────────────────────
      await sendNotificationToUser(
        userId,
        'threshold_reached',
        'Friday giving 🕌',
        `Your $${donationAmount.toFixed(2)} in round-ups is being donated today. JazakAllah khayran!`,
        { batch_id: batch.id },
        admin
      );

      // ── 7. Trigger Stripe charge ──────────────────────────────────────────
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/process-donations`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ batch_id: batch.id }),
        });

        if (!res.ok) {
          console.error(`[friday-cron] process-donations failed for batch ${batch.id}: ${res.status}`);
        }
      } catch (err) {
        console.error(`[friday-cron] Failed to call process-donations for batch ${batch.id}:`, err);
      }

      processed++;
    } catch (err) {
      console.error(`[friday-cron] Unexpected error for user ${userId}:`, err);
    }
  }

  console.log(`[friday-cron] Done — processed ${processed} users`);
  return jsonResponse({ processed });
});
