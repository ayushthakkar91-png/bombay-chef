import { requireRole } from "@/lib/auth/dal";
import { parseRange } from "@/lib/reports/range";
import { getLoyaltyReport } from "@/lib/reports/queries";
import { listLocations } from "@/lib/repositories/admin-locations";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";
import { ReportFilters } from "@/components/admin/reports/ReportFilters";
import { BarList } from "@/components/admin/reports/charts";

export default async function LoyaltyReportPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const l = await getLoyaltyReport(range);

  return (
    <>
      <PageHeader title="Loyalty report" description={range.label} actions={<ReportFilters locations={locations} days={range.days} showLocation={false} />} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Points issued" value={l.issued} />
        <Stat label="Points redeemed" value={l.redeemed} />
        <Stat label="Net points" value={l.net} />
        <Stat label="Active vouchers" value={l.activeVouchers} />
      </div>
      <div className="mt-6">
        <Panel title="Members by tier"><BarList items={l.tiers} /></Panel>
      </div>
    </>
  );
}
