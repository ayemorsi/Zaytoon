# Story 001 — Project Setup & Infrastructure

**Epic:** Foundation
**Status:** Ready for Development
**Priority:** P0 — Must complete before any other story

---

## User Story

As a developer, I need the project properly configured with all dependencies, environment setup, Supabase project initialized, and folder structure in place so that feature development can begin immediately.

---

## Acceptance Criteria

### AC1 — Folder structure
- [ ] `src/app/` contains route groups: `(auth)/`, `(onboarding)/`, `(app)/`
- [ ] Each group has a `_layout.tsx` and at least one placeholder screen
- [ ] `src/lib/`, `src/hooks/`, `src/stores/`, `src/types/`, `src/components/ui/` folders exist

### AC2 — Dependencies installed
- [ ] `@supabase/supabase-js` installed
- [ ] `expo-secure-store` installed
- [ ] `expo-auth-session` installed
- [ ] `expo-apple-authentication` installed
- [ ] `zustand` installed
- [ ] `@tanstack/react-query` installed
- [ ] `react-hook-form` + `zod` installed
- [ ] `nativewind` + `tailwindcss` installed (or decision documented to use StyleSheet)

### AC3 — Supabase client configured
- [ ] `src/lib/supabase.ts` created with SecureStore adapter
- [ ] `.env.local` created with correct variable names (not committed)
- [ ] `.env.example` committed with placeholder values
- [ ] `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` working

### AC4 — Database migrations
- [ ] `supabase/migrations/` folder initialized
- [ ] Migration file for all tables from architecture doc created
- [ ] RLS policies applied for all tables
- [ ] `handle_new_user` trigger created

### AC5 — Theme & design tokens
- [ ] `src/constants/theme.ts` updated with Zaytoon brand colors:
  - Primary: Green (`#2D7A4F` or brand equivalent)
  - Accent: Gold (`#D4A017` or brand equivalent)
  - Background, surface, text tokens defined for light + dark
- [ ] Theme accessible via `useTheme()` hook

### AC6 — Root layout auth guard
- [ ] Root `_layout.tsx` implements session check
- [ ] Routes correctly to `(auth)`, `(onboarding)`, or `(app)` based on session + `onboarding_complete`
- [ ] Loading state shown during session check (animated splash or spinner)

### AC7 — TypeScript types
- [ ] `src/types/database.types.ts` generated from Supabase schema
- [ ] `src/types/app.types.ts` with shared app-level types

---

## Technical Notes

- Run `npx supabase init` and `npx supabase start` for local dev
- Generate DB types: `npx supabase gen types typescript --local > src/types/database.types.ts`
- Expo Router groups use parentheses: `(auth)`, `(onboarding)`, `(app)` — these do not appear in URLs
- `predictiveBackGestureEnabled: false` already set in `app.json`

---

## Tasks

1. Create all route group folders and placeholder screens
2. Install all required npm packages (see AC2)
3. Create `src/lib/supabase.ts`
4. Create `.env.example` and `.env.local`
5. Initialize Supabase project (cloud + local)
6. Write and run all DB migrations
7. Apply RLS policies
8. Create `handle_new_user` trigger
9. Update theme tokens in `src/constants/theme.ts`
10. Implement auth guard in root `_layout.tsx`
11. Generate TypeScript types from Supabase

---

## Definition of Done

- App starts without errors
- Navigates to `(auth)/welcome` when no session
- All environment variables load correctly
- Supabase local dev running
- DB schema matches architecture doc
