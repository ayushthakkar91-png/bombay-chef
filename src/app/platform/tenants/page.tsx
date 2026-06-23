import Link from "next/link";
import { Building2 } from "lucide-react";

import { listTenants } from "@/lib/repositories/platform";
import { PageHeader } from "@/components/admin/ui";
import { Td, Th } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/admin/primitives";

const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const tone = (s: string) => (s === "active" ? "on" : s === "suspended" || s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export default async function TenantsPage() {
  const tenants = await listTenants();
  return (
    <>
      <PageHeader title="Tenants" description="Every restaurant on the platform." actions={<Link href="/platform/tenants/new" className="inline-flex items-center gap-2 rounded-md bg-text px-4 py-2 text-sm text-bg hover:bg-brass"><Building2 className="h-4 w-4" /> New restaurant</Link>} />
      {tenants.length === 0 ? (
        <EmptyState title="No tenants yet" description="Provision your first restaurant with the setup wizard." action={<Link href="/platform/tenants/new" className="inline-flex items-center gap-2 rounded-md bg-text px-4 py-2 text-sm text-bg hover:bg-brass"><Building2 className="h-4 w-4" /> New restaurant</Link>} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Restaurant</Th><Th>Plan</Th><Th>Owner</Th><Th className="text-right">Locations</Th><Th>Status</Th><Th>Joined</Th></tr></thead>
            <tbody className="divide-y divide-sand">
              {tenants.map((t) => (
                <tr key={t.id} className="hover:bg-bg/30">
                  <Td><Link href={`/platform/tenants/${t.id}`} className="font-medium text-text hover:text-primary">{t.name}</Link><div className="font-mono text-xs text-body">{t.slug}</div></Td>
                  <Td className="text-body">{t.planName ?? "—"}</Td>
                  <Td className="text-body">{t.ownerName ?? "—"}</Td>
                  <Td className="text-right tabular-nums">{t.locationCount}</Td>
                  <Td><Badge tone={tone(t.status)}>{t.status}</Badge></Td>
                  <Td className="text-body">{d(t.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
