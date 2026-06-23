import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange } from "@/lib/reports/range";
import { getInventoryInsights } from "@/lib/insights/engine";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BarChart } from "@/components/admin/reports/charts";
import { InsightsFilters } from "@/components/admin/insights/InsightsFilters";
import { AlertList, InsightCard, RecommendationCard } from "@/components/admin/insights/insights-ui";

export default async function InventoryInsightsPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  if (locations.length === 0) return (<><PageHeader title="Inventory insights" /><p className="text-sm text-body">No locations yet.</p></>);

  const locId = locations.find((l) => l.id === sp.loc)?.id ?? locations[0].id;
  // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
  const ii = await getInventoryInsights(range, locId, Date.now());
  const recs = [...ii.optimisation, ...ii.staffing];

  return (
    <>
      <PageHeader title="Inventory & operations insights" description={`${locations.find((l) => l.id === locId)?.name} · ${range.label}`} actions={<InsightsFilters basePath="/admin/insights/inventory" locations={locations} currentLoc={locId} currentDays={range.days} />} />

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-text">Stock & supply alerts</h3>
        <AlertList alerts={ii.stockAlerts} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Panel title="Suggested cover by day (staffing forecast)">
          <div className="p-5"><BarChart data={ii.staffingForecast} /></div>
          <p className="px-5 pb-4 text-xs text-body/70">Estimated staff on shift per weekday from demand (~1 per 8 orders/day). Cross-check against the Schedule.</p>
        </Panel>
        <div>
          {ii.wasteInsight && <div className="mb-4"><InsightCard insight={ii.wasteInsight} /></div>}
          <h3 className="mb-3 text-sm font-semibold text-text">Optimisation & staffing</h3>
          <div className="flex flex-col gap-3">
            {recs.length ? recs.map((r) => <RecommendationCard key={r.id} rec={r} />) : <p className="text-sm text-body">No actions surfaced — stock and staffing look balanced.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
