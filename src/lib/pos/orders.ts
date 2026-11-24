import "server-only";
import { enqueueOrderEmail, STATUS_EMAIL } from "@/lib/ordering/notify";

import { getServiceClient } from "@/lib/supabase/clients";
import { LIVE_STATUSES, type Fulfilment, type OrderStatus } from "@/lib/ordering/constants";
import { recordOrderEvent } from "@/lib/ordering/events";
import { orderToPosJson, appStatusToBbc, forwardStatusPath } from "./mapping";
import { releaseCutoff } from "@/lib/ordering/scheduling";

// Only columns the database GUARANTEES. payment_method is required by
// migration 0035 and the ticket cannot be printed without it. Anything newer
// goes in OPTIONAL_COLS below and is fetched separately — see why there.
const ORDER_COLS =
  "id, code, payment_method, status, fulfilment, contact_name, contact_phone, total_pence, subtotal_pence, delivery_fee_pence, discount_pence, promo_code, notes, delivery_address, placed_at, created_at, printed_at, scheduled_for, prep_time_min, locations(name, address, phone), payments(method)";


/**
 * Columns that improve a ticket but are not needed to print one: the day's
 * number (0034), where the order came from and who took it (0036).
 *
 * Fetched in a second query that is allowed to fail. On 23 Nov 2026 these
 * were added to the main query before their migration had been run; Postgres
 * rejected every poll, the till received an empty list, and nothing printed
 * at Battersea all evening. A till must never stop printing because of a
 * column it does not strictly need.
 */
const OPTIONAL_COLS = "id, daily_seq, source, taken_by_name";

/** The live-orders query for a till. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ordersQuery(supabase: any, locationId: string, cols: string) {
  return supabase
    .from("orders")
    .select(cols)
    .eq("location_id", locationId)
    .in("status", LIVE_STATUSES)
    // A scheduled order is held back until an hour before its slot: a ticket
    // on the rail gets cooked, and food that waited two hours is worse than
    // none. ASAP orders have no slot and are unaffected.
    .or(`scheduled_for.is.null,scheduled_for.lte.${releaseCutoff()}`)
    .order("placed_at", { ascending: false })
    .limit(100);
}

export async function listLiveOrdersForPos(locationId: string): Promise<Record<string, unknown>[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const res = await ordersQuery(supabase, locationId, ORDER_COLS);
  if (res.error) {
    // Logged, not hidden: a till that stops printing must say why.
    console.error("[pos] could not read orders for the till", res.error);
    return [];
  }
  const orders = (res.data ?? []) as Record<string, unknown>[];
  if (!orders.length) return [];

  const ids = orders.map((o) => o.id as string);

  // The nice-to-have columns. If this fails the ticket prints without them.
  const extras = await supabase.from("orders").select(OPTIONAL_COLS).in("id", ids);
  if (extras.error) {
    console.error("[pos] optional order columns unavailable — run the latest migrations", extras.error.message);
  } else {
    const byId = new Map(((extras.data ?? []) as Record<string, unknown>[]).map((e) => [e.id as string, e]));
    for (const o of orders) Object.assign(o, byId.get(o.id as string) ?? {});
  }
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
  const { error } = await supabase.from("orders")
    .update({ printed_at: new Date().toISOString(), print_error: null, print_failed_at: null })
    .eq("id", orderId)
    .eq("location_id", locationId);
  if (error) return false;
  await recordOrderEvent(orderId, "POS_PRINTED", {});
  return true;
}

export async function markPrintFailed(orderId: string, locationId: string, error: string): Promise<boolean> {
  const supabase = getServiceClient();
  if (!supabase) return false;
  if (!(await orderAtLocation(orderId, locationId))) return false;
  const { error: updateError } = await supabase.from("orders")
    .update({ print_failed_at: new Date().toISOString(), print_error: error.slice(0, 300) })
    .eq("id", orderId)
    .eq("location_id", locationId);
  if (updateError) return false;
  await recordOrderEvent(orderId, "POS_PRINT_FAILED", { error: error.slice(0, 300) });
  return true;
}

/**
 * The Sunmi POS only has two buttons (ACCEPT / READY), but the BBC status
 * chain has intermediate states between them (e.g. accepted → preparing →
 * ready_for_collection). So a button press must auto-advance through any
 * legal intermediate hops rather than attempt a single illegal jump.
 */
export async function updateOrderStatusPos(orderId: string, locationId: string, appStatus: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable." };
  const cur = await orderAtLocation(orderId, locationId);
  if (!cur) return { ok: false, error: "Order not found." };

  const target = appStatusToBbc(appStatus, cur.fulfilment);
  if (!target) return { ok: false, error: "Unknown status." };
  if (target === cur.status) return { ok: true }; // idempotent no-op

  const path = forwardStatusPath(cur.status, target);
  if (!path) return { ok: false, error: `Can't move a ${cur.status} order to ${target}.` };

  let current = cur.status;
  for (const next of path) {
    const { data, error } = await supabase.from("orders")
      .update({ status: next })
      .eq("id", orderId)
      .eq("location_id", locationId)
      .eq("status", current)
      .select("id");
    if (error) return { ok: false, error: "Update failed." };
    if (!data || data.length === 0) return { ok: false, error: "Order changed — please refresh." };
    await recordOrderEvent(orderId, "POS_STATUS_CHANGED", { from: current, to: next, via: "pos" });
    // Tell the customer. Pressing READY on the terminal used to email nobody,
    // so whether a customer heard their food was ready depended on which
    // screen staff happened to use.
    const tmpl = STATUS_EMAIL[next];
    if (tmpl) await enqueueOrderEmail(orderId, tmpl);
    current = next;
  }
  return { ok: true };
}
