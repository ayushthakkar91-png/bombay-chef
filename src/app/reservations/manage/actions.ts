"use server";

import { after } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { checkSlot } from "@/lib/reservations/availability";
import { dateTimeToInstant, parse12h, formatInstantDate, formatInstantTime, londonDateISO } from "@/lib/reservations/time";
import { buildEmailPayload, reservationReference } from "@/lib/reservations/format";
import { enqueueEmail, dispatchDue } from "@/lib/notifications/outbox";
import { getManageView, type ManageView } from "@/lib/repositories/reservations";
import { BOOKING_HORIZON_DAYS } from "@/lib/reservations/constants";
import { rateLimit } from "@/lib/ratelimit";

/**
 * Guest manage flow. The manage link carries an unguessable token, but the
 * token alone is NOT enough: every read/change also requires the email address
 * the booking was made with, so a leaked or forwarded link can't be used to
 * view or change the reservation. All entry points are rate-limited.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PARTY = 12;
const GENERIC_ERR = "We couldn't find a booking matching those details.";
const RATE_ERR = "Too many attempts. Please wait a moment and try again.";

/** Client-safe view of a reservation (no email/phone/token echoes). */
export type ManageViewData = {
  status: ManageView["status"];
  reference: string;
  locationName: string;
  locationSlug: string;
  experience: string | null;
  occasion: string | null;
  guestName: string | null;
  dateLabel: string;
  timeLabel: string;
  dateISO: string;
  partySize: number;
  requests: string | null;
};

export type VerifyResult = { ok: true; view: ManageViewData } | { ok: false; error: string };
export type ChangeResult = { ok: true; view: ManageViewData } | { ok: false; error: string };

function toView(r: ManageView): ManageViewData {
  const start = new Date(r.startsAt);
  return {
    status: r.status,
    reference: reservationReference(r.id),
    locationName: r.locationName,
    locationSlug: r.locationSlug,
    experience: r.experience,
    occasion: r.occasion,
    guestName: r.guestName,
    dateLabel: formatInstantDate(start),
    timeLabel: formatInstantTime(start),
    dateISO: londonDateISO(start),
    partySize: r.partySize,
    requests: r.specialRequests,
  };
}

/** Token + booking-email check. Returns null (generic failure) on any mismatch. */
async function loadVerified(token: string, email: string): Promise<ManageView | null> {
  if (!token || !/^[A-Za-z0-9-]{16,64}$/.test(token)) return null;
  const supplied = email?.trim().toLowerCase() ?? "";
  if (!supplied || supplied.length > 254) return null;

  const r = await getManageView(token);
  if (!r) return null;
  const bookedWith = r.guestEmail?.trim().toLowerCase();
  if (!bookedWith || bookedWith !== supplied) return null;
  return r;
}

/** Step 1 of the manage page: unlock the booking with token + email. */
export async function verifyManage(token: string, email: string): Promise<VerifyResult> {
  if (!(await rateLimit("manage", { limit: 10, windowSec: 60 })).ok) {
    return { ok: false, error: RATE_ERR };
  }
  const r = await loadVerified(token, email);
  if (!r) return { ok: false, error: GENERIC_ERR };
  return { ok: true, view: toView(r) };
}

/** Guest-initiated modification via manage token + verified email. */
export async function modifyReservation(
  token: string,
  email: string,
  changes: { dateISO: string; time: string; guests: number; requests: string },
): Promise<ChangeResult> {
  if (!(await rateLimit("manage", { limit: 10, windowSec: 60 })).ok) {
    return { ok: false, error: RATE_ERR };
  }
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable right now." };

  const r = await loadVerified(token, email);
  if (!r) return { ok: false, error: GENERIC_ERR };
  if (r.status === "cancelled" || r.status === "completed" || r.status === "no_show") {
    return { ok: false, error: "This booking can no longer be changed." };
  }

  // Server-side validation — the form is not trusted.
  if (!Number.isInteger(changes.guests) || changes.guests < 1) return { ok: false, error: "Please choose a party size." };
  if (changes.guests > MAX_PARTY) return { ok: false, error: `For parties over ${MAX_PARTY}, please call us.` };
  if ((changes.requests ?? "").length > 1000) return { ok: false, error: "Special requests must be under 1000 characters." };
  if (!DATE_RE.test(changes.dateISO ?? "")) return { ok: false, error: "Please choose a date." };
  const todayISO = londonDateISO(new Date());
  if (changes.dateISO < todayISO) return { ok: false, error: "That date has passed — please choose another." };
  const horizon = londonDateISO(new Date(Date.now() + BOOKING_HORIZON_DAYS * 86400_000));
  if (changes.dateISO > horizon) return { ok: false, error: `We take bookings up to ${BOOKING_HORIZON_DAYS} days ahead.` };

  const hm = parse12h(changes.time);
  if (!hm) return { ok: false, error: "Please choose a date, time and party size." };
  const startsAt = dateTimeToInstant(changes.dateISO, hm.h, hm.m);

  const check = await checkSlot(r.locationId, startsAt, changes.guests, r.id);
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
    .eq("id", r.id);
  if (error) return { ok: false, error: "We couldn't save the change — please try again." };

  if (r.guestEmail) {
    await enqueueEmail({
      template: "reservation_modification",
      to: r.guestEmail,
      toName: r.guestName ?? undefined,
      reservationId: r.id,
      payload: buildEmailPayload({
        id: r.id,
        startsAt: startsAt.toISOString(),
        partySize: changes.guests,
        occasion: r.occasion,
        experience: r.experience,
        guestName: r.guestName,
        manageToken: r.manageToken,
        locationName: r.locationName,
        durationMin: check.turnMinutes,
      }),
    });
    // Deliver immediately (after the response); the daily cron is the retry path.
    after(() => dispatchDue(10));
  }

  return {
    ok: true,
    view: toView({
      ...r,
      startsAt: startsAt.toISOString(),
      partySize: changes.guests,
      specialRequests: changes.requests?.trim() || null,
    }),
  };
}

/** Guest-initiated cancellation via manage token + verified email. */
export async function cancelReservation(token: string, email: string): Promise<ChangeResult> {
  if (!(await rateLimit("manage", { limit: 10, windowSec: 60 })).ok) {
    return { ok: false, error: RATE_ERR };
  }
  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable right now." };

  const r = await loadVerified(token, email);
  if (!r) return { ok: false, error: GENERIC_ERR };
  if (r.status === "cancelled") return { ok: true, view: toView(r) };
  if (r.status === "completed" || r.status === "no_show") {
    return { ok: false, error: "This booking can no longer be cancelled." };
  }

  const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", r.id);
  if (error) return { ok: false, error: "We couldn't cancel — please try again." };

  if (r.guestEmail) {
    await enqueueEmail({
      template: "reservation_cancellation",
      to: r.guestEmail,
      toName: r.guestName ?? undefined,
      reservationId: r.id,
      payload: buildEmailPayload({
        id: r.id,
        startsAt: r.startsAt,
        partySize: r.partySize,
        occasion: r.occasion,
        experience: r.experience,
        guestName: r.guestName,
        manageToken: r.manageToken,
        locationName: r.locationName,
      }),
    });
    after(() => dispatchDue(10));
  }

  return { ok: true, view: toView({ ...r, status: "cancelled" }) };
}
