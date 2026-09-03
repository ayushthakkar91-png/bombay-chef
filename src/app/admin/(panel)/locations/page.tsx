import { requireRole, can } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { getOrderingStatusById } from "@/lib/repositories/ordering-status";
import { isInternalOrdering } from "@/lib/ordering/routing";
import { PageHeader } from "@/components/admin/ui";
import { LocationsManager } from "@/components/admin/LocationsManager";
import { OrderingToggle } from "@/components/admin/orders/OrderingToggle";

export default async function LocationsPage() {
  const ctx = await requireRole("location_manager");
  const locations = await listLocations();
  const canManage = can(ctx, "restaurant_manager");

  // Ordering on/off switch for the branch that takes online orders (Balham).
  const orderingLoc = locations.find((l) => isInternalOrdering(l.slug));
  const orderingStatus = orderingLoc ? await getOrderingStatusById(orderingLoc.id) : null;

  return (
    <>
      <PageHeader
        title="Locations"
        description="Balham, Battersea and Kilburn — their details, hours and public visibility."
      />
      {orderingLoc && orderingStatus && (
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-body/80">Online ordering — {orderingLoc.name}</p>
          <OrderingToggle locationId={orderingLoc.id} initialAccepting={orderingStatus.accepting} initialMessage={orderingStatus.message} />
        </div>
      )}
      <LocationsManager locations={locations} canManage={canManage} />
    </>
  );
}
