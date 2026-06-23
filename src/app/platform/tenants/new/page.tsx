import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { listPlans } from "@/lib/repositories/platform";
import { PageHeader } from "@/components/admin/ui";
import { SetupWizard } from "@/components/platform/SetupWizard";

export default async function NewTenantPage() {
  const plans = await listPlans();
  return (
    <>
      <Link href="/platform/tenants" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-primary"><ArrowLeft className="h-4 w-4" /> Tenants</Link>
      <PageHeader title="New restaurant" description="Provision a tenant in a few steps." />
      <SetupWizard plans={plans} />
    </>
  );
}
