import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);

/* ---- Items (catalogue) ------------------------------------------------ */

export type InventoryItem = { id: string; name: string; category: string; unit: string; costPence: number; isActive: boolean };

export async function listItems(includeInactive = false): Promise<InventoryItem[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase.from("inventory_items").select("id, name, category, unit, cost_pence, is_active").order("name");
  if (!includeInactive) q = q.eq("is_active", true);
  const { data } = await q;
  return (data ?? []).map((i) => ({ id: i.id as string, name: i.name as string, category: i.category as string, unit: i.unit as string, costPence: num(i.cost_pence), isActive: (i.is_active as boolean) ?? true }));
}

/* ---- Stock (per location) --------------------------------------------- */

export type StockRow = { itemId: string; name: string; category: string; unit: string; costPence: number; qty: number; minQty: number; reorderLevel: number; reorderQty: number; low: boolean };

export async function listStock(locationId: string): Promise<StockRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const [{ data: items }, { data: stock }] = await Promise.all([
    supabase.from("inventory_items").select("id, name, category, unit, cost_pence").eq("is_active", true).order("name"),
    supabase.from("location_stock").select("item_id, qty, min_qty, reorder_level, reorder_qty").eq("location_id", locationId),
  ]);
  const stockMap = new Map((stock ?? []).map((s) => [s.item_id as string, s]));
  return (items ?? []).map((i) => {
    const s = stockMap.get(i.id as string);
    const qty = num(s?.qty);
    const reorderLevel = num(s?.reorder_level);
    return {
      itemId: i.id as string,
      name: i.name as string,
      category: i.category as string,
      unit: i.unit as string,
      costPence: num(i.cost_pence),
      qty,
      minQty: num(s?.min_qty),
      reorderLevel,
      reorderQty: num(s?.reorder_qty),
      low: reorderLevel > 0 && qty <= reorderLevel,
    };
  });
}

export async function listMovements(locationId: string, itemId: string | undefined, limit = 50) {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase.from("stock_movements").select("id, item_id, delta, kind, reason, created_at, inventory_items(name, unit)").eq("location_id", locationId).order("created_at", { ascending: false }).limit(limit);
  if (itemId) q = q.eq("item_id", itemId);
  const { data } = await q;
  return (data ?? []).map((m) => {
    const it = (Array.isArray(m.inventory_items) ? m.inventory_items[0] : m.inventory_items) as { name?: string; unit?: string } | null;
    return { id: m.id as string, itemId: m.item_id as string, name: it?.name ?? "—", unit: it?.unit ?? "", delta: num(m.delta), kind: m.kind as string, reason: (m.reason as string | null) ?? null, createdAt: m.created_at as string };
  });
}

/* ---- Waste ------------------------------------------------------------ */

export type WasteRow = { id: string; itemId: string; name: string; unit: string; qty: number; reason: string; notes: string | null; costPence: number; createdAt: string };

export async function listWaste(locationId: string, fromISO?: string): Promise<WasteRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase.from("waste_records").select("id, item_id, qty, reason, notes, created_at, inventory_items(name, unit, cost_pence)").eq("location_id", locationId).order("created_at", { ascending: false }).limit(200);
  if (fromISO) q = q.gte("created_at", fromISO);
  const { data } = await q;
  return (data ?? []).map((w) => {
    const it = (Array.isArray(w.inventory_items) ? w.inventory_items[0] : w.inventory_items) as { name?: string; unit?: string; cost_pence?: number } | null;
    return { id: w.id as string, itemId: w.item_id as string, name: it?.name ?? "—", unit: it?.unit ?? "", qty: num(w.qty), reason: w.reason as string, notes: (w.notes as string | null) ?? null, costPence: Math.round(num(w.qty) * num(it?.cost_pence)), createdAt: w.created_at as string };
  });
}

/* ---- Overview stats --------------------------------------------------- */

export type InventoryStats = { itemCount: number; lowCount: number; stockValuePence: number; openPOs: number; wasteValuePence: number };

export async function getInventoryStats(locationId: string, wasteFromISO: string): Promise<InventoryStats> {
  const stock = await listStock(locationId);
  const supabase = await getUserClient();
  const stockValue = stock.reduce((s, r) => s + Math.round(r.qty * r.costPence), 0);
  const lowCount = stock.filter((r) => r.low).length;

  let openPOs = 0, wasteValue = 0;
  if (supabase) {
    const { count } = await supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("location_id", locationId).in("status", ["draft", "sent"]);
    openPOs = count ?? 0;
    const waste = await listWaste(locationId, wasteFromISO);
    wasteValue = waste.reduce((s, w) => s + w.costPence, 0);
  }
  return { itemCount: stock.length, lowCount, stockValuePence: stockValue, openPOs, wasteValuePence: wasteValue };
}
