import "server-only";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { LIVE_STATUSES, type OrderStatus, type Fulfilment } from "@/lib/ordering/constants";

export type OrderLine = {
  name: string;
  unitPence: number;
  qty: number;
  modifiers: { name: string; pricePence: number }[];
  lineTotalPence: number;
  notes: string | null;
};

export type Order = {
  id: string;
  code: string;
  locationId: string;
  fulfilment: Fulfilment;
  status: OrderStatus;
  subtotalPence: number;
  discountPence: number;
  deliveryFeePence: number;
  giftCardPence: number;
  totalPence: number;
  promoCode: string | null;
  deliveryAddress: Record<string, unknown> | null;
  prepTimeMin: number | null;
  scheduledFor: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  trackToken: string | null;
  placedAt: string | null;
  createdAt: string;
};

export type OrderDetail = Order & {
  items: OrderLine[];
  payment: { status: string; cardBrand: string | null; cardLast4: string | null; paymentIntent: string | null } | null;
};

const SELECT =
  "id, code, location_id, fulfilment, status, subtotal_pence, discount_pence, delivery_fee_pence, gift_card_pence, total_pence, promo_code, delivery_address, prep_time_min, scheduled_for, contact_name, contact_email, contact_phone, notes, track_token, placed_at, created_at";

function map(r: Record<string, unknown>): Order {
  return {
    id: r.id as string,
    code: r.code as string,
    locationId: r.location_id as string,
    fulfilment: r.fulfilment as Fulfilment,
    status: r.status as OrderStatus,
    subtotalPence: (r.subtotal_pence as number) ?? 0,
    discountPence: (r.discount_pence as number) ?? 0,
    deliveryFeePence: (r.delivery_fee_pence as number) ?? 0,
    giftCardPence: (r.gift_card_pence as number) ?? 0,
    totalPence: (r.total_pence as number) ?? 0,
    promoCode: (r.promo_code as string | null) ?? null,
    deliveryAddress: (r.delivery_address as Record<string, unknown> | null) ?? null,
    prepTimeMin: (r.prep_time_min as number | null) ?? null,
    scheduledFor: (r.scheduled_for as string | null) ?? null,
    contactName: (r.contact_name as string | null) ?? null,
    contactEmail: (r.contact_email as string | null) ?? null,
    contactPhone: (r.contact_phone as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    trackToken: (r.track_token as string | null) ?? null,
    placedAt: (r.placed_at as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

function mapItems(rows: Record<string, unknown>[] | null): OrderLine[] {
  return (rows ?? []).map((it) => ({
    name: it.name as string,
    unitPence: (it.unit_price_pence as number) ?? 0,
    qty: (it.qty as number) ?? 1,
    modifiers: ((it.modifiers as { name: string; price_delta_pence?: number; pricePence?: number }[] | null) ?? []).map((m) => ({
      name: m.name,
      pricePence: m.pricePence ?? m.price_delta_pence ?? 0,
    })),
    lineTotalPence: (it.line_total_pence as number) ?? 0,
    notes: (it.notes as string | null) ?? null,
  }));
}

/* ---- Admin reads (RLS: staff at location) ----------------------------- */

export async function listLiveOrders(locationId: string): Promise<OrderDetail[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select(`${SELECT}, order_items(name, unit_price_pence, qty, modifiers, line_total_pence, notes), payments(status, card_brand, card_last4, provider_payment_intent)`)
    .eq("location_id", locationId)
    .in("status", LIVE_STATUSES)
    .order("created_at", { ascending: true });
  return (data as Record<string, unknown>[] | null ?? []).map(toDetail);
}

export async function listOrders(
  locationId: string,
  opts: { statuses?: OrderStatus[]; limit?: number } = {},
): Promise<Order[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase.from("orders").select(SELECT).eq("location_id", locationId);
  if (opts.statuses?.length) q = q.in("status", opts.statuses);
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 100);
  return (data as Record<string, unknown>[] | null ?? []).map(map);
}

export async function getOrderAdmin(id: string): Promise<OrderDetail | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("orders")
    .select(`${SELECT}, order_items(name, unit_price_pence, qty, modifiers, line_total_pence, notes), payments(status, card_brand, card_last4, provider_payment_intent)`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return toDetail(data as Record<string, unknown>);
}

/* ---- Notification failures (dead-letter) for the dashboard alarm ------- */

export type NotificationFailure = { orderId: string; code: string; channel: string; lastError: string | null; attempts: number };

/**
 * Telegram/email notifications that hit the dead-letter (`failed`) for orders at
 * this location. Surfaced as a dashboard alarm so a paid order whose restaurant
 * notification couldn't be delivered is never silently missed. Uses the service
 * client (the outbox has no RLS policy) but scopes strictly by location.
 */
export async function listNotificationFailures(locationId: string): Promise<NotificationFailure[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("notifications")
    .select("channel, last_error, attempts, order_id, orders!inner(code, location_id)")
    .eq("status", "failed")
    .in("channel", ["telegram", "email"])
    .eq("orders.location_id", locationId)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data as Record<string, unknown>[] | null ?? []).map((r) => {
    const o = r.orders as { code: string } | { code: string }[] | null;
    const order = Array.isArray(o) ? o[0] : o;
    return {
      orderId: r.order_id as string,
      code: order?.code ?? "—",
      channel: r.channel as string,
      lastError: (r.last_error as string | null) ?? null,
      attempts: (r.attempts as number) ?? 0,
    };
  });
}

/* ---- Activity / behaviour log (admin observability) ------------------- */

export type ActivityOrder = Order & { items: OrderLine[]; abandoned: boolean };

/**
 * Recent orders at a location INCLUDING abandoned ones (never left
 * `pending_payment`). This is the "what did visitors put in their basket" feed:
 * a paid order is a sale; an abandoned one shows intent + where checkout dropped
 * off. Service client (we want every status), strictly scoped by location.
 */
export async function listRecentBaskets(locationId: string, limit = 40): Promise<ActivityOrder[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select(`${SELECT}, order_items(name, unit_price_pence, qty, modifiers, line_total_pence, notes)`)
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Record<string, unknown>[] | null ?? []).map((r) => {
    const o = map(r);
    return { ...o, items: mapItems(r.order_items as Record<string, unknown>[] | null), abandoned: o.status === "pending_payment" };
  });
}

export type ActivityEvent = { orderId: string; code: string; type: string; data: Record<string, unknown>; createdAt: string };

/**
 * Recent order-event audit trail at a location — the raw "log": ORDER_CREATED,
 * PAYMENT_CONFIRMED/FAILED/AMOUNT_MISMATCH, status changes, TELEGRAM_* sends.
 * Reading this top-to-bottom shows exactly what happened (and where it stalled,
 * e.g. many ORDER_CREATED with no PAYMENT_CONFIRMED = a broken webhook).
 */
export async function listRecentEvents(locationId: string, limit = 60): Promise<ActivityEvent[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("order_events")
    .select("type, data, created_at, order_id, orders!inner(code, location_id)")
    .eq("orders.location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Record<string, unknown>[] | null ?? []).map((r) => {
    const o = r.orders as { code: string } | { code: string }[] | null;
    const order = Array.isArray(o) ? o[0] : o;
    return {
      orderId: r.order_id as string,
      code: order?.code ?? "—",
      type: r.type as string,
      data: (r.data as Record<string, unknown> | null) ?? {},
      createdAt: r.created_at as string,
    };
  });
}

/* ---- Guest read by track token (service client) ----------------------- */

export async function getOrderByToken(token: string): Promise<OrderDetail | null> {
  const supabase = getServiceClient();
  if (!supabase || !token) return null;
  const { data } = await supabase
    .from("orders")
    .select(`${SELECT}, order_items(name, unit_price_pence, qty, modifiers, line_total_pence, notes), payments(status, card_brand, card_last4, provider_payment_intent), locations(name)`)
    .eq("track_token", token)
    .maybeSingle();
  if (!data) return null;
  return toDetail(data as Record<string, unknown>);
}

function toDetail(data: Record<string, unknown>): OrderDetail {
  const payments = (data.payments as Record<string, unknown>[] | null) ?? [];
  const p = payments[0];
  return {
    ...map(data),
    items: mapItems(data.order_items as Record<string, unknown>[] | null),
    payment: p
      ? {
          status: p.status as string,
          cardBrand: (p.card_brand as string | null) ?? null,
          cardLast4: (p.card_last4 as string | null) ?? null,
          paymentIntent: (p.provider_payment_intent as string | null) ?? null,
        }
      : null,
  };
}
