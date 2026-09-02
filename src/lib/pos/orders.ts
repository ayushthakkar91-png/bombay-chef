import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { LIVE_STATUSES, ORDER_TRANSITIONS, type Fulfilment, type OrderStatus } from "@/lib/ordering/constants";
import { recordOrderEvent } from "@/lib/ordering/events";
import { orderToPosJson, appStatusToBbc } from "./mapping";

const ORDER_COLS =
  "id, code, status, fulfilment, contact_name, total_pence, subtotal_pence, delivery_fee_pence, discount_pence, promo_code, notes, delivery_address, placed_at, created_at, printed_at";

export async function listLiveOrdersForPos(locationId: string): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data: orders } = await supabase
    .from("orders")
    .select(ORDER_COLS)
    .eq("location_id", locationId)
    .in("status", LIVE_STATUSES)
    .order("placed_at", { ascending: false })
    .limit(100);
  if (!orders?.length) return [];

  const ids = orders.map((o) => o.id as string);
  const { data: items } = await supabase
    .from("order_items")
    .select("order_id, name, qty, line_total_pence, notes, modifiers")
    .in("order_id", ids);

  const byOrder = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const arr = byOrder.get(it.order_id as string) ?? [];
    arr.push(it);
    byOrder.set(it.order_id as string, arr);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return orders.map((o: any) => orderToPosJson(o, (byOrder.get(o.id) ?? []) as any));
}

/** Confirm the order is at this location before any POS write (auth already
 *  proved the caller is staff for this location). */
async function orderAtLocation(orderId: string, locationId: string): Promise<{ status: OrderStatus; fulfilment: Fulfilment } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("orders").select("status, fulfilment").eq("id", orderId).eq("location_id", locationId).maybeSingle();
  return data ? { status: data.status as OrderStatus, fulfilment: data.fulfilment as Fulfilment } : null;
}

export async function markPrinted(orderId: string, locationId: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  if (!(await orderAtLocation(orderId, locationId))) return false;
  await supabase.from("orders").update({ printed_at: new Date().toISOString(), print_error: null }).eq("id", orderId);
  await recordOrderEvent(orderId, "POS_PRINTED", {});
  return true;
}

export async function markPrintFailed(orderId: string, locationId: string, error: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  if (!(await orderAtLocation(orderId, locationId))) return false;
  await supabase.from("orders")
    .update({ print_failed_at: new Date().toISOString(), print_error: error.slice(0, 300) })
    .eq("id", orderId);
  await recordOrderEvent(orderId, "POS_PRINT_FAILED", { error: error.slice(0, 300) });
  return true;
}

export async function updateOrderStatusPos(orderId: string, locationId: string, appStatus: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };
  const cur = await orderAtLocation(orderId, locationId);
  if (!cur) return { ok: false, error: "Order not found." };

  const target = appStatusToBbc(appStatus, cur.fulfilment);
  if (!target) return { ok: false, error: "Unknown status." };
  if (!ORDER_TRANSITIONS[cur.status]?.includes(target)) {
    return { ok: false, error: `Can't move a ${cur.status} order to ${target}.` };
  }
  const { error } = await supabase.from("orders").update({ status: target }).eq("id", orderId).eq("status", cur.status);
  if (error) return { ok: false, error: "Update failed." };
  await recordOrderEvent(orderId, "POS_STATUS_CHANGED", { from: cur.status, to: target, via: "pos" });
  return { ok: true };
}
