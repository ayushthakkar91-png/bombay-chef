import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import type { DayHours } from "@/lib/ordering/hours";

/**
 * A branch's online-ordering hours.
 *
 * Read uncached, like the pause switch: this decides whether an order is taken
 * at all, and a stale minute at closing time is an order the kitchen has gone
 * home from. It is one small indexed query against fourteen rows.
 *
 * An empty result means no hours are configured, and callers treat that as
 * "always open" — a branch whose hours were never set must not silently stop
 * trading.
 */
export async function getOrderingHours(locationId: string): Promise<DayHours[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("location_ordering_hours")
    .select("weekday, fulfilment, opens_at, closes_at, is_open")
    .eq("location_id", locationId);

  return (data ?? []).map((r) => ({
    weekday: r.weekday as number,
    fulfilment: r.fulfilment as "collection" | "delivery",
    // Postgres hands back "17:30:00"; the rules only read hours and minutes.
    opensAt: String(r.opens_at).slice(0, 5),
    closesAt: String(r.closes_at).slice(0, 5),
    isOpen: r.is_open as boolean,
  }));
}

/** Hours for every branch at once, for the admin screen. */
export async function getAllOrderingHours(): Promise<Record<string, DayHours[]>> {
  const supabase = getServiceClient();
  if (!supabase) return {};

  const { data } = await supabase
    .from("location_ordering_hours")
    .select("location_id, weekday, fulfilment, opens_at, closes_at, is_open");

  const out: Record<string, DayHours[]> = {};
  for (const r of data ?? []) {
    const id = r.location_id as string;
    (out[id] ??= []).push({
      weekday: r.weekday as number,
      fulfilment: r.fulfilment as "collection" | "delivery",
      opensAt: String(r.opens_at).slice(0, 5),
      closesAt: String(r.closes_at).slice(0, 5),
      isOpen: r.is_open as boolean,
    });
  }
  return out;
}
