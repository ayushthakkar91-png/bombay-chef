import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { londonDay, dayBuckets } from "./range";
import type { OrderStatus } from "@/lib/ordering/constants";

/**
 * Read-only reporting aggregates over existing data. Service client (full,
 * cross-location); pages gate to restaurant_manager. Aggregation is done in JS
 * over date-scoped fetches — fine at a restaurant's data scale; materialised SQL
 * views are the scale-up path.
 */

const REVENUE_STATUSES: OrderStatus[] = ["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"];
const REV = new Set<string>(REVENUE_STATUSES);

type Range = { fromISO: string; toISO: string };

async function locationNames(): Promise<Map<string, string>> {
  const supabase = getServiceClient();
  const m = new Map<string, string>();
  if (!supabase) return m;
  const { data } = await supabase.from("locations").select("id, name");
  for (const l of data ?? []) m.set(l.id as string, l.name as string);
  return m;
}

/* ---- Sales ------------------------------------------------------------ */

export type SalesReport = {
  revenuePence: number;
  orders: number;
  aovPence: number;
  refundedCount: number;
  refundedPence: number;
  byDay: { label: string; value: number }[];
  ordersByDay: { label: string; value: number }[];
  fulfilment: { label: string; value: number }[];
  byStatus: { label: string; value: number }[];
  byLocation: { label: string; value: number; sub?: string }[];
};

export async function getSalesReport(range: Range, locationId?: string): Promise<SalesReport> {
  const supabase = getServiceClient();
  const empty: SalesReport = { revenuePence: 0, orders: 0, aovPence: 0, refundedCount: 0, refundedPence: 0, byDay: [], ordersByDay: [], fulfilment: [], byStatus: [], byLocation: [] };
  if (!supabase) return empty;

  let q = supabase
    .from("orders")
    .select("status, total_pence, fulfilment, location_id, placed_at")
    .not("placed_at", "is", null)
    .gte("placed_at", range.fromISO)
    .lt("placed_at", range.toISO)
    .limit(20000);
  if (locationId) q = q.eq("location_id", locationId);
  const { data: orders } = await q;

  const locs = await locationNames();
  const days = dayBuckets(range.fromISO, range.toISO);
  const revByDay = new Map<string, number>();
  const ordByDay = new Map<string, number>();
  const byLoc = new Map<string, { rev: number; ord: number }>();
  const statusCount = new Map<string, number>();
  let revenue = 0, count = 0, collection = 0, delivery = 0, refundedCount = 0, refundedPence = 0;

  for (const o of orders ?? []) {
    const status = o.status as string;
    statusCount.set(status, (statusCount.get(status) ?? 0) + 1);
    if (status === "refunded") { refundedCount++; refundedPence += (o.total_pence as number) ?? 0; continue; }
    if (!REV.has(status)) continue;
    const total = (o.total_pence as number) ?? 0;
    revenue += total; count++;
    if (o.fulfilment === "delivery") delivery++; else collection++;
    const day = londonDay(o.placed_at as string);
    revByDay.set(day, (revByDay.get(day) ?? 0) + total);
    ordByDay.set(day, (ordByDay.get(day) ?? 0) + 1);
    const lid = o.location_id as string;
    const l = byLoc.get(lid) ?? { rev: 0, ord: 0 };
    l.rev += total; l.ord++; byLoc.set(lid, l);
  }

  const dayLabel = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));

  return {
    revenuePence: revenue,
    orders: count,
    aovPence: count ? Math.round(revenue / count) : 0,
    refundedCount,
    refundedPence,
    byDay: days.map((d) => ({ label: dayLabel(d), value: revByDay.get(d) ?? 0 })),
    ordersByDay: days.map((d) => ({ label: dayLabel(d), value: ordByDay.get(d) ?? 0 })),
    fulfilment: [{ label: "Collection", value: collection }, { label: "Delivery", value: delivery }],
    byStatus: [...statusCount.entries()].map(([label, value]) => ({ label: label.replace(/_/g, " "), value })),
    byLocation: [...byLoc.entries()].map(([id, v]) => ({ label: locs.get(id) ?? id, value: v.rev, sub: `${v.ord} orders` })).sort((a, b) => b.value - a.value),
  };
}

/* ---- Reservations ----------------------------------------------------- */

export type ReservationsReport = {
  bookings: number;
  covers: number;
  noShowRate: number;
  cancelledRate: number;
  byDay: { label: string; value: number }[];
  byOccasion: { label: string; value: number }[];
  byLocation: { label: string; value: number; sub?: string }[];
};

export async function getReservationsReport(range: Range, locationId?: string): Promise<ReservationsReport> {
  const supabase = getServiceClient();
  const empty: ReservationsReport = { bookings: 0, covers: 0, noShowRate: 0, cancelledRate: 0, byDay: [], byOccasion: [], byLocation: [] };
  if (!supabase) return empty;

  let q = supabase.from("reservations").select("status, party_size, occasion, location_id, starts_at").gte("starts_at", range.fromISO).lt("starts_at", range.toISO).limit(20000);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;

  const locs = await locationNames();
  const days = dayBuckets(range.fromISO, range.toISO);
  const byDay = new Map<string, number>();
  const occ = new Map<string, number>();
  const byLoc = new Map<string, { b: number; c: number }>();
  let bookings = 0, covers = 0, noShow = 0, cancelled = 0, total = 0;

  for (const r of data ?? []) {
    total++;
    const status = r.status as string;
    if (status === "no_show") noShow++;
    if (status === "cancelled") { cancelled++; continue; }
    bookings++;
    covers += (r.party_size as number) ?? 0;
    byDay.set(londonDay(r.starts_at as string), (byDay.get(londonDay(r.starts_at as string)) ?? 0) + 1);
    if (r.occasion) occ.set(r.occasion as string, (occ.get(r.occasion as string) ?? 0) + 1);
    const l = byLoc.get(r.location_id as string) ?? { b: 0, c: 0 };
    l.b++; l.c += (r.party_size as number) ?? 0; byLoc.set(r.location_id as string, l);
  }

  const dayLabel = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));
  return {
    bookings,
    covers,
    noShowRate: total ? Math.round((noShow / total) * 100) : 0,
    cancelledRate: total ? Math.round((cancelled / total) * 100) : 0,
    byDay: days.map((d) => ({ label: dayLabel(d), value: byDay.get(d) ?? 0 })),
    byOccasion: [...occ.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value),
    byLocation: [...byLoc.entries()].map(([id, v]) => ({ label: locs.get(id) ?? id, value: v.b, sub: `${v.c} covers` })).sort((a, b) => b.value - a.value),
  };
}

/* ---- Top dishes ------------------------------------------------------- */

export async function getTopDishes(range: Range, locationId?: string): Promise<{ label: string; value: number; sub?: string }[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  let q = supabase
    .from("order_items")
    .select("name, qty, line_total_pence, orders!inner(placed_at, status, location_id)")
    .not("orders.placed_at", "is", null)
    .gte("orders.placed_at", range.fromISO)
    .lt("orders.placed_at", range.toISO)
    .limit(50000);
  if (locationId) q = q.eq("orders.location_id", locationId);
  const { data } = await q;

  const agg = new Map<string, { qty: number; rev: number }>();
  for (const it of data ?? []) {
    const o = (Array.isArray(it.orders) ? it.orders[0] : it.orders) as { status?: string } | null;
    if (!o || !REV.has(o.status ?? "")) continue;
    const a = agg.get(it.name as string) ?? { qty: 0, rev: 0 };
    a.qty += (it.qty as number) ?? 0;
    a.rev += (it.line_total_pence as number) ?? 0;
    agg.set(it.name as string, a);
  }
  return [...agg.entries()]
    .map(([label, v]) => ({ label, value: v.qty, sub: `£${(v.rev / 100).toFixed(0)}` }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
}

/* ---- Customers (new vs returning, CLV, retention) --------------------- */

export type CustomersReport = {
  total: number;
  newInRange: number;
  orderingCustomers: number;
  repeatRate: number;
  clvAvgPence: number;
  topCustomers: { label: string; value: number; sub?: string }[];
  acquisitionByDay: { label: string; value: number }[];
};

export async function getCustomersReport(range: Range): Promise<CustomersReport> {
  const supabase = getServiceClient();
  const empty: CustomersReport = { total: 0, newInRange: 0, orderingCustomers: 0, repeatRate: 0, clvAvgPence: 0, topCustomers: [], acquisitionByDay: [] };
  if (!supabase) return empty;

  const [{ data: profiles }, { data: orders }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, created_at").eq("type", "customer").limit(50000),
    supabase.from("orders").select("customer_id, total_pence, status, placed_at").not("customer_id", "is", null).limit(50000),
  ]);

  const days = dayBuckets(range.fromISO, range.toISO);
  const acq = new Map<string, number>();
  let newInRange = 0;
  const nameById = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameById.set(p.id as string, (p.full_name as string) ?? "Customer");
    const created = p.created_at as string;
    if (created >= range.fromISO && created < range.toISO) {
      newInRange++;
      acq.set(londonDay(created), (acq.get(londonDay(created)) ?? 0) + 1);
    }
  }

  const spend = new Map<string, { total: number; count: number }>();
  for (const o of orders ?? []) {
    if (!REV.has(o.status as string)) continue;
    const id = o.customer_id as string;
    const s = spend.get(id) ?? { total: 0, count: 0 };
    s.total += (o.total_pence as number) ?? 0; s.count++; spend.set(id, s);
  }
  const orderingCustomers = spend.size;
  const repeat = [...spend.values()].filter((s) => s.count >= 2).length;
  const totalSpend = [...spend.values()].reduce((a, s) => a + s.total, 0);

  const dayLabel = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));
  return {
    total: profiles?.length ?? 0,
    newInRange,
    orderingCustomers,
    repeatRate: orderingCustomers ? Math.round((repeat / orderingCustomers) * 100) : 0,
    clvAvgPence: orderingCustomers ? Math.round(totalSpend / orderingCustomers) : 0,
    topCustomers: [...spend.entries()]
      .map(([id, s]) => ({ label: nameById.get(id) ?? "Customer", value: s.total, sub: `${s.count} orders` }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10),
    acquisitionByDay: days.map((d) => ({ label: dayLabel(d), value: acq.get(d) ?? 0 })),
  };
}

/* ---- Marketing -------------------------------------------------------- */

export async function getMarketingReport(): Promise<{ subscribed: number; unsubscribed: number; campaigns: { name: string; recipients: number; sentAt: string | null }[]; segments: { label: string; value: number }[] }> {
  const supabase = getServiceClient();
  if (!supabase) return { subscribed: 0, unsubscribed: 0, campaigns: [], segments: [] };
  const [{ count: subscribed }, { count: unsubscribed }, { data: campaigns }, { data: segs }] = await Promise.all([
    supabase.from("marketing_contacts").select("id", { count: "exact", head: true }).eq("consent", true),
    supabase.from("marketing_contacts").select("id", { count: "exact", head: true }).eq("consent", false),
    supabase.from("campaigns").select("name, recipients, sent_at, status").eq("status", "sent").order("sent_at", { ascending: false }).limit(10),
    supabase.from("customer_segments").select("id, name"),
  ]);
  const segments: { label: string; value: number }[] = [];
  for (const s of segs ?? []) {
    const { count } = await supabase.from("segment_members").select("customer_id", { count: "exact", head: true }).eq("segment_id", s.id);
    segments.push({ label: s.name as string, value: count ?? 0 });
  }
  return {
    subscribed: subscribed ?? 0,
    unsubscribed: unsubscribed ?? 0,
    campaigns: (campaigns ?? []).map((c) => ({ name: c.name as string, recipients: (c.recipients as number) ?? 0, sentAt: (c.sent_at as string | null) ?? null })),
    segments,
  };
}

/* ---- Loyalty ---------------------------------------------------------- */

export async function getLoyaltyReport(range: Range): Promise<{ issued: number; redeemed: number; net: number; activeVouchers: number; tiers: { label: string; value: number }[] }> {
  const supabase = getServiceClient();
  if (!supabase) return { issued: 0, redeemed: 0, net: 0, activeVouchers: 0, tiers: [] };
  const [{ data: ledger }, { data: accounts }, { count: vouchers }] = await Promise.all([
    supabase.from("loyalty_ledger").select("delta, reason, created_at").gte("created_at", range.fromISO).lt("created_at", range.toISO).limit(50000),
    supabase.from("loyalty_accounts").select("tier"),
    supabase.from("promo_codes").select("id", { count: "exact", head: true }).not("customer_id", "is", null).eq("is_active", true),
  ]);
  let issued = 0, redeemed = 0;
  for (const l of ledger ?? []) {
    const d = (l.delta as number) ?? 0;
    if (d > 0) issued += d; else redeemed += -d;
  }
  const tierCount = new Map<string, number>();
  for (const a of accounts ?? []) tierCount.set(a.tier as string, (tierCount.get(a.tier as string) ?? 0) + 1);
  const order = ["bronze", "silver", "gold", "vip"];
  return {
    issued,
    redeemed,
    net: issued - redeemed,
    activeVouchers: vouchers ?? 0,
    tiers: order.filter((t) => tierCount.has(t)).map((t) => ({ label: t[0].toUpperCase() + t.slice(1), value: tierCount.get(t) ?? 0 })),
  };
}
