import Link from "next/link";
import { ArrowRight, Megaphone, PieChart, Ticket } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { flags } from "@/lib/flags";
import { getMarketingStats, getSegments, listCampaigns } from "@/lib/repositories/admin-marketing";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";

export default async function MarketingOverviewPage() {
  await requireRole("restaurant_manager");

  if (!flags.marketing) {
    return (<><PageHeader title="Marketing" /><p className="text-sm text-body">Marketing is disabled. Set <code>NEXT_PUBLIC_FEATURE_MARKETING=true</code> to enable campaigns, segments and the newsletter.</p></>);
  }

  const [stats, segments, campaigns] = await Promise.all([getMarketingStats(), getSegments(), listCampaigns()]);
  const recent = campaigns.slice(0, 5);

  return (
    <>
      <PageHeader title="Marketing" description="Audience, segments, campaigns and discount codes." />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Subscribed" value={stats.subscribed} />
        <Stat label="Unsubscribed" value={stats.unsubscribed} />
        <Stat label="Segments" value={segments.length} />
        <Stat label="Campaigns" value={campaigns.length} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/marketing/campaigns", icon: Megaphone, title: "Campaigns", detail: "Compose & send" },
          { href: "/admin/marketing/segments", icon: PieChart, title: "Segments", detail: "Audience groups" },
          { href: "/admin/marketing/promotions", icon: Ticket, title: "Promotions", detail: "Discount codes" },
        ].map((l) => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href} className="group flex items-center justify-between gap-4 rounded-lg border border-sand bg-surface p-5 transition-colors hover:border-brass/50 hover:bg-bg/30">
              <div className="flex items-center gap-3"><Icon className="h-6 w-6 text-brass" strokeWidth={1.5} /><div><p className="font-medium text-text">{l.title}</p><p className="text-sm text-body">{l.detail}</p></div></div>
              <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          );
        })}
      </div>

      {recent.length > 0 && (
        <div className="mt-8">
          <Panel title="Recent campaigns">
            <ul className="divide-y divide-sand">
              {recent.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="font-medium text-text">{c.name}</span>
                  <span className="text-body capitalize">{c.status}{c.recipients != null ? ` · ${c.recipients} sent` : ""}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}
