import "server-only";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import type { OrderStatus, Fulfilment } from "@/lib/ordering/constants";
import type { ReservationStatus } from "@/lib/reservations/constants";

/** Customer-scoped reads (RLS: the signed-in customer owns the rows). */

export type AccountOrder = {
  id: string;
  code: string;
  status: OrderStatus;
  fulfilment: Fulfilment;
  totalPence: number;
  placedAt: string | null;
  createdAt: string;
  itemCount: number;
};

export type AccountOrderItem = {
  itemId: string | null;
  name: string;
  unitPence: number;
  qty: number;
  modifiers: { id: string | null; name: string; pricePence: number }[];
  lineTotalPence: number;
  notes: string | null;
};

export type AccountOrderDetail = AccountOrder & {
  locationName: string;
  locationSlug: string;
  subtotalPence: number;
  discountPence: number;
  deliveryFeePence: number;
  deliveryAddress: Record<string, unknown> | null;
  items: AccountOrderItem[];
};

export type AccountReservation = {
  id: string;
  status: ReservationStatus;
  startsAt: string;
  partySize: number;
  occasion: string | null;
  experience: string | null;
  manageToken: string | null;
  locationName: string;
};

export type AccountAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  city: string;
  postcode: string;
  isDefault: boolean;
};

export type AccountFavourite = {
  itemId: string;
  name: string;
  description: string | null;
  pricePence: number | null;
  imageUrl: string | null;
};

export type AccountGiftCard = {
  id: string;
  code: string;
  initialPence: number;
  balancePence: number;
  status: string;
  expiresAt: string | null;
  viewToken: string | null;
  role: "purchased" | "received";
};

/** Gift-card wallet — cards this customer bought (purchaser_id) OR received
 *  (recipient_email). Service client: received cards aren't visible via RLS. */
export async function listMyGiftCards(userId: string, email: string | null): Promise<AccountGiftCard[]> {
  const service = getServiceClient();
  if (!service) return [];
  const ors = [`purchaser_id.eq.${userId}`];
  if (email) ors.push(`recipient_email.ilike.${email}`);
  const { data } = await service
    .from("gift_cards")
    .select("id, code, initial_pence, balance_pence, status, expires_at, view_token, purchaser_id")
    .or(ors.join(","))
    .neq("status", "pending")
    .order("created_at", { ascending: false });
  return (data ?? []).map((g) => ({
    id: g.id as string,
    code: g.code as string,
    initialPence: Number(g.initial_pence ?? 0),
    balancePence: Number(g.balance_pence ?? 0),
    status: g.status as string,
    expiresAt: (g.expires_at as string | null) ?? null,
    viewToken: (g.view_token as string | null) ?? null,
    role: g.purchaser_id === userId ? "purchased" : "received",
  }));
}

function locName(loc: unknown): { name: string; slug: string } {
  const l = loc as { name?: string; slug?: string } | { name?: string; slug?: string }[] | null;
  const one = Array.isArray(l) ? l[0] : l;
  return { name: one?.name ?? "Bombay Bicycle Chef", slug: one?.slug ?? "" };
}

export async function listMyOrders(userId: string): Promise<AccountOrder[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("orders")
    .select("id, code, status, fulfilment, total_pence, placed_at, created_at, order_items(count)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((o) => ({
    id: o.id as string,
    code: o.code as string,
    status: o.status as OrderStatus,
    fulfilment: o.fulfilment as Fulfilment,
    totalPence: o.total_pence as number,
    placedAt: (o.placed_at as string | null) ?? null,
    createdAt: o.created_at as string,
    itemCount: Array.isArray(o.order_items) && o.order_items[0] ? ((o.order_items[0] as { count: number }).count ?? 0) : 0,
  }));
}

export async function getMyOrder(userId: string, id: string): Promise<AccountOrderDetail | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("orders")
    .select(
      "id, code, status, fulfilment, total_pence, subtotal_pence, discount_pence, delivery_fee_pence, delivery_address, placed_at, created_at, locations(name, slug), order_items(item_id, name, unit_price_pence, qty, modifiers, line_total_pence, notes)",
    )
    .eq("customer_id", userId)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const { name, slug } = locName(data.locations);
  const items = ((data.order_items as Record<string, unknown>[] | null) ?? []).map((it) => ({
    itemId: (it.item_id as string | null) ?? null,
    name: it.name as string,
    unitPence: (it.unit_price_pence as number) ?? 0,
    qty: (it.qty as number) ?? 1,
    modifiers: ((it.modifiers as { id?: string; name: string; price_delta_pence?: number }[] | null) ?? []).map((m) => ({
      id: m.id ?? null,
      name: m.name,
      pricePence: m.price_delta_pence ?? 0,
    })),
    lineTotalPence: (it.line_total_pence as number) ?? 0,
    notes: (it.notes as string | null) ?? null,
  }));

  return {
    id: data.id as string,
    code: data.code as string,
    status: data.status as OrderStatus,
    fulfilment: data.fulfilment as Fulfilment,
    totalPence: data.total_pence as number,
    subtotalPence: data.subtotal_pence as number,
    discountPence: (data.discount_pence as number) ?? 0,
    deliveryFeePence: (data.delivery_fee_pence as number) ?? 0,
    deliveryAddress: (data.delivery_address as Record<string, unknown> | null) ?? null,
    placedAt: (data.placed_at as string | null) ?? null,
    createdAt: data.created_at as string,
    itemCount: items.length,
    locationName: name,
    locationSlug: slug,
    items,
  };
}

export async function listMyReservations(userId: string): Promise<AccountReservation[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reservations")
    .select("id, status, starts_at, party_size, occasion, experience, manage_token, locations(name)")
    .eq("customer_id", userId)
    .order("starts_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((r) => ({
    id: r.id as string,
    status: r.status as ReservationStatus,
    startsAt: r.starts_at as string,
    partySize: r.party_size as number,
    occasion: (r.occasion as string | null) ?? null,
    experience: (r.experience as string | null) ?? null,
    manageToken: (r.manage_token as string | null) ?? null,
    locationName: locName(r.locations).name,
  }));
}

export async function listMyAddresses(userId: string): Promise<AccountAddress[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("addresses")
    .select("id, label, line1, line2, city, postcode, is_default")
    .eq("customer_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []).map((a) => ({
    id: a.id as string,
    label: (a.label as string | null) ?? null,
    line1: a.line1 as string,
    line2: (a.line2 as string | null) ?? null,
    city: a.city as string,
    postcode: a.postcode as string,
    isDefault: (a.is_default as boolean) ?? false,
  }));
}

export async function listMyFavourites(userId: string): Promise<AccountFavourite[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("favourites")
    .select("item_id, menu_items(name, description, price_pence, image_url)")
    .eq("customer_id", userId);
  return (data ?? [])
    .map((f) => {
      const it = (Array.isArray(f.menu_items) ? f.menu_items[0] : f.menu_items) as Record<string, unknown> | null;
      if (!it) return null;
      return {
        itemId: f.item_id as string,
        name: it.name as string,
        description: (it.description as string | null) ?? null,
        pricePence: (it.price_pence as number | null) ?? null,
        imageUrl: (it.image_url as string | null) ?? null,
      };
    })
    .filter((x): x is AccountFavourite => x !== null);
}

export async function getMyFavouriteIds(userId: string): Promise<string[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("favourites").select("item_id").eq("customer_id", userId);
  return (data ?? []).map((f) => f.item_id as string);
}
