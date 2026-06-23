import { requireRole } from "@/lib/auth/dal";
import { getMarketingReport } from "@/lib/reports/queries";
import { PageHeader, Panel, Stat, Th, Td } from "@/components/admin/ui";
import { BarList } from "@/components/admin/reports/charts";

const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export default async function MarketingReportPage() {
  await requireRole("restaurant_manager");
  const m = await getMarketingReport();
  const open = m.subscribed + m.unsubscribed;

  return (
    <>
      <PageHeader title="Marketing report" description="Audience and campaign performance" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Subscribed" value={m.subscribed} />
        <Stat label="Unsubscribed" value={m.unsubscribed} />
        <Stat label="Opt-in rate" value={`${open ? Math.round((m.subscribed / open) * 100) : 0}%`} />
        <Stat label="Campaigns sent" value={m.campaigns.length} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Segments"><BarList items={m.segments} /></Panel>
        <Panel title="Recent campaigns">
          {m.campaigns.length === 0 ? <p className="px-5 py-4 text-sm text-body">No campaigns sent yet.</p> : (
            <table className="w-full border-collapse">
              <thead className="border-b border-sand bg-bg/40"><tr><Th>Campaign</Th><Th className="text-right">Recipients</Th><Th>Sent</Th></tr></thead>
              <tbody className="divide-y divide-sand">
                {m.campaigns.map((c, i) => (
                  <tr key={i}><Td className="font-medium">{c.name}</Td><Td className="text-right tabular-nums">{c.recipients}</Td><Td className="text-body">{c.sentAt ? dt(c.sentAt) : "—"}</Td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </>
  );
}
