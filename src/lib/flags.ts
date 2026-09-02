/**
 * Feature flags. Toggle via environment variables.
 *
 * Client-readable flags must be prefixed `NEXT_PUBLIC_`. Values are read at
 * build/runtime; flip them in `.env.local` (local) or the Vercel dashboard.
 */
export const flags = {
  /**
   * The in-house online-ordering system (cart, checkout, Stripe). HARDCODED ON —
   * no env var needed (Vercel NEXT_PUBLIC toggles were unreliable). Every "Order
   * Online" CTA points at /order (Balham internal, others external). To turn it
   * OFF, change this back to `false` in code and redeploy.
   * NOTE: checkout still needs Stripe + Upstash env configured — without them the
   * cart works but checkout returns "Online payments aren't configured yet".
   */
  ordering: true,

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

/**
 * Public-site kill switch. The site is LIVE by default; set
 * `NEXT_PUBLIC_SITE_ENABLED=false` (in Vercel, then redeploy) to put the public
 * pages into an "under construction" holding screen. The /admin panel stays
 * reachable so you can keep managing orders/reservations while it's off.
 *   on  → NEXT_PUBLIC_SITE_ENABLED=true   (or leave it unset)
 *   off → NEXT_PUBLIC_SITE_ENABLED=false
 */
export const SITE_ENABLED = process.env.NEXT_PUBLIC_SITE_ENABLED !== "false";

/**
 * Online table booking is gated on the backend-wired reservations system
 * (`reservationsV2`). When it's ON, the /reservations page takes bookings
 * on-site with live availability. When OFF (NEXT_PUBLIC_FEATURE_RESERVATIONS_V2
 * unset or "false"), the page and every booking CTA fall back to "call us to
 * reserve a table" showing the restaurant phone number — no slots, no form.
 */
export const RESERVATIONS_ONLINE = flags.reservationsV2;

/** Interim external ordering destination, used while `flags.ordering` is off. */
export const EXTERNAL_ORDER_URL = "https://www.bombaybicyclechef.uk/locator";

/**
 * The global "Order Online" entry point. With in-house ordering on, this is the
 * branch picker at `/order` (which then routes each branch internal/external);
 * with it off, every CTA falls back to the external locator.
 */
export const ORDER_ENTRY_HREF = flags.ordering ? "/order" : EXTERNAL_ORDER_URL;
