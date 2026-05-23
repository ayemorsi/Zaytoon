# Story 005 — Plaid Bank Connection

**Epic:** Financial Integration
**Status:** Ready for Development (can start after Story 001)
**Priority:** P0 — Core functionality
**Depends on:** Story 001 (Supabase + Edge Functions setup)

---

## User Story

As a user, I want to securely connect my bank or credit card account so that my purchases are tracked and round-ups are calculated automatically.

---

## Acceptance Criteria

### AC1 — Plaid Link SDK Integration
- [ ] `react-native-plaid-link-sdk` installed
- [ ] Plaid Link opens natively (not webview) on iOS and Android
- [ ] Plaid environment set via `EXPO_PUBLIC_PLAID_ENV` (`sandbox` for dev, `production` for release)
- [ ] User can connect checking, savings, or credit card accounts

### AC2 — Link Token Creation (Edge Function)
- [ ] Edge Function `plaid-create-link-token` created in Supabase
- [ ] Accepts authenticated request (validates JWT)
- [ ] Calls Plaid `/link/token/create` with user's `client_user_id` = Supabase `user.id`
- [ ] Returns `link_token` to app

### AC3 — Token Exchange (Edge Function)
- [ ] Edge Function `plaid-exchange-token` created in Supabase
- [ ] Accepts `public_token` from Plaid Link success callback
- [ ] Calls Plaid `/item/public_token/exchange` → gets `access_token` + `item_id`
- [ ] Stores in `linked_accounts` table:
  - `plaid_item_id`, `plaid_access_token` (encrypted), `institution_name`, `mask`, `account_type`
- [ ] Returns linked account data to app (never the raw access_token)

### AC4 — Plaid Webhook Handler (Edge Function)
- [ ] Edge Function `plaid-webhook` registered as Plaid webhook URL
- [ ] Handles `TRANSACTIONS_SYNC` webhook type
- [ ] Fetches new transactions via Plaid `/transactions/sync`
- [ ] For each new transaction:
  - Skip pending transactions (wait for posted)
  - Calculate round-up: `roundup = Math.ceil(amount) - amount`
  - Skip if `roundup === 0` (whole dollar amounts)
  - Insert into `roundup_transactions` table
- [ ] Handles `ITEM_ERROR` webhook (e.g., access revoked) — marks account inactive

### AC5 — Account Display in App
- [ ] Linked accounts shown in `(app)/profile/linked-accounts`
- [ ] Each account card shows: institution logo/name, account type, last 4 digits, status
- [ ] "Add another account" button triggers new Plaid Link flow
- [ ] "Remove account" with confirmation dialog — marks as inactive (soft delete)
- [ ] During onboarding Step 1: mock replaced with real Plaid Link flow

### AC6 — Error Handling
- [ ] If Plaid Link is dismissed without completion: no error shown, returns to previous screen
- [ ] If token exchange fails: show error toast "Could not connect account. Please try again."
- [ ] If webhook processing fails: log to Supabase (do not crash silently)
- [ ] If access_token becomes invalid (user revokes in bank): notify user via push notification

---

## Plaid Sandbox Testing

Use Plaid sandbox credentials for development:
- Institution: `ins_109508` (Chase)
- Username: `user_good`
- Password: `pass_good`
- Generates realistic transaction data

---

## Round-up Calculation Logic

```ts
function calculateRoundup(transactionAmount: number): number {
  // Only process positive amounts (purchases), not credits/refunds
  if (transactionAmount <= 0) return 0;

  const roundedUp = Math.ceil(transactionAmount);
  const roundup = roundedUp - transactionAmount;

  // Skip whole dollar amounts (no spare change)
  if (roundup === 0) return 0;

  // Round to 2 decimal places to avoid floating point issues
  return Math.round(roundup * 100) / 100;
}
```

---

## Edge Functions Structure

```
supabase/functions/
├── plaid-create-link-token/
│   └── index.ts
├── plaid-exchange-token/
│   └── index.ts
└── plaid-webhook/
    └── index.ts
```

---

## Security Requirements

- `plaid_access_token` must be stored encrypted in DB (use Supabase Vault or pgcrypto)
- Webhook endpoint must validate Plaid webhook signature (`Plaid-Verification` header)
- Edge Functions must verify Supabase JWT before processing user requests
- `linked_accounts` RLS: users can only read their own rows
- Service role used by Edge Functions for DB writes (bypasses RLS safely)

---

## Tasks

1. Install `react-native-plaid-link-sdk` and configure for EAS Build
2. Create `plaid-create-link-token` Edge Function
3. Create `plaid-exchange-token` Edge Function
4. Create `plaid-webhook` Edge Function with transaction sync logic
5. Register webhook URL in Plaid Dashboard (sandbox)
6. Build `(app)/profile/linked-accounts.tsx` screen
7. Wire "Connect Account" in onboarding Step 1 to real Plaid Link
8. Add account removal flow with confirmation
9. Write Plaid webhook signature validation
10. Test full flow in Plaid sandbox (connect → transactions → round-ups in DB)

---

## Definition of Done

- User can connect a bank account via Plaid Link on iOS and Android
- `access_token` stored securely (encrypted) in Supabase
- Plaid sandbox transactions trigger round-up entries in `roundup_transactions`
- Linked accounts visible in profile settings
- Account removal works (soft delete)
- Webhook validates signature (no unauthenticated processing)
- No raw financial credentials stored outside Plaid/Supabase Vault
