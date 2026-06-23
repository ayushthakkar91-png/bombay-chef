import Link from "next/link";
import { Search } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { listCustomers } from "@/lib/repositories/admin-customers";
import { PageHeader } from "@/components/admin/ui";
import { Th, Td } from "@/components/admin/ui";
import { EmptyState } from "@/components/admin/primitives";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("restaurant_manager");
  const { q } = await searchParams;
  const customers = await listCustomers(q);

  return (
    <>
      <PageHeader title="Customers" description="Account holders — profiles, history, consent." />
      <form method="get" className="mb-5 flex items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
          <input name="q" defaultValue={q ?? ""} placeholder="Search name or email…" className="w-72 rounded-md border border-sand bg-surface py-2 pl-8 pr-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass" />
        </div>
        <button type="submit" className="rounded-md border border-sand px-3 py-2 text-sm text-body hover:bg-sand/50">Search</button>
      </form>

      {customers.length === 0 ? (
        <EmptyState title="No customers" description={q ? "No matches for that search." : "Customer accounts will appear here once people sign up."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40">
              <tr><Th>Name</Th><Th>Email</Th><Th>Phone</Th><Th className="w-px" /></tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-bg/30">
                  <Td className="font-medium">{c.name ?? "—"}</Td>
                  <Td className="text-body">{c.email ?? "—"}</Td>
                  <Td className="text-body">{c.phone ?? "—"}</Td>
                  <Td className="text-right"><Link href={`/admin/customers/${c.id}`} className="text-sm text-primary hover:underline">View</Link></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
