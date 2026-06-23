import "server-only";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import type { Role } from "@/lib/auth/roles";

/* ---- Staff directory (service client; gated at the page) -------------- */

export type StaffGrantView = { role: Role; locationId: string | null; locationName: string };
export type StaffMember = { id: string; name: string | null; email: string | null; phone: string | null; grants: StaffGrantView[] };

async function locationNames(supabase: NonNullable<ReturnType<typeof getServiceClient>>): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  const { data } = await supabase.from("locations").select("id, name");
  for (const l of data ?? []) m.set(l.id as string, l.name as string);
  return m;
}

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data: roleRows } = await supabase.from("staff_roles").select("profile_id, location_id, role");
  const ids = [...new Set((roleRows ?? []).map((r) => r.profile_id as string))];
  if (ids.length === 0) return [];

  const [{ data: profiles }, { data: users }, locs] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone").in("id", ids),
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    locationNames(supabase),
  ]);
  const emails = new Map<string, string>();
  for (const u of users?.users ?? []) if (u.email) emails.set(u.id, u.email);
  const profMap = new Map((profiles ?? []).map((p) => [p.id as string, p]));

  return ids.map((id) => ({
    id,
    name: (profMap.get(id)?.full_name as string | null) ?? null,
    email: emails.get(id) ?? null,
    phone: (profMap.get(id)?.phone as string | null) ?? null,
    grants: (roleRows ?? [])
      .filter((r) => r.profile_id === id)
      .map((r) => ({ role: r.role as Role, locationId: (r.location_id as string | null) ?? null, locationName: r.location_id ? (locs.get(r.location_id as string) ?? "—") : "All locations" })),
  })).sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
}

/* ---- Shifts (RLS: staff read at location) ----------------------------- */

export type ShiftRow = { id: string; profileId: string; staffName: string; locationId: string; startsAt: string; endsAt: string; position: string | null; notes: string | null };

function staffName(p: unknown): string {
  const x = p as { full_name?: string } | { full_name?: string }[] | null;
  const one = Array.isArray(x) ? x[0] : x;
  return one?.full_name ?? "—";
}

export async function listShifts(locationId: string, fromISO: string, toISO: string): Promise<ShiftRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("shifts")
    .select("id, profile_id, location_id, starts_at, ends_at, position, notes, profiles(full_name)")
    .eq("location_id", locationId)
    .gte("starts_at", fromISO)
    .lt("starts_at", toISO)
    .order("starts_at");
  return (data ?? []).map((s) => ({
    id: s.id as string,
    profileId: s.profile_id as string,
    staffName: staffName(s.profiles),
    locationId: s.location_id as string,
    startsAt: s.starts_at as string,
    endsAt: s.ends_at as string,
    position: (s.position as string | null) ?? null,
    notes: (s.notes as string | null) ?? null,
  }));
}

export async function listMyShifts(profileId: string, fromISO: string): Promise<ShiftRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("shifts")
    .select("id, profile_id, location_id, starts_at, ends_at, position, notes, locations(name)")
    .eq("profile_id", profileId)
    .gte("starts_at", fromISO)
    .order("starts_at")
    .limit(60);
  return (data ?? []).map((s) => ({
    id: s.id as string,
    profileId: s.profile_id as string,
    staffName: staffName(s.locations),
    locationId: s.location_id as string,
    startsAt: s.starts_at as string,
    endsAt: s.ends_at as string,
    position: (s.position as string | null) ?? null,
    notes: (s.notes as string | null) ?? null,
  }));
}

/* ---- Leave ------------------------------------------------------------ */

export type LeaveRow = { id: string; profileId: string; staffName: string; locationId: string | null; startDate: string; endDate: string; kind: string; reason: string | null; status: string; decidedAt: string | null };

function mapLeave(rows: Record<string, unknown>[] | null): LeaveRow[] {
  return (rows ?? []).map((l) => ({
    id: l.id as string,
    profileId: l.profile_id as string,
    staffName: staffName(l.profiles),
    locationId: (l.location_id as string | null) ?? null,
    startDate: l.start_date as string,
    endDate: l.end_date as string,
    kind: l.kind as string,
    reason: (l.reason as string | null) ?? null,
    status: l.status as string,
    decidedAt: (l.decided_at as string | null) ?? null,
  }));
}

export async function listLeave(locationId: string, statuses?: string[]): Promise<LeaveRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase
    .from("leave_requests")
    .select("id, profile_id, location_id, start_date, end_date, kind, reason, status, decided_at, profiles(full_name)")
    .eq("location_id", locationId)
    .order("start_date", { ascending: false })
    .limit(200);
  if (statuses?.length) q = q.in("status", statuses);
  const { data } = await q;
  return mapLeave(data as Record<string, unknown>[] | null);
}

export async function listMyLeave(profileId: string): Promise<LeaveRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("leave_requests")
    .select("id, profile_id, location_id, start_date, end_date, kind, reason, status, decided_at, profiles(full_name)")
    .eq("profile_id", profileId)
    .order("start_date", { ascending: false })
    .limit(100);
  return mapLeave(data as Record<string, unknown>[] | null);
}

/* ---- Daily operations summary (service client) ------------------------ */

export type OpsSummary = { orders: number; revenuePence: number; reservations: number; covers: number; onShift: number; pendingLeave: number };

export async function getOpsSummary(locationId: string, dayStartISO: string, dayEndISO: string): Promise<OpsSummary> {
  const supabase = getServiceClient();
  if (!supabase) return { orders: 0, revenuePence: 0, reservations: 0, covers: 0, onShift: 0, pendingLeave: 0 };

  const [{ data: orders }, { data: reservations }, { count: onShift }, { count: pendingLeave }] = await Promise.all([
    supabase.from("orders").select("total_pence, status").eq("location_id", locationId).gte("placed_at", dayStartISO).lt("placed_at", dayEndISO),
    supabase.from("reservations").select("party_size, status").eq("location_id", locationId).gte("starts_at", dayStartISO).lt("starts_at", dayEndISO),
    supabase.from("shifts").select("id", { count: "exact", head: true }).eq("location_id", locationId).gte("starts_at", dayStartISO).lt("starts_at", dayEndISO),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("location_id", locationId).eq("status", "pending"),
  ]);

  const REAL = new Set(["paid", "accepted", "preparing", "ready_for_collection", "out_for_delivery", "completed"]);
  let orderCount = 0, revenue = 0;
  for (const o of orders ?? []) if (REAL.has(o.status as string)) { orderCount++; revenue += (o.total_pence as number) ?? 0; }
  let resCount = 0, covers = 0;
  for (const r of reservations ?? []) if (r.status !== "cancelled" && r.status !== "no_show") { resCount++; covers += (r.party_size as number) ?? 0; }

  return { orders: orderCount, revenuePence: revenue, reservations: resCount, covers, onShift: onShift ?? 0, pendingLeave: pendingLeave ?? 0 };
}
