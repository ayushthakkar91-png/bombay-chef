import { requireRole } from "@/lib/auth/dal";
import { getSegments } from "@/lib/repositories/admin-marketing";
import { PageHeader, Th, Td } from "@/components/admin/ui";
import { RefreshSegments } from "@/components/admin/marketing/RefreshSegments";

export default async function SegmentsPage() {
  await requireRole("restaurant_manager");
  const segments = await getSegments();

  return (
    <>
      <PageHeader title="Segments" description="Audience groups computed from ordering and reservation behaviour." actions={<RefreshSegments />} />
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Segment</Th><Th className="text-right">Customers</Th></tr></thead>
          <tbody className="divide-y divide-sand">
            {segments.map((s) => (
              <tr key={s.id} className="hover:bg-bg/30"><Td className="font-medium">{s.name}</Td><Td className="text-right tabular-nums">{s.count}</Td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-body">Membership recomputes nightly via the marketing cron, or instantly with “Refresh now”.</p>
    </>
  );
}
