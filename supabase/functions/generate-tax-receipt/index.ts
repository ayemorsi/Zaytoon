// Edge Function: generate-tax-receipt
// Builds a PDF annual giving summary, uploads it to private Supabase Storage,
// and returns a short-lived signed URL for download.
//
// Deploy: npx supabase functions deploy generate-tax-receipt

import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1';
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/plaid.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabase-admin.ts';

// ─── Colour palette (Zaytoon olive) ───────────────────────────────────────────
const PRIMARY    = rgb(0.157, 0.278, 0.149); // #284726
const MUTED      = rgb(0.435, 0.463, 0.427); // #6F766D
const BLACK      = rgb(0.094, 0.114, 0.098); // #181d19
const LIGHT_GREY = rgb(0.898, 0.937, 0.882); // #e5efe1

// ─── PDF builder ──────────────────────────────────────────────────────────────

interface DonationRow {
  nonprofit_name: string;
  amount: number;
  date: string;
}

async function buildReceiptPdf(params: {
  userName: string;
  year: number;
  receiptId: string;
  rows: DonationRow[];
  totalDonated: number;
}): Promise<Uint8Array> {
  const { userName, year, receiptId, rows, totalDonated } = params;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4

  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold    = await doc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 56;
  let y = height - margin;

  // ── Header bar ─────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: height - 80, width, height: 80, color: PRIMARY });

  page.drawText('Zaytoon', {
    x: margin, y: height - 50,
    size: 26, font: bold, color: rgb(1, 1, 1),
  });
  page.drawText('Annual Giving Summary', {
    x: margin, y: height - 68,
    size: 11, font: regular, color: rgb(0.8, 0.9, 0.8),
  });

  // Receipt number (top-right)
  page.drawText(`Receipt #${receiptId.slice(0, 8).toUpperCase()}`, {
    x: width - margin - 130, y: height - 50,
    size: 9, font: regular, color: rgb(0.8, 0.9, 0.8),
  });

  y = height - 110;

  // ── Donor details ───────────────────────────────────────────────────────────
  page.drawText('Prepared for', {
    x: margin, y,
    size: 9, font: regular, color: MUTED,
  });
  y -= 16;
  page.drawText(userName, {
    x: margin, y,
    size: 14, font: bold, color: BLACK,
  });
  y -= 14;
  page.drawText(`Tax Year: ${year}`, {
    x: margin, y,
    size: 10, font: regular, color: MUTED,
  });
  y -= 10;
  page.drawText(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: margin, y,
    size: 10, font: regular, color: MUTED,
  });

  y -= 28;

  // ── Total donated highlight ─────────────────────────────────────────────────
  page.drawRectangle({ x: margin, y: y - 30, width: width - margin * 2, height: 46, color: LIGHT_GREY, borderRadius: 6 });
  page.drawText('Total Donated', {
    x: margin + 16, y: y + 4,
    size: 10, font: regular, color: MUTED,
  });
  page.drawText(`$${totalDonated.toFixed(2)}`, {
    x: margin + 16, y: y - 14,
    size: 20, font: bold, color: PRIMARY,
  });

  y -= 58;

  // ── Donation breakdown table ────────────────────────────────────────────────
  page.drawText('Donation Breakdown', {
    x: margin, y,
    size: 11, font: bold, color: BLACK,
  });
  y -= 8;

  // Table header
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: PRIMARY });
  y -= 14;
  page.drawText('Organization', { x: margin, y, size: 9, font: bold, color: MUTED });
  page.drawText('Date', { x: 330, y, size: 9, font: bold, color: MUTED });
  page.drawText('Amount', { x: width - margin - 50, y, size: 9, font: bold, color: MUTED });
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: MUTED });
  y -= 14;

  // Table rows
  for (const row of rows) {
    if (y < margin + 80) {
      // Add a new page if we run out of space
      const newPage = doc.addPage([595.28, 841.89]);
      y = height - margin;
      // Re-draw column headers on continuation page
      newPage.drawText('Organization', { x: margin, y, size: 9, font: bold, color: MUTED });
      newPage.drawText('Date', { x: 330, y, size: 9, font: bold, color: MUTED });
      newPage.drawText('Amount', { x: width - margin - 50, y, size: 9, font: bold, color: MUTED });
      y -= 8;
      newPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.5, color: MUTED });
      y -= 14;
    }

    // Use the last page
    const activePage = doc.getPages()[doc.getPageCount() - 1];

    const name = row.nonprofit_name.length > 42
      ? row.nonprofit_name.slice(0, 42) + '…'
      : row.nonprofit_name;

    activePage.drawText(name, { x: margin, y, size: 9, font: regular, color: BLACK });
    activePage.drawText(row.date, { x: 330, y, size: 9, font: regular, color: MUTED });
    activePage.drawText(`$${row.amount.toFixed(2)}`, { x: width - margin - 50, y, size: 9, font: regular, color: BLACK });
    y -= 14;

    activePage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 0.25, color: LIGHT_GREY });
    y -= 6;
  }

  // Totals line
  const finalPage = doc.getPages()[doc.getPageCount() - 1];
  y -= 4;
  finalPage.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: PRIMARY });
  y -= 14;
  finalPage.drawText('Total', { x: margin, y, size: 10, font: bold, color: BLACK });
  finalPage.drawText(`$${totalDonated.toFixed(2)}`, { x: width - margin - 50, y, size: 10, font: bold, color: PRIMARY });

  // ── Footer disclaimer ───────────────────────────────────────────────────────
  const footerY = margin + 10;
  const disclaimer =
    'Zaytoon facilitates donations to 501(c)(3) organizations. Donations are tax-deductible to ' +
    'the extent permitted by law. Please consult a tax advisor for guidance.';

  finalPage.drawLine({ start: { x: margin, y: footerY + 28 }, end: { x: width - margin, y: footerY + 28 }, thickness: 0.5, color: LIGHT_GREY });
  finalPage.drawText(disclaimer, {
    x: margin, y: footerY + 14,
    size: 7.5, font: regular, color: MUTED,
    maxWidth: width - margin * 2,
    lineHeight: 11,
  });
  finalPage.drawText('Generated by Zaytoon · zaytoon.app', {
    x: margin, y: footerY,
    size: 7.5, font: regular, color: MUTED,
  });

  return doc.save();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }
  if (req.method !== 'POST') {
    return errorResponse('Method not allowed', 405);
  }

  const userId = await getUserFromRequest(req);
  if (!userId) return errorResponse('Unauthorized', 401);

  // Default to previous calendar year
  let year = new Date().getFullYear() - 1;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.year === 'number') year = body.year;
  } catch { /* no body */ }

  const admin = getAdminClient();

  // ── Check for existing receipt ────────────────────────────────────────────
  const { data: existing } = await admin
    .from('tax_receipts')
    .select('pdf_path, total_donated')
    .eq('user_id', userId)
    .eq('year', year)
    .single();

  if (existing) {
    // Return a fresh signed URL for the existing file
    const { data: signed } = await admin.storage
      .from('tax-receipts')
      .createSignedUrl(existing.pdf_path, 3600);

    return jsonResponse({
      url: signed?.signedUrl,
      year,
      total_donated: existing.total_donated,
      cached: true,
    });
  }

  // ── Fetch completed donations for the year ────────────────────────────────
  const startDate = `${year}-01-01T00:00:00.000Z`;
  const endDate   = `${year + 1}-01-01T00:00:00.000Z`;

  const { data: donations } = await admin
    .from('donations')
    .select('amount, created_at, nonprofit_id, nonprofits(name)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .gte('created_at', startDate)
    .lt('created_at', endDate)
    .order('created_at', { ascending: true });

  if (!donations || donations.length === 0) {
    return jsonResponse({ error: 'no_donations', year }, 200);
  }

  const totalDonated = Math.round(
    donations.reduce((s, d) => s + d.amount, 0) * 100
  ) / 100;

  // ── Fetch user name ───────────────────────────────────────────────────────
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .single();

  const userName = profile?.full_name ?? 'Valued Donor';

  // ── Build donation rows ───────────────────────────────────────────────────
  const rows: Array<{ nonprofit_name: string; amount: number; date: string }> =
    donations.map((d) => ({
      nonprofit_name: (d.nonprofits as { name: string } | null)?.name ?? 'Charity',
      amount: d.amount,
      date: new Date(d.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      }),
    }));

  // ── Generate PDF ──────────────────────────────────────────────────────────
  const receiptId = crypto.randomUUID();
  const pdfBytes = await buildReceiptPdf({ userName, year, receiptId, rows, totalDonated });

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const storagePath = `${userId}/${year}.pdf`;

  const { error: uploadErr } = await admin.storage
    .from('tax-receipts')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });

  if (uploadErr) {
    console.error('[generate-tax-receipt] Upload failed:', uploadErr);
    return errorResponse('Failed to upload receipt', 500);
  }

  // ── Upsert tax_receipts record ────────────────────────────────────────────
  await admin.from('tax_receipts').upsert({
    user_id: userId,
    year,
    total_donated: totalDonated,
    pdf_path: storagePath,
    generated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,year' });

  // ── Generate signed URL (1 hour) ──────────────────────────────────────────
  const { data: signed } = await admin.storage
    .from('tax-receipts')
    .createSignedUrl(storagePath, 3600);

  console.log(`[generate-tax-receipt] Receipt generated for user ${userId}, year ${year}, $${totalDonated}`);

  return jsonResponse({ url: signed?.signedUrl, year, total_donated: totalDonated });
});
