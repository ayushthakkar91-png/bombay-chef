import Link from "next/link";
import { Download } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange, condense } from "@/lib/reports/range";
import { getSalesReport } from "@/lib/reports/queries";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ReportFilters } from "@/components/admin/reports/ReportFilters";
import { BarChart, BarList, StackedBar, DataRow } from "@/components/admin/reports/charts";

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default async function SalesReportPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const locId = locations.find((l) => l.id === sp.loc)?.id;
  const sales = await getSalesReport(range, locId);

  return (
    <>
      <PageHeader
        title="Sales"
        description={range.label}
        actions={
          <div className="flex items-center gap-2">
            <ReportFilters locations={locations} days={range.days} loc={locId} />
            <Link href={`/admin/reports/export?report=sales&days=${range.days}${locId ? `&loc=${locId}` : ""}`} className="inline-flex items-center gap-1.5 rounded-md border border-sand bg-surface px-3 py-2 text-sm text-body hover:bg-sand/50"><Download className="h-4 w-4" /> CSV</Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Revenue" value={gbp(sales.revenuePence)} />
        <Stat label="Orders" value={sales.orders} />
        <Stat label="Avg order" value={gbp(sales.aovPence)} />
        <Stat label="Refunded" value={gbp(sales.refundedPence)} hint={`${sales.refundedCount} orders`} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Revenue by day"><div className="px-5 py-4"><BarChart data={condense(sales.byDay)} format={(n) => gbp(n)} /></div></Panel>
        <Panel title="Orders by day"><div className="px-5 py-4"><BarChart data={condense(sales.ordersByDay)} /></div></Panel>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="By location"><BarList items={sales.byLocation} format={(n) => gbp(n)} /></Panel>
        <Panel title="Fulfilment & status">
          <div className="px-5 py-4"><StackedBar segments={sales.fulfilment} /></div>
          <div className="border-t border-sand">
            {sales.byStatus.map((s) => <DataRow key={s.label} label={<span className="capitalize">{s.label}</span>} value={s.value} />)}
          </div>
        </Panel>
      </div>
    </>
  );
}
