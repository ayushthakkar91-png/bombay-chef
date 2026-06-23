import { experienceById, OCCASIONS } from "./constants";
import { formatInstantDate, formatInstantTime } from "./time";
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
}): ReservationEmailPayload {
  const start = new Date(r.startsAt);
  return {
    guestName: r.guestName ?? undefined,
    locationName: r.locationName,
    dateLabel: formatInstantDate(start),
    timeLabel: formatInstantTime(start),
    partySize: r.partySize,
    experienceLabel: experienceById(r.experience)?.label,
    occasionLabel: occasionLabel(r.occasion),
    reference: reservationReference(r.id),
    manageUrl: manageUrl(r.manageToken),
  };
}
