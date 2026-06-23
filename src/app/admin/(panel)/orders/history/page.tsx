import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listOrders } from "@/lib/repositories/orders";
import { ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/ordering/constants";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

const FILTERS: { value: string; label: string; statuses?: OrderStatus[] }[] = [
  { value: "past", label: "Completed & closed", statuses: ["completed", "cancelled", "refunded"] },
  { value: "completed", label: "Completed", statuses: ["completed"] },
  { value: "refunded", label: "Refunded", statuses: ["refunded"] },
  { value: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
  { value: "pending_payment", label: "Abandoned (unpaid)", statuses: ["pending_payment"] },
  { value: "all", label: "All orders", statuses: undefined },
];

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string; status?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (<><PageHeader title="Order history" /><p className="text-sm text-body">No locations are assigned to your account yet.</p></>);
  }
  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const filter = FILTERS.find((f) => f.value === sp.status) ?? FILTERS[0];
  const orders = await listOrders(locId, { statuses: filter.statuses, limit: 200 });

  return (
    <>
      <PageHeader
        title="Order history"
        description="Past orders across this location."
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />
      <form method="get" className="mb-5 flex items-center gap-2">
        <input type="hidden" name="loc" value={locId} />
        <label htmlFor="status" className="text-sm text-body">Show</label>
        <select
          id="status"
          name="status"
          defaultValue={filter.value}
          className="rounded-md border border-sand bg-surface px-3 py-2 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
        >
          {FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button type="submit" className="rounded-md border border-sand px-3 py-2 text-sm text-body hover:bg-sand/50">Apply</button>
        <span className="ml-auto text-sm text-body">{orders.length} orders</span>
      </form>
      <OrdersTable orders={orders} locationId={locId} />
      <p className="mt-3 text-xs text-body">Statuses: {Object.values(ORDER_STATUS_LABEL).join(" · ")}</p>
    </>
  );
}
