import Link from "next/link";
import { ArrowRight, AlertTriangle } from "lucide-react";

import { getStaffContext } from "@/lib/auth/dal";
import { listCategories, listItems } from "@/lib/repositories/admin-menu";
import { listLocations } from "@/lib/repositories/admin-locations";
import { PageHeader, Panel, Stat } from "@/components/admin/ui";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [{ denied }, ctx, categories, items, locations] = await Promise.all([
    searchParams,
    getStaffContext(),
    listCategories(),
    listItems(),
    listLocations(),
  ]);

  const unavailable = items.filter((i) => !i.isAvailable).length;
  const activeLocations = locations.filter((l) => l.isActive).length;
  const firstName = ctx?.fullName?.split(" ")[0] ?? null;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description="Your menu and locations at a glance. Ordering, reservations and the rest arrive in later phases."
      />

      {denied && (
        <div role="alert" className="mb-6 flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 text-sm text-primary">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>You don’t have permission for that area. Ask a manager if you think you should.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Categories" value={categories.length} />
        <Stat label="Dishes" value={items.length} hint={unavailable ? `${unavailable} currently unavailable` : "All available"} />
        <Stat label="Unavailable dishes" value={unavailable} />
        <Stat label="Locations" value={locations.length} hint={`${activeLocations} live on site`} />
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Panel title="Menu">
          <div className="flex flex-col divide-y divide-sand">
            <QuickLink href="/admin/menu/items" label="Manage dishes" detail={`${items.length} dishes`} />
            <QuickLink href="/admin/menu/categories" label="Manage categories" detail={`${categories.length} categories`} />
            <QuickLink href="/admin/menu/availability" label="Branch availability" detail="86 dishes per location" />
          </div>
        </Panel>
        <Panel title="Estate">
          <div className="flex flex-col divide-y divide-sand">
            <QuickLink href="/admin/locations" label="Manage locations" detail={`${locations.length} locations`} />
          </div>
        </Panel>
      </div>
    </>
  );
}

function QuickLink({ href, label, detail }: { href: string; label: string; detail: string }) {
  return (
    <Link href={href} className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-bg/40">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-body">{detail}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-body transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}
