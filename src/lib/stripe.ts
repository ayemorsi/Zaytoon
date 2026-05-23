// App-side Stripe configuration
// The publishable key is safe to include in the app bundle.
// All secret operations (charges, transfers) happen in Edge Functions.

export const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? '';
