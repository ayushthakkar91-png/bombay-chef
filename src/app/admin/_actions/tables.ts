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

export async function updateSlot(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const maxCovers = intOrNull(form, "maxCovers");
  const isActive = bool(form, "isActive");
  if (!id || !locationId) return fail("Missing slot.");
  if (maxCovers != null && maxCovers < 0) return fail("Covers can't be negative.");

  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const patch: Record<string, unknown> = { is_active: isActive };
  if (maxCovers != null) patch.max_covers = maxCovers;

  const { error } = await supabase.from("reservation_slots").update(patch).eq("id", id);
  if (error) return fail(error.message);
  revalidateTables();
  return ok("Service window saved.");
}
