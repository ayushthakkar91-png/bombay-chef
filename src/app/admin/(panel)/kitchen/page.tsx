import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listLiveOrders } from "@/lib/repositories/orders";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { KitchenBoard } from "@/components/admin/operations/KitchenBoard";

export default async function KitchenPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Kitchen" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const orders = await listLiveOrders(locId);

  return (
    <>
      <PageHeader title="Kitchen" description="Live orders — tap to advance. Updates automatically." actions={<LocationSwitcher locations={scoped} current={locId} />} />
      <KitchenBoard orders={orders} locationId={locId} />
    </>
  );
}
