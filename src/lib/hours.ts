/** Structured opening hours shared by the locations pages and JSON-LD schema.
 *  A branch can have several services (dine-in, delivery, takeaway), each with
 *  its own weekly schedule. Days are ordered Monday → Sunday. */

/** Open/close as 24h "HH:MM"; `null` means closed that day. */
export type DayHours = { open: string; close: string } | null;

/** Seven entries, Monday → Sunday. */
export type WeeklyHours = readonly DayHours[];

export type ServiceHours = { label: string; weekly: WeeklyHours };

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const DAY_LONG = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

/** `"17:30"` → `"5:30pm"`, `"23:00"` → `"11pm"`, `"12:00"` → `"12pm"`. */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const mer = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh}${mer}` : `${hh}:${String(m).padStart(2, "0")}${mer}`;
}

/** A day's hours as `"5:30pm – 11pm"`, or `"Closed"`. */
export function formatDay(d: DayHours): string {
  return d ? `${formatTime(d.open)} – ${formatTime(d.close)}` : "Closed";
}

export type HoursRow = { days: string; hours: string };

function sameDay(a: DayHours, b: DayHours): boolean {
  if (a === null || b === null) return a === b;
  return a.open === b.open && a.close === b.close;
}

/** Collapse consecutive days with identical hours into compact rows, e.g.
 *  `[{ days: "Mon–Wed", hours: "5:30pm – 11pm" }, …]`. */
export function groupWeekly(weekly: WeeklyHours): HoursRow[] {
  const rows: HoursRow[] = [];
  let start = 0;
  for (let i = 1; i <= weekly.length; i++) {
    if (i < weekly.length && sameDay(weekly[i], weekly[start])) continue;
    const end = i - 1;
    const days = start === end ? DAY_SHORT[start] : `${DAY_SHORT[start]}–${DAY_SHORT[end]}`;
    rows.push({ days, hours: formatDay(weekly[start]) });
    start = i;
  }
  return rows;
}

export type OpeningHoursSpec = { "@type": "OpeningHoursSpecification"; dayOfWeek: string[]; opens: string; closes: string };

/** JSON-LD `OpeningHoursSpecification[]` — one entry per block of consecutive
 *  days sharing the same hours; closed days are omitted. */
export function weeklyToSchema(weekly: WeeklyHours): OpeningHoursSpec[] {
  const specs: OpeningHoursSpec[] = [];
  let start = 0;
  for (let i = 1; i <= weekly.length; i++) {
    if (i < weekly.length && sameDay(weekly[i], weekly[start])) continue;
    const block = weekly[start];
    if (block) {
      const days = DAY_LONG.slice(start, i);
      specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: days, opens: block.open, closes: block.close });
    }
    start = i;
  }
  return specs;
}
