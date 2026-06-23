import Link from "next/link";
import { Check } from "lucide-react";

import { listPlans, getPlatformStats, listTenants } from "@/lib/repositories/platform";
import { isBillingConfigured } from "@/lib/saas/billing";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";
import { Badge, Banner } from "@/components/admin/primitives";

const gbp = (p: number) => `£${(p / 100).toLocaleString("en-GB")}`;
const tone = (s: string) => (s === "active" ? "on" : s === "suspended" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export default async function BillingPage() {
  const [plans, stats, tenants] = await Promise.all([listPlans(), getPlatformStats(), listTenants()]);

  return (
    <>
      <PageHeader title="Billing & plans" description="Subscription revenue and plan management." />

      {!isBillingConfigured() && <div className="mb-6"><Banner state={{ ok: false, message: "Stripe is not configured — tenants run on manual plans. Set STRIPE_SECRET_KEY + plan price IDs to enable self-serve subscriptions." }} /></div>}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="MRR" value={gbp(stats.mrrPence)} />
        <Stat label="ARR (est.)" value={gbp(stats.mrrPence * 12)} />
        <Stat label="Paying tenants" value={stats.active} />
        <Stat label="Trialing" value={stats.trialing} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <div key={p.id} className="flex flex-col rounded-xl border border-sand bg-surface p-5">
            <p className="font-serif text-xl text-text">{p.name}</p>
            <p className="mt-1 text-2xl font-semibold text-text">{gbp(p.monthlyPence)}<span className="text-sm font-normal text-body">/mo</span></p>
            <p className="text-xs text-body">or {gbp(p.annualPence)}/yr</p>
            <ul className="mt-4 flex flex-1 flex-col gap-1.5">
              {p.features.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm text-body"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brass" /> {f}</li>)}
            </ul>
            <p className="mt-4 text-xs text-body/70">{p.maxLocations == null ? "Unlimited" : p.maxLocations} locations · {p.maxUsers == null ? "Unlimited" : p.maxUsers} users</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Panel title="Subscriptions">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Tenant</Th><Th>Plan</Th><Th>Status</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{t.name}</Td>
                  <Td className="text-body">{t.planName ?? "—"}</Td>
                  <Td><Badge tone={tone(t.status)}>{t.status}</Badge></Td>
                  <Td className="text-right"><Link href={`/platform/tenants/${t.id}`} className="text-sm text-brass hover:underline">Manage</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
