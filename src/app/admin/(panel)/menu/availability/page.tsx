import { requireStaff } from "@/lib/auth/dal";
import { getAvailabilityMatrix } from "@/lib/repositories/admin-locations";
import { PageHeader } from "@/components/admin/ui";
import { AvailabilityManager } from "@/components/admin/AvailabilityManager";

export default async function AvailabilityPage() {
  const ctx = await requireStaff();
  const matrix = await getAvailabilityMatrix();

  // Which locations may this staff member change? An org-wide grant (location_id
  // null) edits any branch; otherwise only their assigned location ids. This
  // mirrors the RLS policy "staff write location_menu" in migration 0004.
  const orgWide = ctx.grants.some((g) => g.locationId === null);
  const editable: string[] | null = orgWide
    ? null
    : Array.from(new Set(ctx.grants.map((g) => g.locationId).filter((x): x is string => Boolean(x))));

  return (
    <>
      <PageHeader
        title="Branch availability"
        description="Temporarily 86 a dish at one location without removing it from the menu."
      />
      <AvailabilityManager matrix={matrix} editable={editable} />
    </>
  );
}
