# Zaytoon — Navigation Architecture

**Version:** 1.0
**Date:** 2026-05-23

---

## 1. Route Map

```
src/app/
│
├── _layout.tsx                        # Root layout — auth guard + global providers
│                                      # Redirects based on session + onboarding state
│
├── (auth)/                            # Group: Unauthenticated screens (no tab bar)
│   ├── _layout.tsx                    # Stack navigator, no header
│   ├── welcome.tsx                    # Landing/splash with brand + CTA
│   ├── login.tsx                      # Login options (Google, Apple, Phone, Email)
│   ├── signup.tsx                     # Sign up with email/password
│   └── verify-otp.tsx                 # Phone OTP entry screen
│
├── (onboarding)/                      # Group: First-run onboarding (authenticated, incomplete)
│   ├── _layout.tsx                    # Stack navigator, progress bar header
│   ├── connect-bank.tsx               # Step 1 — Plaid Link CTA
│   ├── preferences.tsx                # Step 2 — Threshold, cap, schedule
│   ├── select-causes.tsx              # Step 3 — Choose cause categories
│   ├── select-charities.tsx           # Step 4 — Choose specific nonprofits
│   └── complete.tsx                   # Step 5 — Confirmation + "Start Giving"
│
└── (app)/                             # Group: Authenticated main app (tab bar)
    ├── _layout.tsx                    # Tab navigator (4 tabs)
    │
    ├── index.tsx                      # TAB: Home / Dashboard
    │                                  #   - Round-up balance
    │                                  #   - Next donation date/threshold
    │                                  #   - Recent transactions
    │                                  #   - Quick stats (total given, streak)
    │                                  #   - Pause/resume toggle
    │
    ├── charities/
    │   ├── index.tsx                  # TAB: Charities
    │   │                              #   - My selected charities
    │   │                              #   - Discover by category
    │   │                              #   - Search
    │   └── [id].tsx                   # Charity profile (modal or push)
    │                                  #   - Logo, mission, EIN
    │                                  #   - Impact stats
    │                                  #   - Add/remove from my list
    │                                  #   - Split allocation slider
    │
    ├── activity/
    │   └── index.tsx                  # TAB: Activity / History
    │                                  #   - Donation batches (processed)
    │                                  #   - Individual round-ups (pending)
    │                                  #   - Filter: All / Pending / Completed
    │                                  #   - Tax receipt download CTA
    │
    └── profile/
        ├── index.tsx                  # TAB: Profile / Settings
        │                              #   - Avatar, name, email
        │                              #   - Linked accounts summary
        │                              #   - Quick settings links
        ├── linked-accounts.tsx        # Manage Plaid connections
        ├── preferences.tsx            # Round-up threshold, cap, schedule
        ├── notifications.tsx          # Notification preferences
        └── tax-receipts.tsx           # Download annual receipts
```

---

## 2. Navigation Flows

### 2.1 First Launch (No Session)
```
App Open
  └→ (auth)/welcome
       ├→ "Sign In" → (auth)/login
       │    ├→ Google OAuth → completes → auth guard → route decision
       │    ├→ Apple Sign-In → completes → auth guard → route decision
       │    ├→ Phone → (auth)/verify-otp → auth guard → route decision
       │    └→ Email → (auth)/login (form) → auth guard → route decision
       └→ "Create Account" → (auth)/signup
            └→ Success → (onboarding)/connect-bank
```

### 2.2 Auth Guard Route Decision (Root Layout)
```
Session valid?
  No  → (auth)/welcome
  Yes → profile.onboarding_complete?
    No  → (onboarding)/connect-bank
    Yes → (app)/index [Home tab]
```

### 2.3 Onboarding Flow (One-time, post-signup)
```
(onboarding)/connect-bank       [Step 1/5]
  └→ Skip or Connect via Plaid
       └→ (onboarding)/preferences   [Step 2/5]
            └→ (onboarding)/select-causes   [Step 3/5]
                 └→ (onboarding)/select-charities  [Step 4/5]
                      └→ (onboarding)/complete     [Step 5/5]
                           └→ SET onboarding_complete = true
                                └→ (app)/index
```

### 2.4 Main App Navigation
```
Tab Bar (always visible in (app)/):
  [Home]  [Charities]  [Activity]  [Profile]

Home → tap charity card → charities/[id] (modal)
Home → tap "Add Account" → profile/linked-accounts (push)
Charities → search/filter → charities/[id] (push)
Activity → tap receipt icon → tax-receipts (push from profile)
Profile → tap row → sub-screens (push)
```

### 2.5 Donation Batch Notification Deep Link
```
Push notification: "Your $7.40 donation was processed!"
  └→ Deep link: zaytoonapp://activity
       └→ Opens (app)/activity/index, scrolled to batch
```

---

## 3. Tab Bar Design

| Tab | Icon (SF Symbol) | Label |
|---|---|---|
| Home | `house.fill` | Home |
| Charities | `heart.fill` | Charities |
| Activity | `clock.fill` | Activity |
| Profile | `person.fill` | Profile |

---

## 4. Screen Inventory

| Screen | Route | Auth Required | Onboarding Complete |
|---|---|---|---|
| Welcome | `/(auth)/welcome` | No | — |
| Login | `/(auth)/login` | No | — |
| Sign Up | `/(auth)/signup` | No | — |
| Verify OTP | `/(auth)/verify-otp` | No | — |
| Connect Bank | `/(onboarding)/connect-bank` | Yes | No |
| Preferences (onboarding) | `/(onboarding)/preferences` | Yes | No |
| Select Causes | `/(onboarding)/select-causes` | Yes | No |
| Select Charities | `/(onboarding)/select-charities` | Yes | No |
| Onboarding Complete | `/(onboarding)/complete` | Yes | No |
| Home / Dashboard | `/(app)/` | Yes | Yes |
| Charity Discovery | `/(app)/charities/` | Yes | Yes |
| Charity Profile | `/(app)/charities/[id]` | Yes | Yes |
| Activity / History | `/(app)/activity/` | Yes | Yes |
| Profile | `/(app)/profile/` | Yes | Yes |
| Linked Accounts | `/(app)/profile/linked-accounts` | Yes | Yes |
| Round-up Preferences | `/(app)/profile/preferences` | Yes | Yes |
| Notification Settings | `/(app)/profile/notifications` | Yes | Yes |
| Tax Receipts | `/(app)/profile/tax-receipts` | Yes | Yes |

---

## 5. Expo Router Configuration

### Typed Routes
Typed routes are enabled (`experiments.typedRoutes: true`). All `router.push()` and `<Link>` calls must use typed route strings.

### Deep Linking
URL scheme: `zaytoonapp://`

Deep link mappings:
```
zaytoonapp://          → /(app)/
zaytoonapp://activity  → /(app)/activity/
zaytoonapp://charities → /(app)/charities/
zaytoonapp://profile   → /(app)/profile/
```

### Back Behavior
- Android back gesture: handled by Expo Router default stack behavior
- `predictiveBackGestureEnabled: false` is already set in `app.json`
- Onboarding stack: back is allowed on intermediate steps; back from step 1 goes to welcome
