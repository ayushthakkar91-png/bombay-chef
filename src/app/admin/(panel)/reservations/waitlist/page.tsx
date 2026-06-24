import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listWaitlist } from "@/lib/repositories/reservations";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { WaitlistManager } from "@/components/admin/reservations/WaitlistManager";

export default async function WaitlistPage({
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
        <PageHeader title="Waitlist" />
        <p className="text-sm text-body">No locations are assigned to your account yet.</p>
      </>
    );
  }

  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  const entries = await listWaitlist(locId);

  return (
    <>
      <PageHeader
        title="Waitlist"
        description="Guests waiting for a table. Offer them a slot when one opens."
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />
      <WaitlistManager entries={entries} locationId={locId} />
    </>
  );
}
