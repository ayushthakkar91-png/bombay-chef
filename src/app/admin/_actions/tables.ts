"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str, intOrNull, bool } from "@/lib/admin/validation";

function revalidateTables() {
  revalidatePath("/admin/reservations/tables");
}

export async function upsertTable(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const name = str(form, "name");
  const seats = intOrNull(form, "seats") ?? 0;
  const minParty = intOrNull(form, "minParty") ?? 1;
  const maxParty = intOrNull(form, "maxParty") ?? seats;
  const zone = str(form, "zone") || null;
  const isActive = bool(form, "isActive");

  if (!locationId || !name) return fail("Name is required.");
  if (seats < 1) return fail("Seats must be at least 1.", { seats: "Min 1." });

  await requireRole("staff", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const row = {
    location_id: locationId,
    name,
    seats,
    min_party: minParty,
    max_party: maxParty,
    zone,
    is_active: isActive,
  };
  const { error } = id
    ? await supabase.from("tables").update(row).eq("id", id)
    : await supabase.from("tables").insert(row);

  if (error) {
    if (error.code === "23505") return fail("A table with that name already exists here.", { name: "Already in use." });
    return fail(error.message);
  }
  revalidateTables();
  return ok(id ? "Table saved." : "Table added.");
}

export async function deleteTable(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  if (!id || !locationId) return fail("Missing table.");
  await requireRole("staff", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("tables").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateTables();
  return ok("Table removed.");
}

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function upsertSlot(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const weekday = intOrNull(form, "weekday");
  const serviceStart = str(form, "serviceStart");
  const serviceEnd = str(form, "serviceEnd");
  const slotMinutes = intOrNull(form, "slotMinutes") ?? 15;
  const turnMinutes = intOrNull(form, "turnMinutes") ?? 120;
  const maxCovers = intOrNull(form, "maxCovers");
  const isActive = bool(form, "isActive");

  if (!locationId) return fail("Missing location.");
  if (weekday == null || weekday < 0 || weekday > 6) return fail("Pick a day of the week.");
  if (!TIME_RE.test(serviceStart)) return fail("Start time must be HH:MM.", { serviceStart: "Use 24h HH:MM." });
  if (!TIME_RE.test(serviceEnd)) return fail("End time must be HH:MM.", { serviceEnd: "Use 24h HH:MM." });
  if (serviceEnd <= serviceStart) return fail("End must be after start.", { serviceEnd: "Must be after start." });
  if (slotMinutes < 5 || slotMinutes > 120) return fail("Booking interval must be 5–120 minutes.", { slotMinutes: "5–120." });
  if (turnMinutes < 30 || turnMinutes > 300) return fail("Table turn must be 30–300 minutes.", { turnMinutes: "30–300." });
  if (maxCovers == null || maxCovers < 0 || maxCovers > 1000) return fail("Max covers must be 0–1000.", { maxCovers: "0–1000." });

  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const row = {
    location_id: locationId,
    weekday,
    service_start: serviceStart,
    service_end: serviceEnd,
    slot_minutes: slotMinutes,
    turn_minutes: turnMinutes,
    max_covers: maxCovers,
    is_active: isActive,
  };
  const { error } = id
    ? await supabase.from("reservation_slots").update(row).eq("id", id)
    : await supabase.from("reservation_slots").insert(row);

  if (error) return fail(error.message);
  revalidateTables();
  return ok(id ? "Service window saved." : "Service window added.");
}

export async function deleteSlot(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  if (!id || !locationId) return fail("Missing slot.");
  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("reservation_slots").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateTables();
  return ok("Service window removed.");
}
