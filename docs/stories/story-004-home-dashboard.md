# Story 004 — Home Dashboard

**Epic:** Core App Screens
**Status:** Ready for Development (after Story 003)
**Priority:** P1
**Depends on:** Story 003

---

## User Story

As an active user, I want to see my current round-up balance, recent transaction activity, and giving stats on a dashboard so that I can understand my giving at a glance and stay motivated.

---

## Acceptance Criteria

### AC1 — Round-up Balance Card
- [ ] Displays current pending round-up balance (sum of unprocessed round-ups)
- [ ] Shows threshold amount and how close user is: "You're $2.14 away from your next donation"
- [ ] Progress bar filling toward threshold
- [ ] If schedule is "Every Friday": shows countdown to next Friday
- [ ] "Pause Giving" / "Resume Giving" toggle:
  - Updates `donation_preferences.is_paused` in DB
  - Paused state shows banner: "Giving paused. Round-ups are not being collected."

### AC2 — Impact Stats Row
- [ ] Total donated (all time): "$47.30 given"
- [ ] Giving streak: "3-week streak" or "12 donations"
- [ ] Charities supported count: "Helping 3 nonprofits"
- [ ] Stats displayed as 3 horizontal cards/chips

### AC3 — My Charities Preview
- [ ] Horizontal scroll of user's selected charity logos
- [ ] "Manage" link navigates to `(app)/charities/`
- [ ] Shows split percentages if custom splits configured

### AC4 — Recent Activity Feed
- [ ] Last 5–10 round-up transactions listed
- [ ] Each item: merchant name, transaction amount, round-up amount, date
- [ ] "View all" link navigates to `(app)/activity/`
- [ ] Empty state: "Connect your bank to start collecting round-ups"
  - CTA links to `(app)/profile/linked-accounts`
- [ ] If bank not connected (skipped onboarding): shows prominent "Connect your bank" CTA card

### AC5 — Last Donation Badge (if applicable)
- [ ] If a batch was processed in last 7 days: show confirmation card
  - "Your $8.40 donation was processed on May 16"
  - Logos of charities that received it
  - "View receipt" link → activity screen

### AC6 — Pull to Refresh
- [ ] Pull-to-refresh triggers re-fetch of round-up balance and recent transactions
- [ ] Loading skeleton shown during initial data fetch
- [ ] Error state if Supabase query fails

---

## Data Requirements

```ts
// Queries needed on this screen:
// 1. Sum of pending round-ups for current user
SELECT SUM(roundup_amount) FROM roundup_transactions
WHERE user_id = $uid AND status = 'pending'

// 2. User's donation preferences (threshold, schedule, is_paused)
SELECT * FROM donation_preferences WHERE user_id = $uid

// 3. Total donated all-time
SELECT SUM(amount) FROM donations
WHERE user_id = $uid AND status = 'completed'

// 4. User's charity allocations with nonprofit details
SELECT uca.*, n.name, n.logo_url FROM user_charity_allocations uca
JOIN nonprofits n ON uca.nonprofit_id = n.id
WHERE uca.user_id = $uid

// 5. Recent round-up transactions (last 10)
SELECT * FROM roundup_transactions
WHERE user_id = $uid
ORDER BY transacted_at DESC
LIMIT 10

// 6. Last completed donation batch
SELECT * FROM donation_batches
WHERE user_id = $uid AND status = 'completed'
ORDER BY processed_at DESC
LIMIT 1
```

---

## UI Specifications

### Layout (top to bottom)
```
┌────────────────────────────────────┐
│  Good morning, Ahmed 👋            │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Your round-up balance       │  │
│  │  $3.86 / $5.00               │  │
│  │  ████████░░░░  77%           │  │
│  │  $1.14 until next donation   │  │
│  │                  [Pause ⏸]   │  │
│  └──────────────────────────────┘  │
│                                    │
│  [Total Given] [Streak] [Charities]│
│   $47.30        3 wks    3 orgs    │
│                                    │
│  My Charities              Manage →│
│  [🕌] [🍽️] [📚]                    │
│                                    │
│  Recent Activity           View all│
│  Starbucks   $5.60  +$0.40  May 22 │
│  Amazon      $23.47 +$0.53  May 21 │
│  Target      $41.12 +$0.88  May 20 │
│  ...                               │
└────────────────────────────────────┘
```

### Greeting
- Time-based: "Good morning" / "Good afternoon" / "Good evening"
- Uses user's first name from `profiles.full_name`

### Round-up Card
- Card with subtle shadow/elevation
- Progress bar: green fill, rounded corners
- Paused state: card grayed out, progress bar muted

---

## Technical Notes

- Use TanStack Query for all data fetching with proper cache keys
- Parallel query fetching for all dashboard data (Promise.all or `useQueries`)
- Skeleton loaders: show placeholder cards with shimmer animation while loading
- Use Expo's `useColorScheme` for dark mode support on all elements

---

## Tasks

1. Create `src/hooks/use-dashboard.ts` — parallel queries for all dashboard data
2. Build `(app)/index.tsx` layout structure
3. Build `RoundupBalanceCard` component
4. Build `ImpactStatsRow` component
5. Build `MyCharitiesPreview` component (horizontal scroll)
6. Build `RecentActivityFeed` component
7. Build `LastDonationBadge` component
8. Implement pause/resume toggle with optimistic update
9. Build skeleton loading states for each section
10. Implement pull-to-refresh
11. Handle empty/no-bank-connected states

---

## Definition of Done

- Dashboard loads and displays real data from Supabase
- All sections render correctly in light and dark mode
- Pull-to-refresh works
- Pause/resume updates DB and reflects in UI immediately (optimistic)
- Skeleton loading shown during initial fetch
- Empty states shown correctly for new users
- No TypeScript errors
