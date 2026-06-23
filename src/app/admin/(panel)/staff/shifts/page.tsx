import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { requireStaff, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listShifts, listStaff } from "@/lib/repositories/staff";
import { dateTimeToInstant } from "@/lib/reservations/time";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { ShiftScheduler } from "@/components/admin/staff/ShiftScheduler";

function iso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function mondayOf(d: Date) { const dow = d.getDay(); return addDays(d, dow === 0 ? -6 : 1 - dow); }

export default async function ShiftsPage({ searchParams }: { searchParams: Promise<{ loc?: string; week?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Schedule" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const anchorISO = sp.week && /^\d{4}-\d{2}-\d{2}$/.test(sp.week) ? sp.week : iso(new Date());
  const weekStart = mondayOf(new Date(`${anchorISO}T12:00:00`));
  const days = Array.from({ length: 7 }, (_, i) => iso(addDays(weekStart, i)));
  const fromISO = dateTimeToInstant(days[0], 0, 0).toISOString();
  const toISO = dateTimeToInstant(iso(addDays(weekStart, 7)), 0, 0).toISOString();

  const canManage = can(ctx, "location_manager", locId);
  const [shifts, allStaff] = await Promise.all([listShifts(locId, fromISO, toISO), canManage ? listStaff() : Promise.resolve([])]);
  const staffOptions = allStaff
    .filter((s) => s.grants.some((g) => g.locationId === locId || g.locationId === null))
    .map((s) => ({ id: s.id, name: s.name ?? s.email ?? "Staff" }));

  const navUrl = (d: string) => `/admin/staff/shifts?loc=${locId}&week=${d}`;

  return (
    <>
      <PageHeader
        title="Schedule"
        description={`Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />
      <div className="mb-5 flex items-center gap-2">
        <Link href={navUrl(iso(addDays(weekStart, -7)))} aria-label="Previous week" className="rounded-md border border-sand bg-surface p-2 text-body hover:bg-sand/50"><ChevronLeft className="h-4 w-4" /></Link>
        <Link href={navUrl(iso(addDays(weekStart, 7)))} aria-label="Next week" className="rounded-md border border-sand bg-surface p-2 text-body hover:bg-sand/50"><ChevronRight className="h-4 w-4" /></Link>
        <Link href={navUrl(iso(new Date()))} className="rounded-md px-3 py-2 text-sm text-body hover:bg-sand/50">This week</Link>
        {!canManage && <span className="ml-auto text-sm text-body">Your location&apos;s schedule</span>}
      </div>
      <ShiftScheduler shifts={shifts} staff={staffOptions} locationId={locId} days={days} canManage={canManage} />
    </>
  );
}
