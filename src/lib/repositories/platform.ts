import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);
const joinName = (j: unknown): string | null => {
  const x = j as { name?: string } | { name?: string }[] | null;
  return (Array.isArray(x) ? x[0]?.name : x?.name) ?? null;
};

export type Plan = { id: string; key: string; name: string; monthlyPence: number; annualPence: number; maxLocations: number | null; maxUsers: number | null; features: string[] };

export async function listPlans(): Promise<Plan[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("plans").select("id, key, name, monthly_price_pence, annual_price_pence, max_locations, max_users, features").eq("is_active", true).order("sort_order");
  return (data ?? []).map((p) => ({ id: p.id as string, key: p.key as string, name: p.name as string, monthlyPence: num(p.monthly_price_pence), annualPence: num(p.annual_price_pence), maxLocations: (p.max_locations as number | null) ?? null, maxUsers: (p.max_users as number | null) ?? null, features: (p.features as string[]) ?? [] }));
}

export type TenantRow = { id: string; slug: string; name: string; status: string; planName: string | null; ownerName: string | null; locationCount: number; createdAt: string };

export async function listTenants(): Promise<TenantRow[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];
  const { data } = await supabase.from("tenants").select("id, slug, name, status, created_at, plans(name), profiles(full_name)").order("created_at", { ascending: false });
  const { data: locs } = await supabase.from("locations").select("tenant_id");
  const counts = new Map<string, number>();
  for (const l of locs ?? []) { const t = l.tenant_id as string | null; if (t) counts.set(t, (counts.get(t) ?? 0) + 1); }
  return (data ?? []).map((t) => ({
    id: t.id as string, slug: t.slug as string, name: t.name as string, status: t.status as string,
    planName: joinName(t.plans), ownerName: joinName(t.profiles ? { name: (Array.isArray(t.profiles) ? t.profiles[0]?.full_name : (t.profiles as { full_name?: string }).full_name) } : null),
    locationCount: counts.get(t.id as string) ?? 0, createdAt: t.created_at as string,
  }));
}

export type TenantDetail = {
  id: string; slug: string; name: string; status: string; planId: string | null; planName: string | null; createdAt: string;
  settings: { brandName: string | null; logoUrl: string | null; primaryColor: string; accentColor: string; theme: string; customDomain: string | null; supportEmail: string | null } | null;
  subscription: { interval: string; status: string; currentPeriodEnd: string | null; stripeCustomerId: string | null } | null;
  users: { userId: string; name: string | null; email: string | null; role: string }[];
  locationCount: number;
};

export async function getTenant(id: string): Promise<TenantDetail | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data: t } = await supabase.from("tenants").select("id, slug, name, status, plan_id, created_at, plans(name)").eq("id", id).maybeSingle();
  if (!t) return null;

  const [{ data: s }, { data: sub }, { data: tu }, { count: locCount }] = await Promise.all([
    supabase.from("tenant_settings").select("brand_name, logo_url, primary_color, accent_color, theme, custom_domain, support_email").eq("tenant_id", id).maybeSingle(),
    supabase.from("subscriptions").select("interval, status, current_period_end, stripe_customer_id").eq("tenant_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("tenant_users").select("user_id, role, profiles(full_name)").eq("tenant_id", id),
    supabase.from("locations").select("id", { count: "exact", head: true }).eq("tenant_id", id),
  ]);

  const userIds = (tu ?? []).map((r) => r.user_id as string);
  const emails = new Map<string, string>();
  if (userIds.length) {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users?.users ?? []) if (u.email && userIds.includes(u.id)) emails.set(u.id, u.email);
  }

  return {
    id: t.id as string, slug: t.slug as string, name: t.name as string, status: t.status as string, planId: (t.plan_id as string | null) ?? null, planName: joinName(t.plans), createdAt: t.created_at as string,
    settings: s ? { brandName: (s.brand_name as string | null) ?? null, logoUrl: (s.logo_url as string | null) ?? null, primaryColor: s.primary_color as string, accentColor: s.accent_color as string, theme: s.theme as string, customDomain: (s.custom_domain as string | null) ?? null, supportEmail: (s.support_email as string | null) ?? null } : null,
    subscription: sub ? { interval: sub.interval as string, status: sub.status as string, currentPeriodEnd: (sub.current_period_end as string | null) ?? null, stripeCustomerId: (sub.stripe_customer_id as string | null) ?? null } : null,
    users: (tu ?? []).map((r) => ({ userId: r.user_id as string, name: joinName(r.profiles ? { name: (Array.isArray(r.profiles) ? r.profiles[0]?.full_name : (r.profiles as { full_name?: string }).full_name) } : null), email: emails.get(r.user_id as string) ?? null, role: r.role as string })),
    locationCount: locCount ?? 0,
  };
}

export type PlatformStats = { tenants: number; active: number; trialing: number; suspended: number; mrrPence: number; planBreakdown: { label: string; value: number }[] };

export async function getPlatformStats(): Promise<PlatformStats> {
  const supabase = getServiceClient();
  if (!supabase) return { tenants: 0, active: 0, trialing: 0, suspended: 0, mrrPence: 0, planBreakdown: [] };

  const [{ data: tenants }, { data: subs }, plans] = await Promise.all([
    supabase.from("tenants").select("status, plan_id, plans(name)"),
    supabase.from("subscriptions").select("status, interval, plan_id"),
    listPlans(),
  ]);
  const planById = new Map(plans.map((p) => [p.id, p]));

  let active = 0, trialing = 0, suspended = 0;
  const byPlan = new Map<string, number>();
  for (const t of tenants ?? []) {
    const st = t.status as string;
    if (st === "active") active++; else if (st === "trialing") trialing++; else if (st === "suspended") suspended++;
    const pn = joinName(t.plans) ?? "—";
    byPlan.set(pn, (byPlan.get(pn) ?? 0) + 1);
  }

  let mrr = 0;
  for (const s of subs ?? []) {
    if (!["active", "trialing", "manual"].includes(s.status as string)) continue;
    const plan = planById.get(s.plan_id as string);
    if (!plan) continue;
    mrr += s.interval === "annual" ? Math.round(plan.annualPence / 12) : plan.monthlyPence;
  }

  return { tenants: (tenants ?? []).length, active, trialing, suspended, mrrPence: mrr, planBreakdown: [...byPlan.entries()].map(([label, value]) => ({ label, value })) };
}
