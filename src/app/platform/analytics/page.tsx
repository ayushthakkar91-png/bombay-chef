import Link from "next/link";

import { getPlatformStats, listTenants } from "@/lib/repositories/platform";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";
import { BarList } from "@/components/admin/reports/charts";
import { Badge } from "@/components/admin/primitives";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;
const tone = (s: string) => (s === "active" ? "on" : s === "suspended" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export default async function PlatformAnalytics() {
  const [stats, tenants] = await Promise.all([getPlatformStats(), listTenants()]);

  return (
    <>
      <PageHeader title="Platform analytics" description="Cross-tenant performance. Per-tenant operational reporting lives in each tenant's admin." />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tenants" value={stats.tenants} />
        <Stat label="Active" value={stats.active} hint={`${stats.suspended} suspended`} />
        <Stat label="MRR" value={gbp(stats.mrrPence)} />
        <Stat label="Locations" value={tenants.reduce((s, t) => s + t.locationCount, 0)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Tenants by plan"><div className="py-1"><BarList items={stats.planBreakdown} /></div></Panel>
        <Panel title="Tenants by status">
          <div className="py-1"><BarList items={[{ label: "Active", value: stats.active }, { label: "Trialing", value: stats.trialing }, { label: "Suspended", value: stats.suspended }]} /></div>
        </Panel>
      </div>

      <div className="mt-8">
        <Panel title="Per-tenant">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Tenant</Th><Th>Plan</Th><Th className="text-right">Locations</Th><Th>Status</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{t.name}</Td>
                  <Td className="text-body">{t.planName ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{t.locationCount}</Td>
                  <Td><Badge tone={tone(t.status)}>{t.status}</Badge></Td>
                  <Td className="text-right"><Link href={`/platform/tenants/${t.id}`} className="text-sm text-brass hover:underline">View</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
