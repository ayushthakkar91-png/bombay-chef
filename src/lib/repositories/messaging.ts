import "server-only";

import { getUserClient } from "@/lib/supabase/clients";
import { SENT_OR_BETTER, DELIVERED_STATUSES } from "@/lib/messaging/constants";

/* ---- Messages --------------------------------------------------------- */

export type MessageRow = { id: string; channel: string; category: string; toPhone: string; status: string; templateKey: string | null; provider: string | null; error: string | null; createdAt: string; clickedAt: string | null };

export async function listMessages(opts: { status?: string; category?: string; limit?: number } = {}): Promise<MessageRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase.from("messages").select("id, channel, category, to_phone, status, template_key, provider, error, created_at, clicked_at").order("created_at", { ascending: false }).limit(opts.limit ?? 100);
  if (opts.status && opts.status !== "all") q = q.eq("status", opts.status);
  if (opts.category && opts.category !== "all") q = q.eq("category", opts.category);
  const { data } = await q;
  return (data ?? []).map((m) => ({ id: m.id as string, channel: m.channel as string, category: m.category as string, toPhone: m.to_phone as string, status: m.status as string, templateKey: (m.template_key as string | null) ?? null, provider: (m.provider as string | null) ?? null, error: (m.error as string | null) ?? null, createdAt: m.created_at as string, clickedAt: (m.clicked_at as string | null) ?? null }));
}

export type MessagingStats = { total: number; sent: number; delivered: number; read: number; failed: number; skipped: number; clicked: number; deliveryRate: number; readRate: number; clickRate: number };

export async function getMessagingStats(fromISO: string): Promise<MessagingStats> {
  const supabase = await getUserClient();
  if (!supabase) return { total: 0, sent: 0, delivered: 0, read: 0, failed: 0, skipped: 0, clicked: 0, deliveryRate: 0, readRate: 0, clickRate: 0 };
  const { data } = await supabase.from("messages").select("status, clicked_at").gte("created_at", fromISO).limit(10000);

  let total = 0, sent = 0, delivered = 0, read = 0, failed = 0, skipped = 0, clicked = 0;
  for (const m of data ?? []) {
    total++;
    const s = m.status as string;
    if (SENT_OR_BETTER.includes(s)) sent++;
    if (DELIVERED_STATUSES.includes(s)) delivered++;
    if (s === "read") read++;
    if (s === "failed") failed++;
    if (s === "skipped") skipped++;
    if (m.clicked_at) clicked++;
  }
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  return { total, sent, delivered, read, failed, skipped, clicked, deliveryRate: pct(delivered, sent), readRate: pct(read, delivered), clickRate: pct(clicked, delivered) };
}

/* ---- Templates -------------------------------------------------------- */

export type Template = { id: string; key: string; name: string; channel: string; category: string; body: string; isActive: boolean };

export async function listTemplates(): Promise<Template[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("message_templates").select("id, key, name, channel, category, body, is_active").order("category").order("name");
  return (data ?? []).map((t) => ({ id: t.id as string, key: t.key as string, name: t.name as string, channel: t.channel as string, category: t.category as string, body: t.body as string, isActive: (t.is_active as boolean) ?? true }));
}

/* ---- Campaigns -------------------------------------------------------- */

export type Campaign = { id: string; name: string; channel: string; body: string; linkUrl: string | null; status: string; totalCount: number; createdAt: string };

export async function listCampaigns(): Promise<Campaign[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("message_campaigns").select("id, name, channel, body, link_url, status, total_count, created_at").order("created_at", { ascending: false });
  return (data ?? []).map((c) => ({ id: c.id as string, name: c.name as string, channel: c.channel as string, body: c.body as string, linkUrl: (c.link_url as string | null) ?? null, status: c.status as string, totalCount: (c.total_count as number) ?? 0, createdAt: c.created_at as string }));
}

/* ---- Consent ---------------------------------------------------------- */

export type ConsentStats = { total: number; sms: number; whatsapp: number; marketing: number; optedOut: number };

export async function getConsentStats(): Promise<ConsentStats> {
  const supabase = await getUserClient();
  if (!supabase) return { total: 0, sms: 0, whatsapp: 0, marketing: 0, optedOut: 0 };
  const { data } = await supabase.from("messaging_preferences").select("sms_opt_in, whatsapp_opt_in, marketing_opt_in, opt_out_at").limit(10000);
  let total = 0, sms = 0, whatsapp = 0, marketing = 0, optedOut = 0;
  for (const p of data ?? []) {
    total++;
    if (p.opt_out_at) { optedOut++; continue; }
    if (p.sms_opt_in) sms++;
    if (p.whatsapp_opt_in) whatsapp++;
    if (p.marketing_opt_in) marketing++;
  }
  return { total, sms, whatsapp, marketing, optedOut };
}

export type PreferenceRow = { id: string; phone: string; smsOptIn: boolean; whatsappOptIn: boolean; marketingOptIn: boolean; optedOut: boolean; source: string | null; updatedAt: string };

export async function listPreferences(limit = 50): Promise<PreferenceRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("messaging_preferences").select("id, phone, sms_opt_in, whatsapp_opt_in, marketing_opt_in, opt_out_at, source, updated_at").order("updated_at", { ascending: false }).limit(limit);
  return (data ?? []).map((p) => ({ id: p.id as string, phone: p.phone as string, smsOptIn: (p.sms_opt_in as boolean) ?? false, whatsappOptIn: (p.whatsapp_opt_in as boolean) ?? false, marketingOptIn: (p.marketing_opt_in as boolean) ?? false, optedOut: Boolean(p.opt_out_at), source: (p.source as string | null) ?? null, updatedAt: p.updated_at as string }));
}
