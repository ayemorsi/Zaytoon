-- Add plaid_sync_cursor to linked_accounts for Plaid /transactions/sync pagination.
-- This column stores the opaque cursor string returned by Plaid after each sync call.
-- NULL means no sync has occurred yet (initial full fetch).

ALTER TABLE linked_accounts
  ADD COLUMN IF NOT EXISTS plaid_sync_cursor text;
