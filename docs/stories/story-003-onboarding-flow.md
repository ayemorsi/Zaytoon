# Story 003 — Onboarding Flow

**Epic:** Auth & Onboarding
**Status:** Ready for Development (after Story 002)
**Priority:** P0
**Depends on:** Story 002

---

## User Story

As a new user who just signed up, I want to be guided through connecting my bank, setting my donation preferences, and choosing my charities so that round-ups start working automatically.

---

## Acceptance Criteria

### AC1 — Onboarding Layout
- [ ] Progress indicator at top showing current step (e.g., "Step 1 of 5" or dot indicators)
- [ ] Back button navigates to previous step (not back to auth)
- [ ] Skip option available on the "Connect Bank" step (user can connect later from settings)
- [ ] Cannot reach `(app)/` until `onboarding_complete = true` is set in DB

### AC2 — Step 1: Connect Bank (`/connect-bank`)
- [ ] Explains what Plaid is and why bank connection is needed
- [ ] Trust indicators: "Secured by Plaid", "Bank-level encryption", "We never store your credentials"
- [ ] "Connect Account" button: placeholder CTA (Plaid SDK integration is Story 005)
- [ ] For this story: tapping "Connect Account" shows a success state (mock Plaid result)
- [ ] "Skip for now" link advances to next step
- [ ] On mock success: show connected account card (Institution name, last 4 digits)

### AC3 — Step 2: Set Preferences (`/preferences`)
- [ ] **Threshold amount** selector:
  - Options: $5, $10, $25 (segmented control or radio buttons)
  - Default: $5
  - Helper text: "We'll process your donations when your round-ups reach this amount"
- [ ] **Monthly cap** input:
  - Default: $50
  - Min: $5, Max: $500
  - Helper text: "We'll pause round-ups once you've donated this much in a month"
- [ ] **Donation schedule** toggle:
  - Option A: "When I reach my threshold" (default)
  - Option B: "Every Friday" (weekly batch regardless of threshold)
- [ ] All preferences saved to `donation_preferences` table on "Continue"

### AC4 — Step 3: Select Causes (`/select-causes`)
- [ ] Grid of cause category cards with icon and label:
  - Food Security, Medical Aid, Education, Disaster Relief, Masjids, Orphan Support, Clean Water, Refugees
- [ ] Multi-select (tap to toggle, highlighted state when selected)
- [ ] At least 1 cause must be selected to continue
- [ ] Selected causes used to filter nonprofits shown in Step 4

### AC5 — Step 4: Select Charities (`/select-charities`)
- [ ] Shows nonprofits filtered by selected cause categories
- [ ] Each card: logo, name, short description, cause tags, verified badge
- [ ] Tap to select/deselect
- [ ] At least 1 charity must be selected to continue
- [ ] Selected charities saved to `user_charity_allocations` (equal split by default)
- [ ] "View profile" link opens charity detail (modal or sheet) — read-only at this stage

### AC6 — Step 5: Complete (`/complete`)
- [ ] Celebration/confirmation screen
- [ ] Summary of setup:
  - Connected account (or "Add account later" if skipped)
  - Threshold amount
  - Monthly cap
  - Schedule
  - Selected charities (with logos)
- [ ] "Start Giving" button:
  - Sets `profiles.onboarding_complete = true` in Supabase
  - Navigates to `(app)/` (Home tab)

---

## State Management

Use a Zustand store to hold onboarding progress state across steps:

```ts
// src/stores/onboarding-store.ts
interface OnboardingState {
  linkedAccountId: string | null;
  threshold: 5 | 10 | 25;
  monthlyCap: number;
  schedule: 'threshold' | 'weekly_friday';
  selectedCauseIds: string[];
  selectedCharityIds: string[];
  // Actions
  setLinkedAccount: (id: string) => void;
  setPreferences: (prefs: Partial<OnboardingState>) => void;
  setSelectedCauses: (ids: string[]) => void;
  setSelectedCharities: (ids: string[]) => void;
  reset: () => void;
}
```

---

## Data Operations

| Step | DB Operation |
|---|---|
| Step 2 (Preferences) | `INSERT INTO donation_preferences` (upsert) |
| Step 4 (Charities) | `INSERT INTO user_charity_allocations` (bulk insert) |
| Step 5 (Complete) | `UPDATE profiles SET onboarding_complete = true` |

---

## UI Specifications

- Step transitions: slide horizontally (Reanimated shared element or Expo Router stack animation)
- Cause category cards: 2-column grid, 80px tall, icon + label
- Charity cards: list style, avatar left, name + description + tags
- "Continue" button: fixed at bottom, disabled when validation not met
- Disabled state: muted color + `accessibilityState={{ disabled: true }}`

---

## Technical Notes

- Plaid Link SDK not integrated yet — use mock success state in this story
- Cause categories should be seeded in DB (see Story 001 tasks)
- Nonprofit data must exist in DB — seed at least 5 nonprofits across 3 categories
- Onboarding layout must prevent navigation to `(app)/` via direct URL manipulation

---

## Tasks

1. Create `src/stores/onboarding-store.ts`
2. Build `(onboarding)/_layout.tsx` with progress bar header
3. Build `(onboarding)/connect-bank.tsx` with mock Plaid CTA
4. Build `(onboarding)/preferences.tsx` with all controls and validation
5. Build `(onboarding)/select-causes.tsx` with multi-select grid
6. Build `(onboarding)/select-charities.tsx` with filtered nonprofit list
7. Build `(onboarding)/complete.tsx` summary screen
8. Wire up DB writes at correct steps
9. Seed cause categories and sample nonprofits in Supabase
10. Test full flow: signup → onboarding → home

---

## Definition of Done

- Full onboarding flow completable start to finish
- Preferences and charity selections persisted in Supabase
- `onboarding_complete = true` set on completion
- App routes to Home tab after "Start Giving"
- Back navigation works at each step
- Skipping bank connection works and is recoverable later
