"use server";

import { after } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { checkSlot } from "@/lib/reservations/availability";
import { dateTimeToInstant, parse12h } from "@/lib/reservations/time";
import { buildEmailPayload, reservationReference } from "@/lib/reservations/format";
import { enqueueEmail, dispatchDue } from "@/lib/notifications/outbox";
import { ADMIN_NOTIFY_EMAIL } from "@/lib/email/provider";
import { experienceById, OCCASIONS, BOOKING_HORIZON_DAYS } from "@/lib/reservations/constants";
import { londonDateISO } from "@/lib/reservations/time";
import { rateLimit } from "@/lib/ratelimit";

export type BookingInput = {
  locationSlug: string;
  experience: string | null;
  dateISO: string; // yyyy-mm-dd (London)
  time: string | null; // "7:30 PM"
  guests: number;
  name: string;
  email: string;
  phone: string;
  occasion: string | null;
  requests: string;
};

export type SubmitResult =
  | { ok: true; reference: string; manageToken: string }
  | { ok: false; full?: true; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_PARTY = 12;

async function resolveLocation(slug: string): Promise<{ id: string; name: string } | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("locations")
    .select("id, name")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  return data ? { id: data.id as string, name: data.name as string } : null;
}

/** Full server-side validation — the client UI is not trusted. */
function validateCore(input: BookingInput): string | null {
  const name = input.name?.trim() ?? "";
  if (!name) return "Please enter your name.";
  if (name.length > 100) return "That name is too long.";
  const email = input.email?.trim() ?? "";
  if (!EMAIL_RE.test(email) || email.length > 254) return "Please enter a valid email.";
  if ((input.phone ?? "").trim().length > 30) return "That phone number is too long.";
  if ((input.requests ?? "").length > 1000) return "Special requests must be under 1000 characters.";
  if (!input.locationSlug || input.locationSlug.length > 50) return "Please choose a location.";

  if (!Number.isInteger(input.guests) || input.guests < 1) return "Please choose a party size.";
  if (input.guests > MAX_PARTY) return `For parties over ${MAX_PARTY}, please call us to book.`;

  if (!DATE_RE.test(input.dateISO ?? "")) return "Please choose a date.";
  const todayISO = londonDateISO(new Date());
  if (input.dateISO < todayISO) return "That date has passed — please choose another.";
  const horizon = londonDateISO(new Date(Date.now() + BOOKING_HORIZON_DAYS * 86400_000));
  if (input.dateISO > horizon) return `We take bookings up to ${BOOKING_HORIZON_DAYS} days ahead.`;

  if (input.experience != null && !experienceById(input.experience)) return "That experience isn't available.";
  if (input.occasion != null && !OCCASIONS.some((o) => o.id === input.occasion)) return "That occasion isn't available.";
  return null;
}

/** Create a confirmed guest reservation, or report the slot is full. */
export async function submitReservation(input: BookingInput): Promise<SubmitResult> {
  if (!(await rateLimit("reservation", { limit: 5, windowSec: 60, failClosed: true })).ok) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }
  const coreError = validateCore(input);
  if (coreError) return { ok: false, error: coreError };
  if (!input.time) return { ok: false, error: "Please choose a time." };

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Bookings are temporarily unavailable." };

  const loc = await resolveLocation(input.locationSlug);
  if (!loc) return { ok: false, error: "That location isn't available." };

  const hm = parse12h(input.time);
  if (!hm) return { ok: false, error: "That time isn't valid." };
  const startsAt = dateTimeToInstant(input.dateISO, hm.h, hm.m);

  const check = await checkSlot(loc.id, startsAt, input.guests);
  if (!check.ok) {
    if (check.reason === "full") return { ok: false, full: true, error: "That time is fully booked." };
    if (check.reason === "too_soon") return { ok: false, error: "That time has passed — please choose another." };
    return { ok: false, error: "That time isn't available — please choose another." };
  }

  const { data, error } = await supabase
    .from("reservations")
    .insert({
      location_id: loc.id,
      party_size: input.guests,
      occasion: input.occasion,
      experience: input.experience,
      starts_at: startsAt.toISOString(),
      duration_min: check.turnMinutes,
      status: "confirmed",
      guest_name: input.name.trim(),
      guest_email: input.email.trim(),
      guest_phone: input.phone?.trim() || null,
      special_requests: input.requests?.trim() || null,
      source: "web",
    })
    .select("id, manage_token")
    .single();

  if (error || !data) return { ok: false, error: "We couldn't save your booking — please try again." };

  const id = data.id as string;
  const manageToken = data.manage_token as string;
  const payload = buildEmailPayload({
    id,
    startsAt: startsAt.toISOString(),
    partySize: input.guests,
    occasion: input.occasion,
    experience: input.experience,
    guestName: input.name.trim(),
    manageToken,
    locationName: loc.name,
    durationMin: check.turnMinutes,
  });

  await enqueueEmail({
    template: "reservation_confirmation",
    to: input.email.trim(),
    toName: input.name.trim(),
    payload,
    reservationId: id,
  });
  await enqueueEmail({
    template: "admin_new_reservation",
    to: ADMIN_NOTIFY_EMAIL,
    payload: { ...payload, adminSummary: `${input.guests} guests · ${payload.dateLabel} ${payload.timeLabel}` },
    reservationId: id,
  });

  // Send the queued emails right away (after the response) instead of waiting
  // for the daily cron — the cron remains the retry/reminder fallback.
  after(() => dispatchDue(10));

  return { ok: true, reference: reservationReference(id), manageToken };
}

/** Add the guest to the waitlist for their chosen date. */
export async function joinWaitlist(input: BookingInput): Promise<{ ok: boolean; error?: string }> {
  if (!(await rateLimit("waitlist", { limit: 5, windowSec: 60 })).ok) {
    return { ok: false, error: "Too many attempts. Please wait a moment and try again." };
  }
  const coreError = validateCore(input);
  if (coreError) return { ok: false, error: coreError };

  const supabase = getServiceClient();
  if (!supabase) return { ok: false, error: "Unavailable right now." };

  const loc = await resolveLocation(input.locationSlug);
  if (!loc) return { ok: false, error: "That location isn't available." };

  // Desired window: the service span of the chosen day.
  const from = dateTimeToInstant(input.dateISO, 12, 0);
  const to = dateTimeToInstant(input.dateISO, 22, 0);

  const { error } = await supabase.from("waitlist_entries").insert({
    location_id: loc.id,
    party_size: input.guests,
    desired_from: from.toISOString(),
    desired_to: to.toISOString(),
    guest_name: input.name.trim(),
    guest_email: input.email.trim(),
    guest_phone: input.phone?.trim() || null,
    status: "waiting",
  });
  if (error) return { ok: false, error: "We couldn't add you to the waitlist — please try again." };

  await enqueueEmail({
    template: "waitlist_joined",
    to: input.email.trim(),
    toName: input.name.trim(),
    payload: {
      guestName: input.name.trim(),
      locationName: loc.name,
      dateLabel: new Date(from).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }),
      partySize: input.guests,
      experienceLabel: experienceById(input.experience)?.label,
    },
  });

  after(() => dispatchDue(10));

  return { ok: true };
}
