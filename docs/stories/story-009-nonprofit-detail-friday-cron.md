# Story 009 — Nonprofit Detail Screen & Friday Cron

**Epics:** Nonprofit Discovery & Selection (Epic 4) + Donation Accumulation Engine (Epic 3)
**Status:** Ready for implementation

---

## Overview

Two remaining gaps before v1 feature-complete:

1. **Nonprofit detail screen** — tapping a nonprofit card navigates to a full profile page (mission, EIN, impact, add/remove giving CTA)
2. **Friday cron** — Edge Function that processes all `weekly_friday` users every Friday at 6am UTC, creating batches and triggering Stripe charges regardless of threshold

---

## Acceptance Criteria

### AC-1: Nonprofit detail screen
- `src/app/(app)/nonprofits/[id].tsx` — dynamic route accepting `id` param
- Loads nonprofit from `nonprofits` table by `id`; falls back to SEED data by matching id
- Loads user's current allocation to show add/remove state
- Displays: logo placeholder, name, verified badge, mission statement, description, EIN, cause category tags
- "Add to my giving" / "✓ Supporting" toggle button (same DB upsert/delete as nonprofits list)
- Website link (opens with `Linking.openURL`)
- Back navigation

### AC-2: Nonprofits list cards are tappable
- Each card in `nonprofits/index.tsx` navigates to `/(app)/nonprofits/[id]` on tap
- "Select to Support" button still exists and handles the toggle inline (doesn't navigate)

### AC-3: `friday-cron` Edge Function
- `supabase/functions/friday-cron/index.ts`
- HTTP POST, protected by service-role key
- Queries all users where `donation_preferences.schedule = 'weekly_friday'` AND `is_paused = false`
- For each user:
  1. Sum `roundup_transactions` where `status = 'pending'` — skip if total is $0.00
  2. Check monthly cap (same logic as `checkAndTriggerDonation` in plaid-webhook)
  3. Create `donation_batches` record with `trigger_type = 'scheduled_friday'`
  4. Mark round-ups as `included_in_batch`
  5. Send `threshold_reached` push notification
  6. Call `process-donations` Edge Function with the new batch_id
- Returns `{ processed: N }` count

### AC-4: pg_cron schedule migration
- `supabase/migrations/20260523000004_friday_cron.sql`
- Enables `pg_net` and `pg_cron` extensions
- Schedules `friday-donation-cron` at `0 6 * * 5` (6am UTC every Friday)
- Cron calls `friday-cron` Edge Function via `net.http_post`
- URL and service role key stored as Postgres settings (`app.supabase_url`, `app.service_role_key`) — set via `ALTER DATABASE ... SET` — with clear instructions to fill in before running

---

## Notes
- Friday cron shares monthly cap logic with `checkAndTriggerDonation` — both independently enforce the cap
- The cron also processes users whose pending total is below their normal threshold (Friday overrides the threshold)
- pg_cron + pg_net is the standard Supabase pattern for scheduled Edge Function calls
- `app.supabase_url` and `app.service_role_key` must be set on the Postgres database before running the migration (see migration comments)
