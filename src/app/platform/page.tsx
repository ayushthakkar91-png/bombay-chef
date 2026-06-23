import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";

import { getPlatformStats, listTenants } from "@/lib/repositories/platform";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { BarList } from "@/components/admin/reports/charts";
import { Badge } from "@/components/admin/primitives";

const gbp = (p: number) => `£${Math.round(p / 100).toLocaleString("en-GB")}`;
const tone = (s: string) => (s === "active" ? "on" : s === "suspended" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export default async function PlatformOverview() {
  const [stats, tenants] = await Promise.all([getPlatformStats(), listTenants()]);
  return (
    <>
      <PageHeader title="Platform overview" description="Your restaurant operating system at a glance." actions={<Link href="/platform/tenants/new" className="inline-flex items-center gap-2 rounded-md bg-text px-4 py-2 text-sm text-bg hover:bg-brass"><Building2 className="h-4 w-4" /> New restaurant</Link>} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Tenants" value={stats.tenants} />
        <Stat label="Active" value={stats.active} />
        <Stat label="Trialing" value={stats.trialing} />
        <Stat label="MRR" value={gbp(stats.mrrPence)} hint="recurring/mo" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Panel title="By plan"><div className="py-1"><BarList items={stats.planBreakdown} /></div></Panel>
        <Panel title="Recent tenants">
          <ul className="divide-y divide-sand">
            {tenants.slice(0, 8).map((t) => (
              <li key={t.id}>
                <Link href={`/platform/tenants/${t.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-bg/30">
                  <div><p className="text-sm font-medium text-text">{t.name}</p><p className="text-xs text-body">{t.planName ?? "No plan"} · {t.locationCount} location{t.locationCount === 1 ? "" : "s"}</p></div>
                  <div className="flex items-center gap-3"><Badge tone={tone(t.status)}>{t.status}</Badge><ArrowRight className="h-4 w-4 text-body" /></div>
                </Link>
              </li>
            ))}
            {tenants.length === 0 && <li className="px-5 py-6 text-sm text-body">No tenants yet — provision your first restaurant.</li>}
          </ul>
        </Panel>
      </div>
    </>
  );
}
