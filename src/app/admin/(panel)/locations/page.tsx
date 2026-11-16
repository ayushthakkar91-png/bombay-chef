import { requireRole, can } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { getOrderingStatusById } from "@/lib/repositories/ordering-status";
import { isInternalOrdering } from "@/lib/ordering/routing";
import { PageHeader } from "@/components/admin/ui";
import { LocationsManager } from "@/components/admin/LocationsManager";
import { OrderingToggle } from "@/components/admin/orders/OrderingToggle";
import { DeliveryTiers } from "@/components/admin/DeliveryTiers";
import { listDeliveryTiers } from "@/lib/ordering/delivery-tiers";
import { getAllOrderingHours } from "@/lib/repositories/ordering-hours";
import { OrderingHours } from "@/components/admin/OrderingHours";

export default async function LocationsPage() {
  const ctx = await requireRole("location_manager");
  const locations = await listLocations();
  const canManage = can(ctx, "restaurant_manager");
  const deliveryTiers = await listDeliveryTiers();

  // Every branch that takes online orders gets its own pause switch and its
  // own hours. This used to find() the first one, so when Battersea joined it
  // had neither — no way to pause it, and nowhere to set when it trades.
  const orderingLocs = locations.filter((l) => isInternalOrdering(l.slug));
  const orderingStatuses = await Promise.all(orderingLocs.map((l) => getOrderingStatusById(l.id)));
  const hoursByLocation = await getAllOrderingHours();

  return (
    <>
      <PageHeader
        title="Locations"
        description="Balham, Battersea and Kilburn — their details, hours and public visibility."
      />
      {orderingLocs.map((loc, i) => (
        <div key={loc.id} className="mb-6 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-body/80">Online ordering — {loc.name}</p>
          <OrderingToggle locationId={loc.id} initialAccepting={orderingStatuses[i].accepting} initialMessage={orderingStatuses[i].message} />
          <OrderingHours locationId={loc.id} locationName={loc.name} hours={hoursByLocation[loc.id] ?? []} />
        </div>
      ))}
      <div className="mb-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-body/80">Delivery charges — all branches</p>
        <DeliveryTiers tiers={deliveryTiers} canManage={canManage} />
      </div>
      <LocationsManager locations={locations} canManage={canManage} />
    </>
  );
}
