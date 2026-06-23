"use client";

import { useActionState } from "react";

import type { WasteRow } from "@/lib/repositories/inventory";
import type { InventoryItem } from "@/lib/repositories/inventory";
import { WASTE_REASONS, wasteReasonLabel, gbp, qtyFmt } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { recordWaste } from "@/app/admin/_actions/inventory";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Field, Select, SubmitButton, Textarea, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const dt = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export function WasteManager({ items, waste, locationId }: { items: InventoryItem[]; waste: WasteRow[]; locationId: string }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <RecordForm items={items} locationId={locationId} />
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Item</Th><Th className="text-right">Qty</Th><Th>Reason</Th><Th className="text-right">Cost</Th><Th>When</Th></tr></thead>
          <tbody className="divide-y divide-sand">
            {waste.length === 0 ? (
              <tr><Td className="text-body" >No waste logged.</Td><Td /><Td /><Td /><Td /></tr>
            ) : waste.map((w) => (
              <tr key={w.id} className="hover:bg-bg/30">
                <Td className="font-medium">{w.name}</Td>
                <Td className="text-right tabular-nums">{qtyFmt(w.qty)} {w.unit}</Td>
                <Td><Badge tone="off">{wasteReasonLabel(w.reason)}</Badge></Td>
                <Td className="text-right tabular-nums text-body">{gbp(w.costPence)}</Td>
                <Td className="text-body">{dt(w.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RecordForm({ items, locationId }: { items: InventoryItem[]; locationId: string }) {
  const [state, action] = useActionState(recordWaste, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-sand bg-surface p-5 self-start">
      <h2 className="text-sm font-semibold text-text">Record waste</h2>
      <Banner state={state} />
      <input type="hidden" name="locationId" value={locationId} />
      <Field label="Item" htmlFor="itemId" required>
        <Select id="itemId" name="itemId" defaultValue="">
          <option value="" disabled>Choose…</option>
          {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Quantity" htmlFor="qty" required><TextInput id="qty" name="qty" inputMode="decimal" /></Field>
        <Field label="Reason" htmlFor="reason"><Select id="reason" name="reason" defaultValue="kitchen">{WASTE_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</Select></Field>
      </div>
      <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" /></Field>
      <div className="flex justify-end"><SubmitButton>Log waste</SubmitButton></div>
    </form>
  );
}
