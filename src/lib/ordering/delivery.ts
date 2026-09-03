import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { outcodeOf, formatPostcode } from "./postcode";
import { geocodePostcode, distanceMiles } from "./geocode";

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

export type BranchSuggestion = { slug: string; name: string; feePence: number; minOrderPence: number; etaMin: number; outcode: string; servesExact: boolean };

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
 * Suggest the nearest branch for a postcode, using existing delivery zones only
 * (no geocoding): first a branch whose active zone covers the exact outcode
 * (cheapest delivery wins), else a branch serving the same postcode area (e.g.
 * "SW…"). Returns null when nothing is close. Future-proof for multi-branch.
 */
export async function suggestNearestBranch(rawPostcode: string): Promise<BranchSuggestion | null> {
  const outcode = outcodeOf(rawPostcode);
  if (!outcode) return null;
  const supabase = getServiceClient();
  if (!supabase) return null;

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
      if (miles <= radius) {
        return {
          served: true,
          postcode: formatPostcode(rawPostcode),
          outcode,
          // Distance-tiered: £1 per started mile (see deliveryFeeForMiles).
          feePence: deliveryFeeForMiles(miles),
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
        error: `Sorry — that's ${(Math.round(miles * 10) / 10).toFixed(1)} miles away, just outside our ${radius}-mile delivery area.`,
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
