import Link from "next/link";
import { Search, X } from "lucide-react";

import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listReservationsBetween, searchReservations } from "@/lib/repositories/reservations";
import { dateTimeToInstant, londonDateISO, formatInstantDate } from "@/lib/reservations/time";
import { PageHeader, Stat } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { DateNav } from "@/components/admin/reservations/DateNav";
import { BookingsTable } from "@/components/admin/reservations/BookingsTable";

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; date?: string; q?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;

  const allLocations = await listLocations(false);
  const scoped = filterScoped(allLocations, scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (
      <>
        <PageHeader title="Bookings" />
        <p className="text-sm text-body">No locations are assigned to your account yet.</p>
      </>
    );
  }

  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : londonDateISO(new Date());
  const query = sp.q?.trim() ?? "";

  const dayStart = dateTimeToInstant(date, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const reservations = query
    ? await searchReservations(locId, query)
    : await listReservationsBetween(locId, dayStart.toISOString(), dayEnd.toISOString());

  const active = reservations.filter((r) => r.status !== "cancelled" && r.status !== "no_show");
  const covers = active.reduce((sum, r) => sum + r.partySize, 0);

  return (
    <>
      <PageHeader
        title="Bookings"
        description={query ? `Search results for “${query}”` : formatInstantDate(dateTimeToInstant(date, 12, 0))}
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {!query && <DateNav date={date} />}
        <form method="get" className="flex items-center gap-2">
          <input type="hidden" name="loc" value={locId} />
          {!query && <input type="hidden" name="date" value={date} />}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
            <input
              name="q"
              defaultValue={query}
              placeholder="Search name, email, phone…"
              className="w-64 rounded-md border border-sand bg-surface py-2 pl-8 pr-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
            />
          </div>
          {query && (
            <Link href={`/admin/reservations?loc=${locId}`} className="inline-flex items-center gap-1 rounded-md border border-sand px-2.5 py-2 text-sm text-body hover:bg-sand/50">
              <X className="h-4 w-4" /> Clear
            </Link>
          )}
        </form>
      </div>

      {!query && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
          <Stat label="Bookings" value={active.length} />
          <Stat label="Covers" value={covers} />
        </div>
      )}

      <BookingsTable reservations={reservations} locationId={locId} />
    </>
  );
}
