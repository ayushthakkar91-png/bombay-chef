import Link from "next/link";
import { ChefHat, CalendarDays, ClipboardList, ArrowRight } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { getOpsSummary, listShifts } from "@/lib/repositories/staff";
import { dateTimeToInstant, londonDateISO, formatInstantTime } from "@/lib/reservations/time";
import { positionLabel } from "@/lib/staff/constants";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default async function OperationsPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireRole("location_manager");
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Operations" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  const today = londonDateISO(new Date());
  const dayStart = dateTimeToInstant(today, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [summary, shifts] = await Promise.all([
    getOpsSummary(locId, dayStart.toISOString(), dayEnd.toISOString()),
    listShifts(locId, dayStart.toISOString(), dayEnd.toISOString()),
  ]);

  return (
    <>
      <PageHeader
        title="Operations"
        description={new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "long", day: "numeric", month: "long" }).format(dayStart)}
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Orders" value={summary.orders} />
        <Stat label="Revenue" value={gbp(summary.revenuePence)} />
        <Stat label="Bookings" value={summary.reservations} />
        <Stat label="Covers" value={summary.covers} />
        <Stat label="On shift" value={summary.onShift} />
        <Stat label="Pending leave" value={summary.pendingLeave} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: `/admin/kitchen?loc=${locId}`, icon: ChefHat, title: "Kitchen", detail: "Live order board" },
          { href: `/admin/reservations?loc=${locId}`, icon: CalendarDays, title: "Bookings", detail: "Today's reservations" },
          { href: `/admin/staff/leave?loc=${locId}`, icon: ClipboardList, title: "Leave", detail: `${summary.pendingLeave} to review` },
        ].map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href} className="group flex items-center justify-between gap-4 rounded-lg border border-sand bg-surface p-5 transition-colors hover:border-brass/50 hover:bg-bg/30">
              <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-brass" strokeWidth={1.5} /><div><p className="font-medium text-text">{l.title}</p><p className="text-sm text-body">{l.detail}</p></div></div>
              <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      <div className="mt-8">
        <Panel title="On shift today">
          {shifts.length === 0 ? <p className="px-5 py-4 text-sm text-body">No shifts scheduled today.</p> : (
            <ul className="divide-y divide-sand">
              {shifts.map((s) => (
                <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-text">{s.staffName}{s.position ? <span className="ml-2 text-xs text-brass">{positionLabel(s.position)}</span> : null}</span>
                  <span className="text-body tabular-nums">{formatInstantTime(new Date(s.startsAt))}–{formatInstantTime(new Date(s.endsAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}
