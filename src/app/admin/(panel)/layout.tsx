import type { Metadata } from "next";

import { requireStaff } from "@/lib/auth/dal";
import { ROLE_RANK, ROLES, type Role } from "@/lib/auth/roles";
import { scopedLocationIds, filterScoped } from "@/lib/auth/scope";
import { listLocations } from "@/lib/repositories/admin-locations";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Admin · Bombay Bicycle Chef",
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireStaff();

  // Highest-ranked role held, for the top-bar badge + coarse nav gating.
  const topRole: Role = ROLES.reduce(
    (best, r) =>
      ctx.grants.some((g) => g.role === r) && ROLE_RANK[r] > ROLE_RANK[best] ? r : best,
    "staff" as Role,
  );

  const locations = filterScoped(await listLocations(false), scopedLocationIds(ctx)).map((l) => ({ id: l.id, name: l.name }));

  return (
    <AdminShell user={{ name: ctx.fullName, email: ctx.email }} rank={ctx.rank} topRole={topRole} locations={locations}>
      {children}
    </AdminShell>
  );
}
