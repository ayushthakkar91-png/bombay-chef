import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { getSupplier, listSupplierProducts, listPriceHistory } from "@/lib/repositories/suppliers";
import { listItems } from "@/lib/repositories/inventory";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge } from "@/components/admin/primitives";
import { SupplierCatalogue } from "@/components/admin/inventory/SupplierCatalogue";

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("restaurant_manager");
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) return (<><PageHeader title="Supplier" /><p className="text-sm text-body">Supplier not found.</p></>);

  const [products, items] = await Promise.all([listSupplierProducts(id), listItems()]);
  const historyEntries = await Promise.all(products.map(async (p) => [p.id, await listPriceHistory(p.id)] as const));
  const history = Object.fromEntries(historyEntries);

  return (
    <>
      <Link href="/admin/inventory/suppliers" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-primary"><ArrowLeft className="h-4 w-4" /> All suppliers</Link>
      <PageHeader title={supplier.name} description={[supplier.contactName, supplier.email, supplier.phone].filter(Boolean).join(" · ")} actions={<Badge tone={supplier.isActive ? "on" : "off"}>{supplier.isActive ? "Active" : "Inactive"}</Badge>} />

      {(supplier.address || supplier.notes) && (
        <div className="mb-6">
          <Panel title="Details">
            <div className="space-y-1 px-5 py-4 text-sm text-body">
              {supplier.address && <p>{supplier.address}</p>}
              {supplier.notes && <p>{supplier.notes}</p>}
            </div>
          </Panel>
        </div>
      )}

      <h2 className="mb-3 font-serif text-xl text-text">Price catalogue</h2>
      <SupplierCatalogue supplierId={id} products={products} items={items} history={history} />
    </>
  );
}
