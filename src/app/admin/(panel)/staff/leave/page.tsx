import { requireStaff, can } from "@/lib/auth/dal";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { listMyLeave, listLeave, type LeaveRow } from "@/lib/repositories/staff";
import { PageHeader } from "@/components/admin/ui";
import { LocationSwitcher } from "@/components/admin/reservations/LocationSwitcher";
import { LeaveManager } from "@/components/admin/staff/LeaveManager";
import { TeamLeave } from "@/components/admin/staff/TeamLeave";

export default async function LeavePage({ searchParams }: { searchParams: Promise<{ loc?: string }> }) {
  const ctx = await requireStaff();
  const sp = await searchParams;
  const myLeave = await listMyLeave(ctx.userId);
  const isManager = can(ctx, "location_manager");

  let teamLeave: LeaveRow[] = [];
  let scoped: { id: string; name: string }[] = [];
  let locId: string | undefined;
  if (isManager) {
    scoped = (filterScoped(await listLocations(false), scopedLocationIds(ctx))).map((l) => ({ id: l.id, name: l.name }));
    locId = scoped.find((l) => l.id === sp.loc)?.id ?? scoped[0]?.id;
    if (locId) teamLeave = await listLeave(locId);
  }

  return (
    <>
      <PageHeader title="Leave" description="Request time off and track your requests." />
      <LeaveManager myLeave={myLeave} />

      {isManager && locId && (
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl text-text">Team requests</h2>
            <LocationSwitcher locations={scoped} current={locId} />
          </div>
          <TeamLeave leave={teamLeave} />
        </section>
      )}
    </>
  );
}
