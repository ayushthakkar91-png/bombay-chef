import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { getSalesReport } from "@/lib/reports/queries";
import { listDishCosting } from "@/lib/repositories/costing";
import { listStock, listWaste } from "@/lib/repositories/inventory";
import { londonDay } from "@/lib/reports/range";
import { confidence, confidenceFrom, delta, mean, projectLinear } from "./stats";
import type { Alert, Confidence, Delta, Forecast, Insight, Recommendation } from "./types";

type Range = { fromISO: string; toISO: string; days: number; label: string };
const REV = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;

function priorRange(range: Range): Range {
  const ms = range.days * 86400000;
  const toISO = range.fromISO;
  const fromISO = new Date(new Date(range.fromISO).getTime() - ms).toISOString();
  return { fromISO, toISO, days: range.days, label: "prior" };
}

/* ---- Dish stats (volume + cost + profit) ------------------------------ */

export type DishStat = { id: string; name: string; units: number; revenuePence: number; unitCostPence: number; profitPence: number; foodCostPct: number | null };

async function dishStats(range: Range, locationId?: string): Promise<DishStat[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  let q = supabase
    .from("order_items")
    .select("item_id, name, qty, line_total_pence, orders!inner(placed_at, status, location_id)")
    .not("orders.placed_at", "is", null)
    .gte("orders.placed_at", range.fromISO)
    .lt("orders.placed_at", range.toISO)
    .limit(50000);
  if (locationId) q = q.eq("orders.location_id", locationId);
  const { data } = await q;

  const costing = await listDishCosting();
  const costById = new Map(costing.map((d) => [d.menuItemId, d.costPence]));

  const agg = new Map<string, { name: string; units: number; rev: number }>();
  for (const it of data ?? []) {
    const o = (Array.isArray(it.orders) ? it.orders[0] : it.orders) as { status?: string } | null;
    if (!o || !REV.has(o.status ?? "")) continue;
    const id = (it.item_id as string) ?? (it.name as string);
    const a = agg.get(id) ?? { name: it.name as string, units: 0, rev: 0 };
    a.units += (it.qty as number) ?? 0;
    a.rev += (it.line_total_pence as number) ?? 0;
    agg.set(id, a);
  }

  return [...agg.entries()].map(([id, v]) => {
    const unitCost = costById.get(id) ?? 0;
    const totalCost = unitCost * v.units;
    const profit = v.rev - totalCost;
    return { id, name: v.name, units: v.units, revenuePence: v.rev, unitCostPence: unitCost, profitPence: profit, foodCostPct: v.rev > 0 && unitCost > 0 ? Math.round((totalCost / v.rev) * 100) : null };
  }).sort((a, b) => b.revenuePence - a.revenuePence);
}

/* ---- Executive overview ----------------------------------------------- */

export type ExecOverview = {
  revenue: Delta; orders: Delta; aov: Delta;
  forecast: Forecast;
  insights: Insight[];
  alerts: Alert[];
  recommendations: Recommendation[];
  topDishes: { label: string; value: number; sub?: string }[];
  revenueSeries: { label: string; value: number }[];
};

export async function getExecutiveOverview(range: Range, locationId?: string): Promise<ExecOverview> {
  const [sales, prior] = await Promise.all([getSalesReport(range, locationId), getSalesReport(priorRange(range), locationId)]);

  const revenue = delta(sales.revenuePence, prior.revenuePence);
  const orders = delta(sales.orders, prior.orders);
  const aov = delta(sales.aovPence, prior.aovPence);

  const dailyRev = sales.byDay.map((d) => d.value);
  const forecast = buildRevenueForecast(sales.byDay, 7);

  const dishes = await dishStats(range, locationId);
  const alerts = await collectAlerts(range, locationId, revenue);
  const recommendations = (await buildAllRecommendations(range, locationId, dishes)).sort((a, b) => b.confidence.score - a.confidence.score).slice(0, 4);

  const insights: Insight[] = [];
  if (dishes[0]) insights.push({ id: "top-dish", title: `${dishes[0].name} is your top earner`, detail: `${dishes[0].units} sold for ${gbp(dishes[0].revenuePence)} this period.`, tone: "good", confidence: confidence(dishes[0].units, "units sold") });
  const profitable = [...dishes].sort((a, b) => b.profitPence - a.profitPence)[0];
  if (profitable) insights.push({ id: "profit-dish", title: `${profitable.name} drives the most profit`, detail: `${gbp(profitable.profitPence)} gross profit${profitable.foodCostPct != null ? ` at ${profitable.foodCostPct}% food cost` : ""}.`, tone: "good", confidence: confidence(profitable.units, "units sold") });
  insights.push({ id: "rev-trend", title: revenue.direction === "up" ? "Revenue is growing" : revenue.direction === "down" ? "Revenue is slipping" : "Revenue is steady", detail: `${gbp(sales.revenuePence)} vs ${gbp(prior.revenuePence)} the prior ${range.days} days${revenue.pct != null ? ` (${revenue.pct > 0 ? "+" : ""}${revenue.pct}%)` : ""}.`, tone: revenue.direction === "down" ? "bad" : "good", confidence: confidence(sales.orders, "orders") });

  return { revenue, orders, aov, forecast, insights, alerts, recommendations, topDishes: dishes.slice(0, 8).map((d) => ({ label: d.name, value: d.units, sub: gbp(d.revenuePence) })), revenueSeries: sales.byDay.length ? sales.byDay : dailyRev.map((v, i) => ({ label: String(i), value: v })) };
}

function buildRevenueForecast(byDay: { label: string; value: number }[], ahead: number): Forecast {
  const values = byDay.map((d) => d.value);
  const { projection, r2 } = projectLinear(values, ahead);
  const projTotal = projection.reduce((a, b) => a + b, 0);
  const recentAvg = mean(values.slice(-7));
  return {
    label: `Next ${ahead} days`,
    history: byDay.slice(-21),
    projection: projection.map((v, i) => ({ label: `+${i + 1}`, value: v })),
    summary: `Projected ${gbp(projTotal)} over the next ${ahead} days (~${gbp(recentAvg)}/day), based on the recent trend.`,
    confidence: confidenceFrom(30 + r2 * 60, `trend fit R²=${r2.toFixed(2)} over ${values.length} days`),
  };
}

/* ---- Revenue & demand page -------------------------------------------- */

export type RevenueInsights = {
  revenue: Delta; orders: Delta; aov: Delta;
  series: { label: string; value: number }[];
  forecast: Forecast;
  weekdayDemand: { label: string; value: number }[];
  bestSelling: DishStat[];
  mostProfitable: DishStat[];
  lowPerforming: DishStat[];
  pricing: Recommendation[];
};

export async function getRevenueInsights(range: Range, locationId?: string): Promise<RevenueInsights> {
  const [sales, prior, dishes] = await Promise.all([getSalesReport(range, locationId), getSalesReport(priorRange(range), locationId), dishStats(range, locationId)]);

  const weekday = await weekdayDemand(range, locationId);
  const bestSelling = [...dishes].sort((a, b) => b.units - a.units).slice(0, 8);
  const mostProfitable = [...dishes].sort((a, b) => b.profitPence - a.profitPence).slice(0, 8);
  const lowPerforming = [...dishes].filter((d) => d.units > 0).sort((a, b) => a.units - b.units || a.profitPence - b.profitPence).slice(0, 6);

  return {
    revenue: delta(sales.revenuePence, prior.revenuePence),
    orders: delta(sales.orders, prior.orders),
    aov: delta(sales.aovPence, prior.aovPence),
    series: sales.byDay,
    forecast: buildRevenueForecast(sales.byDay, 14),
    weekdayDemand: weekday,
    bestSelling, mostProfitable, lowPerforming,
    pricing: pricingRecommendations(dishes),
  };
}

async function weekdayDemand(range: Range, locationId?: string): Promise<{ label: string; value: number }[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  let q = supabase.from("orders").select("placed_at, status, location_id").not("placed_at", "is", null).gte("placed_at", range.fromISO).lt("placed_at", range.toISO).limit(20000);
  if (locationId) q = q.eq("location_id", locationId);
  const { data } = await q;
  const byDow = new Array(7).fill(0);
  const daysSeen = new Array(7).fill(0);
  const seenDays = new Set<string>();
  for (const o of data ?? []) {
    if (!REV.has(o.status as string)) continue;
    const d = new Date(o.placed_at as string);
    const dow = d.getUTCDay();
    byDow[dow]++;
    const key = `${dow}:${londonDay(o.placed_at as string)}`;
    if (!seenDays.has(key)) { seenDays.add(key); daysSeen[dow]++; }
  }
  return WEEKDAYS.map((label, i) => ({ label, value: daysSeen[i] ? Math.round(byDow[i] / daysSeen[i]) : 0 }));
}

function pricingRecommendations(dishes: DishStat[]): Recommendation[] {
  const recs: Recommendation[] = [];
  // High food cost + decent volume → margin pressure.
  for (const d of dishes.filter((x) => x.foodCostPct != null && x.foodCostPct > 40 && x.units >= 5).slice(0, 3)) {
    recs.push({
      id: `price-up-${d.id}`,
      category: "pricing",
      title: `Review pricing on ${d.name}`,
      rationale: `Food cost is ${d.foodCostPct}% (target ≤35%) across ${d.units} sold — margin is thin.`,
      action: "Raise the price ~5–10% or trim the recipe cost; demand is strong enough to absorb it.",
      impact: `A 5% price rise ≈ ${gbp(Math.round(d.revenuePence * 0.05))} more revenue at current volume.`,
      confidence: confidence(d.units, "units sold"),
    });
  }
  // Strong margin + low volume → promote.
  for (const d of dishes.filter((x) => (x.foodCostPct == null || x.foodCostPct < 30) && x.units > 0).sort((a, b) => b.profitPence / Math.max(1, b.units) - a.profitPence / Math.max(1, a.units)).slice(0, 2)) {
    if (d.units >= 15) continue;
    recs.push({
      id: `promote-${d.id}`,
      category: "pricing",
      title: `Promote ${d.name}`,
      rationale: `Healthy margin but only ${d.units} sold — it's under-exposed.`,
      action: "Feature it on the menu or bundle it; each extra sale is high-margin.",
      confidence: confidence(d.units + 5, "units sold"),
    });
  }
  return recs;
}

/* ---- Customers page --------------------------------------------------- */

export type CustomerSignal = { customerId: string; name: string; phone: string | null; orders: number; ltvPence: number; lastOrderDays: number; cadenceDays: number | null; riskScore: number; confidence: Confidence };
export type CustomerInsights = {
  churnRisk: CustomerSignal[];
  repeatOpportunities: CustomerSignal[];
  retention: { repeatRatePct: number; atRiskCount: number; atRiskValuePence: number };
  alerts: Alert[];
  marketing: Recommendation[];
};

export async function getCustomerInsights(nowMs: number): Promise<CustomerInsights> {
  const supabase = getServiceClient();
  if (!supabase) return { churnRisk: [], repeatOpportunities: [], retention: { repeatRatePct: 0, atRiskCount: 0, atRiskValuePence: 0 }, alerts: [], marketing: [] };

  const sinceISO = new Date(nowMs - 365 * 86400000).toISOString();
  const { data: orders } = await supabase.from("orders").select("customer_id, placed_at, total_pence, status").not("customer_id", "is", null).not("placed_at", "is", null).gte("placed_at", sinceISO).limit(40000);

  type Agg = { dates: number[]; ltv: number };
  const byCust = new Map<string, Agg>();
  for (const o of orders ?? []) {
    if (!REV.has(o.status as string)) continue;
    const a = byCust.get(o.customer_id as string) ?? { dates: [], ltv: 0 };
    a.dates.push(new Date(o.placed_at as string).getTime());
    a.ltv += (o.total_pence as number) ?? 0;
    byCust.set(o.customer_id as string, a);
  }

  const signals: CustomerSignal[] = [];
  let repeatCount = 0;
  for (const [id, a] of byCust) {
    a.dates.sort((x, y) => x - y);
    const n = a.dates.length;
    if (n >= 2) repeatCount++;
    const lastOrderDays = Math.floor((nowMs - a.dates[n - 1]) / 86400000);
    const cadence = n >= 2 ? Math.round((a.dates[n - 1] - a.dates[0]) / (n - 1) / 86400000) : null;
    const expected = cadence ?? 35; // one-timers: assume a ~monthly window
    const risk = Math.max(0, Math.min(100, Math.round((lastOrderDays / Math.max(7, expected) - 1) * 55)));
    signals.push({ customerId: id, name: "", phone: null, orders: n, ltvPence: a.ltv, lastOrderDays, cadenceDays: cadence, riskScore: risk, confidence: confidence(n, "orders") });
  }

  const repeatRatePct = byCust.size ? Math.round((repeatCount / byCust.size) * 100) : 0;

  // Churn risk: previously-active, valuable, now overdue.
  const churnRisk = signals.filter((s) => s.orders >= 2 && s.riskScore >= 50).sort((a, b) => b.riskScore * b.ltvPence - a.riskScore * a.ltvPence).slice(0, 20);
  // Repeat opportunity: one order, recent enough to convert.
  const repeatOpportunities = signals.filter((s) => s.orders === 1 && s.lastOrderDays <= 60).sort((a, b) => b.ltvPence - a.ltvPence).slice(0, 20);

  await hydrateNames(supabase, [...churnRisk, ...repeatOpportunities]);

  const atRiskValue = churnRisk.reduce((s, c) => s + c.ltvPence, 0);
  const alerts: Alert[] = [];
  if (churnRisk.length >= 3) alerts.push({ id: "churn", title: `${churnRisk.length} regulars at churn risk`, detail: `Worth ${gbp(atRiskValue)} in lifetime value — they're overdue versus their usual cadence.`, severity: churnRisk.length >= 8 ? "critical" : "warning", metric: "retention" });
  if (repeatRatePct < 25 && byCust.size >= 10) alerts.push({ id: "repeat-low", title: `Repeat rate is ${repeatRatePct}%`, detail: "Most customers order once. A second-order nudge is the highest-leverage retention move.", severity: "warning", metric: "retention" });

  const marketing: Recommendation[] = [];
  if (churnRisk.length) marketing.push({ id: "winback", category: "marketing", title: "Launch a win-back campaign", rationale: `${churnRisk.length} valuable regulars (${gbp(atRiskValue)} LTV) are overdue.`, action: "Send a targeted SMS/email offer to lapsing regulars via the Messaging/CRM tools.", impact: `Re-activating even 20% recovers ~${gbp(Math.round(atRiskValue * 0.2))} in future value.`, confidence: confidenceFrom(60 + Math.min(30, churnRisk.length), `${churnRisk.length} at-risk customers`) });
  if (repeatOpportunities.length) marketing.push({ id: "second-order", category: "marketing", title: "Convert one-time buyers", rationale: `${repeatOpportunities.length} customers ordered once in the last 60 days.`, action: "Trigger a 'thanks for your first order' offer to earn the second visit.", confidence: confidence(repeatOpportunities.length, "first-time buyers") });

  return { churnRisk, repeatOpportunities, retention: { repeatRatePct, atRiskCount: churnRisk.length, atRiskValuePence: atRiskValue }, alerts, marketing };
}

async function hydrateNames(supabase: NonNullable<ReturnType<typeof getServiceClient>>, rows: CustomerSignal[]): Promise<void> {
  const ids = [...new Set(rows.map((r) => r.customerId))];
  if (!ids.length) return;
  const { data } = await supabase.from("profiles").select("id, full_name, phone").in("id", ids);
  const m = new Map((data ?? []).map((p) => [p.id as string, p]));
  for (const r of rows) {
    const p = m.get(r.customerId);
    r.name = (p?.full_name as string) || "Guest";
    r.phone = (p?.phone as string | null) ?? null;
  }
}

/* ---- Inventory & operations page -------------------------------------- */

export type InventoryInsights = {
  stockAlerts: Alert[];
  optimisation: Recommendation[];
  staffing: Recommendation[];
  wasteInsight: Insight | null;
  staffingForecast: { label: string; value: number }[];
};

export async function getInventoryInsights(range: Range, locationId: string, nowMs: number): Promise<InventoryInsights> {
  const monthAgo = new Date(nowMs - 30 * 86400000).toISOString();
  const [stock, waste, weekday] = await Promise.all([listStock(locationId), listWaste(locationId, monthAgo), weekdayDemand(range, locationId)]);

  const low = stock.filter((s) => s.low);
  const stockAlerts: Alert[] = [];
  if (low.length) stockAlerts.push({ id: "low-stock", title: `${low.length} item${low.length === 1 ? "" : "s"} below reorder level`, detail: low.slice(0, 5).map((s) => s.name).join(", ") + (low.length > 5 ? "…" : ""), severity: low.length >= 5 ? "critical" : "warning", metric: "inventory" });

  const optimisation: Recommendation[] = [];
  for (const s of low.slice(0, 4)) {
    optimisation.push({ id: `reorder-${s.itemId}`, category: "inventory", title: `Reorder ${s.name}`, rationale: `${s.qty} ${s.unit} left, at/below the reorder point of ${s.reorderLevel}.`, action: s.reorderQty > 0 ? `Raise a PO for ~${s.reorderQty} ${s.unit}.` : "Raise a purchase order with the usual supplier.", confidence: confidenceFrom(85, "live stock level") });
  }

  // Waste insight.
  const wasteValue = waste.reduce((sum, w) => sum + w.costPence, 0);
  const wasteInsight: Insight | null = waste.length ? { id: "waste", title: `${gbp(wasteValue)} of waste in 30 days`, detail: topWaste(waste), tone: wasteValue > 0 ? "bad" : "neutral", confidence: confidence(waste.length, "waste events") } : null;
  if (wasteValue > 0) {
    const top = topWasteItem(waste);
    if (top) optimisation.push({ id: "waste-opt", category: "inventory", title: `Cut waste on ${top.name}`, rationale: `${gbp(top.cost)} wasted in 30 days, mostly ${top.reason}.`, action: "Tighten par levels, rotation (FIFO) or portioning for this item.", impact: `Halving it saves ~${gbp(Math.round(top.cost / 2))}/month.`, confidence: confidence(waste.length, "waste events") });
  }

  // Staffing forecast: recommended cover per weekday from demand (orders + reservations).
  const staffingForecast = weekday.map((d) => ({ label: d.label, value: Math.max(1, Math.ceil(d.value / 8)) }));
  const staffing: Recommendation[] = [];
  const busiest = [...weekday].sort((a, b) => b.value - a.value)[0];
  const quietest = [...weekday].filter((d) => d.value > 0).sort((a, b) => a.value - b.value)[0];
  if (busiest && busiest.value > 0) {
    staffing.push({ id: "staff-peak", category: "staff", title: `Staff up for ${busiest.label}`, rationale: `${busiest.label} averages ${busiest.value} orders/day — your busiest.`, action: `Roster ~${Math.max(1, Math.ceil(busiest.value / 8))} on shift; check the schedule covers it.`, confidence: confidence(range.days, "days analysed") });
  }
  if (quietest && busiest && quietest.value > 0 && quietest.value < busiest.value * 0.5) {
    staffing.push({ id: "staff-quiet", category: "staff", title: `Trim ${quietest.label} cover`, rationale: `${quietest.label} runs ~${quietest.value} orders/day, well below peak.`, action: "Shift labour from quiet days to peaks to hold service without overspending.", confidence: confidence(range.days, "days analysed") });
  }

  return { stockAlerts, optimisation, staffing, wasteInsight, staffingForecast };
}

function topWaste(waste: { name: string; costPence: number }[]): string {
  const m = new Map<string, number>();
  for (const w of waste) m.set(w.name, (m.get(w.name) ?? 0) + w.costPence);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, c]) => `${n} (${gbp(c)})`).join(", ");
}
function topWasteItem(waste: { name: string; costPence: number; reason: string }[]): { name: string; cost: number; reason: string } | null {
  const m = new Map<string, { cost: number; reason: string }>();
  for (const w of waste) { const e = m.get(w.name) ?? { cost: 0, reason: w.reason }; e.cost += w.costPence; m.set(w.name, e); }
  const top = [...m.entries()].sort((a, b) => b[1].cost - a[1].cost)[0];
  return top ? { name: top[0], cost: top[1].cost, reason: top[1].reason } : null;
}

/* ---- Shared: alerts + recommendation aggregation ---------------------- */

async function collectAlerts(range: Range, locationId: string | undefined, revenue: Delta): Promise<Alert[]> {
  const alerts: Alert[] = [];
  if (revenue.direction === "down" && revenue.pct != null && revenue.pct <= -10) {
    alerts.push({ id: "rev-drop", title: `Revenue down ${Math.abs(revenue.pct)}%`, detail: `${gbp(revenue.current)} vs ${gbp(revenue.previous)} the prior ${range.days} days.`, severity: revenue.pct <= -25 ? "critical" : "warning", metric: "revenue" });
  }
  // Stock issues across the selected scope (first location if scoped).
  if (locationId) {
    const stock = await listStock(locationId);
    const low = stock.filter((s) => s.low);
    if (low.length) alerts.push({ id: "stock", title: `${low.length} item${low.length === 1 ? "" : "s"} low on stock`, detail: low.slice(0, 4).map((s) => s.name).join(", ") + (low.length > 4 ? "…" : ""), severity: low.length >= 5 ? "critical" : "warning", metric: "inventory" });
  }
  return alerts;
}

async function buildAllRecommendations(range: Range, locationId: string | undefined, dishes: DishStat[]): Promise<Recommendation[]> {
  const recs = pricingRecommendations(dishes);
  if (locationId) {
    const inv = await getInventoryInsights(range, locationId, new Date(range.toISO).getTime());
    recs.push(...inv.optimisation.slice(0, 2), ...inv.staffing.slice(0, 1));
  }
  return recs;
}
