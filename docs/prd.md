# Zaytoon — Product Requirements Document

**Version:** 1.0
**Date:** 2026-05-23
**Status:** Draft

---

## 1. Overview

**Zaytoon** is a mobile-first fintech app for automated charitable giving. It connects to a user's bank or credit/debit cards via Plaid, rounds up every purchase to the nearest dollar, and accumulates the spare change until a threshold or scheduled donation day is reached. Funds are then processed via Stripe and disbursed to verified nonprofit organizations selected by the user.

The name "Zaytoon" (زيتون) means olive in Arabic — symbolizing continuous, effortless generosity rooted in tradition.

**Tagline:** Give effortlessly, one purchase at a time.

---

## 2. Problem Statement

Charitable giving is often friction-heavy: users must remember to donate, decide on amounts, navigate nonprofit websites, and manage tax records manually. For Muslim and socially conscious users who believe in sadaqah (continuous charity), there is no dedicated mobile tool that makes passive, recurring, automated giving easy and spiritually aligned.

Existing round-up apps (Acorns, Chime) focus on investing, not giving. Existing donation platforms (Launchgood, Network for Good) require active intent per donation.

---

## 3. Goals

### Primary Goals
- Make charitable giving effortless and passive through purchase round-ups
- Minimize processing costs by batching donations above a threshold (not per-transaction)
- Support scheduled donation days (e.g., every Friday) aligned with Islamic giving practices
- Provide a curated, vetted set of nonprofit organizations users can trust

### Secondary Goals
- Build a habit of continuous giving through gamification-lite (streaks, impact stats)
- Provide transparent tax documentation (receipts)
- Scale to accommodate multiple cause categories and international charities

### Non-Goals
- User-created fundraising campaigns or peer-to-peer fundraising
- Crypto donations (v1)
- Investment features
- Web/desktop app for donors (mobile-first only in v1)

---

## 4. Target Users

### Persona 1 — The Passive Giver (Primary)
- Age: 22–35, mobile-first, uses fintech apps (Venmo, Cash App, Robinhood)
- Wants to give regularly but forgets or finds it inconvenient
- Motivated by: effortlessness, automation, visible impact

### Persona 2 — The Practicing Muslim
- Age: 18–45, values sadaqah jariyah (ongoing charity)
- Wants giving aligned with Islamic finance principles
- Motivated by: spiritual continuity, verified halal causes, Friday scheduling

### Persona 3 — The Socially Conscious Professional
- Age: 28–42, busy career, disposable income
- Already donates but wants a set-and-forget system
- Motivated by: tax receipts, impact tracking, reputable nonprofits

---

## 5. Core Features

### Epic 1 — Auth & Onboarding
- Email/password sign-up and login
- Google OAuth login
- Apple Sign-In
- Phone OTP verification (SMS)
- Post-signup onboarding flow:
  1. Connect bank/card account (Plaid Link)
  2. Set round-up preferences (threshold amount, monthly cap)
  3. Choose donation schedule (threshold-based vs. weekly Friday)
  4. Select cause categories and specific nonprofits

### Epic 2 — Bank & Card Connection (Plaid)
- Plaid Link integration for bank/debit/credit card connection
- Support multiple linked accounts
- Real-time transaction sync via Plaid webhooks
- Round-up calculation per transaction (round up to nearest $1)
- Pending round-up balance display

### Epic 3 — Donation Accumulation Engine
- Accumulate round-ups per user in a ledger
- Configurable threshold trigger ($5–$10 default, user can adjust)
- Friday batch processing option (donations processed every Friday regardless of threshold)
- Monthly cap enforcement (user sets max donation per month)
- Round-up pause/resume toggle

### Epic 4 — Nonprofit Discovery & Selection
- Curated list of verified nonprofits (admin-approved only, no user-created)
- Cause categories: Food, Medical, Education, Disaster Relief, Masjids, Orphan Support, Clean Water, Refugees
- Nonprofit profile pages: mission, EIN, impact stats, verification badge
- Multi-select: users can split donations across multiple nonprofits
- Split percentage or equal distribution

### Epic 5 — Donation Processing (Stripe)
- Stripe ACH pull from user's linked bank account when threshold met
- Stripe payout to nonprofit's Stripe Connect account
- Transaction fee handling (platform absorbs or passes through — TBD)
- Apple Pay / Google Pay for one-time top-up donations
- Donation confirmation notifications

### Epic 6 — Donation History & Tracking
- Full transaction history (round-ups per purchase, batch donations)
- Impact stats: total given, causes supported, equivalent impact (e.g., "You've fed 12 families")
- Annual/monthly giving summaries
- Tax receipt generation (PDF, downloadable and emailed)
- Donation streaks

### Epic 7 — Notifications
- Push notifications for:
  - Donation batch processed
  - Threshold reached
  - New nonprofit added in selected category
  - Monthly summary
  - Round-up milestones
- Notification preferences in settings

### Epic 8 — Profile & Settings
- Edit profile (name, email, phone)
- Manage linked accounts (add/remove Plaid connections)
- Update round-up preferences and monthly cap
- Change nonprofit selections and split ratios
- Pause/resume giving
- Notification settings
- Delete account / data export (GDPR/CCPA)

### Epic 9 — Admin Dashboard (Next.js — separate repo)
- Nonprofit onboarding and verification
- Transaction monitoring and reconciliation
- User management
- Payout management and Stripe Connect oversight
- Content management for cause categories
- Reports and analytics

---

## 6. Financial Model

### Round-up Mechanics
- Every purchase is rounded up to the nearest $1
- Example: $4.73 → round-up = $0.27
- Round-ups accumulate in a virtual ledger (no real money moved per-transaction)

### Threshold Batching
- Default threshold: $5.00 (user-configurable: $5, $10, $25)
- When balance ≥ threshold, a Stripe ACH charge is initiated
- OR: process every Friday regardless of threshold (user opt-in)
- Monthly cap: $50/month default (user-configurable, max $500)

### Fee Strategy (v1)
- Platform charges 0% to users — platform sustains via optional "tip" or future B2B model (TBD)
- Stripe ACH fees (~$0.80/transfer) absorbed by platform
- Plaid fees absorbed by platform

---

## 7. Compliance & Trust

- All nonprofits must be 501(c)(3) verified (U.S.) or equivalent
- EIN displayed on every nonprofit profile
- Tax receipts issued for annual giving totals
- Plaid and Stripe handle all PCI-compliant card/bank data — Zaytoon stores no raw financial credentials
- Privacy policy and Terms of Service required at sign-up
- Data deletion available within 30 days of request

---

## 8. Success Metrics (v1)

| Metric | Target (6 months post-launch) |
|---|---|
| Registered users | 5,000 |
| Users with linked bank | 60% of registered |
| Monthly active donors | 40% of linked users |
| Average monthly donation | $15–$25/user |
| Total disbursed | $500K |
| Nonprofit partners | 20–30 |
| App Store rating | ≥ 4.5 |

---

## 9. Constraints & Risks

| Risk | Mitigation |
|---|---|
| Plaid access costs at scale | Negotiate volume pricing; cache transaction data aggressively |
| Stripe ACH failure / NSF | Retry logic with exponential backoff; user notification on failure |
| Regulatory (money transmission) | Consult legal on MSB licensing; consider partnering with licensed processor |
| Low conversion (linked → donor) | Strong onboarding UX; impact messaging; social proof |
| Nonprofit vetting bottleneck | Admin dashboard with clear onboarding checklist; manual review queue |

---

## 10. Open Questions

- [ ] Will Zaytoon hold funds in escrow (requires money transmitter license) or use Stripe as the intermediary?
- [ ] International charities — how to handle non-U.S. 501(c)(3) equivalents in v1?
- [ ] Will the platform take a fee, add an optional tip, or operate on grants/sponsorships?
- [ ] Is Zakat calculation a v2 feature?
- [ ] Will users be able to invite friends (referral program)?
