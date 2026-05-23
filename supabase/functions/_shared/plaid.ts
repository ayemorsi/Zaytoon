// Shared Plaid client for Supabase Edge Functions (Deno)

const PLAID_BASE_URLS: Record<string, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

function getPlaidBase(): string {
  const env = Deno.env.get('PLAID_ENV') ?? 'sandbox';
  return PLAID_BASE_URLS[env] ?? PLAID_BASE_URLS.sandbox;
}

function plaidHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Plaid-Version': '2020-09-14',
    'PLAID-CLIENT-ID': Deno.env.get('PLAID_CLIENT_ID')!,
    'PLAID-SECRET': Deno.env.get('PLAID_SECRET')!,
  };
}

export async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${getPlaidBase()}${path}`, {
    method: 'POST',
    headers: plaidHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Plaid error ${res.status}: ${JSON.stringify(data)}`);
  }
  return data as T;
}

export function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}
