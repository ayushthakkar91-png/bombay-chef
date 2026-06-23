import Link from "next/link";
import { Download } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange, condense } from "@/lib/reports/range";
import { getReservationsReport } from "@/lib/reports/queries";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ReportFilters } from "@/components/admin/reports/ReportFilters";
import { BarChart, BarList } from "@/components/admin/reports/charts";

export default async function ReservationsReportPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const locId = locations.find((l) => l.id === sp.loc)?.id;
  const r = await getReservationsReport(range, locId);

  return (
    <>
      <PageHeader
        title="Reservations report"
        description={range.label}
        actions={
          <div className="flex items-center gap-2">
            <ReportFilters locations={locations} days={range.days} loc={locId} />
            <Link href={`/admin/reports/export?report=reservations&days=${range.days}${locId ? `&loc=${locId}` : ""}`} className="inline-flex items-center gap-1.5 rounded-md border border-sand bg-surface px-3 py-2 text-sm text-body hover:bg-sand/50"><Download className="h-4 w-4" /> CSV</Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Bookings" value={r.bookings} />
        <Stat label="Covers" value={r.covers} />
        <Stat label="No-show rate" value={`${r.noShowRate}%`} />
        <Stat label="Cancelled rate" value={`${r.cancelledRate}%`} />
      </div>
      <div className="mt-6">
        <Panel title="Bookings by day"><div className="px-5 py-4"><BarChart data={condense(r.byDay)} /></div></Panel>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By occasion"><BarList items={r.byOccasion.map((o) => ({ label: o.label.charAt(0).toUpperCase() + o.label.slice(1), value: o.value }))} /></Panel>
        <Panel title="By location"><BarList items={r.byLocation} /></Panel>
      </div>
    </>
  );
}
