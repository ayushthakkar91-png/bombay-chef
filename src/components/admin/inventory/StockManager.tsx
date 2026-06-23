"use client";

import { useActionState, useState, useMemo } from "react";
import { Plus, Search, SlidersHorizontal } from "lucide-react";

import type { StockRow } from "@/lib/repositories/inventory";
import { ITEM_CATEGORIES, UNITS, categoryLabel, gbp, qtyFmt } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { saveItem, adjustStock, setStockLevels } from "@/app/admin/_actions/inventory";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, EmptyState, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

export function StockManager({ stock, locationId, canManageStock, canManageItems }: { stock: StockRow[]; locationId: string; canManageStock: boolean; canManageItems: boolean }) {
  const [addOpen, setAddOpen] = useState(false);
  const [managing, setManaging] = useState<StockRow | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");

  const rows = useMemo(() => stock.filter((r) => (cat === "" || r.category === cat) && (query === "" || r.name.toLowerCase().includes(query.toLowerCase()))), [stock, query, cat]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-body/60" />
          <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items…" className="w-52 pl-8" aria-label="Search" />
        </div>
        <Select value={cat} onChange={(e) => setCat(e.target.value)} className="w-44" aria-label="Category">
          <option value="">All categories</option>
          {ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
        {canManageItems && <Button className="ml-auto" onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> New item</Button>}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No items" description={canManageItems ? "Add inventory items to start tracking stock." : "No items match."} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
          <table className="w-full border-collapse">
            <thead className="border-b border-sand bg-bg/40"><tr><Th>Item</Th><Th>Category</Th><Th className="text-right">In stock</Th><Th className="text-right">Reorder at</Th><Th className="text-right">Unit cost</Th><Th className="text-right">Value</Th>{canManageStock && <Th className="w-px" />}</tr></thead>
            <tbody className="divide-y divide-sand">
              {rows.map((r) => (
                <tr key={r.itemId} className="hover:bg-bg/30">
                  <Td className="font-medium">{r.name} <span className="text-xs text-body">/ {r.unit}</span></Td>
                  <Td className="text-body">{categoryLabel(r.category)}</Td>
                  <Td className="text-right tabular-nums">{qtyFmt(r.qty)} {r.low && <Badge tone="off">Low</Badge>}</Td>
                  <Td className="text-right tabular-nums text-body">{r.reorderLevel ? qtyFmt(r.reorderLevel) : "—"}</Td>
                  <Td className="text-right tabular-nums text-body">{gbp(r.costPence)}</Td>
                  <Td className="text-right tabular-nums">{gbp(Math.round(r.qty * r.costPence))}</Td>
                  {canManageStock && <Td className="text-right"><Button variant="ghost" onClick={() => setManaging(r)} aria-label={`Manage ${r.name}`}><SlidersHorizontal className="h-4 w-4" /></Button></Td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="New inventory item"><ItemForm onDone={() => setAddOpen(false)} /></Modal>
      <Modal open={managing !== null} onClose={() => setManaging(null)} title={managing ? `Manage ${managing.name}` : "Manage"}>
        {managing && <ManageRow key={managing.itemId} row={managing} locationId={locationId} canManageItems={canManageItems} onDone={() => setManaging(null)} />}
      </Modal>
    </>
  );
}

function ItemForm({ row, onDone }: { row?: StockRow; onDone: () => void }) {
  const [state, action] = useActionState(saveItem, IDLE);
  useActionResult(state, onDone);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Banner state={state} />
      {row && <input type="hidden" name="id" value={row.itemId} />}
      <Field label="Name" htmlFor="name" required error={state.errors?.name}><TextInput id="name" name="name" defaultValue={state.values?.name ?? row?.name} /></Field>
      <div className="grid grid-cols-3 gap-4">
        <Field label="Category" htmlFor="category"><Select id="category" name="category" defaultValue={row?.category ?? "ingredient"}>{ITEM_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></Field>
        <Field label="Unit" htmlFor="unit" required error={state.errors?.unit}><Select id="unit" name="unit" defaultValue={row?.unit ?? "kg"}>{UNITS.map((u) => <option key={u} value={u}>{u}</option>)}</Select></Field>
        <Field label="Unit cost £" htmlFor="cost" hint="Auto-updates on receiving."><TextInput id="cost" name="cost" inputMode="decimal" defaultValue={row ? (row.costPence / 100).toFixed(2) : ""} /></Field>
      </div>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onDone}>Cancel</Button><SubmitButton>{row ? "Save" : "Add item"}</SubmitButton></div>
    </form>
  );
}

function ManageRow({ row, locationId, canManageItems, onDone }: { row: StockRow; locationId: string; canManageItems: boolean; onDone: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-lg border border-sand bg-bg/30 p-4 text-sm">In stock: <span className="font-semibold">{qtyFmt(row.qty)} {row.unit}</span> · value {gbp(Math.round(row.qty * row.costPence))}</div>
      <AdjustForm row={row} locationId={locationId} />
      <LevelsForm row={row} locationId={locationId} />
      {canManageItems && (
        <div className="border-t border-sand pt-4">
          <p className="mb-3 text-sm font-medium text-text">Edit item details</p>
          <ItemForm row={row} onDone={onDone} />
        </div>
      )}
    </div>
  );
}

function AdjustForm({ row, locationId }: { row: StockRow; locationId: string }) {
  const [state, action] = useActionState(adjustStock, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm font-medium text-text">Adjust stock</p>
      <Banner state={state} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="itemId" value={row.itemId} />
      <div className="grid grid-cols-2 gap-3">
        <Field label={`Change (+/− ${row.unit})`} htmlFor="delta"><TextInput id="delta" name="delta" inputMode="decimal" placeholder="e.g. 5 or -2" /></Field>
        <Field label="Reason" htmlFor="reason"><TextInput id="reason" name="reason" placeholder="Stock count, spillage…" /></Field>
      </div>
      <div className="flex justify-end"><SubmitButton variant="secondary">Apply adjustment</SubmitButton></div>
    </form>
  );
}

function LevelsForm({ row, locationId }: { row: StockRow; locationId: string }) {
  const [state, action] = useActionState(setStockLevels, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="flex flex-col gap-3 border-t border-sand pt-4">
      <p className="text-sm font-medium text-text">Reorder levels</p>
      <Banner state={state} />
      <input type="hidden" name="locationId" value={locationId} />
      <input type="hidden" name="itemId" value={row.itemId} />
      <div className="grid grid-cols-3 gap-3">
        <Field label="Minimum" htmlFor="minQty"><TextInput id="minQty" name="minQty" inputMode="decimal" defaultValue={row.minQty || ""} /></Field>
        <Field label="Reorder at" htmlFor="reorderLevel"><TextInput id="reorderLevel" name="reorderLevel" inputMode="decimal" defaultValue={row.reorderLevel || ""} /></Field>
        <Field label="Reorder qty" htmlFor="reorderQty"><TextInput id="reorderQty" name="reorderQty" inputMode="decimal" defaultValue={row.reorderQty || ""} /></Field>
      </div>
      <div className="flex justify-end"><SubmitButton variant="secondary">Save levels</SubmitButton></div>
    </form>
  );
}
