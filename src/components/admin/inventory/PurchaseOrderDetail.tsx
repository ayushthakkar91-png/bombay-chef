"use client";

import { useActionState } from "react";

import type { PODetail } from "@/lib/repositories/purchasing";
import type { InventoryItem } from "@/lib/repositories/inventory";
import { gbp, qtyFmt } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { addPurchaseOrderItem, removePurchaseOrderItem, setPurchaseOrderStatus, receivePurchaseOrder } from "@/app/admin/_actions/purchasing";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export function PurchaseOrderDetail({ po, items, canManage }: { po: PODetail; items: InventoryItem[]; canManage: boolean }) {
  const editable = canManage && (po.status === "draft" || po.status === "sent");
  const receivable = canManage && (po.status === "draft" || po.status === "sent");

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Item</Th><Th className="text-right">Packs</Th><Th className="text-right">Pack size</Th><Th className="text-right">£/pack</Th><Th className="text-right">Line total</Th><Th className="text-right">Received</Th>{editable && <Th className="w-px" />}</tr></thead>
          <tbody className="divide-y divide-sand">
            {po.items.length === 0 ? (
              <tr><Td className="text-body">No items yet.</Td><Td /><Td /><Td /><Td /><Td />{editable && <Td />}</tr>
            ) : po.items.map((it) => (
              <tr key={it.id}>
                <Td className="font-medium">{it.name} <span className="text-xs text-body">/ {it.unit}</span></Td>
                <Td className="text-right tabular-nums">{qtyFmt(it.qtyOrdered)}</Td>
                <Td className="text-right tabular-nums text-body">{qtyFmt(it.packSize)} {it.unit}</Td>
                <Td className="text-right tabular-nums">{gbp(it.unitPricePence)}</Td>
                <Td className="text-right tabular-nums">{gbp(it.qtyOrdered * it.unitPricePence)}</Td>
                <Td className="text-right tabular-nums text-body">{qtyFmt(it.qtyReceived)}</Td>
                {editable && <Td className="text-right"><RemoveItem id={it.id} poId={po.id} /></Td>}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-sand"><tr><Td className="font-medium" >Total</Td><Td /><Td /><Td /><Td className="text-right font-semibold tabular-nums">{gbp(po.totalPence)}</Td><Td />{editable && <Td />}</tr></tfoot>
        </table>
      </div>

      {editable && <AddItem poId={po.id} items={items} />}

      {canManage && po.status !== "cancelled" && po.status !== "received" && (
        <div className="flex flex-wrap gap-2">
          {po.status === "draft" && <StatusButton id={po.id} status="sent" label="Mark sent" variant="secondary" />}
          {receivable && po.items.length > 0 && <ReceiveButton id={po.id} />}
          <StatusButton id={po.id} status="cancelled" label="Cancel order" variant="danger" confirm="Cancel this purchase order?" />
        </div>
      )}
    </div>
  );
}

function AddItem({ poId, items }: { poId: string; items: InventoryItem[] }) {
  const [state, action] = useActionState(addPurchaseOrderItem, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="rounded-lg border border-sand bg-surface p-4">
      <Banner state={state} />
      <div className="mt-2 grid gap-3 sm:grid-cols-5 sm:items-end">
        <Field label="Item" htmlFor="itemId">
          <Select id="itemId" name="itemId" defaultValue=""><option value="" disabled>Choose…</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</Select>
        </Field>
        <Field label="Packs" htmlFor="qtyOrdered"><TextInput id="qtyOrdered" name="qtyOrdered" inputMode="decimal" /></Field>
        <Field label="Pack size" htmlFor="packSize" hint="base units"><TextInput id="packSize" name="packSize" inputMode="decimal" defaultValue="1" /></Field>
        <Field label="£/pack" htmlFor="unitPrice"><TextInput id="unitPrice" name="unitPrice" inputMode="decimal" /></Field>
        <SubmitButton>Add</SubmitButton>
      </div>
      <input type="hidden" name="poId" value={poId} />
    </form>
  );
}

function RemoveItem({ id, poId }: { id: string; poId: string }) {
  const [state, action] = useActionState(removePurchaseOrderItem, IDLE);
  useActionResult(state);
  return (
    <form action={action}><input type="hidden" name="id" value={id} /><input type="hidden" name="poId" value={poId} /><Button type="submit" variant="ghost">Remove</Button></form>
  );
}

function StatusButton({ id, status, label, variant, confirm }: { id: string; status: string; label: string; variant: "secondary" | "danger"; confirm?: string }) {
  const [state, action] = useActionState(setPurchaseOrderStatus, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} /><input type="hidden" name="status" value={status} />
      <SubmitButton variant={variant}>{label}</SubmitButton>
    </form>
  );
}

function ReceiveButton({ id }: { id: string }) {
  const [state, action] = useActionState(receivePurchaseOrder, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Receive this order in full and add it to stock?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <SubmitButton pendingLabel="Receiving…">Receive stock</SubmitButton>
    </form>
  );
}
