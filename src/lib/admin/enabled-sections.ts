/**
 * Which admin sections are switched ON right now.
 *
 * The admin panel ships with many modules (kitchen, inventory, staff, loyalty,
 * gift cards, messaging, insights, …). To run a slimmed-down panel we simply
 * DON'T list those prefixes here — every page's code stays intact and untouched,
 * so re-enabling a section later is a one-line change (add its prefix back), not
 * an un-commenting/rewrite. Nothing is deleted.
 *
 * Two consumers share this list:
 *   - AdminShell hides nav items whose href isn't enabled.
 *   - proxy.ts redirects any typed/bookmarked hidden `/admin/*` URL to /admin.
 *
 * Matching is by path prefix, so "/admin/orders" also enables "/admin/orders/123".
 * The "/admin" dashboard is always allowed.
 */
export const ADMIN_ENABLED_PREFIXES = [
  "/admin/orders", // core: live + history
  "/admin/reservations", // bookings, calendar, waitlist, tables & hours
  "/admin/menu/availability", // mark dishes sold-out (full menu editing stays hidden)
  "/admin/marketing", // email marketing: CRM, campaigns, segments, promotions, offers popup
  "/admin/locations", // delivery radius/fee, opening hours
  "/admin/reports/sales", // revenue
] as const;

/** Is this admin path part of a currently-enabled section? */
export function isAdminPathEnabled(pathname: string): boolean {
  if (pathname === "/admin") return true; // dashboard is always on
  return ADMIN_ENABLED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}
