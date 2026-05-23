// App-side helper for tax receipt generation and download

import { supabase } from './supabase';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;

export interface TaxReceiptRecord {
  id: string;
  year: number;
  total_donated: number;
  pdf_path: string;
  generated_at: string;
}

/** Generate (or retrieve cached) receipt for the given year. Returns a signed URL. */
export async function generateReceipt(year: number): Promise<{
  url: string;
  total_donated: number;
  error?: string;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-tax-receipt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ year }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to generate receipt');
  return data;
}

/** Fetch the signed download URL for an already-generated receipt. Valid for 1 hour. */
export async function getReceiptDownloadUrl(pdfPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('tax-receipts')
    .createSignedUrl(pdfPath, 3600);

  if (error || !data?.signedUrl) throw new Error('Could not generate download link');
  return data.signedUrl;
}

/** Load all receipt records for the current user, newest first. */
export async function loadReceipts(): Promise<TaxReceiptRecord[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('tax_receipts')
    .select('id, year, total_donated, pdf_path, generated_at')
    .eq('user_id', user.id)
    .order('year', { ascending: false });

  return (data ?? []) as TaxReceiptRecord[];
}

/** Sum of completed donations for a given year (for the empty-state summary). */
export async function getYearTotal(year: number): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate   = `${year + 1}-01-01T00:00:00.000Z`;

  const { data } = await supabase
    .from('donations')
    .select('amount')
    .eq('user_id', user.id)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lt('created_at', endDate);

  return Math.round(
    (data ?? []).reduce((s, d) => s + d.amount, 0) * 100
  ) / 100;
}
