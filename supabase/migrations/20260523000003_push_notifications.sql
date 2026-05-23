-- Story 007: Push notification token + per-type preferences on profiles

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS expo_push_token text,
  ADD COLUMN IF NOT EXISTS notif_donation_completed bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_donation_failed    bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_threshold_reached  bool NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS notif_item_error         bool NOT NULL DEFAULT true;
