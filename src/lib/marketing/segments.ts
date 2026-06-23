import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

/**
 * Recompute segment membership from behaviour. Segments (seeded in 0008):
 * new (<1 order), returning (>=2), high_value (>=£150 lifetime), inactive
 * (last order >90d), delivery-leaning, dine_in (has a reservation). Run nightly
 * by the marketing cron. Service-client (reads across all customers).
 */

const INACTIVE_DAYS = 90;
const HIGH_VALUE_PENCE = 15000;
const REAL_ORDER = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);

type Agg = { real: number; spend: number; lastOrder: number; delivery: number; collection: number; hasRes: boolean };

export async function recomputeSegments(): Promise<{ updated: Record<string, number> }> {
  const supabase = getServiceClient();
  if (!supabase) return { updated: {} };

  const [{ data: customers }, { data: orders }, { data: reservations }] = await Promise.all([
    supabase.from("customers").select("id"),
    supabase.from("orders").select("customer_id, status, total_pence, placed_at, fulfilment").not("customer_id", "is", null),
    supabase.from("reservations").select("customer_id, status").not("customer_id", "is", null),
  ]);

  const agg = new Map<string, Agg>();
  const at = (id: string): Agg => {
    let a = agg.get(id);
    if (!a) { a = { real: 0, spend: 0, lastOrder: 0, delivery: 0, collection: 0, hasRes: false }; agg.set(id, a); }
    return a;
  };

  for (const o of orders ?? []) {
    if (!REAL_ORDER.has(o.status as string)) continue;
    const a = at(o.customer_id as string);
    a.real++;
    a.spend += (o.total_pence as number) ?? 0;
    const t = o.placed_at ? new Date(o.placed_at as string).getTime() : 0;
    if (t > a.lastOrder) a.lastOrder = t;
    if (o.fulfilment === "delivery") a.delivery++; else a.collection++;
  }
  for (const r of reservations ?? []) {
    if (r.status === "cancelled" || r.status === "no_show") continue;
    at(r.customer_id as string).hasRes = true;
  }

  const now = Date.now();
  const inactiveCut = now - INACTIVE_DAYS * 86400000;
  const members: Record<string, string[]> = { new: [], returning: [], high_value: [], inactive: [], delivery: [], dine_in: [] };

  for (const c of customers ?? []) {
    const a = agg.get(c.id as string) ?? { real: 0, spend: 0, lastOrder: 0, delivery: 0, collection: 0, hasRes: false };
    const id = c.id as string;
    if (a.real === 0) members.new.push(id);
    if (a.real >= 2) members.returning.push(id);
    if (a.spend >= HIGH_VALUE_PENCE) members.high_value.push(id);
    if (a.real >= 1 && a.lastOrder > 0 && a.lastOrder < inactiveCut) members.inactive.push(id);
    if (a.real >= 1 && a.delivery > 0 && a.delivery >= a.collection) members.delivery.push(id);
    if (a.hasRes) members.dine_in.push(id);
  }

  const updated: Record<string, number> = {};
  for (const [seg, ids] of Object.entries(members)) {
    await supabase.from("segment_members").delete().eq("segment_id", seg);
    for (let i = 0; i < ids.length; i += 500) {
      await supabase.from("segment_members").insert(ids.slice(i, i + 500).map((id) => ({ segment_id: seg, customer_id: id })));
    }
    updated[seg] = ids.length;
  }
  return { updated };
}
