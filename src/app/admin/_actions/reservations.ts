"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str, intOrNull } from "@/lib/admin/validation";
import { checkSlot } from "@/lib/reservations/availability";
import { dateTimeToInstant } from "@/lib/reservations/time";
import { enqueueReservationEmail } from "@/lib/notifications/outbox";
import { STATUS_TRANSITIONS, type ReservationStatus } from "@/lib/reservations/constants";

function revalidateAll() {
  revalidatePath("/admin/reservations");
  revalidatePath("/admin/reservations/calendar");
  revalidatePath("/admin/reservations/waitlist");
}

/** "HH:MM" → {h,m}. */
function parseHM(t: string): { h: number; m: number } | null {
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return { h: Number(m[1]), m: Number(m[2]) };
}

/* ---- Reservations ----------------------------------------------------- */

export async function setReservationStatus(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const next = str(form, "status") as ReservationStatus;
  const current = str(form, "current") as ReservationStatus;
  if (!id || !locationId) return fail("Missing reservation.");

  await requireRole("staff", locationId);

  if (current && !STATUS_TRANSITIONS[current]?.includes(next)) {
    return fail(`Can't move a ${current} booking to ${next}.`);
  }

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("reservations").update({ status: next }).eq("id", id);
  if (error) return fail(error.message);

  if (next === "cancelled") {
    await enqueueReservationEmail(id, "reservation_cancellation", { reason: "by the restaurant" });
  }
  revalidateAll();
  return ok(`Marked ${next}.`);
}

/** Move/modify a booking: date, time, party size and requests in one edit. */
export async function moveReservation(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  const dateISO = str(form, "date");
  const time = str(form, "time");
  const partySize = intOrNull(form, "partySize") ?? 0;
  const requests = str(form, "requests");
  if (!id || !locationId || !dateISO || !time) return fail("Date, time and party size are required.");
  if (partySize < 1) return fail("Party size must be at least 1.");

  await requireRole("staff", locationId);
  const hm = parseHM(time);
  if (!hm) return fail("Invalid time.");
  const startsAt = dateTimeToInstant(dateISO, hm.h, hm.m);

  const check = await checkSlot(locationId, startsAt, partySize, id);
  if (!check.ok && check.reason === "full") {
    return fail("That time is fully booked. Block-override or pick another time.");
  }

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase
    .from("reservations")
    .update({
      starts_at: startsAt.toISOString(),
      duration_min: check.turnMinutes,
      party_size: partySize,
      special_requests: requests || null,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  await enqueueReservationEmail(id, "reservation_modification");
  revalidateAll();
  return ok("Booking updated.");
}

/* ---- Waitlist --------------------------------------------------------- */

export async function convertWaitlist(_p: ActionState, form: FormData): Promise<ActionState> {
  const waitlistId = str(form, "waitlistId");
  const locationId = str(form, "locationId");
  const dateISO = str(form, "date");
  const time = str(form, "time");
  if (!waitlistId || !locationId || !dateISO || !time) return fail("Pick a date and time to offer.");

  await requireRole("staff", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");

  const { data: entry } = await supabase
    .from("waitlist_entries")
    .select("party_size, guest_name, guest_email, guest_phone")
    .eq("id", waitlistId)
    .maybeSingle();
  if (!entry) return fail("Waitlist entry not found.");

  const hm = parseHM(time);
  if (!hm) return fail("Invalid time.");
  const startsAt = dateTimeToInstant(dateISO, hm.h, hm.m);
  const check = await checkSlot(locationId, startsAt, entry.party_size as number);
  if (!check.ok && check.reason === "full") return fail("That time is fully booked.");

  const { data: created, error } = await supabase
    .from("reservations")
    .insert({
      location_id: locationId,
      party_size: entry.party_size,
      starts_at: startsAt.toISOString(),
      duration_min: check.turnMinutes,
      status: "confirmed",
      guest_name: entry.guest_name,
      guest_email: entry.guest_email,
      guest_phone: entry.guest_phone,
      source: "phone",
    })
    .select("id")
    .single();
  if (error || !created) return fail(error?.message ?? "Couldn't create the booking.");

  await supabase.from("waitlist_entries").update({ status: "converted" }).eq("id", waitlistId);
  await enqueueReservationEmail(created.id as string, "reservation_confirmation");
  revalidateAll();
  return ok("Booking created from waitlist.");
}

export async function removeWaitlist(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  if (!id || !locationId) return fail("Missing entry.");
  await requireRole("staff", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("waitlist_entries").update({ status: "cancelled" }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/reservations/waitlist");
  return ok("Removed from waitlist.");
}

/* ---- Blocks / closures ------------------------------------------------ */

export async function addBlock(_p: ActionState, form: FormData): Promise<ActionState> {
  const locationId = str(form, "locationId");
  const dateISO = str(form, "date");
  const startTime = str(form, "startTime");
  const endTime = str(form, "endTime");
  const kind = str(form, "kind") === "closure" ? "closure" : "block";
  const reason = str(form, "reason");
  if (!locationId || !dateISO || !startTime || !endTime) return fail("Date and time range are required.");

  await requireRole("staff", locationId);
  const s = parseHM(startTime);
  const e = parseHM(endTime);
  if (!s || !e) return fail("Invalid time.");
  const startsAt = dateTimeToInstant(dateISO, s.h, s.m);
  const endsAt = dateTimeToInstant(dateISO, e.h, e.m);
  if (endsAt <= startsAt) return fail("End time must be after start time.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("reservation_blocks").insert({
    location_id: locationId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    kind,
    reason: reason || null,
  });
  if (error) return fail(error.message);
  revalidatePath("/admin/reservations/tables");
  return ok(kind === "closure" ? "Closure added." : "Block added.");
}

export async function removeBlock(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const locationId = str(form, "locationId");
  if (!id || !locationId) return fail("Missing block.");
  await requireRole("staff", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Database not connected.");
  const { error } = await supabase.from("reservation_blocks").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/reservations/tables");
  return ok("Removed.");
}
