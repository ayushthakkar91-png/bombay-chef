import { requireStaff, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listStock } from "@/lib/repositories/inventory";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { StockManager } from "@/components/admin/inventory/StockManager";

export default async function StockPage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Stock" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const stock = await listStock(locId);

  return (
    <>
      <PageHeader title="Stock" description="Current stock, reorder levels and adjustments." actions={<LocationSwitcher locations={scoped} current={locId} />} />
      <StockManager stock={stock} locationId={locId} canManageStock={can(ctx, "location_manager", locId)} canManageItems={can(ctx, "restaurant_manager")} />
    </>
  );
}
