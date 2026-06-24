import { requireStaff } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listItems, listWaste } from "@/lib/repositories/inventory";
import { gbp } from "@/lib/inventory/constants";
import { PageHeader, Stat } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { WasteManager } from "@/components/admin/inventory/WasteManager";

export default async function WastePage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) return (<><PageHeader title="Waste" /><p className="text-sm text-body">No locations assigned.</p></>);

  const locId = scoped.find((l) => (l.slug === sp.loc || l.id === sp.loc))?.id ?? scoped[0].id;
  // eslint-disable-next-line react-hooks/purity -- request-time boundary in a Server Component
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const [items, waste] = await Promise.all([listItems(), listWaste(locId)]);
  const last30 = waste.filter((w) => w.createdAt >= monthAgo);
  const value30 = last30.reduce((s, w) => s + w.costPence, 0);

  return (
    <>
      <PageHeader title="Waste" description="Log damaged, expired and kitchen waste." actions={<LocationSwitcher locations={scoped} current={locId} />} />
      <div className="mb-6 grid grid-cols-2 gap-4 sm:max-w-md">
        <Stat label="Waste events (30d)" value={last30.length} />
        <Stat label="Waste cost (30d)" value={gbp(value30)} />
      </div>
      <WasteManager items={items} waste={waste} locationId={locId} />
    </>
  );
}
