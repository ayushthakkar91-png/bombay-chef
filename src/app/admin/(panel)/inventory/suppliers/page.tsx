import { requireRole } from "@/lib/auth/dal";
import { listSuppliers } from "@/lib/repositories/suppliers";
import { PageHeader } from "@/components/admin/ui";
import { SuppliersManager } from "@/components/admin/inventory/SuppliersManager";

export default async function SuppliersPage() {
  await requireRole("restaurant_manager");
  const suppliers = await listSuppliers();
  return (
    <>
      <PageHeader title="Suppliers" description="Supplier profiles, contacts and price catalogues." />
      <SuppliersManager suppliers={suppliers} />
    </>
  );
}
