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
} as const;

/** Interim external ordering destination, used while `flags.ordering` is off. */
export const EXTERNAL_ORDER_URL = "https://www.bombaybicyclechef.uk/locator";
