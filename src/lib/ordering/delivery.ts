import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { outcodeOf, formatPostcode } from "./postcode";
import { geocodePostcode, distanceMiles } from "./geocode";
import { listDeliveryTiers, feeForMiles, maxDeliveryMiles } from "./delivery-tiers";

export type DeliveryCheck = {
  served: boolean;
  postcode?: string;
  outcode?: string;
  feePence?: number;
  minOrderPence?: number;
  etaMin?: number;
  /** Distance from the branch in miles (radius deliveries only). */
  distanceMiles?: number;
  /** Order subtotal (pence) at/above which delivery is free, if configured. */
  freeOverPence?: number | null;
  error?: string;
};

export type BranchSuggestion = {
  slug: string;
  name: string;
  feePence: number;
  minOrderPence: number;
  etaMin: number;
  outcode: string;
  servesExact: boolean;
  /** How far the branch actually is, when it could be measured. */
  distanceMiles?: number;
};

/**
 * Distance-tiered delivery fee: £1 per started mile (minimum £1). 0.4mi → £1,
 * 1.2mi → £2, 2.7mi → £3. The branch radius (delivery_radius_miles) caps how far
 * we deliver, so this naturally tops out at £<radius>. Used only in the radius
 * model where an actual distance is known; the flat delivery_fee_pence remains
 * the fallback when geocoding is unavailable or a branch has no coordinates.
 */
export const DELIVERY_PENCE_PER_MILE = 100;
export function deliveryFeeForMiles(miles: number): number {
  // Guard a degenerate distance (NaN/Infinity/negative) so we never emit a NaN
  // total — fall back to the £1 minimum tier. Callers only pass a served,
  // finite distance, so this is pure defence.
  const m = Number.isFinite(miles) && miles > 0 ? miles : 1;
  return Math.max(1, Math.ceil(m)) * DELIVERY_PENCE_PER_MILE;
}

type ZoneLoc = { slug: string; name: string; is_active: boolean; delivery_enabled: boolean; delivery_fee_pence: number; min_order_pence: number; prep_time_min: number; delivery_time_min: number };
const oneLoc = (j: unknown): ZoneLoc | null => { const x = j as ZoneLoc | ZoneLoc[] | null; return (Array.isArray(x) ? x[0] : x) ?? null; };

/**
 * Of the branches that can reach a postcode, which one should cook it.
 *
 * Pure, and exported, because this is the decision that sends food to the
 * right kitchen and charges the right delivery fee. It used to be made by
 * sorting on the flat delivery fee with distance never consulted.
 *
 * A branch qualifies only if the postcode is inside BOTH its own radius and
 * the furthest delivery band. Nearest then wins, and a cheaper fee breaks a
 * tie — at equal distance the customer should pay less.
 */
export function pickNearestBranch<T extends { miles: number; feePence: number; withinBands: boolean; radiusMiles: number }>(
  candidates: T[],
  bandLimitMiles: number | null,
): T | null {
  const limit = (c: T) => Math.min(c.radiusMiles, bandLimitMiles ?? Infinity);
  const reachable = candidates
    .filter((c) => c.withinBands && c.miles <= limit(c))
    .sort((a, b) => a.miles - b.miles || a.feePence - b.feePence);
  return reachable[0] ?? null;
}

type Candidate = {
  slug: string;
  name: string;
  min_order_pence: number;
  prep_time_min: number;
  delivery_time_min: number;
  delivery_fee_pence: number;
  latitude: number | null;
  longitude: number | null;
  delivery_radius_miles: number | null;
};

/**
 * Nearest branch that can actually deliver, by road-less straight-line miles.
 *
 * Returns null when nothing can be measured — no coordinates anywhere, or the
 * postcode could not be geocoded — so the caller can fall back.
 */
async function nearestByDistance(
  rawPostcode: string,
  outcode: string,
  supabase: NonNullable<ReturnType<typeof getServiceClient>>,
): Promise<BranchSuggestion | null> {
  const { data } = await supabase
    .from("locations")
    .select(
      "slug, name, min_order_pence, prep_time_min, delivery_time_min, delivery_fee_pence, latitude, longitude, delivery_radius_miles",
    )
    .eq("is_active", true)
    .eq("delivery_enabled", true);

  const mappable = ((data ?? []) as Candidate[]).filter(
    (l) => l.latitude != null && l.longitude != null && l.delivery_radius_miles != null,
  );
  if (mappable.length === 0) return null;

  const dest = await geocodePostcode(rawPostcode);
  if (!dest) return null;

  const tiers = await listDeliveryTiers();
  const bandLimit = maxDeliveryMiles(tiers);

  const best = pickNearestBranch(
    mappable.map((l) => {
      const miles = distanceMiles({ lat: l.latitude as number, lng: l.longitude as number }, dest);
      const tierFee = feeForMiles(miles, tiers);
      return {
        l,
        miles,
        feePence: tierFee ?? deliveryFeeForMiles(miles),
        withinBands: tiers.length === 0 || tierFee != null,
        radiusMiles: l.delivery_radius_miles as number,
      };
    }),
    bandLimit,
  );
  if (!best) return null;

  return {
    slug: best.l.slug,
    name: best.l.name,
    feePence: best.feePence,
    minOrderPence: best.l.min_order_pence,
    etaMin: best.l.prep_time_min + best.l.delivery_time_min,
    outcode,
    servesExact: true,
    distanceMiles: Math.round(best.miles * 10) / 10,
  };
}

/**
 * The branch that should take this postcode's order.
 *
 * Measured in miles, from each branch's own coordinates. This used to sort
 * candidate branches by their flat delivery fee and never look at distance at
 * all — which was harmless with one branch and wrong the moment there were
 * two: SW17 7LT is 1.1 miles from Balham and 2.4 from Battersea, both inside
 * the radius, and the customer was being sent to Battersea. That is £2 more
 * delivery, a longer wait, and the wrong kitchen cooking.
 *
 * Only branches that can genuinely serve the postcode are considered — inside
 * their radius AND inside a delivery band. Nearest wins; a cheaper fee breaks
 * a tie, because at equal distance the customer should pay less.
 *
 * Falls back to the old outcode-zone lookup when the postcode cannot be
 * geocoded or no branch has coordinates, so a postcodes.io outage degrades to
 * the previous behaviour instead of refusing every order.
 */
export async function suggestNearestBranch(rawPostcode: string): Promise<BranchSuggestion | null> {
  const outcode = outcodeOf(rawPostcode);
  if (!outcode) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;

  const byDistance = await nearestByDistance(rawPostcode, outcode, supabase);
  if (byDistance) return byDistance;

  const SEL = "outcode, locations!inner(slug, name, is_active, delivery_enabled, delivery_fee_pence, min_order_pence, prep_time_min, delivery_time_min)";
  const toSuggestion = (l: ZoneLoc, exact: boolean): BranchSuggestion => ({ slug: l.slug, name: l.name, feePence: l.delivery_fee_pence, minOrderPence: l.min_order_pence, etaMin: l.prep_time_min + l.delivery_time_min, outcode, servesExact: exact });

  // 1) Exact outcode coverage — cheapest delivery wins.
  const { data: exactZones } = await supabase.from("delivery_zones").select(SEL).eq("outcode", outcode).eq("is_active", true);
  const exact = (exactZones ?? []).map((z) => oneLoc(z.locations)).filter((l): l is ZoneLoc => Boolean(l && l.is_active && l.delivery_enabled)).sort((a, b) => a.delivery_fee_pence - b.delivery_fee_pence);
  if (exact[0]) return toSuggestion(exact[0], true);

  // 2) Same postcode area (letters prefix, e.g. "SW").
  const area = outcode.match(/^[A-Z]+/)?.[0];
  if (area) {
    const { data: areaZones } = await supabase.from("delivery_zones").select(SEL).ilike("outcode", `${area}%`).eq("is_active", true);
    const near = (areaZones ?? []).map((z) => oneLoc(z.locations)).filter((l): l is ZoneLoc => Boolean(l && l.is_active)).sort((a, b) => a.delivery_fee_pence - b.delivery_fee_pence);
    if (near[0]) return toSuggestion(near[0], false);
  }
  return null;
}

/**
 * Is a postcode within a location's delivery area?
 *
 * Radius model (preferred): when the branch has latitude/longitude and a
 * `delivery_radius_miles`, the customer postcode is geocoded (postcodes.io) and
 * served iff the great-circle distance is within the radius.
 *
 * Outcode model (fallback): if the branch has no coordinates, or geocoding is
 * transiently unavailable, we fall back to the `delivery_zones` outcode list so
 * nothing breaks. An invalid postcode is always rejected.
 *
 * Returns the fee / minimum / ETA (and, for radius, the distance + free-over
 * threshold) when served. The free-delivery threshold is applied against the
 * subtotal later, in priceCart.
 */
export async function checkDelivery(locationSlug: string, rawPostcode: string): Promise<DeliveryCheck> {
  const outcode = outcodeOf(rawPostcode);
  if (!outcode) return { served: false, error: "Please enter a valid UK postcode." };

  const supabase = getServiceClient();
  if (!supabase) return { served: false, error: "Delivery checks are temporarily unavailable." };

  const { data: loc } = await supabase
    .from("locations")
    .select("id, delivery_enabled, delivery_fee_pence, min_order_pence, prep_time_min, delivery_time_min, latitude, longitude, delivery_radius_miles, free_delivery_over_pence")
    .eq("slug", locationSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) return { served: false, error: "That location isn't available." };
  if (!loc.delivery_enabled) return { served: false, error: "This location doesn't offer delivery." };

  const feePence = loc.delivery_fee_pence as number;
  const minOrderPence = loc.min_order_pence as number;
  const etaMin = (loc.prep_time_min as number) + (loc.delivery_time_min as number);
  const freeOverPence = (loc.free_delivery_over_pence as number | null) ?? null;
  const lat = loc.latitude as number | null;
  const lng = loc.longitude as number | null;
  const radius = loc.delivery_radius_miles as number | null;

  // Radius model — branch has coordinates + a radius.
  if (lat != null && lng != null && radius != null) {
    const dest = await geocodePostcode(rawPostcode);
    if (dest) {
      const miles = distanceMiles({ lat, lng }, dest);
      const tiers = await listDeliveryTiers();
      // Distance bands (1 mile free, 2 miles £1.99, 3 miles £3.99 by default)
      // decide both the fee and how far we will go. Falling outside every band
      // means "too far", not "free". With no bands configured we keep the old
      // per-mile rule so a missing migration cannot stop deliveries.
      const tierFee = feeForMiles(miles, tiers);
      const bandLimit = maxDeliveryMiles(tiers);
      const limit = bandLimit != null ? Math.min(radius, bandLimit) : radius;
      const withinBands = tiers.length === 0 || tierFee != null;

      if (miles <= radius && withinBands) {
        return {
          served: true,
          postcode: formatPostcode(rawPostcode),
          outcode,
          feePence: tierFee ?? deliveryFeeForMiles(miles),
          minOrderPence,
          etaMin,
          distanceMiles: Math.round(miles * 10) / 10,
          freeOverPence,
        };
      }
      return {
        served: false,
        outcode,
        postcode: formatPostcode(rawPostcode),
        distanceMiles: Math.round(miles * 10) / 10,
        error: `Sorry — that's ${(Math.round(miles * 10) / 10).toFixed(1)} miles away, just outside our ${limit}-mile delivery area.`,
      };
    }
    // Geocode unavailable (API down). Fall through to the outcode check so a
    // transient outage doesn't block legitimate orders.
  }

  // Outcode model (fallback / branches without coordinates).
  const { data: zone } = await supabase
    .from("delivery_zones")
    .select("id")
    .eq("location_id", loc.id as string)
    .eq("outcode", outcode)
    .eq("is_active", true)
    .maybeSingle();

  if (!zone) {
    return { served: false, outcode, postcode: formatPostcode(rawPostcode), error: `Sorry, we don't deliver to ${outcode} from here yet.` };
  }

  return { served: true, postcode: formatPostcode(rawPostcode), outcode, feePence, minOrderPence, etaMin, freeOverPence };
}
