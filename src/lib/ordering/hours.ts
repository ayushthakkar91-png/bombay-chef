/**
 * When a branch takes online orders, and what a customer may schedule.
 *
 * Pure, and free of the database, so the rules can be tested directly. Every
 * decision here is made in LONDON wall-clock time: the server runs in UTC, the
 * kitchen does not, and "we close at 22:30" means half past ten in Balham on
 * the day in question — which is a different instant in June and December.
 *
 * Weekdays are 0=Sunday through 6=Saturday, matching both JavaScript's
 * Date.getDay() and Postgres's extract(dow).
 */

export type Fulfilment = "collection" | "delivery";

export type DayHours = {
  /** Collection and delivery keep their own hours: the counter can hand food
   *  over later than a driver can be sent out and still get back. */
  fulfilment: Fulfilment;
  /** 0 = Sunday … 6 = Saturday */
  weekday: number;
  /** "17:30" — wall-clock, London. */
  opensAt: string;
  /** "22:30". Always later in the day than opensAt; we do not trade past midnight. */
  closesAt: string;
  /** A day the branch takes no online orders at all. */
  isOpen: boolean;
};

const ZONE = "Europe/London";

const PARTS = new Intl.DateTimeFormat("en-GB", {
  timeZone: ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export type LondonTime = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
  /** Minutes since midnight, London. */
  minutesOfDay: number;
};

/** An instant, read as a London wall clock. */
export function londonTime(at: Date): LondonTime {
  const parts = Object.fromEntries(PARTS.formatToParts(at).map((p) => [p.type, p.value])) as Record<string, string>;
  // Intl renders 24:00 for midnight in some runtimes; normalise it to 0.
  const hour = Number(parts.hour) % 24;
  const minute = Number(parts.minute);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute,
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
    minutesOfDay: hour * 60 + minute,
  };
}

/** "17:30" → 1050. Returns null for anything unparseable. */
export function minutesOfDay(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** 1050 → "17:30". */
export function hhmm(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * The instant at which a London wall-clock time occurs.
 *
 * Done by correction rather than arithmetic on a fixed offset: guess the
 * instant as if London were UTC, see what the clock there actually reads, and
 * shift by the difference. The second pass settles the two days a year when
 * the clocks change, where the first guess lands on the wrong side of the
 * transition.
 */
export function londonInstant(year: number, month: number, day: number, mins: number): Date {
  let guess = Date.UTC(year, month - 1, day, Math.floor(mins / 60), mins % 60, 0);
  for (let i = 0; i < 2; i++) {
    const seen = londonTime(new Date(guess));
    const seenUtc = Date.UTC(seen.year, seen.month - 1, seen.day, seen.hour, seen.minute, 0);
    const wantUtc = Date.UTC(year, month - 1, day, Math.floor(mins / 60), mins % 60, 0);
    const drift = wantUtc - seenUtc;
    if (drift === 0) break;
    guess += drift;
  }
  return new Date(guess);
}

/** The hours for the day `at` falls on, or null when the branch is shut. */
export function hoursFor(hours: DayHours[], at: Date, fulfilment: Fulfilment): DayHours | null {
  const { weekday } = londonTime(at);
  const day = hours.find((h) => h.weekday === weekday && h.fulfilment === fulfilment);
  if (!day || !day.isOpen) return null;
  return day;
}

/** Is the branch taking orders right now? */
export function isOpenAt(hours: DayHours[], at: Date, fulfilment: Fulfilment): boolean {
  const day = hoursFor(hours, at, fulfilment);
  if (!day) return false;
  const open = minutesOfDay(day.opensAt);
  const close = minutesOfDay(day.closesAt);
  if (open == null || close == null) return false;
  const { minutesOfDay: nowMins } = londonTime(at);
  return nowMins >= open && nowMins < close;
}

/**
 * Times a customer may choose for a collection or delivery TODAY.
 *
 * Today only, deliberately: a pre-order for tomorrow is one more thing to
 * remember overnight, and an order nobody remembers is worse than an order
 * never taken.
 *
 * The first slot is never sooner than the kitchen can cook — `leadMinutes`,
 * which is the branch's own prep time (plus the drive, for delivery). Slots
 * are rounded up to the next step so the list reads 18:00, 18:15, 18:30
 * rather than 17:52, 18:07.
 */
export function slotsForToday(
  hours: DayHours[],
  now: Date,
  fulfilment: Fulfilment,
  opts: { leadMinutes: number; stepMinutes?: number },
): Date[] {
  const step = Math.max(5, opts.stepMinutes ?? 15);
  const day = hoursFor(hours, now, fulfilment);
  if (!day) return [];

  const open = minutesOfDay(day.opensAt);
  const close = minutesOfDay(day.closesAt);
  if (open == null || close == null || close <= open) return [];

  const t = londonTime(now);
  const earliest = Math.max(open, t.minutesOfDay + Math.max(0, opts.leadMinutes));
  const first = Math.ceil(earliest / step) * step;

  const out: Date[] = [];
  // Last order goes in at closing time, not after it: a slot AT 22:30 is the
  // final one, and anything past it is tomorrow's problem.
  for (let m = first; m <= close; m += step) {
    out.push(londonInstant(t.year, t.month, t.day, m));
  }
  return out;
}

/** When the branch next opens, looking up to a week ahead. Null if never. */
export function nextOpening(hours: DayHours[], from: Date, fulfilment: Fulfilment): Date | null {
  const t = londonTime(from);
  for (let i = 0; i < 8; i++) {
    const weekday = (t.weekday + i) % 7;
    const day = hours.find((h) => h.weekday === weekday && h.fulfilment === fulfilment);
    if (!day || !day.isOpen) continue;
    const open = minutesOfDay(day.opensAt);
    const close = minutesOfDay(day.closesAt);
    if (open == null || close == null) continue;
    // Today only counts if there is still time left to order.
    if (i === 0 && t.minutesOfDay >= close) continue;
    const mins = i === 0 ? Math.max(open, t.minutesOfDay) : open;
    if (i === 0 && t.minutesOfDay >= open) return from; // already open
    const d = new Date(from.getTime() + i * 86_400_000);
    const onDay = londonTime(d);
    return londonInstant(onDay.year, onDay.month, onDay.day, mins);
  }
  return null;
}

/**
 * Is this a time the kitchen agreed to? Checked server-side on every order,
 * because the slot list came from the browser and the browser can say anything.
 */
export function isValidSlot(
  hours: DayHours[],
  now: Date,
  slot: Date,
  fulfilment: Fulfilment,
  opts: { leadMinutes: number; stepMinutes?: number },
): boolean {
  return slotsForToday(hours, now, fulfilment, opts).some((s) => s.getTime() === slot.getTime());
}

/** How a closed branch reads to a customer. */
export function closedMessage(hours: DayHours[], now: Date, fulfilment: Fulfilment): string {
  const next = nextOpening(hours, now, fulfilment);
  if (!next) return "We're not taking online orders at the moment.";
  const t = londonTime(next);
  const nowT = londonTime(now);
  const when = t.day === nowT.day && t.month === nowT.month ? "today" : "tomorrow";
  return `We're closed just now — ordering opens ${when} at ${hhmm(t.minutesOfDay)}.`;
}
