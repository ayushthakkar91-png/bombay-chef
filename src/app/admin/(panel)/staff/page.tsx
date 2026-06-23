import { requireRole, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listStaff } from "@/lib/repositories/staff";
import { PageHeader } from "@/components/admin/ui";
import { StaffManager } from "@/components/admin/staff/StaffManager";

export default async function StaffPage() {
  const ctx = await requireRole("location_manager");
  const [allStaff, allLocations] = await Promise.all([listStaff(), listLocations(false)]);

  const scope = scopedLocationIds(ctx);
  const staff = scope === null ? allStaff : allStaff.filter((s) => s.grants.some((g) => g.locationId && scope.includes(g.locationId)));
  const locations = filterScoped(allLocations, scope).map((l) => ({ id: l.id, name: l.name }));

  return (
    <>
      <PageHeader title="Staff" description="Accounts, roles and location access." />
      <StaffManager staff={staff} locations={locations} canDeactivate={can(ctx, "restaurant_manager")} />
    </>
  );
}
