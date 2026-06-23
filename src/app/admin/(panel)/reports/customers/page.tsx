import Link from "next/link";
import { Download } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange, condense } from "@/lib/reports/range";
import { getCustomersReport } from "@/lib/reports/queries";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ReportFilters } from "@/components/admin/reports/ReportFilters";
import { BarChart, BarList } from "@/components/admin/reports/charts";

const gbp = (p: number) => new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(p / 100);

export default async function CustomersReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const c = await getCustomersReport(range);

  return (
    <>
      <PageHeader
        title="Customers report"
        description={`${range.label} · retention & lifetime value`}
        actions={
          <div className="flex items-center gap-2">
            <ReportFilters locations={locations} days={range.days} showLocation={false} />
            <Link href={`/admin/reports/export?report=customers&days=${range.days}`} className="inline-flex items-center gap-1.5 rounded-md border border-sand bg-surface px-3 py-2 text-sm text-body hover:bg-sand/50"><Download className="h-4 w-4" /> CSV</Link>
          </div>
        }
      />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Total customers" value={c.total} />
        <Stat label="New in range" value={c.newInRange} />
        <Stat label="Ordering customers" value={c.orderingCustomers} />
        <Stat label="Repeat rate" value={`${c.repeatRate}%`} />
        <Stat label="Avg lifetime value" value={gbp(c.clvAvgPence)} />
      </div>
      <div className="mt-6">
        <Panel title="New customers by day"><div className="px-5 py-4"><BarChart data={condense(c.acquisitionByDay)} /></div></Panel>
      </div>
      <div className="mt-6">
        <Panel title="Top customers by spend (all time)"><BarList items={c.topCustomers} format={(n) => gbp(n)} /></Panel>
      </div>
    </>
  );
}
