"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

import type { POListRow } from "@/lib/repositories/purchasing";
import type { Supplier } from "@/lib/repositories/suppliers";
import { PO_STATUS_LABEL, gbp } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { createPurchaseOrder } from "@/app/admin/_actions/purchasing";
import { Modal } from "@/components/admin/Modal";
import { Badge, Banner, Button, EmptyState, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short" }).format(new Date(iso));
const tone = (s: string) => (s === "received" ? "on" : s === "cancelled" ? "off" : "accent") as "on" | "off" | "accent";

export function PurchaseOrdersList({ orders, suppliers, locationId, canCreate }: { orders: POListRow[]; suppliers: Supplier[]; locationId: string; canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {canCreate && <div className="mb-4 flex justify-end"><Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New order</Button></div>}
      {orders.length === 0 ? (
        <EmptyState title="No purchase orders" description="Create an order to a supplier, add items, then receive stock." action={canCreate ? <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New order</Button> : undefined} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Order</Th><Th>Supplier</Th><Th className="text-right">Lines</Th><Th className="text-right">Total</Th><Th>Expected</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-sand">
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-bg/30">
                  <Td><Link href={`/admin/inventory/purchase-orders/${o.id}`} className="font-medium text-text hover:text-primary">{o.code}</Link></Td>
                  <Td className="text-body">{o.supplierName}</Td>
                  <Td className="text-right tabular-nums">{o.itemCount}</Td>
                  <Td className="text-right tabular-nums">{gbp(o.totalPence)}</Td>
                  <Td className="text-body">{o.expectedAt ? d(o.expectedAt) : "—"}</Td>
                  <Td><Badge tone={tone(o.status)}>{PO_STATUS_LABEL[o.status]}</Badge></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New purchase order"><CreateForm suppliers={suppliers} locationId={locationId} onDone={() => setOpen(false)} /></Modal>
    </>
  );
}

function CreateForm({ suppliers, locationId, onDone }: { suppliers: Supplier[]; locationId: string; onDone: () => void }) {
  const [state, action] = useActionState(createPurchaseOrder, IDLE);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      <input type="hidden" name="locationId" value={locationId} />
      <Field label="Supplier" htmlFor="supplierId" required>
        <Select id="supplierId" name="supplierId" defaultValue="">
          <option value="" disabled>Choose…</option>
          {suppliers.filter((s) => s.isActive).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label="Expected delivery" htmlFor="expectedAt"><TextInput id="expectedAt" name="expectedAt" type="date" /></Field>
      <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" /></Field>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>Create order</SubmitButton></div>
    </form>
  );
}
