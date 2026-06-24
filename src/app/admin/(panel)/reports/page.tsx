import Link from "next/link";
import { Download } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange, condense } from "@/lib/reports/range";
import { getSalesReport, getReservationsReport, getCustomersReport, getTopDishes, getMarketingReport, getLoyaltyReport } from "@/lib/reports/queries";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ReportFilters } from "@/components/admin/reports/ReportFilters";
import { BarChart, BarList, StackedBar, DataRow } from "@/components/admin/reports/charts";

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const locId = locations.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id;

  const [sales, reservations, customers, dishes, marketing, loyalty] = await Promise.all([
    getSalesReport(range, locId),
    getReservationsReport(range, locId),
    getCustomersReport(range),
    getTopDishes(range, locId),
    getMarketingReport(),
    getLoyaltyReport(range),
  ]);

  const exportHref = `/admin/reports/export?report=sales&days=${range.days}${locId ? `&loc=${locId}` : ""}`;

  return (
    <>
      <PageHeader
        title="Reports"
        description={range.label}
        actions={
          <div className="flex items-center gap-2">
            <ReportFilters locations={locations} days={range.days} loc={locId} />
            <Link href={exportHref} className="inline-flex items-center gap-1.5 rounded-md border border-sand bg-surface px-3 py-2 text-sm text-body hover:bg-sand/50"><Download className="h-4 w-4" /> CSV</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <Stat label="Revenue" value={gbp(sales.revenuePence)} />
        <Stat label="Orders" value={sales.orders} />
        <Stat label="Avg order" value={gbp(sales.aovPence)} />
        <Stat label="Covers" value={reservations.covers} hint={`${reservations.bookings} bookings`} />
        <Stat label="New customers" value={customers.newInRange} />
        <Stat label="Points redeemed" value={loyalty.redeemed} />
      </div>

      <div className="mt-6">
        <Panel title="Revenue" description={`${range.label}${locId ? " · selected location" : " · all locations"}`}>
          <div className="px-5 py-4"><BarChart data={condense(sales.byDay)} format={(n) => gbp(n)} /></div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Order mix">
          <div className="px-5 py-4">
            <StackedBar segments={sales.fulfilment} />
            {sales.refundedCount > 0 && <p className="mt-3 text-xs text-body">{sales.refundedCount} refunded · {gbp(sales.refundedPence)}</p>}
          </div>
        </Panel>
        <Panel title="Top dishes"><BarList items={dishes} format={(n) => `${n}`} /></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Reservations">
          <DataRow label="Bookings" value={reservations.bookings} />
          <DataRow label="Covers" value={reservations.covers} />
          <DataRow label="No-show rate" value={`${reservations.noShowRate}%`} />
          <DataRow label="Cancelled rate" value={`${reservations.cancelledRate}%`} />
        </Panel>
        <Panel title="Marketing & loyalty">
          <DataRow label="Subscribers" value={marketing.subscribed} />
          <DataRow label="Campaigns sent" value={marketing.campaigns.length} />
          <DataRow label="Points issued" value={loyalty.issued} />
          <DataRow label="Active vouchers" value={loyalty.activeVouchers} />
        </Panel>
      </div>
    </>
  );
}
