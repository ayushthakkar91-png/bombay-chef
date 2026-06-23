import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireStaff, can } from "@/lib/auth/dal";
import { getPurchaseOrder } from "@/lib/repositories/purchasing";
import { listItems } from "@/lib/repositories/inventory";
import { PO_STATUS_LABEL, gbp } from "@/lib/inventory/constants";
import { PageHeader } from "@/components/admin/ui";
import { Badge } from "@/components/admin/primitives";
import { PurchaseOrderDetail } from "@/components/admin/inventory/PurchaseOrderDetail";

const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
const tone = (s: string) => (s === "received" ? "on" : s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export default async function PurchaseOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireStaff();
  const { id } = await params;
  const po = await getPurchaseOrder(id);
  if (!po) return (<><PageHeader title="Purchase order" /><p className="text-sm text-body">Order not found.</p></>);

  const items = await listItems();
  const canManage = can(ctx, "location_manager", po.locationId);

  return (
    <>
      <Link href="/admin/inventory/purchase-orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-body hover:text-primary"><ArrowLeft className="h-4 w-4" /> All orders</Link>
      <PageHeader
        title={`Order ${po.code}`}
        description={`${po.supplierName} · ${po.locationName}${po.expectedAt ? ` · expected ${d(po.expectedAt)}` : ""}${po.receivedAt ? ` · received ${d(po.receivedAt)}` : ""}`}
        actions={<div className="flex items-center gap-3"><span className="font-serif text-lg text-text">{gbp(po.totalPence)}</span><Badge tone={tone(po.status)}>{PO_STATUS_LABEL[po.status]}</Badge></div>}
      />
      {po.notes && <p className="mb-5 rounded-lg border border-sand bg-bg/30 px-4 py-3 text-sm text-body">{po.notes}</p>}
      <PurchaseOrderDetail po={po} items={items} canManage={canManage} />
    </>
  );
}
