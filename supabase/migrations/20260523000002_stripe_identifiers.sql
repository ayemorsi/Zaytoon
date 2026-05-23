-- Story 006: Add Stripe identifiers for ACH charge flow
--
-- stripe_customer_id  — Stripe Customer object; created on first charge per user
-- plaid_account_id    — Plaid account_id (not item_id) required to generate processor tokens
-- stripe_bank_account_id — Stripe bank account source id (ba_xxx), cached after first link

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

ALTER TABLE public.linked_accounts
  ADD COLUMN IF NOT EXISTS plaid_account_id text,
  ADD COLUMN IF NOT EXISTS stripe_bank_account_id text;
