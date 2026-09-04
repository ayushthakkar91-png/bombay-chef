import "server-only";

import { flags, EXTERNAL_ORDER_URL } from "@/lib/flags";
import { BRANCHES } from "@/data/locations";
import { getOrderingStatusBySlug } from "@/lib/repositories/ordering-status";

/** The branch that takes orders on our own flow (Balham today). */
const INTERNAL_BRANCH = BRANCHES.find((b) => b.ordering.provider === "internal");

/**
 * Runtime destination for the global "Order Online" / "Order Now" CTAs.
 *
 * Goes to our internal `/order` flow ONLY when the master flag is on AND the
 * internal branch is currently accepting orders (admin toggle →
 * locations.accepting_orders). Otherwise it falls back to the external locator —
 * exactly the pre-launch behaviour. Read UNCACHED (like the pause switch) so
 * flipping the admin toggle re-points every CTA on the very next request.
 */
export async function getOrderEntryHref(): Promise<string> {
  if (!flags.ordering || !INTERNAL_BRANCH) return EXTERNAL_ORDER_URL;
  const status = await getOrderingStatusBySlug(INTERNAL_BRANCH.slug);
  return status.accepting ? "/order" : EXTERNAL_ORDER_URL;
}
