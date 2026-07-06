import { getServiceClient } from "@/lib/supabase/clients";
import { branchAddress, reservationReference, manageUrl } from "@/lib/reservations/format";

export const dynamic = "force-dynamic";

/** Escape ICS text values (RFC 5545): backslash, semicolon, comma, newline. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** UTC instant in ICS basic format, e.g. 20260711T173000Z. */
function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/**
 * GET /api/ics/[token] — downloadable calendar event for a reservation, looked
 * up by its manage token (the same secret used for the manage-booking page).
 * Linked from confirmation emails so guests can add the booking to their phone
 * calendar (Apple/Outlook); Google gets a render link instead.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });

  const supabase = getServiceClient();
  if (!supabase) return new Response("Unavailable", { status: 503 });

  const { data } = await supabase
    .from("reservations")
    .select("id, starts_at, duration_min, party_size, status, locations(name)")
    .eq("manage_token", token)
    .maybeSingle();
  if (!data || data.status === "cancelled") return new Response("Not found", { status: 404 });

  const loc = data.locations as { name: string } | { name: string }[] | null;
  const locationName = (Array.isArray(loc) ? loc[0]?.name : loc?.name) ?? "Bombay Bicycle Chef";
  const start = new Date(data.starts_at as string);
  const end = new Date(start.getTime() + ((data.duration_min as number) ?? 120) * 60000);
  const reference = reservationReference(data.id as string);

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bombay Bicycle Chef//Reservations//EN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${data.id}@bombaybicyclechef.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Table at Bombay Bicycle Chef — ${locationName}`)}`,
    `LOCATION:${esc(branchAddress(locationName) ?? `Bombay Bicycle Chef ${locationName}`)}`,
    `DESCRIPTION:${esc(`${data.party_size} guests · Reference ${reference}\nManage your booking: ${manageUrl(token) ?? ""}`)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="bombay-bicycle-chef-${reference}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
