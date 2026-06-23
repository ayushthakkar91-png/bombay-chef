import "server-only";

import { getUserClient } from "@/lib/supabase/clients";
import type { Tier } from "@/lib/loyalty/constants";

/** Customer-scoped loyalty reads (RLS: own rows; rewards catalogue is public). */

export type MyLoyalty = { pointsBalance: number; pointsLifetime: number; tier: Tier };

export type MyVoucher = { code: string; kind: string; value: number; endsAt: string | null };

export type LedgerEntry = { delta: number; reason: string; note: string | null; createdAt: string };

export type CatalogueReward = {
  id: string;
  name: string;
  kind: string;
  pointsCost: number;
  valuePence: number | null;
  minTier: Tier;
};

export async function getMyLoyalty(userId: string): Promise<MyLoyalty> {
  const supabase = await getUserClient();
  const fallback: MyLoyalty = { pointsBalance: 0, pointsLifetime: 0, tier: "bronze" };
  if (!supabase) return fallback;
  const { data } = await supabase.from("loyalty_accounts").select("points_balance, points_lifetime, tier").eq("customer_id", userId).maybeSingle();
  if (!data) return fallback;
  return {
    pointsBalance: (data.points_balance as number) ?? 0,
    pointsLifetime: (data.points_lifetime as number) ?? 0,
    tier: (data.tier as Tier) ?? "bronze",
  };
}

export async function listMyVouchers(userId: string): Promise<MyVoucher[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const nowISO = new Date().toISOString();
  const { data } = await supabase
    .from("promo_codes")
    .select("code, kind, value, ends_at, global_limit, used_count, is_active")
    .eq("customer_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data ?? [])
    .filter((p) => {
      const limit = (p.global_limit as number | null) ?? 1;
      const used = (p.used_count as number) ?? 0;
      const live = !p.ends_at || (p.ends_at as string) > nowISO;
      return used < limit && live;
    })
    .map((p) => ({ code: p.code as string, kind: p.kind as string, value: (p.value as number) ?? 0, endsAt: (p.ends_at as string | null) ?? null }));
}

export async function listMyLedger(userId: string, limit = 20): Promise<LedgerEntry[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("loyalty_ledger")
    .select("delta, reason, note, created_at")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((l) => ({ delta: l.delta as number, reason: l.reason as string, note: (l.note as string | null) ?? null, createdAt: l.created_at as string }));
}

export async function listCatalogue(): Promise<CatalogueReward[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("rewards").select("id, name, kind, points_cost, value_pence, min_tier").eq("is_active", true).order("points_cost");
  return (data ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    kind: r.kind as string,
    pointsCost: r.points_cost as number,
    valuePence: (r.value_pence as number | null) ?? null,
    minTier: (r.min_tier as Tier) ?? "bronze",
  }));
}
