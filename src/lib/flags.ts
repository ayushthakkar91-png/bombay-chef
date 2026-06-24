/**
 * Feature flags. Toggle via environment variables.
 *
 * Client-readable flags must be prefixed `NEXT_PUBLIC_`. Values are read at
 * build/runtime; flip them in `.env.local` (local) or the Vercel dashboard.
 */
export const flags = {
  /**
   * The in-house online-ordering system (cart, checkout, Stripe). Built behind
   * this flag and shipped OFF until Phase 3. While off, ordering links fall
   * back to the external locator below.
   */
  ordering: process.env.NEXT_PUBLIC_FEATURE_ORDERING === "true",

  /**
   * Backend-wired reservations (live availability, waitlist, confirmation &
   * reminder notifications). While OFF, the existing reservation flow renders
   * but submits to the interim handler. See docs/SYSTEM_ARCHITECTURE.md (P3).
   */
  reservationsV2: process.env.NEXT_PUBLIC_FEATURE_RESERVATIONS_V2 === "true",

  /** Customer accounts: loyalty, referrals, favourites, saved addresses (P5). */
  loyalty: process.env.NEXT_PUBLIC_FEATURE_LOYALTY === "true",

  /** CRM + email marketing: ESP sync, segments, lifecycle automations (P6). */
  marketing: process.env.NEXT_PUBLIC_FEATURE_MARKETING === "true",

  /** Multi-tenant SaaS platform / operator console at /platform (P13). OFF by
   *  default — when off, the nav entry is hidden and /platform redirects away. */
  platform: process.env.NEXT_PUBLIC_FEATURE_PLATFORM === "true",
} as const;

/** Interim external ordering destination, used while `flags.ordering` is off. */
export const EXTERNAL_ORDER_URL = "https://www.bombay-bicycle-chef.com/locator";

/**
 * Where every public "Order online" CTA points. When in-house ordering is on it's
 * the on-site flow (`/order`); otherwise it falls back to the external locator.
 */
export const ORDER_URL = flags.ordering ? "/order" : EXTERNAL_ORDER_URL;
