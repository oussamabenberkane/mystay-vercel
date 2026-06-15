/**
 * Splash-screen timing.
 *
 * SPLASH_DELAY_MS is the single source of truth for how long the pre-auth
 * splash screen displays the "My Stay" wordmark before auto-redirecting to the
 * landing page (no user interaction required).
 *
 * Override at deploy time with NEXT_PUBLIC_SPLASH_DELAY_MS (milliseconds).
 * Default: 2600ms (inside the 2–3s spec window).
 */
const DEFAULT_SPLASH_DELAY_MS = 2600

const parsed = Number(process.env.NEXT_PUBLIC_SPLASH_DELAY_MS)

export const SPLASH_DELAY_MS =
  Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SPLASH_DELAY_MS
