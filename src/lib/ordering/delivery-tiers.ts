import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/** One distance band: everything up to and including `maxMiles` costs `feePence`. */
export type DeliveryTier = { maxMiles: number; feePence: number };

/**
 * The delivery bands, cheapest distance first. Shared by every branch (see
 * migration 0030). An empty list means none are configured — callers fall back
 * to the old per-mile rule so a missing migration can never stop deliveries.
 */
export async function listDeliveryTiers(): Promise<DeliveryTier[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("delivery_tiers")
    .select("max_miles, fee_pence")
    .order("max_miles", { ascending: true });
  if (error || !data) return [];
  return data
    .map((t) => ({ maxMiles: Number(t.max_miles), feePence: Number(t.fee_pence) }))
    .filter((t) => Number.isFinite(t.maxMiles) && Number.isFinite(t.feePence));
}

/**
 * Fee for a distance, or null when it falls outside every band — which means
 * "we do not deliver that far", not "free".
 *
 * Bands are inclusive upper bounds, so with 1 / 2 / 3 mile bands exactly 1.0
 * miles pays the 1-mile price, and 1.01 miles pays the 2-mile price.
 */
export function feeForMiles(miles: number, tiers: DeliveryTier[]): number | null {
  if (!tiers.length) return null;
  const m = Number.isFinite(miles) && miles > 0 ? miles : 0;
  for (const t of tiers) if (m <= t.maxMiles) return t.feePence;
  return null;
}

/** The furthest we deliver under the current bands, or null when none are set. */
export function maxDeliveryMiles(tiers: DeliveryTier[]): number | null {
  return tiers.length ? Math.max(...tiers.map((t) => t.maxMiles)) : null;
}
