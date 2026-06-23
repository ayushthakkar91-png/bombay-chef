import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import type { OrderStatus, Fulfilment } from "@/lib/ordering/constants";
import type { ReservationStatus } from "@/lib/reservations/constants";
import type { Tier } from "@/lib/loyalty/constants";

/**
 * Admin customer directory. Uses the service client (to read auth emails +
 * cross-location history) and is gated by `requireRole('restaurant_manager')`
 * at the page. Read-only — admins view, they don't edit customer accounts here.
 */

export type AdminCustomerRow = { id: string; name: string | null; email: string | null; phone: string | null };

async function emailMap(): Promise<Map<string, string>> {
  const service = getServiceClient();
  const map = new Map<string, string>();
  if (!service) return map;
  const { data } = await service.auth.admin.listUsers({ perPage: 1000 });
  for (const u of data?.users ?? []) if (u.email) map.set(u.id, u.email);
  return map;
}

export async function listCustomers(search?: string): Promise<AdminCustomerRow[]> {
  const service = getServiceClient();
  if (!service) return [];

  let q = service.from("profiles").select("id, full_name, phone").eq("type", "customer").order("created_at", { ascending: false }).limit(200);
  if (search?.trim()) q = q.ilike("full_name", `%${search.trim()}%`);
  const { data: profiles } = await q;

  const emails = await emailMap();
  const rows = (profiles ?? []).map((p) => ({
    id: p.id as string,
    name: (p.full_name as string | null) ?? null,
    phone: (p.phone as string | null) ?? null,
    email: emails.get(p.id as string) ?? null,
  }));

  // Allow searching by email too (emails live in auth, not profiles).
  if (search?.trim()) {
    const s = search.trim().toLowerCase();
    const byEmail = [...emails.entries()].filter(([, e]) => e.toLowerCase().includes(s)).map(([id]) => id);
    const have = new Set(rows.map((r) => r.id));
    for (const id of byEmail) {
      if (have.has(id)) continue;
      const { data: p } = await service.from("profiles").select("full_name, phone").eq("id", id).maybeSingle();
      if (p) rows.push({ id, name: (p.full_name as string | null) ?? null, phone: (p.phone as string | null) ?? null, email: emails.get(id) ?? null });
    }
  }
  return rows;
}

export type AdminCustomerProfile = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  marketingEmail: boolean;
  marketingSms: boolean;
  loyalty: { pointsBalance: number; pointsLifetime: number; tier: Tier } | null;
  addresses: { line1: string; line2: string | null; city: string; postcode: string; isDefault: boolean }[];
  orders: { id: string; code: string; status: OrderStatus; fulfilment: Fulfilment; totalPence: number; createdAt: string }[];
  reservations: { id: string; status: ReservationStatus; startsAt: string; partySize: number; locationName: string }[];
};

export async function getCustomerProfile(id: string): Promise<AdminCustomerProfile | null> {
  const service = getServiceClient();
  if (!service) return null;

  const { data: profile } = await service.from("profiles").select("full_name, phone, type").eq("id", id).maybeSingle();
  if (!profile) return null;

  const { data: userRes } = await service.auth.admin.getUserById(id);
  const email = userRes?.user?.email ?? null;

  const [{ data: consentRows }, { data: addresses }, { data: orders }, { data: reservations }, { data: loyalty }] = await Promise.all([
    service.from("consents").select("purpose, granted, created_at").eq("customer_id", id).in("purpose", ["marketing_email", "marketing_sms"]).order("created_at", { ascending: false }),
    service.from("addresses").select("line1, line2, city, postcode, is_default").eq("customer_id", id),
    service.from("orders").select("id, code, status, fulfilment, total_pence, created_at").eq("customer_id", id).order("created_at", { ascending: false }).limit(50),
    service.from("reservations").select("id, status, starts_at, party_size, locations(name)").eq("customer_id", id).order("starts_at", { ascending: false }).limit(50),
    service.from("loyalty_accounts").select("points_balance, points_lifetime, tier").eq("customer_id", id).maybeSingle(),
  ]);

  const latest = new Map<string, boolean>();
  for (const r of consentRows ?? []) if (!latest.has(r.purpose as string)) latest.set(r.purpose as string, r.granted as boolean);

  return {
    id,
    name: (profile.full_name as string | null) ?? null,
    email,
    phone: (profile.phone as string | null) ?? null,
    marketingEmail: latest.get("marketing_email") ?? false,
    marketingSms: latest.get("marketing_sms") ?? false,
    loyalty: loyalty ? { pointsBalance: (loyalty.points_balance as number) ?? 0, pointsLifetime: (loyalty.points_lifetime as number) ?? 0, tier: (loyalty.tier as Tier) ?? "bronze" } : null,
    addresses: (addresses ?? []).map((a) => ({ line1: a.line1 as string, line2: (a.line2 as string | null) ?? null, city: a.city as string, postcode: a.postcode as string, isDefault: (a.is_default as boolean) ?? false })),
    orders: (orders ?? []).map((o) => ({ id: o.id as string, code: o.code as string, status: o.status as OrderStatus, fulfilment: o.fulfilment as Fulfilment, totalPence: o.total_pence as number, createdAt: o.created_at as string })),
    reservations: (reservations ?? []).map((r) => {
      const loc = r.locations as { name: string } | { name: string }[] | null;
      return { id: r.id as string, status: r.status as ReservationStatus, startsAt: r.starts_at as string, partySize: r.party_size as number, locationName: (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "—" };
    }),
  };
}
