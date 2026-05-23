-- Story 009: Friday donation cron job
--
-- Uses pg_cron + pg_net to call the `friday-cron` Edge Function every Friday at 6am UTC.
--
-- ─── SETUP REQUIRED BEFORE RUNNING ────────────────────────────────────────────
--
-- This migration reads two Postgres settings that you must set first:
--
--   1. Connect to your database and run:
--
--      ALTER DATABASE postgres
--        SET "app.supabase_url" = 'https://YOUR_PROJECT_REF.supabase.co';
--
--      ALTER DATABASE postgres
--        SET "app.service_role_key" = 'YOUR_SERVICE_ROLE_KEY';
--
--   2. Then run: npx supabase db push
--
-- The service role key is available in:
--   Supabase Dashboard → Project Settings → API → service_role (secret)
--
-- ──────────────────────────────────────────────────────────────────────────────

-- Enable required extensions (no-op if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- Grant pg_cron usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Remove existing schedule if it exists (idempotent)
SELECT cron.unschedule('friday-donation-cron') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'friday-donation-cron'
);

-- Schedule: every Friday at 6:00am UTC (cron: minute hour day month weekday)
-- weekday 5 = Friday
SELECT cron.schedule(
  'friday-donation-cron',
  '0 6 * * 5',
  $$
  SELECT extensions.http_post(
    url      := current_setting('app.supabase_url') || '/functions/v1/friday-cron',
    headers  := jsonb_build_object(
                  'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
                  'Content-Type',  'application/json'
                ),
    body     := '{}'
  );
  $$
);

COMMENT ON EXTENSION pg_cron IS 'Zaytoon: drives Friday scheduled donation batches';
