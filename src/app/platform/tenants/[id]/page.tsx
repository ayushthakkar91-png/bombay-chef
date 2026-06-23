import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireTenantAccess } from "@/lib/saas/tenancy";
import { getTenant, listPlans } from "@/lib/repositories/platform";
import { PageHeader } from "@/components/admin/ui";
import { TenantManager } from "@/components/platform/TenantManager";

export default async function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireTenantAccess(id);
  const [tenant, plans] = await Promise.all([getTenant(id), listPlans()]);
  if (!tenant) return (<><PageHeader title="Tenant" /><p className="text-sm text-body">Tenant not found.</p></>);

  return (
    <>
      <Link href="/platform/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-primary"><ArrowLeft className="h-4 w-4" /> Tenants</Link>
      <PageHeader title={tenant.name} description={`${tenant.slug} · joined ${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(tenant.createdAt))}`} />
      <TenantManager tenant={tenant} plans={plans} canPlatform={ctx.isPlatformAdmin} />
    </>
  );
}
