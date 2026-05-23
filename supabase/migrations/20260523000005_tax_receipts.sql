-- Story 010: Tax receipts table + private storage bucket

-- ─────────────────────────────────────────────
-- TAX RECEIPTS
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tax_receipts (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  year          int         NOT NULL,
  total_donated numeric     NOT NULL,
  pdf_path      text        NOT NULL, -- storage path: {userId}/{year}.pdf
  generated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, year)
);

ALTER TABLE public.tax_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tax receipts"
  ON public.tax_receipts FOR SELECT USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- STORAGE BUCKET
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'tax-receipts',
  'tax-receipts',
  false,               -- private bucket
  5242880,             -- 5 MB limit per file
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Users can read files stored under their own user_id folder
CREATE POLICY "Users can read own receipt files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'tax-receipts'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Only service role can upload (Edge Function uses admin client)
CREATE POLICY "Service role can upload receipt files"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'tax-receipts');

CREATE POLICY "Service role can update receipt files"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'tax-receipts');
