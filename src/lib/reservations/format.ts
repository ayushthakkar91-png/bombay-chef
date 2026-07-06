import { experienceById, OCCASIONS } from "./constants";
import { formatInstantDate, formatInstantTime } from "./time";
import { BRANCHES } from "@/data/locations";
import type { ReservationEmailPayload } from "@/lib/email/templates";

/** Public site origin for building manage links in emails. */
export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** Short human reference shown to guests, e.g. "BBC-3F9A2C". */
export function reservationReference(id: string): string {
  return `BBC-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

export function occasionLabel(id: string | null | undefined): string | undefined {
  return OCCASIONS.find((o) => o.id === id)?.label;
}

export function manageUrl(token: string | null | undefined): string | undefined {
  return token ? `${siteUrl()}/reservations/manage/${token}` : undefined;
}

/** Street address for a branch, matched by display name (best effort). */
export function branchAddress(locationName: string): string | undefined {
  const b = BRANCHES.find((br) => br.name === locationName);
  return b ? `${b.street}, ${b.locality} ${b.postcode}` : undefined;
}

/** UTC instant in Google Calendar's basic format, e.g. 20260711T173000Z. */
function gcalStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** "Add to Google Calendar" deep link for a reservation. */
export function googleCalendarUrl(r: {
  start: Date;
  durationMin: number;
  locationName: string;
  reference: string;
  manageUrl?: string;
}): string {
  const end = new Date(r.start.getTime() + r.durationMin * 60000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Table at Bombay Bicycle Chef — ${r.locationName}`,
    dates: `${gcalStamp(r.start)}/${gcalStamp(end)}`,
    details: `Reference ${r.reference}${r.manageUrl ? `\nManage your booking: ${r.manageUrl}` : ""}`,
    location: branchAddress(r.locationName) ?? `Bombay Bicycle Chef ${r.locationName}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build the email payload from a reservation + its location name. */
export function buildEmailPayload(r: {
  id: string;
  startsAt: string;
  partySize: number;
  occasion: string | null;
  experience?: string | null;
  guestName: string | null;
  manageToken: string | null;
  locationName: string;
  /** Turn length for calendar events; defaults to 120 min when unknown. */
  durationMin?: number;
}): ReservationEmailPayload {
  const start = new Date(r.startsAt);
  const reference = reservationReference(r.id);
  const manage = manageUrl(r.manageToken);
  return {
    guestName: r.guestName ?? undefined,
    locationName: r.locationName,
    dateLabel: formatInstantDate(start),
    timeLabel: formatInstantTime(start),
    partySize: r.partySize,
    experienceLabel: experienceById(r.experience)?.label,
    occasionLabel: occasionLabel(r.occasion),
    reference,
    manageUrl: manage,
    calendarGoogleUrl: googleCalendarUrl({
      start,
      durationMin: r.durationMin ?? 120,
      locationName: r.locationName,
      reference,
      manageUrl: manage,
    }),
    calendarIcsUrl: r.manageToken ? `${siteUrl()}/api/ics/${r.manageToken}` : undefined,
  };
}
