# Story 010 — Tax Receipts

**Epic:** Donation History & Tracking (Epic 6)
**Status:** Ready for implementation

---

## Overview

Generate annual PDF giving summaries (tax receipts) for users. The Edge Function builds a PDF with `pdf-lib`, uploads it to a private Supabase Storage bucket, and returns a signed URL. The app-side screen lists past receipts and lets users generate and download the current year's.

---

## Acceptance Criteria

### AC-1: DB migration — tax_receipts table + storage bucket
- `tax_receipts` table: `id uuid PK`, `user_id FK`, `year int`, `total_donated numeric`, `pdf_path text`, `generated_at timestamptz`
- Unique constraint on `(user_id, year)` — one receipt per user per year
- RLS: users can read own rows only; service role inserts
- Supabase Storage bucket `tax-receipts` (private) created via migration
- Storage RLS: users can read files under their own `user_id/` prefix; service role can insert

### AC-2: `generate-tax-receipt` Edge Function
- `supabase/functions/generate-tax-receipt/index.ts`
- Accepts JWT-authenticated POST with optional `{ year?: number }` (defaults to previous calendar year)
- If a receipt already exists for `(user_id, year)` → returns existing signed URL (no regeneration)
- Queries all `donations` where `status = 'completed'` and `created_at` falls within the year, joined with `nonprofits.name`
- If total donated is $0 → returns `{ error: 'no_donations' }`
- Generates a PDF (A4) using `pdf-lib` from esm.sh with:
  - Zaytoon header with olive accent
  - User name, year, receipt number (UUID)
  - Per-nonprofit donation breakdown table
  - Total amount
  - 501(c)(3) deductibility disclaimer
- Uploads PDF to `tax-receipts/{userId}/{year}.pdf` in Supabase Storage (admin client, upsert)
- Upserts record into `tax_receipts`
- Returns `{ url: signedUrl, year, total_donated }` — signed URL valid for 1 hour

### AC-3: App-side tax receipts screen
- `src/app/(app)/settings/tax-receipts.tsx`
- Loads `tax_receipts` rows for the current user (sorted by year desc)
- Shows each year as a card with total amount + "Download PDF" button
- "Download PDF" calls `supabase.storage.from('tax-receipts').createSignedUrl(record.pdf_path, 3600)` then `Linking.openURL`
- "Generate [year] Receipt" button calls the Edge Function for previous year; shows loading state
- If no receipts yet, shows encouraging empty state with giving total for current year

### AC-4: Settings wired
- "Tax Receipts" row in settings navigates to `/(app)/settings/tax-receipts`

---

## Notes
- `pdf-lib` is a pure-JS library that works in Deno — import via `https://esm.sh/pdf-lib@1.17.1`
- PDF path stored (not signed URL) so fresh signed URLs can be generated on demand
- Email delivery of receipts is a future enhancement (requires Resend/SMTP setup)
- Only `completed` donations count toward the receipt total — `pending`/`failed` batches excluded
