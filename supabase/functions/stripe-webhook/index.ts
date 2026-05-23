// Edge Function: stripe-webhook
// Handles async Stripe charge events (ACH settlements happen 1–5 business days later).
//
// Register this URL in the Stripe Dashboard → Webhooks:
//   <SUPABASE_URL>/functions/v1/stripe-webhook
//
// Events to subscribe to:
//   charge.succeeded
//   charge.failed
//
// Deploy: npx supabase functions deploy stripe-webhook

import { errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient } from '../_shared/supabase-admin.ts';
import { stripePost, verifyStripeWebhook } from '../_shared/stripe.ts';
import { sendNotificationToUser } from '../_shared/push.ts';

// ─── Stripe event shapes (minimal) ────────────────────────────────────────────

interface StripeCharge {
  id: string;
  object: 'charge';
  metadata: { batch_id?: string; user_id?: string };
  status: string;
}

interface StripeEvent {
  id: string;
  type: string;
  data: { object: StripeCharge };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const rawBody = await req.text();
  const sigHeader = req.headers.get('Stripe-Signature');

  const isValid = await verifyStripeWebhook(rawBody, sigHeader);
  if (!isValid) {
    console.error('[stripe-webhook] Invalid signature — rejecting');
    return errorResponse('Invalid webhook signature', 401);
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`);

  const admin = getAdminClient();
  const charge = event.data.object;
  const batchId = charge.metadata?.batch_id;
  const userId = charge.metadata?.user_id;

  if (!batchId || !userId) {
    // Not a charge we created — acknowledge and ignore
    console.warn('[stripe-webhook] Missing metadata, skipping:', event.id);
    return jsonResponse({ received: true });
  }

  // ── charge.succeeded ──────────────────────────────────────────────────────
  if (event.type === 'charge.succeeded') {
    // Mark batch completed
    await admin
      .from('donation_batches')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', batchId);

    // Mark individual donations completed
    await admin
      .from('donations')
      .update({ status: 'completed' })
      .eq('batch_id', batchId);

    // Trigger Stripe Connect transfers to each nonprofit
    await triggerNonprofitPayouts(batchId, charge.id, admin);

    // Notify user
    const amountDollars = (charge as unknown as { amount: number }).amount / 100;
    await sendNotificationToUser(
      userId,
      'donation_completed',
      'Donation on its way 🫒',
      `Your $${amountDollars.toFixed(2)} donation is being processed. JazakAllah khayran!`,
      { batch_id: batchId },
      admin
    );

    console.log(`[stripe-webhook] Batch ${batchId} completed — charge ${charge.id}`);
  }

  // ── charge.failed ─────────────────────────────────────────────────────────
  if (event.type === 'charge.failed') {
    // Mark batch failed
    await admin
      .from('donation_batches')
      .update({ status: 'failed' })
      .eq('id', batchId);

    // Mark donations failed
    await admin
      .from('donations')
      .update({ status: 'failed' })
      .eq('batch_id', batchId);

    // Revert round-ups to pending so they can be retried
    await admin
      .from('roundup_transactions')
      .update({ status: 'pending' })
      .eq('user_id', userId)
      .eq('status', 'included_in_batch');

    // Notify user
    await sendNotificationToUser(
      userId,
      'donation_failed',
      'Action needed',
      "We couldn't process your donation. Please check your bank account in Settings.",
      { batch_id: batchId },
      admin
    );

    console.log(`[stripe-webhook] Batch ${batchId} FAILED — round-ups reverted to pending`);
  }

  return jsonResponse({ received: true });
});

// ─── Nonprofit payouts ────────────────────────────────────────────────────────

async function triggerNonprofitPayouts(
  batchId: string,
  sourceChargeId: string,
  admin: ReturnType<typeof getAdminClient>
): Promise<void> {
  const { data: donations } = await admin
    .from('donations')
    .select('id, nonprofit_id, amount')
    .eq('batch_id', batchId)
    .eq('status', 'completed');

  if (!donations || donations.length === 0) return;

  // Fetch nonprofit Stripe Connect IDs
  const nonprofitIds = donations.map((d) => d.nonprofit_id);
  const { data: nonprofits } = await admin
    .from('nonprofits')
    .select('id, stripe_connect_id')
    .in('id', nonprofitIds);

  const connectMap = Object.fromEntries(
    (nonprofits ?? []).map((n) => [n.id, n.stripe_connect_id])
  );

  for (const donation of donations) {
    const connectId = connectMap[donation.nonprofit_id];

    if (!connectId) {
      // No Stripe Connect account configured — skip transfer (manual payout in dev)
      console.warn(
        `[stripe-webhook] No stripe_connect_id for nonprofit ${donation.nonprofit_id} — skipping transfer`
      );
      continue;
    }

    const amountCents = Math.round(donation.amount * 100);

    try {
      const transfer = await stripePost<{ id: string }>('/transfers', {
        amount: amountCents,
        currency: 'usd',
        destination: connectId,
        source_transaction: sourceChargeId,
        metadata: { donation_id: donation.id, batch_id: batchId },
      });

      await admin
        .from('donations')
        .update({ stripe_transfer_id: transfer.id })
        .eq('id', donation.id);

      console.log(
        `[stripe-webhook] Transfer ${transfer.id}: $${donation.amount} → ${connectId}`
      );
    } catch (err) {
      console.error(`[stripe-webhook] Transfer failed for donation ${donation.id}:`, err);
    }
  }
}
