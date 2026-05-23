# Story 006 — Stripe Donation Processing

**Epic:** Donation Processing (Epic 5)
**Status:** Ready for implementation

---

## Overview

When a user's pending round-up balance reaches their threshold (or it is a scheduled Friday), a donation batch is created. This story wires the actual Stripe ACH charge flow so real money moves from the user's bank account to the platform, and then distributes individual donations to each nonprofit via Stripe Connect payouts.

---

## Acceptance Criteria

### AC-1: Stripe SDK installed and configured
- `@stripe/stripe-react-native` installed via `expo install`
- Root `_layout.tsx` wraps the app with `<StripeProvider publishableKey={...} />`
- `src/lib/stripe.ts` exports the publishable key config

### AC-2: DB migration — Stripe identifiers
- `profiles.stripe_customer_id text` — Stripe Customer ID, set on first charge
- `linked_accounts.plaid_account_id text` — Plaid account_id needed for processor token
- `linked_accounts.stripe_bank_account_id text` — Stripe bank account source id (cached after first link)

### AC-3: `plaid-exchange-token` stores `plaid_account_id`
- When storing the linked account after Plaid exchange, also save `primaryAccount.account_id` as `plaid_account_id`

### AC-4: `process-donations` Edge Function
Accepts `{ batch_id: string }` via HTTP POST (service-role auth).
1. Fetches the donation batch (must be `pending`)
2. Fetches the user's primary active linked account
3. Fetches user's charity allocations; falls back to equal split if none configured
4. Gets Stripe Customer (creates if first charge), saves ID to `profiles.stripe_customer_id`
5. Gets Stripe bank account (creates from Plaid processor token if first time), saves ID to `linked_accounts.stripe_bank_account_id`
6. Calls Plaid `/processor/stripe/bank_account_token/create` only if `stripe_bank_account_id` is null
7. Creates a Stripe charge against the customer + bank account source
8. Updates `donation_batches`: `stripe_payment_intent_id = charge.id`, `status = 'processing'`
9. Inserts per-charity `donations` rows (equal split or per user's `split_percentage`)
10. Returns `{ ok: true, charge_id }`

### AC-5: `stripe-webhook` Edge Function
Registered at `<SUPABASE_URL>/functions/v1/stripe-webhook` in Stripe Dashboard.
- Verifies `Stripe-Signature` header (HMAC-SHA256)
- **`charge.succeeded`**: marks batch → `completed` + `processed_at`, marks donations → `completed`, triggers Stripe Connect transfer to each nonprofit's `stripe_connect_id` (skips if connect id is null — allows manual payout in dev)
- **`charge.failed`**: marks batch → `failed`, reverts `roundup_transactions` → `pending` for the batch's user
- Always returns 200 to acknowledge

### AC-6: `plaid-webhook` updated
- After creating a donation batch, the `checkAndTriggerDonation` function calls `process-donations` via an internal HTTP fetch instead of the TODO comment

---

## Technical Notes

- Stripe ACH flow uses the **Plaid processor token** (`btok_xxx`) to attach a bank account to a Stripe Customer, then uses the **legacy Charges API** (simplest server-side ACH path)
- All Stripe API calls are made server-side in Edge Functions; no card/bank data touches the app
- `STRIPE_WEBHOOK_SECRET` is required for signature verification; set in Supabase Edge Function secrets
- Stripe Connect transfers require nonprofits to have `stripe_connect_id` set; batches will complete without transfers if connect id is null (allows development without full Stripe Connect onboarding)
- ACH charges are async — Stripe sends a webhook 1–5 business days later when settled

---

## Env Vars Required (Supabase Edge Function Secrets)

```
STRIPE_SECRET_KEY       sk_test_xxx
STRIPE_WEBHOOK_SECRET   whsec_xxx
PLAID_CLIENT_ID         (already set from story 005)
PLAID_SECRET            (already set from story 005)
SUPABASE_URL            (auto-injected)
SUPABASE_SERVICE_ROLE_KEY (auto-injected)
```
