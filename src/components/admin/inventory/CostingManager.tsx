"use client";

import { useActionState, useState } from "react";

import type { DishCost, RecipeLine } from "@/lib/repositories/costing";
import type { InventoryItem } from "@/lib/repositories/inventory";
import { gbp, qtyFmt } from "@/lib/inventory/constants";
import { IDLE } from "@/lib/admin/validation";
import { saveRecipeLine, removeRecipeLine } from "@/app/admin/_actions/inventory";
import { Modal } from "@/components/admin/Modal";
import { useActionResult } from "@/components/admin/useActionResult";
import { Badge, Banner, Button, Field, Select, SubmitButton, TextInput } from "@/components/admin/primitives";
import { Td, Th } from "@/components/admin/ui";

function pctTone(pct: number | null): "on" | "accent" | "off" | "neutral" {
  if (pct == null) return "neutral";
  if (pct <= 30) return "on";
  if (pct <= 40) return "accent";
  return "off";
}

export function CostingManager({ dishes, items, recipes }: { dishes: DishCost[]; items: InventoryItem[]; recipes: Record<string, RecipeLine[]> }) {
  const [editing, setEditing] = useState<DishCost | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-sand bg-surface">
        <table className="w-full border-collapse">
          <thead className="border-b border-sand bg-bg/40"><tr><Th>Dish</Th><Th className="text-right">Price</Th><Th className="text-right">Food cost</Th><Th className="text-right">Margin</Th><Th className="text-center">Food cost %</Th><Th className="w-px" /></tr></thead>
          <tbody className="divide-y divide-sand">
            {dishes.map((d) => (
              <tr key={d.menuItemId} className="hover:bg-bg/30">
                <Td className="font-medium">{d.name}{!d.hasRecipe && <span className="ml-2 text-xs text-body/60">no recipe</span>}</Td>
                <Td className="text-right tabular-nums">{d.pricePence == null ? "—" : gbp(d.pricePence)}</Td>
                <Td className="text-right tabular-nums text-body">{gbp(d.costPence)}</Td>
                <Td className="text-right tabular-nums">{d.marginPence == null ? "—" : gbp(d.marginPence)}</Td>
                <Td className="text-center">{d.foodCostPct == null ? "—" : <Badge tone={pctTone(d.foodCostPct)}>{d.foodCostPct}%</Badge>}</Td>
                <Td className="text-right"><Button variant="ghost" onClick={() => setEditing(d)}>Recipe</Button></Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Recipe — ${editing.name}` : "Recipe"} description="Ingredients drive the food cost. Costs come from the latest received/supplier price.">
        {editing && <RecipeEditor key={editing.menuItemId} dish={editing} lines={recipes[editing.menuItemId] ?? []} items={items} />}
      </Modal>
    </>
  );
}

function RecipeEditor({ dish, lines, items }: { dish: DishCost; lines: RecipeLine[]; items: InventoryItem[] }) {
  const total = lines.reduce((s, l) => s + l.lineCostPence, 0);
  return (
    <div className="flex flex-col gap-4">
      {lines.length > 0 ? (
        <table className="w-full border-collapse text-sm">
          <thead className="border-b border-sand"><tr><Th>Ingredient</Th><Th className="text-right">Qty</Th><Th className="text-right">Cost</Th><Th className="w-px" /></tr></thead>
          <tbody className="divide-y divide-sand">
            {lines.map((l) => (
              <tr key={l.itemId}>
                <Td>{l.name}</Td>
                <Td className="text-right tabular-nums text-body">{qtyFmt(l.qty)} {l.unit}</Td>
                <Td className="text-right tabular-nums">{gbp(l.lineCostPence)}</Td>
                <Td className="text-right"><RemoveLine menuItemId={dish.menuItemId} itemId={l.itemId} /></Td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-sand"><tr><Td className="font-medium">Total cost</Td><Td /><Td className="text-right font-semibold tabular-nums">{gbp(total)}</Td><Td /></tr></tfoot>
        </table>
      ) : <p className="text-sm text-body">No ingredients yet.</p>}

      <AddLine menuItemId={dish.menuItemId} items={items} />
    </div>
  );
}

function AddLine({ menuItemId, items }: { menuItemId: string; items: InventoryItem[] }) {
  const [state, action] = useActionState(saveRecipeLine, IDLE);
  useActionResult(state);
  return (
    <form action={action} className="rounded-lg border border-sand bg-bg/30 p-4">
      <Banner state={state} />
      <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <Field label="Ingredient" htmlFor="itemId">
          <Select id="itemId" name="itemId" defaultValue=""><option value="" disabled>Choose…</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}</Select>
        </Field>
        <Field label="Qty per dish" htmlFor="qty"><TextInput id="qty" name="qty" inputMode="decimal" className="w-32" /></Field>
        <SubmitButton variant="secondary">Add</SubmitButton>
      </div>
      <input type="hidden" name="menuItemId" value={menuItemId} />
    </form>
  );
}

function RemoveLine({ menuItemId, itemId }: { menuItemId: string; itemId: string }) {
  const [state, action] = useActionState(removeRecipeLine, IDLE);
  useActionResult(state);
  return (
    <form action={action}><input type="hidden" name="menuItemId" value={menuItemId} /><input type="hidden" name="itemId" value={itemId} /><Button type="submit" variant="ghost">×</Button></form>
  );
}
