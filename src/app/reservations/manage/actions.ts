"use server";

import { revalidatePath } from "next/cache";

import { getServiceClient } from "@/lib/supabase/clients";
import { checkSlot } from "@/lib/reservations/availability";
import { dateTimeToInstant, parse12h } from "@/lib/reservations/time";
import { buildEmailPayload } from "@/lib/reservations/format";
import { enqueueEmail } from "@/lib/notifications/outbox";

type Result = { ok: boolean; error?: string };

async function loadByToken(token: string) {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("reservations")
    .select(
      "id, location_id, party_size, occasion, experience, starts_at, status, guest_name, guest_email, manage_token, locations(name)",
    )
    .eq("manage_token", token)
    .maybeSingle();
  if (!data) return null;
  const loc = data.locations as { name: string } | { name: string }[] | null;
  return {
    row: data,
    locationName: (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "Bombay Bicycle Chef",
  };
}

/** Guest-initiated modification via manage token. */
export async function modifyReservation(
  token: string,
  changes: { dateISO: string; time: string; guests: number; requests: string },
): Promise<Result> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable right now." };

  const found = await loadByToken(token);
  if (!found) return { ok: false, error: "We couldn't find that booking." };
  const { row, locationName } = found;
  const status = row.status as string;
  if (status === "cancelled" || status === "completed" || status === "no_show") {
    return { ok: false, error: "This booking can no longer be changed." };
  }

  const hm = parse12h(changes.time);
  if (!hm || !changes.dateISO || !changes.guests) return { ok: false, error: "Please choose a date, time and party size." };
  const startsAt = dateTimeToInstant(changes.dateISO, hm.h, hm.m);

  const check = await checkSlot(row.location_id as string, startsAt, changes.guests, row.id as string);
  if (!check.ok) {
    return { ok: false, error: check.reason === "full" ? "That time is fully booked." : "That time isn't available." };
  }

  const { error } = await supabase
    .from("reservations")
    .update({
      starts_at: startsAt.toISOString(),
      party_size: changes.guests,
      duration_min: check.turnMinutes,
      special_requests: changes.requests?.trim() || null,
    })
    .eq("id", row.id);
  if (error) return { ok: false, error: "We couldn't save the change — please try again." };

  const email = row.guest_email as string | null;
  if (email) {
    await enqueueEmail({
      template: "reservation_modification",
      to: email,
      toName: (row.guest_name as string) ?? undefined,
      reservationId: row.id as string,
      payload: buildEmailPayload({
        id: row.id as string,
        startsAt: startsAt.toISOString(),
        partySize: changes.guests,
        occasion: (row.occasion as string | null) ?? null,
        experience: (row.experience as string | null) ?? null,
        guestName: (row.guest_name as string | null) ?? null,
        manageToken: (row.manage_token as string | null) ?? null,
        locationName,
      }),
    });
  }

  revalidatePath(`/reservations/manage/${token}`);
  return { ok: true };
}

/** Guest-initiated cancellation via manage token. */
export async function cancelReservation(token: string): Promise<Result> {
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable right now." };

  const found = await loadByToken(token);
  if (!found) return { ok: false, error: "We couldn't find that booking." };
  const { row, locationName } = found;
  const status = row.status as string;
  if (status === "cancelled") return { ok: true };
  if (status === "completed" || status === "no_show") {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }

  const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", row.id);
  if (error) return { ok: false, error: "We couldn't cancel — please try again." };

  const email = row.guest_email as string | null;
  if (email) {
    await enqueueEmail({
      template: "reservation_cancellation",
      to: email,
      toName: (row.guest_name as string) ?? undefined,
      reservationId: row.id as string,
      payload: buildEmailPayload({
        id: row.id as string,
        startsAt: row.starts_at as string,
        partySize: row.party_size as number,
        occasion: (row.occasion as string | null) ?? null,
        experience: (row.experience as string | null) ?? null,
        guestName: (row.guest_name as string | null) ?? null,
        manageToken: (row.manage_token as string | null) ?? null,
        locationName,
      }),
    });
  }

  revalidatePath(`/reservations/manage/${token}`);
  return { ok: true };
}
