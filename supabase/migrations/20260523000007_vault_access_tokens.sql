-- Move plaid_access_token into Supabase Vault so the raw token is never
-- visible via a plain SELECT on linked_accounts.
--
-- Requires: the supabase_vault extension (enabled by default on Supabase Pro+).
-- After this migration the column plaid_access_token is removed; callers must
-- use the store_plaid_access_token / get_plaid_access_token / update_plaid_access_token
-- RPCs (service-role only) defined below.

-- ─── Enable vault extension ────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS supabase_vault SCHEMA vault;

-- ─── Schema change ─────────────────────────────────────────────────────────────
ALTER TABLE public.linked_accounts
  ADD COLUMN plaid_access_token_id uuid;

-- ─── Migrate existing plaintext tokens into vault ─────────────────────────────
DO $$
DECLARE
  rec RECORD;
  v_id uuid;
BEGIN
  FOR rec IN
    SELECT id, plaid_access_token
    FROM public.linked_accounts
    WHERE plaid_access_token IS NOT NULL
  LOOP
    v_id := vault.create_secret(
      rec.plaid_access_token,
      'plaid_token_' || rec.id::text
    );
    UPDATE public.linked_accounts
    SET plaid_access_token_id = v_id
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- ─── Enforce NOT NULL now that all rows have been migrated ────────────────────
ALTER TABLE public.linked_accounts
  ALTER COLUMN plaid_access_token_id SET NOT NULL;

-- ─── Drop the plaintext column ─────────────────────────────────────────────────
ALTER TABLE public.linked_accounts
  DROP COLUMN plaid_access_token;

-- ─── Service-role RPC helpers (called from Edge Functions) ────────────────────
-- These run as SECURITY DEFINER so the vault schema is accessible regardless of
-- the calling role's grants.

CREATE OR REPLACE FUNCTION public.store_plaid_access_token(token text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE
  v_id uuid;
BEGIN
  v_id := vault.create_secret(token);
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_plaid_access_token(secret_id uuid)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets
  WHERE id = secret_id;
  RETURN v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_plaid_access_token(secret_id uuid, new_token text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault
AS $$
BEGIN
  PERFORM vault.update_secret(secret_id, new_token);
END;
$$;

-- Restrict to service_role only — app clients must never call these
REVOKE EXECUTE ON FUNCTION public.store_plaid_access_token  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_plaid_access_token    FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_plaid_access_token FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.store_plaid_access_token  TO service_role;
GRANT  EXECUTE ON FUNCTION public.get_plaid_access_token    TO service_role;
GRANT  EXECUTE ON FUNCTION public.update_plaid_access_token TO service_role;
