import { requireRole, can } from "@/lib/auth/dal";
import { listLocations } from "@/lib/repositories/admin-locations";
import { PageHeader } from "@/components/admin/ui";
import { LocationsManager } from "@/components/admin/LocationsManager";

export default async function LocationsPage() {
  const ctx = await requireRole("location_manager");
  const locations = await listLocations();
  const canManage = can(ctx, "restaurant_manager");

  return (
    <>
      <PageHeader
        title="Locations"
        description="Balham, Battersea and Kilburn — their details, hours and public visibility."
      />
      <LocationsManager locations={locations} canManage={canManage} />
    </>
  );
}
