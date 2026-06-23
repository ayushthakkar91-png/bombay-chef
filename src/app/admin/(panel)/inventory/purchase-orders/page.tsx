import { requireStaff, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listPurchaseOrders } from "@/lib/repositories/purchasing";
import { listSuppliers } from "@/lib/repositories/suppliers";
import { PO_STATUS_LABEL } from "@/lib/inventory/constants";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { PurchaseOrdersList } from "@/components/admin/inventory/PurchaseOrdersList";

const FILTERS = ["all", "draft", "sent", "received", "cancelled"];

export default async function PurchaseOrdersPage({ searchParams }: { searchParams: Promise<{ loc?: string; status?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Purchase orders" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const status = FILTERS.includes(sp.status ?? "") ? (sp.status as string) : "all";
  const canCreate = can(ctx, "location_manager", locId);
  const [orders, suppliers] = await Promise.all([listPurchaseOrders(locId, status), canCreate ? listSuppliers() : Promise.resolve([])]);

  return (
    <>
      <PageHeader title="Purchase orders" description="Order from suppliers, track delivery and receive stock." actions={<LocationSwitcher locations={scoped} current={locId} />} />
      <form method="get" className="mb-4 flex items-center gap-2">
        <input type="hidden" name="loc" value={locId} />
        <label htmlFor="status" className="text-sm text-body">Show</label>
        <select id="status" name="status" defaultValue={status} className="rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass">
          {FILTERS.map((f) => <option key={f} value={f}>{f === "all" ? "All" : PO_STATUS_LABEL[f]}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-sand px-3 py-2 text-sm text-body hover:bg-sand/50">Apply</button>
      </form>
      <PurchaseOrdersList orders={orders} suppliers={suppliers} locationId={locId} canCreate={canCreate} />
    </>
  );
}
