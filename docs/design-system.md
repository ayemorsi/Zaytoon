# Zaytoon Design System

**Source:** DESIGN.md + HTML design files provided by user

---

## Brand

| | |
|---|---|
| Name | Zaytoon (زيتون — olive in Arabic) |
| Tagline | Turn spare change into lasting impact. |
| Feel | Modern · Warm · Trustworthy · Premium · Calm · Human |

---

## Color Tokens (matches Tailwind config in HTML designs)

| Token | Light Value | Role |
|---|---|---|
| `primary` | `#284726` | Deep Olive Green — primary actions, brand |
| `surface` | `#f6fbf4` | App background |
| `surface-white` | `#FFFFFF` | Card surfaces |
| `background-warm` | `#F8F4EA` | Onboarding/welcome backgrounds |
| `secondary-container` | `#d4e5c5` | Soft sage — icon backgrounds, chips |
| `tertiary-fixed` | `#ffdf9e` | Gold accent — verified badges |
| `on-surface` | `#181d19` | Primary text |
| `text-muted` | `#6F766D` | Secondary text |
| `warning-amber` | `#F5B942` | Verified star badges |
| `success-fresh` | `#4CAF50` | Success states |

---

## Typography

**Font:** Manrope (Google Fonts)

| Usage | Size | Weight |
|---|---|---|
| Hero / Wordmark | 32–36px | 700 |
| Page Title | 26–32px | 700 |
| Section Title | 20px | 600 |
| Card Title | 18px | 600 |
| Body | 16px | 400–500 |
| Label Bold | 13px | 700, letter-spacing 0.02em |
| Caption | 12px | 500 |

---

## Navigation (5 Tabs)

| Tab | Icon | Route |
|---|---|---|
| Home | house | `/(app)/` |
| Giving | receipt_long | `/(app)/giving/` |
| Nonprofits | volunteer_activism | `/(app)/nonprofits/` |
| Impact | auto_graph | `/(app)/impact/` |
| Settings | settings | `/(app)/settings/` |

---

## Card Design Language

- Large rounded corners: `borderRadius: 24` (xxl)
- Shadow: `0 4px 20px 0 rgba(31,36,32,0.04)` (soft-lift)
- Background: always `surface-white` (#FFFFFF) on `surface` (#f6fbf4) background
- Internal padding: 20px (card-padding)
- Gap between cards: 16px (stack-gap-md)

---

## Key Screens (from HTML designs)

| Screen | Key Design Notes |
|---|---|
| Home Dashboard | Greeting + Total Impact card + Bento grid (Next/Balance) + Monthly cap progress + Recent round-ups |
| Giving History | Summary card (primary bg) + filter chips + pending/processed sections |
| Nonprofits | Search bar + horizontal filter chips + card list with Select button |
| Impact | Hero total card + 2×2 bento grid + quote card + impact updates feed |
| Settings | Avatar + grouped rows with icons + pause toggle + sign out |
| Monthly Cap | 2×2 grid of $ options + custom input |
| Connect Card | Centered lock icon with pulse rings + trust badges + CTA |
| Onboarding | Olive-tree image + value prop cards + fixed bottom CTA |
