# Zaytoon — Technical Architecture

**Version:** 1.0
**Date:** 2026-05-23

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     ZAYTOON SYSTEM                          │
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Mobile App  │    │  Admin Web   │    │  Edge Funcs  │  │
│  │ Expo RN SDK56│    │   Next.js    │    │  (Supabase)  │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                  │                   │           │
│  ┌──────▼───────────────────▼───────────────────▼───────┐  │
│  │                  Supabase                            │  │
│  │   Auth │ Postgres DB │ Storage │ Edge Functions      │  │
│  │   Realtime │ Row Level Security                      │  │
│  └──────┬──────────────────────────────────────────────┘  │
│         │                                                   │
│  ┌──────▼──────────────────────────────────────────────┐   │
│  │              Third-Party Integrations               │   │
│  │   Plaid (bank link) │ Stripe (payments) │ Firebase  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Frontend — Expo React Native

### Stack
| Layer | Technology |
|---|---|
| Framework | Expo SDK 56, React Native 0.85, React 19 |
| Navigation | Expo Router v4 (file-based, typed routes) |
| State | Zustand (global) + React Query / TanStack Query (server state) |
| Styling | NativeWind v4 (Tailwind for RN) or StyleSheet with theme tokens |
| UI Components | Custom design system built on `@expo/ui` + `expo-symbols` |
| Animations | React Native Reanimated 4 + Expo Glass Effect |
| Auth | Supabase JS client + expo-auth-session (OAuth) |
| Bank Link | react-native-plaid-link-sdk |
| Payments | @stripe/stripe-react-native |
| Push Notifications | Expo Notifications + Firebase Cloud Messaging |
| Storage | expo-secure-store (tokens), AsyncStorage (non-sensitive) |
| Forms | React Hook Form + Zod |
| Analytics | Posthog (optional v1) |

### File Structure
```
src/
├── app/                          # Expo Router pages
│   ├── _layout.tsx               # Root layout (auth guard, providers)
│   ├── (auth)/                   # Unauthenticated routes
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx
│   │   ├── login.tsx
│   │   ├── signup.tsx
│   │   └── verify-otp.tsx
│   ├── (onboarding)/             # Post-signup onboarding (one-time)
│   │   ├── _layout.tsx
│   │   ├── connect-bank.tsx
│   │   ├── preferences.tsx
│   │   ├── select-causes.tsx
│   │   └── complete.tsx
│   └── (app)/                    # Authenticated app (tab navigator)
│       ├── _layout.tsx           # Tab bar layout
│       ├── index.tsx             # Home / Dashboard
│       ├── charities/
│       │   ├── index.tsx         # Charity discovery
│       │   └── [id].tsx          # Charity profile
│       ├── activity/
│       │   └── index.tsx         # Donation history
│       └── profile/
│           ├── index.tsx         # Profile & settings
│           ├── linked-accounts.tsx
│           ├── preferences.tsx
│           └── notifications.tsx
├── components/
│   ├── ui/                       # Base design system
│   ├── charity/                  # Charity-specific components
│   ├── donation/                 # Donation-specific components
│   └── onboarding/               # Onboarding step components
├── hooks/
│   ├── use-auth.ts
│   ├── use-round-ups.ts
│   ├── use-charities.ts
│   └── use-donations.ts
├── lib/
│   ├── supabase.ts               # Supabase client
│   ├── plaid.ts                  # Plaid helpers
│   ├── stripe.ts                 # Stripe helpers
│   └── notifications.ts          # Push notification setup
├── stores/
│   ├── auth-store.ts             # Zustand auth state
│   └── onboarding-store.ts       # Onboarding progress state
├── types/
│   ├── database.types.ts         # Supabase generated types
│   └── app.types.ts              # App-level types
└── constants/
    ├── theme.ts                  # Design tokens (already exists)
    └── config.ts                 # Env-driven config
```

---

## 3. Backend — Supabase

### Database Schema

```sql
-- Users (extends Supabase auth.users)
profiles
  id uuid PK FK → auth.users.id
  full_name text
  phone text
  avatar_url text
  onboarding_complete bool DEFAULT false
  created_at timestamptz

-- Linked bank/card accounts (Plaid)
linked_accounts
  id uuid PK
  user_id uuid FK → profiles.id
  plaid_item_id text
  plaid_access_token text (encrypted)
  institution_name text
  mask text (last 4 digits)
  account_type text (checking/savings/credit)
  is_active bool DEFAULT true
  created_at timestamptz

-- Donation preferences per user
donation_preferences
  id uuid PK
  user_id uuid FK → profiles.id (UNIQUE)
  threshold_amount numeric DEFAULT 5.00
  monthly_cap numeric DEFAULT 50.00
  schedule text DEFAULT 'threshold' -- 'threshold' | 'weekly_friday'
  is_paused bool DEFAULT false
  created_at timestamptz
  updated_at timestamptz

-- Nonprofits (admin-managed)
nonprofits
  id uuid PK
  name text
  slug text UNIQUE
  description text
  mission text
  logo_url text
  website_url text
  ein text                   -- EIN for U.S. 501c3
  country text DEFAULT 'US'
  stripe_connect_id text
  is_verified bool DEFAULT false
  is_active bool DEFAULT true
  created_at timestamptz

-- Cause categories
cause_categories
  id uuid PK
  name text UNIQUE            -- 'food', 'medical', 'education', etc.
  label text                  -- 'Food Security'
  icon text                   -- SF Symbol or emoji
  display_order int

-- Nonprofit ↔ cause category mapping
nonprofit_categories
  nonprofit_id uuid FK → nonprofits.id
  category_id uuid FK → cause_categories.id
  PRIMARY KEY (nonprofit_id, category_id)

-- User's chosen charities and split
user_charity_allocations
  id uuid PK
  user_id uuid FK → profiles.id
  nonprofit_id uuid FK → nonprofits.id
  split_percentage numeric DEFAULT 0   -- if 0, equal split
  created_at timestamptz
  UNIQUE (user_id, nonprofit_id)

-- Round-up ledger (one row per transaction)
roundup_transactions
  id uuid PK
  user_id uuid FK → profiles.id
  linked_account_id uuid FK → linked_accounts.id
  plaid_transaction_id text UNIQUE
  transaction_amount numeric
  roundup_amount numeric          -- always > 0 and <= 1.00
  merchant_name text
  transacted_at timestamptz
  status text DEFAULT 'pending'   -- 'pending' | 'included_in_batch' | 'excluded'
  created_at timestamptz

-- Donation batches (when threshold/schedule triggers a real charge)
donation_batches
  id uuid PK
  user_id uuid FK → profiles.id
  total_amount numeric
  stripe_payment_intent_id text
  status text DEFAULT 'pending'   -- 'pending' | 'processing' | 'completed' | 'failed'
  trigger_type text               -- 'threshold' | 'scheduled_friday' | 'manual'
  processed_at timestamptz
  created_at timestamptz

-- Individual donations per batch per charity
donations
  id uuid PK
  batch_id uuid FK → donation_batches.id
  user_id uuid FK → profiles.id
  nonprofit_id uuid FK → nonprofits.id
  amount numeric
  stripe_transfer_id text
  status text DEFAULT 'pending'   -- 'pending' | 'completed' | 'failed'
  created_at timestamptz

-- Tax receipts
tax_receipts
  id uuid PK
  user_id uuid FK → profiles.id
  year int
  total_donated numeric
  pdf_url text
  generated_at timestamptz
```

### Row Level Security (RLS)
- `profiles`: users can read/update their own row only
- `linked_accounts`: users can CRUD their own rows only
- `donation_preferences`: users can CRUD their own row only
- `nonprofits`: all authenticated users can read; only service role can write
- `cause_categories`: public read
- `user_charity_allocations`: users can CRUD their own rows only
- `roundup_transactions`: users can read their own rows; service role inserts
- `donation_batches`: users can read their own rows; service role inserts/updates
- `donations`: users can read their own rows; service role inserts/updates

### Edge Functions
| Function | Trigger | Description |
|---|---|---|
| `plaid-webhook` | HTTP POST (Plaid) | Receive transaction webhooks, compute round-ups, insert to ledger |
| `process-donations` | Cron (Fri 6am UTC) + HTTP | Check thresholds, create donation batches, trigger Stripe charges |
| `stripe-webhook` | HTTP POST (Stripe) | Handle payment intent updates, update batch/donation status |
| `generate-tax-receipt` | HTTP (user-triggered) | Generate PDF receipt, upload to Storage, email user |
| `sync-transactions` | HTTP (on-demand) | Manual Plaid transaction sync for a user |

---

## 4. Authentication Flow

### Providers
- **Supabase Auth** as the auth layer (handles JWTs, sessions, refresh tokens)
- **Google OAuth** via `expo-auth-session` + Supabase OAuth redirect
- **Apple Sign-In** via `expo-apple-authentication` + Supabase OAuth
- **Phone OTP** via Supabase Auth phone provider (Twilio)
- **Email/Password** via Supabase Auth native

### Token Storage
- Access token and refresh token stored in `expo-secure-store`
- Supabase JS client auto-refreshes tokens
- Root layout reads session on mount to determine routing

### Session Routing Logic (Root `_layout.tsx`)
```
App Start
  ↓
Load session from SecureStore
  ↓
No session → redirect to (auth)/welcome
  ↓
Has session + onboarding_complete = false → redirect to (onboarding)/connect-bank
  ↓
Has session + onboarding_complete = true → redirect to (app)/index
```

---

## 5. Financial Integration Architecture

### Plaid Flow
```
User taps "Connect Account"
  ↓
App calls Supabase Edge Function: create-link-token
  ↓
Edge Function calls Plaid /link/token/create
  ↓
App opens Plaid Link SDK with link_token
  ↓
User completes Plaid Link (selects bank, logs in)
  ↓
Plaid returns public_token to app
  ↓
App calls Edge Function: exchange-plaid-token
  ↓
Edge Function calls Plaid /item/public_token/exchange
  ↓
Stores encrypted access_token in linked_accounts table
  ↓
Plaid begins sending transaction webhooks
```

### Round-up Calculation
```
Transaction posted: $12.35
Rounded up: $13.00
Round-up amount: $0.65
Stored in roundup_transactions
```

### Donation Batch Trigger
```
Cron job (every Friday 6am UTC) OR
Threshold check (after each new roundup_transaction insert):

  SELECT SUM(roundup_amount) FROM roundup_transactions
  WHERE user_id = $1 AND status = 'pending'

  If sum >= user's threshold_amount:
    1. Create donation_batch record
    2. Mark roundup_transactions as 'included_in_batch'
    3. Create Stripe PaymentIntent for ACH pull
    4. On success: create donations records per nonprofit per split
    5. Trigger Stripe Connect payouts to nonprofits
    6. Send push notification to user
```

---

## 6. Third-Party Services

| Service | Purpose | SDK |
|---|---|---|
| Plaid | Bank account linking + transaction data | `react-native-plaid-link-sdk` |
| Stripe | ACH payment processing, Connect payouts | `@stripe/stripe-react-native` |
| Supabase | Auth, DB, Storage, Edge Functions | `@supabase/supabase-js` |
| Firebase | Cloud Messaging for push notifications | `@react-native-firebase/messaging` |
| Expo Notifications | Push notification registration + handling | `expo-notifications` |

---

## 7. Environment Configuration

```
# .env.local (never commit)
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_PLAID_ENV=sandbox          # sandbox | development | production
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS=
EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID=

# Server-side only (Supabase Edge Function secrets)
SUPABASE_SERVICE_ROLE_KEY=
PLAID_CLIENT_ID=
PLAID_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## 8. Non-Functional Requirements

| Requirement | Target |
|---|---|
| App cold start | < 2 seconds |
| Plaid webhook processing | < 5 seconds |
| Donation batch processing | < 30 seconds end-to-end |
| Uptime | 99.5% (Supabase SLA) |
| Data encryption | AES-256 at rest (Supabase default), TLS in transit |
| PCI Compliance | Delegated to Stripe; no raw card data in Zaytoon DB |
