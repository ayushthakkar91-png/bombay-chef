import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listReservationsBetween } from "@/lib/repositories/reservations";
import { dateTimeToInstant, londonDateISO } from "@/lib/reservations/time";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";

type View = "week" | "month";

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function mondayOf(d: Date): Date {
  const dow = d.getDay();
  return addDays(d, dow === 0 ? -6 : 1 - dow);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; date?: string; view?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;

  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (
      <>
        <PageHeader title="Calendar" />
        <p className="text-sm text-body">No locations are assigned to your account yet.</p>
      </>
    );
  }

  const loc = scoped.find((l) => l.slug === sp.loc || l.id === sp.loc) ?? scoped[0];
  const locId = loc.id;
  const locSlug = loc.slug;
  const view: View = sp.view === "month" ? "month" : "week";
  const anchorISO = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : londonDateISO(new Date());
  const anchor = new Date(`${anchorISO}T12:00:00`);

  // Build the grid of dates.
  let gridStart: Date;
  let cellCount: number;
  if (view === "week") {
    gridStart = mondayOf(anchor);
    cellCount = 7;
  } else {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    gridStart = mondayOf(first);
    cellCount = 42;
  }
  const cells = Array.from({ length: cellCount }, (_, i) => addDays(gridStart, i));
  const gridEnd = addDays(gridStart, cellCount);

  const reservations = await listReservationsBetween(
    locId,
    dateTimeToInstant(iso(gridStart), 0, 0).toISOString(),
    dateTimeToInstant(iso(gridEnd), 0, 0).toISOString(),
  );

  // Aggregate active bookings per day.
  const byDay = new Map<string, { count: number; covers: number }>();
  for (const r of reservations) {
    if (r.status === "cancelled" || r.status === "no_show") continue;
    const key = londonDateISO(new Date(r.startsAt));
    const cur = byDay.get(key) ?? { count: 0, covers: 0 };
    cur.count += 1;
    cur.covers += r.partySize;
    byDay.set(key, cur);
  }

  const prevAnchor = view === "week" ? iso(addDays(anchor, -7)) : iso(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  const nextAnchor = view === "week" ? iso(addDays(anchor, 7)) : iso(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  const navUrl = (d: string) => `/admin/reservations/calendar?loc=${locSlug}&view=${view}&date=${d}`;
  const todayISO = londonDateISO(new Date());
  const heading =
    view === "week"
      ? `Week of ${new Date(`${iso(gridStart)}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`
      : anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader title="Calendar" actions={<LocationSwitcher locations={scoped} current={locId} />} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={navUrl(prevAnchor)} aria-label="Previous" className="rounded-md border border-sand bg-surface p-2 text-body hover:bg-sand/50"><ChevronLeft className="h-4 w-4" /></Link>
          <span className="min-w-44 text-center text-sm font-medium text-text">{heading}</span>
          <Link href={navUrl(nextAnchor)} aria-label="Next" className="rounded-md border border-sand bg-surface p-2 text-body hover:bg-sand/50"><ChevronRight className="h-4 w-4" /></Link>
          <Link href={navUrl(todayISO)} className="rounded-md px-3 py-2 text-sm text-body hover:bg-sand/50">Today</Link>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-sand">
          {(["week", "month"] as View[]).map((v) => (
            <Link
              key={v}
              href={`/admin/reservations/calendar?loc=${locSlug}&view=${v}&date=${anchorISO}`}
              className={`px-4 py-2 text-sm capitalize ${v === view ? "bg-primary text-on-dark" : "bg-surface text-body hover:bg-sand/50"}`}
            >
              {v}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-sand bg-sand">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="bg-bg/60 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-body/80">{d}</div>
        ))}
        {cells.map((d) => {
          const key = iso(d);
          const data = byDay.get(key);
          const inMonth = view === "week" || d.getMonth() === anchor.getMonth();
          const isToday = key === todayISO;
          return (
            <Link
              key={key}
              href={`/admin/reservations?loc=${locSlug}&date=${key}`}
              className={`flex min-h-24 flex-col gap-1 bg-surface p-2 transition-colors hover:bg-bg/40 ${!inMonth ? "bg-surface/50 text-body/40" : ""}`}
            >
              <span className={`text-sm tabular-nums ${isToday ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-on-dark" : ""}`}>
                {d.getDate()}
              </span>
              {data && (
                <span className="mt-auto rounded bg-brass/15 px-1.5 py-0.5 text-[11px] font-medium text-[#6b5418]">
                  {data.count} {data.count === 1 ? "booking" : "bookings"} · {data.covers} covers
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}
