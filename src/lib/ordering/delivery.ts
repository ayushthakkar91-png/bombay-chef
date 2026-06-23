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
