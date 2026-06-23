import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);

/**
 * Apply a stock change at a location and log it to the movement ledger.
 * Privileged (service client) — callers gate by role. Keeps `location_stock.qty`
 * as the maintained current with `stock_movements` as the append-only audit.
 */
export async function applyStockDelta(
  locationId: string,
  itemId: string,
  delta: number,
  kind: "receive" | "adjust" | "waste" | "transfer" | "correction",
  opts: { reason?: string | null; unitCostPence?: number | null; poId?: string | null; actorId?: string | null } = {},
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;

  const { data: existing } = await supabase.from("location_stock").select("qty").eq("location_id", locationId).eq("item_id", itemId).maybeSingle();
  const newQty = num(existing?.qty) + delta;
  if (existing) {
    await supabase.from("location_stock").update({ qty: newQty }).eq("location_id", locationId).eq("item_id", itemId);
  } else {
    await supabase.from("location_stock").insert({ location_id: locationId, item_id: itemId, qty: newQty });
  }

  await supabase.from("stock_movements").insert({
    location_id: locationId,
    item_id: itemId,
    delta,
    kind,
    reason: opts.reason ?? null,
    unit_cost_pence: opts.unitCostPence ?? null,
    po_id: opts.poId ?? null,
    actor_id: opts.actorId ?? null,
  });
}
