import { flags, EXTERNAL_ORDER_URL } from "@/lib/flags";
import type { Branch } from "@/data/locations";
import { branchBySlug } from "@/data/locations";

/**
 * Single source of truth for where "Order Online" goes, per branch.
 *
 * A branch orders on our own system only when BOTH the master ordering flag is on
 * AND that branch's provider is `internal`. Every other case routes to the
 * external platform. Server routes and actions gate on `isInternalOrdering` so a
 * hand-typed `?loc=<external-branch>` can never reach checkout.
 */

/** True only when this branch takes orders on our own flow right now. */
export function isInternalOrdering(slug: string): boolean {
  if (!flags.ordering) return false;
  return branchBySlug(slug)?.ordering.provider === "internal";
}

/** Resolve the Order-Online destination for a specific branch. */
export function orderHrefFor(branch: Branch): { href: string; external: boolean } {
  if (flags.ordering && branch.ordering.provider === "internal") {
    return { href: `/order/menu?loc=${branch.slug}`, external: false };
  }
  return { href: branch.ordering.externalUrl ?? EXTERNAL_ORDER_URL, external: true };
}
