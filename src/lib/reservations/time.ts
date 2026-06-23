import { RESTAURANT_TZ } from "./constants";

/**
 * Timezone helpers for reservations. The restaurant runs on Europe/London wall
 * time (GMT/BST). We store `starts_at` as an absolute timestamptz, so we must
 * convert a London wall-clock date+time to the correct UTC instant accounting
 * for DST — done here with Intl, no external date library.
 */

/** Minutes that `tz` is ahead of UTC at the given absolute instant. */
function tzOffsetMinutes(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p = dtf.formatToParts(date).reduce<Record<string, string>>((a, x) => {
    a[x.type] = x.value;
    return a;
  }, {});
  const asUTC = Date.UTC(
    +p.year,
    +p.month - 1,
    +p.day,
    +p.hour === 24 ? 0 : +p.hour,
    +p.minute,
    +p.second,
  );
  return (asUTC - date.getTime()) / 60000;
}

/** Convert a London wall-clock (y, m[0-11], d, h, min) to a UTC Date. */
export function londonWallToUtc(
  y: number,
  m: number,
  d: number,
  h: number,
  min: number,
): Date {
  let ts = Date.UTC(y, m, d, h, min);
  const off1 = tzOffsetMinutes(new Date(ts), RESTAURANT_TZ);
  ts = Date.UTC(y, m, d, h, min) - off1 * 60000;
  // Re-check once for the rare DST-boundary case.
  const off2 = tzOffsetMinutes(new Date(ts), RESTAURANT_TZ);
  if (off2 !== off1) ts = Date.UTC(y, m, d, h, min) - off2 * 60000;
  return new Date(ts);
}

/** `"2026-07-04"` + `{h,m}` (London) → absolute Date. */
export function dateTimeToInstant(dateISO: string, h: number, m: number): Date {
  const [y, mo, d] = dateISO.split("-").map(Number);
  return londonWallToUtc(y, mo - 1, d, h, m);
}

/** Weekday (0=Sun … 6=Sat) for a `yyyy-mm-dd` date in London. */
export function weekdayOf(dateISO: string): number {
  const [y, mo, d] = dateISO.split("-").map(Number);
  // Noon London on date d lands on date d in UTC too (offset is 0/+1h), so the
  // UTC weekday of that instant is the calendar weekday.
  return londonWallToUtc(y, mo - 1, d, 12, 0).getUTCDay();
}

/** Parse `"6:30 PM"` / `"12:00 PM"` → `{ h, m }` (24h). */
export function parse12h(label: string): { h: number; m: number } | null {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = Number(match[1]);
  const m = Number(match[2]);
  const mer = match[3].toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return { h, m };
}

/** `{h,m}` → `"6:30 PM"`. */
export function format12h(h: number, m: number): string {
  const mer = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${mer}`;
}

/** `"HH:MM[:SS]"` (Postgres time) → minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Format an absolute instant as London time, e.g. "7:30 PM". */
export function formatInstantTime(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TZ,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/** Format an absolute instant as a London date, e.g. "Sat 4 Jul 2026". */
export function formatInstantDate(d: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

/** London wall-clock hour+minute for an absolute instant. */
export function londonHM(d: Date): { h: number; m: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: RESTAURANT_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0") % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return { h, m };
}

/** `yyyy-mm-dd` for an instant, in London. */
export function londonDateISO(d: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: RESTAURANT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return p; // en-CA yields yyyy-mm-dd
}
