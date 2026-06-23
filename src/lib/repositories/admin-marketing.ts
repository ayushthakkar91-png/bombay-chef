import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

/** Admin CRM reads (RLS: restaurant_manager+). */

export type AdminCampaign = {
  id: string;
  name: string;
  subject: string | null;
  status: string;
  segmentId: string | null;
  recipients: number | null;
  sentAt: string | null;
  createdAt: string;
};

export async function listCampaigns(): Promise<AdminCampaign[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("campaigns")
    .select("id, name, subject, status, segment_id, recipients, sent_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    subject: (c.subject as string | null) ?? null,
    status: (c.status as string) ?? "draft",
    segmentId: (c.segment_id as string | null) ?? null,
    recipients: (c.recipients as number | null) ?? null,
    sentAt: (c.sent_at as string | null) ?? null,
    createdAt: c.created_at as string,
  }));
}

export async function getCampaign(id: string) {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase.from("campaigns").select("id, name, subject, body_text, status, segment_id, recipients, sent_at").eq("id", id).maybeSingle();
  return data;
}

export type SegmentSize = { id: string; name: string; count: number };

export async function getSegments(): Promise<SegmentSize[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data: segs } = await supabase.from("customer_segments").select("id, name").order("id");
  const out: SegmentSize[] = [];
  for (const s of segs ?? []) {
    const { count } = await supabase.from("segment_members").select("customer_id", { count: "exact", head: true }).eq("segment_id", s.id);
    out.push({ id: s.id as string, name: s.name as string, count: count ?? 0 });
  }
  return out;
}

export async function getMarketingStats(): Promise<{ subscribed: number; unsubscribed: number }> {
  const supabase = await getUserClient();
  if (!supabase) return { subscribed: 0, unsubscribed: 0 };
  const [{ count: subscribed }, { count: unsubscribed }] = await Promise.all([
    supabase.from("marketing_contacts").select("id", { count: "exact", head: true }).eq("consent", true),
    supabase.from("marketing_contacts").select("id", { count: "exact", head: true }).eq("consent", false),
  ]);
  return { subscribed: subscribed ?? 0, unsubscribed: unsubscribed ?? 0 };
}

export type AdminPromo = {
  id: string;
  code: string;
  kind: string;
  value: number;
  minSpendPence: number;
  isActive: boolean;
  usedCount: number;
  globalLimit: number | null;
  endsAt: string | null;
};

/** Public promo codes only (personal loyalty vouchers are excluded). */
export async function listPromos(): Promise<AdminPromo[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("promo_codes")
    .select("id, code, kind, value, min_spend_pence, is_active, used_count, global_limit, ends_at, customer_id")
    .is("customer_id", null)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((p) => ({
    id: p.id as string,
    code: p.code as string,
    kind: p.kind as string,
    value: (p.value as number) ?? 0,
    minSpendPence: (p.min_spend_pence as number) ?? 0,
    isActive: (p.is_active as boolean) ?? true,
    usedCount: (p.used_count as number) ?? 0,
    globalLimit: (p.global_limit as number | null) ?? null,
    endsAt: (p.ends_at as string | null) ?? null,
  }));
}
