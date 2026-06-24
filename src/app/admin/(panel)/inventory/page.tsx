import Link from "next/link";
import { Boxes, Trash2, FileText, Truck, Calculator, ArrowRight, AlertTriangle } from "lucide-react";

import { requireStaff, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listStock, getInventoryStats } from "@/lib/repositories/inventory";
import { gbp, qtyFmt } from "@/lib/inventory/constants";
import { PageHeader, Stat, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/admin/primitives";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";

export default async function InventoryOverviewPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Inventory" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [stats, stock] = await Promise.all([getInventoryStats(locId, monthAgo), listStock(locId)]);
  const low = stock.filter((r) => r.low).sort((a, b) => a.qty - b.qty);

  const links = [
    { href: "stock", icon: Boxes, title: "Stock", detail: "Counts & adjustments", show: true },
    { href: "purchase-orders", icon: FileText, title: "Purchase orders", detail: `${stats.openPOs} open`, show: can(ctx, "location_manager", locId) },
    { href: "waste", icon: Trash2, title: "Waste", detail: "Log & review", show: true },
    { href: "suppliers", icon: Truck, title: "Suppliers", detail: "Profiles & pricing", show: can(ctx, "restaurant_manager") },
    { href: "costing", icon: Calculator, title: "Costing", detail: "Food cost & margin", show: can(ctx, "restaurant_manager") },
  ].filter((l) => l.show);

  return (
    <>
      <PageHeader title="Inventory" description="Stock health, purchasing and costs at a glance." actions={<LocationSwitcher locations={scoped} current={locId} />} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Tracked items" value={stats.itemCount} />
        <Stat label="Low stock" value={stats.lowCount} />
        <Stat label="Stock value" value={gbp(stats.stockValuePence)} />
        <Stat label="Open POs" value={stats.openPOs} />
        <Stat label="Waste (30d)" value={gbp(stats.wasteValuePence)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title="Low stock — needs reordering">
          {low.length === 0 ? (
            <p className="px-5 py-6 text-sm text-body">Everything is above its reorder level. 👍</p>
          ) : (
            <ul className="divide-y divide-sand">
              {low.map((r) => (
                <li key={r.itemId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
                    <div>
                      <p className="text-sm font-medium text-text">{r.name}</p>
                      <p className="text-xs text-body">{qtyFmt(r.qty)} {r.unit} left · reorder at {qtyFmt(r.reorderLevel)}</p>
                    </div>
                  </div>
                  {r.reorderQty > 0 && <Badge tone="accent">order {qtyFmt(r.reorderQty)}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-3">
          {links.map((l) => {
            const Icon = l.icon;
            return (
              <Link key={l.href} href={`/admin/inventory/${l.href}?loc=${locId}`} className="group flex items-center justify-between gap-3 rounded-lg border border-sand bg-surface p-4 transition-colors hover:border-brass/50 hover:bg-bg/30">
                <div className="flex items-center gap-3"><Icon className="h-5 w-5 text-brass" strokeWidth={1.5} /><div><p className="text-sm font-medium text-text">{l.title}</p><p className="text-xs text-body">{l.detail}</p></div></div>
                <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
