import "server-only";

import { flags, EXTERNAL_ORDER_URL } from "@/lib/flags";
import { BRANCHES } from "@/data/locations";
import { getOrderingStatusBySlug } from "@/lib/repositories/ordering-status";

/** Branches that take orders on our own flow — Balham, then Battersea. */
const INTERNAL_BRANCHES = BRANCHES.filter((b) => b.ordering.provider === "internal");

/**
 * Runtime destination for the global "Order Online" / "Order Now" CTAs.
 *
 * Goes to our internal `/order` flow when the master flag is on AND at least
 * one internal branch is currently accepting orders (admin toggle →
 * locations.accepting_orders). Otherwise it falls back to the external
 * locator — exactly the pre-launch behaviour.
 *
 * ANY branch, not the first one. With a single branch those were the same
 * thing; with two, pausing Balham for a busy Saturday would otherwise have
 * sent every customer on the site to the old Touch platform while Battersea
 * sat open and empty.
 *
 * Read UNCACHED (like the pause switch) so flipping the admin toggle
 * re-points every CTA on the very next request.
 */
export async function getOrderEntryHref(): Promise<string> {
  if (!flags.ordering || INTERNAL_BRANCHES.length === 0) return EXTERNAL_ORDER_URL;
  const statuses = await Promise.all(INTERNAL_BRANCHES.map((b) => getOrderingStatusBySlug(b.slug)));
  return statuses.some((s) => s.accepting) ? "/order" : EXTERNAL_ORDER_URL;
}
