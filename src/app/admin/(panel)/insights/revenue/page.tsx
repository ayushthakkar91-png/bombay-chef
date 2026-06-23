import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange } from "@/lib/reports/range";
import { getRevenueInsights } from "@/lib/insights/engine";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";
import { BarChart, BarList } from "@/components/admin/reports/charts";
import { InsightsFilters } from "@/components/admin/insights/InsightsFilters";
import { DeltaPill, ForecastPanel, RecommendationCard } from "@/components/admin/insights/insights-ui";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;

export default async function RevenueInsightsPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const locId = locations.find((l) => l.id === sp.loc)?.id;
  const r = await getRevenueInsights(range, locId);

  return (
    <>
      <PageHeader title="Revenue & demand" description={`${locId ? locations.find((l) => l.id === locId)?.name : "All locations"} · ${range.label}`} actions={<InsightsFilters basePath="/admin/insights/revenue" locations={locations} currentLoc={locId} currentDays={range.days} />} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Revenue</p><DeltaPill delta={r.revenue} format={gbp} /></div>
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Orders</p><DeltaPill delta={r.orders} /></div>
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Avg order</p><DeltaPill delta={r.aov} format={gbp} /></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ForecastPanel forecast={r.forecast} format={gbp} />
        <Panel title="Demand by day (avg orders)"><div className="p-5"><BarChart data={r.weekdayDemand} /></div></Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Best sellers (units)"><BarList items={r.bestSelling.map((d) => ({ label: d.name, value: d.units, sub: gbp(d.revenuePence) }))} /></Panel>
        <Panel title="Most profitable (gross profit)">
          <DishTable rows={r.mostProfitable} cols="profit" />
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Low performers (lowest volume)"><DishTable rows={r.lowPerforming} cols="low" /></Panel>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Pricing opportunities</h3>
          <div className="flex flex-col gap-3">{r.pricing.length ? r.pricing.map((rec) => <RecommendationCard key={rec.id} rec={rec} />) : <p className="text-sm text-body">No pricing flags — margins look balanced.</p>}</div>
        </div>
      </div>
    </>
  );
}

function DishTable({ rows, cols }: { rows: { id: string; name: string; units: number; revenuePence: number; profitPence: number; foodCostPct: number | null }[]; cols: "profit" | "low" }) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-body">No dishes for this period.</p>;
  return (
    <table className="w-full border-collapse">
      <thead className="border-b border-sand bg-bg/40"><tr><Th>Dish</Th><Th className="text-right">Units</Th>{cols === "profit" ? <><Th className="text-right">Profit</Th><Th className="text-right">Food cost</Th></> : <><Th className="text-right">Revenue</Th><Th className="text-right">Food cost</Th></>}</tr></thead>
      <tbody className="divide-y divide-sand">
        {rows.map((d) => (
          <tr key={d.id} className="hover:bg-bg/30">
            <Td className="font-medium">{d.name}</Td>
            <Td className="text-right tabular-nums">{d.units}</Td>
            {cols === "profit" ? <Td className="text-right tabular-nums">{gbp(d.profitPence)}</Td> : <Td className="text-right tabular-nums text-body">{gbp(d.revenuePence)}</Td>}
            <Td className="text-right tabular-nums text-body">{d.foodCostPct == null ? "—" : `${d.foodCostPct}%`}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
