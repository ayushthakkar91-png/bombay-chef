import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { dateTimeToInstant, londonDateISO } from "@/lib/reservations/time";
import { londonDay, dayBuckets } from "@/lib/reports/range";

const REV = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);
const num = (v: unknown): number => Number(v ?? 0);

export type ActivityItem = { kind: "order" | "reservation" | "giftcard" | "loyalty"; title: string; detail: string; at: string; status?: string };

export type DashboardData = {
  todayRevenuePence: number; todayOrders: number; todayReservations: number; todayCovers: number;
  monthRevenuePence: number; returningCustomers: number; loyaltyMembers: number; giftCardSalesPence: number;
  revenueByDay: { label: string; value: number }[];
  activity: ActivityItem[];
};

/** Lightweight recent-activity feed for the header notifications bell. */
export async function listRecentActivity(nowMs: number, limit = 15): Promise<ActivityItem[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const since = new Date(nowMs - 3 * 86400000).toISOString();

  const [orders, reservations, giftCards, redemptions] = await Promise.all([
    supabase.from("orders").select("code, total_pence, contact_name, status, placed_at").not("placed_at", "is", null).gte("placed_at", since).order("placed_at", { ascending: false }).limit(10),
    supabase.from("reservations").select("guest_name, party_size, status, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10),
    supabase.from("gift_cards").select("code, initial_pence, recipient_name, status, created_at").gte("created_at", since).neq("status", "pending").order("created_at", { ascending: false }).limit(6),
    supabase.from("loyalty_ledger").select("delta, customer_id, created_at").eq("reason", "redeem").gte("created_at", since).order("created_at", { ascending: false }).limit(6),
  ]);

  const names = new Map<string, string>();
  const ids = [...new Set((redemptions.data ?? []).map((r) => r.customer_id as string))];
  if (ids.length) { const { data } = await supabase.from("profiles").select("id, full_name").in("id", ids); for (const p of data ?? []) names.set(p.id as string, (p.full_name as string) ?? "Member"); }

  const out: ActivityItem[] = [];
  for (const o of orders.data ?? []) out.push({ kind: "order", title: `New order ${o.code}`, detail: `£${(num(o.total_pence) / 100).toFixed(2)} · ${(o.contact_name as string) ?? "Guest"}`, at: o.placed_at as string, status: o.status as string });
  for (const r of reservations.data ?? []) out.push({ kind: "reservation", title: `New booking · ${(r.guest_name as string) ?? "Guest"}`, detail: `Party of ${num(r.party_size)}`, at: r.created_at as string, status: r.status as string });
  for (const g of giftCards.data ?? []) out.push({ kind: "giftcard", title: `Gift card ${g.code}`, detail: `£${(num(g.initial_pence) / 100).toFixed(0)} purchased`, at: g.created_at as string });
  for (const r of redemptions.data ?? []) out.push({ kind: "loyalty", title: "Reward redeemed", detail: `${Math.abs(num(r.delta))} pts · ${names.get(r.customer_id as string) ?? "Member"}`, at: r.created_at as string });
  out.sort((a, b) => b.at.localeCompare(a.at));
  return out.slice(0, limit);
}

export async function getDashboardData(nowMs: number): Promise<DashboardData> {
  const supabase = getServiceClient();
  const empty: DashboardData = { todayRevenuePence: 0, todayOrders: 0, todayReservations: 0, todayCovers: 0, monthRevenuePence: 0, returningCustomers: 0, loyaltyMembers: 0, giftCardSalesPence: 0, revenueByDay: [], activity: [] };
  if (!supabase) return empty;

  const todayISO = londonDateISO(new Date(nowMs));
  const todayStart = dateTimeToInstant(todayISO, 0, 0);
  const tomorrow = new Date(todayStart); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(nowMs - 30 * 86400000);

  const [orders, reservations, giftCards, redemptions, returningRes, loyaltyRes, gcSalesRes] = await Promise.all([
    supabase.from("orders").select("status, total_pence, placed_at, code, contact_name").not("placed_at", "is", null).gte("placed_at", monthStart.toISOString()).limit(20000),
    supabase.from("reservations").select("party_size, status, starts_at, guest_name, created_at").gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }).limit(400),
    supabase.from("gift_cards").select("initial_pence, status, recipient_name, code, created_at").gte("created_at", monthStart.toISOString()).order("created_at", { ascending: false }).limit(50),
    supabase.from("loyalty_ledger").select("delta, reason, customer_id, created_at").eq("reason", "redeem").order("created_at", { ascending: false }).limit(8),
    supabase.from("customers").select("id", { count: "exact", head: true }).gte("orders_count", 2),
    supabase.from("customers").select("id", { count: "exact", head: true }).eq("loyalty_opt_in", true),
    supabase.from("gift_cards").select("initial_pence").in("status", ["active", "redeemed"]).limit(20000),
  ]);

  // Orders → today + month + 30-day series.
  const revByDay = new Map<string, number>();
  let todayRevenue = 0, todayOrders = 0, monthRevenue = 0;
  const recentOrders = [...(orders.data ?? [])].sort((a, b) => (b.placed_at as string).localeCompare(a.placed_at as string)).slice(0, 8);
  for (const o of orders.data ?? []) {
    if (!REV.has(o.status as string)) continue;
    const total = num(o.total_pence);
    monthRevenue += total;
    revByDay.set(londonDay(o.placed_at as string), (revByDay.get(londonDay(o.placed_at as string)) ?? 0) + total);
    if ((o.placed_at as string) >= todayStart.toISOString()) { todayRevenue += total; todayOrders++; }
  }
  const days = dayBuckets(monthStart.toISOString(), tomorrow.toISOString());
  const dayLabel = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));
  const revenueByDay = days.map((d) => ({ label: dayLabel(d), value: revByDay.get(d) ?? 0 }));

  // Reservations → today.
  let todayReservations = 0, todayCovers = 0;
  for (const r of reservations.data ?? []) {
    const sa = r.starts_at as string;
    if (sa >= todayStart.toISOString() && sa < tomorrow.toISOString() && r.status !== "cancelled" && r.status !== "no_show") { todayReservations++; todayCovers += num(r.party_size); }
  }

  // Loyalty redemption names.
  const redIds = [...new Set((redemptions.data ?? []).map((r) => r.customer_id as string))];
  const names = new Map<string, string>();
  if (redIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", redIds);
    for (const p of profs ?? []) names.set(p.id as string, (p.full_name as string) ?? "Member");
  }

  // Activity feed.
  const activity: ActivityItem[] = [];
  for (const o of recentOrders) activity.push({ kind: "order", title: `Order ${o.code}`, detail: `£${(num(o.total_pence) / 100).toFixed(2)} · ${(o.contact_name as string) ?? "Guest"}`, at: o.placed_at as string, status: o.status as string });
  for (const r of (reservations.data ?? []).slice(0, 8)) activity.push({ kind: "reservation", title: `Booking · ${(r.guest_name as string) ?? "Guest"}`, detail: `Party of ${num(r.party_size)}`, at: r.created_at as string, status: r.status as string });
  for (const g of (giftCards.data ?? []).filter((x) => x.status !== "pending").slice(0, 5)) activity.push({ kind: "giftcard", title: `Gift card ${g.code}`, detail: `£${(num(g.initial_pence) / 100).toFixed(0)} · ${(g.recipient_name as string) ?? ""}`.trim(), at: g.created_at as string });
  for (const r of redemptions.data ?? []) activity.push({ kind: "loyalty", title: "Reward redeemed", detail: `${Math.abs(num(r.delta))} pts · ${names.get(r.customer_id as string) ?? "Member"}`, at: r.created_at as string });
  activity.sort((a, b) => b.at.localeCompare(a.at));

  return {
    todayRevenuePence: todayRevenue, todayOrders, todayReservations, todayCovers,
    monthRevenuePence: monthRevenue,
    returningCustomers: returningRes.count ?? 0,
    loyaltyMembers: loyaltyRes.count ?? 0,
    giftCardSalesPence: (gcSalesRes.data ?? []).reduce((s, g) => s + num(g.initial_pence), 0),
    revenueByDay,
    activity: activity.slice(0, 12),
  };
}
