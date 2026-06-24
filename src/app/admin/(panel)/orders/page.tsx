import Link from "next/link";
import { ArrowRight, ChefHat, Clock } from "lucide-react";

import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listLiveOrders } from "@/lib/repositories/orders";
import { PageHeader, Stat } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";

export default async function OrdersOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (<><PageHeader title="Orders" /><p className="text-sm text-body">No locations are assigned to your account yet.</p></>);
  }
  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  const live = await listLiveOrders(locId);

  const awaiting = live.filter((o) => o.status === "paid").length;
  const inKitchen = live.filter((o) => o.status === "accepted" || o.status === "preparing").length;
  const enRoute = live.filter((o) => o.status === "ready_for_collection" || o.status === "out_for_delivery").length;

  return (
    <>
      <PageHeader title="Orders" description="Online collection & delivery orders." actions={<LocationSwitcher locations={scoped} current={locId} />} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="New (awaiting accept)" value={awaiting} />
        <Stat label="In the kitchen" value={inKitchen} />
        <Stat label="Ready / en route" value={enRoute} />
        <Stat label="Live total" value={live.length} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link href={`/admin/orders/live?loc=${locId}`} className="group flex items-center justify-between gap-4 rounded-lg border border-sand bg-surface p-5 transition-colors hover:border-brass/50 hover:bg-bg/30">
          <div className="flex items-center gap-3">
            <ChefHat className="h-6 w-6 text-brass" strokeWidth={1.5} />
            <div><p className="font-medium text-text">Live orders</p><p className="text-sm text-body">Work the kitchen queue</p></div>
          </div>
          <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
        <Link href={`/admin/orders/history?loc=${locId}`} className="group flex items-center justify-between gap-4 rounded-lg border border-sand bg-surface p-5 transition-colors hover:border-brass/50 hover:bg-bg/30">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-brass" strokeWidth={1.5} />
            <div><p className="font-medium text-text">Order history</p><p className="text-sm text-body">Past orders & refunds</p></div>
          </div>
          <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </Link>
      </div>
    </>
  );
}
