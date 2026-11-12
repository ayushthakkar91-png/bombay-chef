import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { KitchenPrinter } from "@/components/admin/orders/KitchenPrinter";

export const metadata = { title: "Kitchen printer" };

export default async function KitchenPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (
      <>
        <PageHeader title="Kitchen printer" />
        <p className="text-sm text-body">No locations are assigned to your account yet.</p>
      </>
    );
  }
  const location = scoped.find((l) => l.slug === sp.loc || l.id === sp.loc) ?? scoped[0];

  return (
    <>
      <PageHeader
        title="Kitchen printer"
        description="Leave this open on the till. Every new order prints by itself."
        actions={<LocationSwitcher locations={scoped} current={location.id} />}
      />
      <KitchenPrinter locationId={location.id} locationName={location.name} />
    </>
  );
}
