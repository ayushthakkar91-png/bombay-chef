import { Sparkles } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { parseRange } from "@/lib/reports/range";
import { getExecutiveOverview } from "@/lib/insights/engine";
import { generateExecutiveBrief } from "@/lib/insights/ai";
import { PageHeader, Panel } from "@/components/admin/ui";
import { BarList } from "@/components/admin/reports/charts";
import { InsightsFilters } from "@/components/admin/insights/InsightsFilters";
import { DeltaPill, InsightCard, AlertList, RecommendationCard, ForecastPanel } from "@/components/admin/insights/insights-ui";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;

export default async function InsightsPage({ searchParams }: { searchParams: Promise<{ days?: string; loc?: string }> }) {
  await requireRole("restaurant_manager");
  const sp = await searchParams;
  const range = parseRange(sp.days);
  const locations = await listLocations(false);
  const locId = locations.find((l) => l.id === sp.loc)?.id;
  const scopeName = locId ? (locations.find((l) => l.id === locId)?.name ?? "Location") : "All locations";

  const o = await getExecutiveOverview(range, locId);
  const brief = await generateExecutiveBrief({
    scope: scopeName,
    period: range.label.toLowerCase(),
    revenue: { current: gbp(o.revenue.current), pct: o.revenue.pct, direction: o.revenue.direction },
    insights: o.insights.map((i) => i.detail),
    alerts: o.alerts.map((a) => a.title),
    recommendations: o.recommendations.map((r) => r.title),
  });

  return (
    <>
      <PageHeader title="Executive insights" description={`${scopeName} · ${range.label}`} actions={<InsightsFilters basePath="/admin/insights" locations={locations} currentLoc={locId} currentDays={range.days} />} />

      <div className="mb-6 rounded-xl border border-brass/30 bg-gradient-to-br from-brass/5 to-transparent p-5">
        <div className="mb-2 flex items-center gap-2"><Sparkles className="h-4 w-4 text-brass" /><h2 className="text-sm font-semibold text-text">Executive brief</h2><span className="rounded-full border border-sand px-2 py-0.5 text-[11px] text-body">{brief.source === "ai" ? "AI-generated" : "auto-summary"}</span></div>
        <p className="text-[15px] leading-relaxed text-text">{brief.text}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Revenue</p><DeltaPill delta={o.revenue} format={gbp} /></div>
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Orders</p><DeltaPill delta={o.orders} /></div>
        <div className="rounded-lg border border-sand bg-surface p-4"><p className="mb-1 text-xs uppercase tracking-wide text-body">Avg order</p><DeltaPill delta={o.aov} format={gbp} /></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <ForecastPanel forecast={o.forecast} format={gbp} />
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Alerts</h3>
          <AlertList alerts={o.alerts} />
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Key insights</h3>
          <div className="flex flex-col gap-3">{o.insights.map((i) => <InsightCard key={i.id} insight={i} />)}</div>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Top recommendations</h3>
          <div className="flex flex-col gap-3">{o.recommendations.length ? o.recommendations.map((r) => <RecommendationCard key={r.id} rec={r} />) : <p className="text-sm text-body">No recommendations for this period.</p>}</div>
        </div>
      </div>

      <div className="mt-8">
        <Panel title="Best sellers (units)"><BarList items={o.topDishes} /></Panel>
      </div>
    </>
  );
}
