"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { dateTimeToInstant } from "@/lib/reservations/time";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

function parseHM(t: string): { h: number; m: number } | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  return m ? { h: Number(m[1]), m: Number(m[2]) } : null;
}

function buildTimes(dateISO: string, start: string, end: string): { starts: Date; ends: Date } | null {
  const s = parseHM(start), e = parseHM(end);
  if (!s || !e) return null;
  const starts = dateTimeToInstant(dateISO, s.h, s.m);
  let ends = dateTimeToInstant(dateISO, e.h, e.m);
  if (ends <= starts) ends = new Date(ends.getTime() + 24 * 3600 * 1000); // overnight shift
  return { starts, ends };
}

export async function saveShift(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const profileId = str(form, "profileId");
  const dateISO = str(form, "date");
  const startTime = str(form, "startTime");
  const endTime = str(form, "endTime");
  const position = str(form, "position") || null;
  const notes = str(form, "notes") || null;

  if (!locationId || !profileId || !dateISO || !startTime || !endTime) return fail("Staff member, date and times are required.");
  const ctx = await requireRole("location_manager", locationId);
  const times = buildTimes(dateISO, startTime, endTime);
  if (!times) return fail("Invalid times.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const row = { profile_id: profileId, location_id: locationId, starts_at: times.starts.toISOString(), ends_at: times.ends.toISOString(), position, notes };
  const { error } = id ? await supabase.from("shifts").update(row).eq("id", id) : await supabase.from("shifts").insert({ ...row, created_by: ctx.userId });
  if (error) return fail(error.message);

  revalidatePath("/admin/staff/shifts");
  return ok(id ? "Shift updated." : "Shift added.");
}

export async function deleteShift(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  if (!id || !locationId) return fail("Missing shift.");
  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("shifts").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/staff/shifts");
  return ok("Shift removed.");
}
