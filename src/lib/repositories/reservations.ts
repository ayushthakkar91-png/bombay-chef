import "server-only";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import type { ReservationStatus } from "@/lib/reservations/constants";

export type Reservation = {
  id: string;
  locationId: string;
  partySize: number;
  occasion: string | null;
  startsAt: string; // ISO
  durationMin: number;
  status: ReservationStatus;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  specialRequests: string | null;
  manageToken: string | null;
  source: string;
  createdAt: string;
};

const SELECT =
  "id, location_id, party_size, occasion, starts_at, duration_min, status, guest_name, guest_email, guest_phone, special_requests, manage_token, source, created_at";

function map(r: Record<string, unknown>): Reservation {
  return {
    id: r.id as string,
    locationId: r.location_id as string,
    partySize: r.party_size as number,
    occasion: (r.occasion as string | null) ?? null,
    startsAt: r.starts_at as string,
    durationMin: (r.duration_min as number) ?? 120,
    status: r.status as ReservationStatus,
    guestName: (r.guest_name as string | null) ?? null,
    guestEmail: (r.guest_email as string | null) ?? null,
    guestPhone: (r.guest_phone as string | null) ?? null,
    specialRequests: (r.special_requests as string | null) ?? null,
    manageToken: (r.manage_token as string | null) ?? null,
    source: (r.source as string) ?? "web",
    createdAt: r.created_at as string,
  };
}

/* ---- Admin reads (RLS: staff at the location) ------------------------- */

/** Reservations whose start falls within [fromISO, toISO). */
export async function listReservationsBetween(
  locationId: string,
  fromISO: string,
  toISO: string,
): Promise<Reservation[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT)
    .eq("location_id", locationId)
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO)
    .order("starts_at", { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(map);
}

export async function searchReservations(
  locationId: string,
  query: string,
): Promise<Reservation[]> {
  const supabase = await getUserClient();
  if (!supabase || !query.trim()) return [];
  const q = `%${query.trim()}%`;
  const { data, error } = await supabase
    .from("reservations")
    .select(SELECT)
    .eq("location_id", locationId)
    .or(`guest_name.ilike.${q},guest_email.ilike.${q},guest_phone.ilike.${q}`)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(map);
}

export async function getReservationAdmin(id: string): Promise<Reservation | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase.from("reservations").select(SELECT).eq("id", id).maybeSingle();
  return data ? map(data as Record<string, unknown>) : null;
}

/* ---- Guest read by manage token (bearer capability) ------------------- */

/**
 * Read a reservation by its manage token. Uses the service client because guest
 * reservations aren't readable through RLS — possession of the unguessable
 * token is the authorisation. Never expose the token list anywhere.
 */
export async function getReservationByToken(token: string): Promise<Reservation | null> {
  const supabase = getServiceClient();
  if (!supabase || !token) return null;
  const { data } = await supabase
    .from("reservations")
    .select(SELECT)
    .eq("manage_token", token)
    .maybeSingle();
  return data ? map(data as Record<string, unknown>) : null;
}

export type ManageView = Reservation & {
  experience: string | null;
  locationName: string;
  locationSlug: string;
};

/** Reservation + its location (name/slug) + experience, for the guest manage page. */
export async function getManageView(token: string): Promise<ManageView | null> {
  const supabase = getServiceClient();
  if (!supabase || !token) return null;
  const { data } = await supabase
    .from("reservations")
    .select(`${SELECT}, experience, locations(name, slug)`)
    .eq("manage_token", token)
    .maybeSingle();
  if (!data) return null;
  const loc = (data as Record<string, unknown>).locations as
    | { name: string; slug: string }
    | { name: string; slug: string }[]
    | null;
  const location = Array.isArray(loc) ? loc[0] : loc;
  return {
    ...map(data as Record<string, unknown>),
    experience: ((data as Record<string, unknown>).experience as string | null) ?? null,
    locationName: location?.name ?? "Bombay Bicycle Chef",
    locationSlug: location?.slug ?? "",
  };
}

/* ---- Waitlist --------------------------------------------------------- */

export type WaitlistEntry = {
  id: string;
  locationId: string;
  partySize: number;
  desiredFrom: string;
  desiredTo: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  status: string;
  offeredUntil: string | null;
  createdAt: string;
};

export async function listWaitlist(
  locationId: string,
  statuses: string[] = ["waiting", "offered"],
): Promise<WaitlistEntry[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("waitlist_entries")
    .select(
      "id, location_id, party_size, desired_from, desired_to, guest_name, guest_email, guest_phone, status, offered_until, created_at",
    )
    .eq("location_id", locationId)
    .in("status", statuses)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return data.map((w) => ({
    id: w.id as string,
    locationId: w.location_id as string,
    partySize: w.party_size as number,
    desiredFrom: w.desired_from as string,
    desiredTo: w.desired_to as string,
    guestName: (w.guest_name as string | null) ?? null,
    guestEmail: (w.guest_email as string | null) ?? null,
    guestPhone: (w.guest_phone as string | null) ?? null,
    status: w.status as string,
    offeredUntil: (w.offered_until as string | null) ?? null,
    createdAt: w.created_at as string,
  }));
}

/* ---- Tables / slots / blocks (admin config) --------------------------- */

export async function listTables(locationId: string) {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("tables")
    .select("id, name, seats, min_party, max_party, zone, combinable, is_active, sort_order")
    .eq("location_id", locationId)
    .order("sort_order");
  return data ?? [];
}

export async function listSlots(locationId: string) {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reservation_slots")
    .select("id, weekday, service_start, service_end, slot_minutes, turn_minutes, max_covers, is_active")
    .eq("location_id", locationId)
    .order("weekday")
    .order("service_start");
  return data ?? [];
}

export async function listBlocks(locationId: string, fromISO: string) {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reservation_blocks")
    .select("id, starts_at, ends_at, kind, reason")
    .eq("location_id", locationId)
    .gte("ends_at", fromISO)
    .order("starts_at");
  return data ?? [];
}
