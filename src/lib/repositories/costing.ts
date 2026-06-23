import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);

export type DishCost = {
  menuItemId: string;
  name: string;
  pricePence: number | null;
  costPence: number;
  marginPence: number | null;
  foodCostPct: number | null;
  hasRecipe: boolean;
};

/** Per-dish cost = Σ(recipe qty × inventory unit cost). Food cost % = cost ÷ price. */
export async function listDishCosting(): Promise<DishCost[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const [{ data: dishes }, { data: recipes }, { data: items }] = await Promise.all([
    supabase.from("menu_items").select("id, name, price_pence").order("name"),
    supabase.from("menu_item_ingredients").select("menu_item_id, item_id, qty"),
    supabase.from("inventory_items").select("id, cost_pence"),
  ]);
  const cost = new Map((items ?? []).map((i) => [i.id as string, num(i.cost_pence)]));
  const byDish = new Map<string, number>();
  for (const r of recipes ?? []) {
    const c = num(r.qty) * (cost.get(r.item_id as string) ?? 0);
    byDish.set(r.menu_item_id as string, (byDish.get(r.menu_item_id as string) ?? 0) + c);
  }
  return (dishes ?? [])
    .map((d) => {
      const price = d.price_pence == null ? null : num(d.price_pence);
      const dishCost = Math.round(byDish.get(d.id as string) ?? 0);
      return {
        menuItemId: d.id as string,
        name: d.name as string,
        pricePence: price,
        costPence: dishCost,
        marginPence: price == null ? null : price - dishCost,
        foodCostPct: price && price > 0 ? Math.round((dishCost / price) * 100) : null,
        hasRecipe: byDish.has(d.id as string),
      };
    })
    .sort((a, b) => (b.foodCostPct ?? -1) - (a.foodCostPct ?? -1));
}

export type RecipeLine = { itemId: string; name: string; unit: string; qty: number; unitCostPence: number; lineCostPence: number };

export async function listRecipe(menuItemId: string): Promise<RecipeLine[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("menu_item_ingredients")
    .select("item_id, qty, inventory_items(name, unit, cost_pence)")
    .eq("menu_item_id", menuItemId);
  return (data ?? []).map((r) => {
    const it = (Array.isArray(r.inventory_items) ? r.inventory_items[0] : r.inventory_items) as { name?: string; unit?: string; cost_pence?: number } | null;
    const unitCost = num(it?.cost_pence);
    return { itemId: r.item_id as string, name: it?.name ?? "—", unit: it?.unit ?? "", qty: num(r.qty), unitCostPence: unitCost, lineCostPence: Math.round(num(r.qty) * unitCost) };
  });
}

/** All recipes keyed by menu item — for the costing editor (one round-trip). */
export async function listAllRecipes(): Promise<Record<string, RecipeLine[]>> {
  const supabase = await getUserClient();
  if (!supabase) return {};
  const [{ data: recipes }, { data: items }] = await Promise.all([
    supabase.from("menu_item_ingredients").select("menu_item_id, item_id, qty"),
    supabase.from("inventory_items").select("id, name, unit, cost_pence"),
  ]);
  const itemMap = new Map((items ?? []).map((i) => [i.id as string, i]));
  const out: Record<string, RecipeLine[]> = {};
  for (const r of recipes ?? []) {
    const it = itemMap.get(r.item_id as string);
    if (!it) continue;
    const unitCost = num(it.cost_pence);
    (out[r.menu_item_id as string] ??= []).push({ itemId: r.item_id as string, name: it.name as string, unit: it.unit as string, qty: num(r.qty), unitCostPence: unitCost, lineCostPence: Math.round(num(r.qty) * unitCost) });
  }
  return out;
}
