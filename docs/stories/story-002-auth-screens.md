# Story 002 — Auth Screens & Supabase Auth Integration

**Epic:** Auth & Onboarding
**Status:** Ready for Development (after Story 001)
**Priority:** P0
**Depends on:** Story 001

---

## User Story

As a new user, I want to create an account or sign in using Google, Apple, phone OTP, or email/password so that I can access Zaytoon securely.

---

## Acceptance Criteria

### AC1 — Welcome Screen
- [ ] Displays Zaytoon logo and tagline: "Give effortlessly, one purchase at a time."
- [ ] "Get Started" button navigates to login screen
- [ ] "Sign In" link for returning users
- [ ] Visible on first app open when no session exists

### AC2 — Login Screen
- [ ] "Continue with Google" button (visible on both iOS and Android)
- [ ] "Continue with Apple" button (visible on iOS only; hidden on Android)
- [ ] "Continue with Phone" button navigates to phone entry
- [ ] Email field + password field with show/hide toggle
- [ ] "Sign In" button triggers email/password auth
- [ ] "Forgot password?" link sends reset email via Supabase
- [ ] "Don't have an account? Sign up" navigates to signup screen
- [ ] Loading state shown during auth request
- [ ] Error messages shown for invalid credentials (inline, not alert)

### AC3 — Sign Up Screen
- [ ] Full name field (required)
- [ ] Email field (required, validated)
- [ ] Password field (min 8 chars, 1 uppercase, 1 number)
- [ ] Confirm password field
- [ ] "I agree to Terms of Service and Privacy Policy" checkbox (required to submit)
- [ ] "Create Account" button
- [ ] Loading state during account creation
- [ ] On success: navigate to `(onboarding)/connect-bank`
- [ ] Inline validation errors for each field

### AC4 — Phone OTP Flow
- [ ] Phone number entry screen with country code picker (default: +1)
- [ ] Phone number formatted as user types
- [ ] "Send Code" button calls `supabase.auth.signInWithOtp({ phone })`
- [ ] Navigates to OTP verification screen
- [ ] OTP screen: 6 separate input boxes, auto-focus advances
- [ ] Paste support for SMS OTP autofill
- [ ] "Verify" button calls `supabase.auth.verifyOtp`
- [ ] "Resend code" with 60-second cooldown timer
- [ ] "Change number" link returns to phone entry
- [ ] Error for invalid OTP code

### AC5 — Google OAuth
- [ ] Calls Supabase OAuth with Google provider via `expo-auth-session`
- [ ] Opens browser session for Google login
- [ ] On success: session stored, navigate based on `onboarding_complete`
- [ ] On cancel: returns to login screen, no error shown

### AC6 — Apple Sign-In
- [ ] Uses `expo-apple-authentication` for native Apple Sign-In sheet
- [ ] On success: calls `supabase.auth.signInWithIdToken` with identity token
- [ ] On cancel: returns to login screen, no error shown
- [ ] Only rendered when `Platform.OS === 'ios'`

### AC7 — Session Persistence
- [ ] Returning user with valid session skips auth screens entirely
- [ ] Token refresh works transparently in background
- [ ] Expired/invalid session clears and routes to welcome

---

## UI Specifications

### Color / Style
- Background: brand dark or light based on system color scheme
- Primary button: filled green (`theme.primary`)
- OAuth buttons: outlined with provider logo
- Input fields: rounded, sufficient padding (48px height minimum)
- Error text: red, displayed below the relevant field

### Accessibility
- All interactive elements have `accessibilityLabel`
- OTP inputs are grouped with `accessibilityHint`
- Color contrast ≥ 4.5:1 for all text

---

## Technical Notes

- Read `docs/auth-flow.md` for exact implementation patterns
- Google OAuth requires `makeRedirectUri({ scheme: 'zaytoonapp' })` — scheme registered in `app.json`
- Apple Sign-In only available on iOS physical device / TestFlight; not on simulator
- Supabase email confirmation can be disabled in dashboard for v1 to reduce friction
- Phone OTP requires Twilio integration in Supabase dashboard

---

## Tasks

1. Build `(auth)/welcome.tsx` screen
2. Build `(auth)/login.tsx` screen with all four auth methods
3. Build `(auth)/signup.tsx` screen with validation
4. Build `(auth)/verify-otp.tsx` screen with OTP inputs
5. Implement `signInWithGoogle()` using `expo-auth-session`
6. Implement `signInWithApple()` using `expo-apple-authentication`
7. Implement phone OTP request + verification
8. Implement email/password sign-in and sign-up
9. Wire up forgot password flow
10. Add form validation with `react-hook-form` + `zod`
11. Add error handling and loading states to all forms

---

## Definition of Done

- All four auth methods work end-to-end in Expo Go / dev build
- Successful auth routes correctly (new user → onboarding, existing → app)
- Session persists across app restarts
- All error states handled gracefully
- No TypeScript errors
