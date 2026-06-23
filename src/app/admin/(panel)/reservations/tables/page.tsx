import { requireRole } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listTables, listSlots, listBlocks } from "@/lib/repositories/reservations";
import { PageHeader, Panel } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { TablesManager, type TableRow } from "@/components/admin/reservations/TablesManager";
import { ServiceWindows, type SlotRow } from "@/components/admin/reservations/ServiceWindows";
import { BlocksManager, type BlockRow } from "@/components/admin/reservations/BlocksManager";

export default async function TablesPage({
  searchParams,
}: {
  searchParams: Promise<{ loc?: string }>;
}) {
  const ctx = await requireRole("location_manager");
  const sp = await searchParams;

  const scoped = filterScoped(await listLocations(false), scopedLocationIds(ctx));
  if (scoped.length === 0) {
    return (
      <>
        <PageHeader title="Tables & hours" />
        <p className="text-sm text-body">No locations are assigned to your account yet.</p>
      </>
    );
  }

  const locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0].id;
  const [tables, slots, blocks] = await Promise.all([
    listTables(locId),
    listSlots(locId),
    listBlocks(locId, new Date().toISOString()),
  ]);

  return (
    <>
      <PageHeader
        title="Tables & hours"
        description="Capacities, service windows and one-off closures for this branch."
        actions={<LocationSwitcher locations={scoped} current={locId} />}
      />

      <div className="flex flex-col gap-8">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Tables</h2>
          <TablesManager tables={tables as unknown as TableRow[]} locationId={locId} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Service windows &amp; capacity</h2>
          <ServiceWindows slots={slots as unknown as SlotRow[]} locationId={locId} />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">Blocks &amp; closures</h2>
          <Panel className="p-4">
            <BlocksManager blocks={blocks as unknown as BlockRow[]} locationId={locId} />
          </Panel>
        </section>
      </div>
    </>
  );
}
