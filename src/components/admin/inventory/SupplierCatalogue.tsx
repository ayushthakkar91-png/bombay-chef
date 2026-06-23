"use client";

import { useActionState } from "react";

import type { SupplierProduct } from "@/lib/repositories/suppliers";
import type { InventoryItem } from "@/lib/repositories/inventory";
import { gbp, qtyFmt } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { saveSupplierProduct, deleteSupplierProduct } from "@/app/admin/_actions/suppliers";
import { useActionResult } from "@/components/admin/useActionResult";
import { Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

const d = (iso: string) => new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));

export function SupplierCatalogue({ supplierId, products, items, history }: { supplierId: string; products: SupplierProduct[]; items: InventoryItem[]; history: Record<string, { pricePence: number; createdAt: string }[]> }) {
  return (
    <div className="flex flex-col gap-5">
      <AddProduct supplierId={supplierId} items={items} />
      {products.length === 0 ? (
        <p className="text-sm text-body">No products in this supplier&apos;s catalogue yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Item</Th><Th>SKU</Th><Th className="text-right">Pack</Th><Th className="text-right">Price/pack</Th><Th className="text-right">Per unit</Th><Th>Price history</Th><Th className="w-px" /></tr></thead>
            <tbody className="divide-y divide-sand">
              {products.map((p) => {
                const h = history[p.id] ?? [];
                return (
                  <tr key={p.id} className="hover:bg-bg/30">
                    <Td className="font-medium">{p.itemName} <span className="text-xs text-body">/ {p.unit}</span></Td>
                    <Td className="text-body">{p.sku ?? "—"}</Td>
                    <Td className="text-right tabular-nums">{qtyFmt(p.packSize)} {p.unit}</Td>
                    <Td className="text-right tabular-nums">{gbp(p.pricePence)}</Td>
                    <Td className="text-right tabular-nums text-body">{gbp(p.perUnitPence)}</Td>
                    <Td className="text-xs text-body">{h.slice(0, 3).map((x) => `${gbp(x.pricePence)} (${d(x.createdAt)})`).join(" · ") || "—"}</Td>
                    <Td className="text-right"><DeleteProduct id={p.id} supplierId={supplierId} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddProduct({ supplierId, items }: { supplierId: string; items: InventoryItem[] }) {
  const [state, action] = useActionState(saveSupplierProduct, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="rounded-lg border border-sand bg-surface p-4">
      <Banner state={state} />
      <div className="mt-2 grid gap-3 sm:grid-cols-5 sm:items-end">
        <Field label="Item" htmlFor="itemId">
          <Select id="itemId" name="itemId" defaultValue="">
            <option value="" disabled>Choose…</option>
            {items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
          </Select>
        </Field>
        <Field label="SKU" htmlFor="sku"><TextInput id="sku" name="sku" /></Field>
        <Field label="Pack size" htmlFor="packSize" hint="base units"><TextInput id="packSize" name="packSize" inputMode="decimal" defaultValue="1" /></Field>
        <Field label="Price/pack £" htmlFor="price"><TextInput id="price" name="price" inputMode="decimal" /></Field>
        <SubmitButton>Save</SubmitButton>
      </div>
      <input type="hidden" name="supplierId" value={supplierId} />
    </form>
  );
}

function DeleteProduct({ id, supplierId }: { id: string; supplierId: string }) {
  const [state, action] = useActionState(deleteSupplierProduct, IDLE);
  useActionResult(state);
  return (
    <form action={action} onSubmit={(e) => { if (!window.confirm("Remove from catalogue?")) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="supplierId" value={supplierId} />
      <Button type="submit" variant="ghost">Remove</Button>
    </form>
  );
}
