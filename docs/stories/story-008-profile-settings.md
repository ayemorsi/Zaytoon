# Story 008 — Profile & Settings Completion

**Epic:** Profile & Settings (Epic 8)
**Status:** Ready for implementation

---

## Overview

Complete the settings experience by implementing all stub "onPress={() => {}}" rows: edit profile, edit giving preferences, edit charity selections, and delete account. These screens allow users to update their giving setup post-onboarding.

---

## Acceptance Criteria

### AC-1: Edit Profile screen
- `src/app/(app)/settings/profile.tsx`
- Loads `profiles.full_name` and email from `supabase.auth.getUser()`
- Editable `full_name` text input
- Email displayed read-only (email change requires a separate auth flow — show explanatory label)
- "Save" button updates `profiles.full_name`; shows save feedback

### AC-2: Edit Preferences screen
- `src/app/(app)/settings/preferences.tsx`
- Same threshold/cap/schedule UI as `(onboarding)/preferences.tsx`
- Loads current values from `donation_preferences` on mount
- "Save changes" updates `donation_preferences` and navigates back
- Shows success toast / button feedback

### AC-3: Edit Charities screen
- `src/app/(app)/settings/charities.tsx`
- Same nonprofit list UI as `(onboarding)/select-charities.tsx`
- Loads current `user_charity_allocations` to pre-select saved charities
- "Save changes" deletes existing allocations and re-inserts selected ones (equal split, `split_percentage = 0`)
- Requires at least 1 nonprofit selected to save

### AC-4: Delete account Edge Function + UI
- `supabase/functions/delete-account/index.ts` — verifies user JWT, deletes user via service role `auth.admin.deleteUser`, returns `{ ok: true }`
- Settings has a "Danger Zone" section at the bottom with a "Delete Account" button
- Shows a two-step confirmation alert ("Are you sure?" → "This cannot be undone" destructive confirm)
- On confirm, calls the Edge Function, then signs out (root layout clears the session and routes to welcome)

### AC-5: Settings index wired
- "Account Information" row → `/(app)/settings/profile`
- "Monthly Giving Cap" row → `/(app)/settings/preferences`
- New "My Charities" row in Account group → `/(app)/settings/charities`
- Delete Account button calls the Edge Function flow

---

## Notes
- Preferences and charities screens share 90% of their UI logic with the onboarding equivalents — no shared component extracted (YAGNI)
- Split percentage is always 0 (equal split) in v1; custom splits are a future story
- Email editing requires `supabase.auth.updateUser({ email })` which triggers a re-verification email — out of scope for v1
