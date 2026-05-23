// Shared Stripe REST helpers for Supabase Edge Functions (Deno)
// Uses the Stripe REST API directly via fetch — no Node.js SDK needed.

const STRIPE_API = 'https://api.stripe.com/v1';

function stripeHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
}

// Encode a potentially nested object into URLSearchParams format.
// e.g. { metadata: { batch_id: 'x' } } → "metadata[batch_id]=x"
function encodeParams(obj: Record<string, unknown>, prefix = ''): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      parts.push(encodeParams(value as Record<string, unknown>, paramKey));
    } else if (Array.isArray(value)) {
      for (const item of value) {
        parts.push(`${encodeURIComponent(paramKey)}[]=${encodeURIComponent(String(item))}`);
      }
    } else if (value !== undefined && value !== null) {
      parts.push(`${encodeURIComponent(paramKey)}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.join('&');
}

export async function stripePost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: 'POST',
    headers: stripeHeaders(),
    body: encodeParams(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe error ${res.status}: ${JSON.stringify(data.error ?? data)}`);
  }
  return data as T;
}

export async function stripeGet<T>(path: string): Promise<T> {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: {
      'Authorization': `Bearer ${Deno.env.get('STRIPE_SECRET_KEY')}`,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Stripe error ${res.status}: ${JSON.stringify(data.error ?? data)}`);
  }
  return data as T;
}

// ─── Stripe webhook signature verification ─────────────────────────────────────
// Stripe-Signature: t=<timestamp>,v1=<sig>,v1=<sig2>,...
// Signed payload = `${t}.${rawBody}`
// Verify: HMAC-SHA256(webhookSecret, signedPayload) === v1

export async function verifyStripeWebhook(
  rawBody: string,
  signatureHeader: string | null
): Promise<boolean> {
  if (!signatureHeader) return false;

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET is not set');
    return false;
  }

  try {
    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => part.split('=') as [string, string])
    );
    const timestamp = parts['t'];
    const expectedSig = parts['v1'];

    if (!timestamp || !expectedSig) return false;

    // Reject webhooks older than 5 minutes
    const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
    if (ageSeconds > 300) {
      console.warn('[stripe-webhook] Timestamp too old:', ageSeconds, 'seconds');
      return false;
    }

    const signedPayload = `${timestamp}.${rawBody}`;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
    const computed = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return computed === expectedSig;
  } catch (err) {
    console.error('[stripe-webhook] Signature verification error:', err);
    return false;
  }
}
