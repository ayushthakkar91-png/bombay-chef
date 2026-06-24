import { requireRole } from "@/lib/auth/dal";
import { getCustomerInsights } from "@/lib/insights/engine";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";
import { AlertList, RecommendationCard, ConfidenceBadge } from "@/components/admin/insights/insights-ui";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;
const riskTone = (s: number) => (s >= 75 ? "bg-primary/10 text-primary" : s >= 50 ? "bg-amber-50 text-amber-700" : "bg-sand/60 text-body");

export default async function CustomerInsightsPage() {
  await requireRole("restaurant_manager");
  // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
  const ci = await getCustomerInsights(Date.now());

  return (
    <>
      <PageHeader title="Customer insights" description="Retention, churn risk and growth opportunities (last 12 months)." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Repeat rate" value={`${ci.retention.repeatRatePct}%`} hint="ordered 2+ times" />
        <Stat label="At churn risk" value={ci.retention.atRiskCount} hint="valuable & overdue" />
        <Stat label="At-risk value" value={gbp(ci.retention.atRiskValuePence)} hint="lifetime value" />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold text-text">Retention alerts</h3>
        <AlertList alerts={ci.alerts} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Churn risk — win these back">
          <SignalTable rows={ci.churnRisk} kind="churn" />
        </Panel>
        <Panel title="Repeat opportunities — earn the 2nd order">
          <SignalTable rows={ci.repeatOpportunities} kind="repeat" />
        </Panel>
      </div>

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-text">Marketing opportunities</h3>
        <div className="grid gap-3 lg:grid-cols-2">{ci.marketing.length ? ci.marketing.map((r) => <RecommendationCard key={r.id} rec={r} />) : <p className="text-sm text-body">No marketing actions surfaced.</p>}</div>
      </div>
    </>
  );
}

function SignalTable({ rows, kind }: { rows: { customerId: string; name: string; orders: number; ltvPence: number; lastOrderDays: number; cadenceDays: number | null; riskScore: number; confidence: { score: number; level: string; basis: string } }[]; kind: "churn" | "repeat" }) {
  if (rows.length === 0) return <p className="px-5 py-4 text-sm text-body">{kind === "churn" ? "No at-risk regulars — retention looks healthy." : "No recent one-time buyers to convert."}</p>;
  return (
    <table className="w-full border-collapse">
      <thead className="border-b border-sand bg-bg/40"><tr><Th>Customer</Th><Th className="text-right">LTV</Th><Th className="text-right">Last order</Th>{kind === "churn" ? <Th className="text-center">Risk</Th> : <Th className="text-right">Orders</Th>}<Th className="text-right">Conf.</Th></tr></thead>
      <tbody className="divide-y divide-sand">
        {rows.map((c) => (
          <tr key={c.customerId} className="hover:bg-bg/30">
            <Td className="font-medium">{c.name}</Td>
            <Td className="text-right tabular-nums">{gbp(c.ltvPence)}</Td>
            <Td className="text-right tabular-nums text-body">{c.lastOrderDays}d ago</Td>
            {kind === "churn"
              ? <Td className="text-center"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${riskTone(c.riskScore)}`}>{c.riskScore}</span></Td>
              : <Td className="text-right tabular-nums text-body">{c.orders}</Td>}
            <Td className="text-right"><ConfidenceBadge confidence={{ score: c.confidence.score, level: c.confidence.level as "low" | "medium" | "high", basis: c.confidence.basis }} /></Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
