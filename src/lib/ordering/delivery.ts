import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { outcodeOf, formatPostcode } from "./postcode";

export type DeliveryCheck = {
  served: boolean;
  postcode?: string;
  outcode?: string;
  feePence?: number;
  minOrderPence?: number;
  etaMin?: number;
  error?: string;
};

export type BranchSuggestion = { slug: string; name: string; feePence: number; minOrderPence: number; etaMin: number; outcode: string; servesExact: boolean };

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
 * Is a postcode within a location's delivery area? Validates format, extracts
 * the outcode, and checks it against `delivery_zones`. Returns the fee/minimum/
 * ETA when served. Postcode-district (outcode) matching is the Phase 3 model;
 * true radius matching (geocode + distance) is a later enhancement.
 */
export async function checkDelivery(locationSlug: string, rawPostcode: string): Promise<DeliveryCheck> {
  const outcode = outcodeOf(rawPostcode);
  if (!outcode) return { served: false, error: "Please enter a valid UK postcode." };

  const supabase = getServiceClient();
  if (!supabase) return { served: false, error: "Delivery checks are temporarily unavailable." };

  const { data: loc } = await supabase
    .from("locations")
    .select("id, delivery_enabled, delivery_fee_pence, min_order_pence, prep_time_min, delivery_time_min")
    .eq("slug", locationSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!loc) return { served: false, error: "That location isn't available." };
  if (!loc.delivery_enabled) return { served: false, error: "This location doesn't offer delivery." };

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

  return {
    served: true,
    postcode: formatPostcode(rawPostcode),
    outcode,
    feePence: loc.delivery_fee_pence as number,
    minOrderPence: loc.min_order_pence as number,
    etaMin: (loc.prep_time_min as number) + (loc.delivery_time_min as number),
  };
}
