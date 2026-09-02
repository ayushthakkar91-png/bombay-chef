import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/**
 * Live "are we accepting online orders" switch, read UNCACHED so an admin toggle
 * takes effect immediately (unlike the 5-min-cached menu). Default: accepting,
 * so a missing row / unconfigured DB never silently blocks ordering.
 */
export type OrderingStatus = { accepting: boolean; message: string | null };

const DEFAULT: OrderingStatus = { accepting: true, message: null };

function shape(data: { accepting_orders?: boolean | null; ordering_pause_message?: string | null } | null): OrderingStatus {
  if (!data) return DEFAULT;
  return { accepting: data.accepting_orders ?? true, message: data.ordering_pause_message ?? null };
}

export async function getOrderingStatusBySlug(slug: string): Promise<OrderingStatus> {
  const supabase = getServiceClient();
  if (!supabase) return DEFAULT;
  const { data } = await supabase
    .from("locations")
    .select("accepting_orders, ordering_pause_message")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return shape(data);
}

export async function getOrderingStatusById(locationId: string): Promise<OrderingStatus> {
  const supabase = getServiceClient();
  if (!supabase) return DEFAULT;
  const { data } = await supabase
    .from("locations")
    .select("accepting_orders, ordering_pause_message")
    .eq("id", locationId)
    .maybeSingle();
  return shape(data);
}
