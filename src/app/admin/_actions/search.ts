"use server";

import { requireStaff } from "@/lib/auth/dal";
import { getServiceClient } from "@/lib/supabase/clients";

export type SearchHit = { group: string; label: string; sub?: string; href: string };

/** Universal admin search across the core entities. Staff-gated, read-only. */
export async function globalSearch(query: string): Promise<SearchHit[]> {
  await requireStaff();
  const term = query.trim();
  if (term.length < 2) return [];
  const supabase = getServiceClient();
  if (!supabase) return [];
  const like = `%${term.replace(/[%_,()*]/g, "")}%`; // strip PostgREST .or() metachars

  const [orders, reservations, customers, dishes, giftCards] = await Promise.all([
    supabase.from("orders").select("code, contact_name, status").or(`code.ilike.${like},contact_name.ilike.${like}`).order("created_at", { ascending: false }).limit(5),
    supabase.from("reservations").select("id, guest_name, party_size, status").or(`guest_name.ilike.${like},guest_phone.ilike.${like}`).order("created_at", { ascending: false }).limit(5),
    supabase.from("customers").select("id, loyalty_opt_in, profiles!inner(full_name)").ilike("profiles.full_name", like).limit(5),
    supabase.from("menu_items").select("id, name, price").ilike("name", like).limit(5),
    supabase.from("gift_cards").select("code, recipient_name, balance_pence").or(`code.ilike.${like},recipient_name.ilike.${like}`).limit(5),
  ]);

  const hits: SearchHit[] = [];
  const name = (j: unknown) => { const x = j as { full_name?: string } | { full_name?: string }[] | null; return (Array.isArray(x) ? x[0]?.full_name : x?.full_name) ?? "Customer"; };

  for (const o of orders.data ?? []) hits.push({ group: "Orders", label: `Order ${o.code}`, sub: (o.contact_name as string) ?? (o.status as string), href: `/admin/orders/history` });
  for (const r of reservations.data ?? []) hits.push({ group: "Reservations", label: (r.guest_name as string) ?? "Booking", sub: `Party of ${r.party_size} · ${r.status}`, href: `/admin/reservations` });
  for (const c of customers.data ?? []) hits.push({ group: c.loyalty_opt_in ? "Loyalty" : "Customers", label: name(c.profiles), sub: c.loyalty_opt_in ? "Loyalty member" : undefined, href: `/admin/customers/${c.id}` });
  for (const d of dishes.data ?? []) hits.push({ group: "Dishes", label: d.name as string, sub: (d.price as string) ?? undefined, href: `/admin/menu/items` });
  for (const g of giftCards.data ?? []) hits.push({ group: "Gift cards", label: `${g.code}`, sub: `£${(Number(g.balance_pence) / 100).toFixed(2)} balance`, href: `/admin/giftcards` });

  return hits;
}
