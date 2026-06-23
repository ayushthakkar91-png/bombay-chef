import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);
function joinName(j: unknown): string {
  const x = j as { name?: string } | { name?: string }[] | null;
  return (Array.isArray(x) ? x[0]?.name : x?.name) ?? "—";
}

export type POListRow = { id: string; code: string; supplierName: string; status: string; expectedAt: string | null; createdAt: string; itemCount: number; totalPence: number };

export async function listPurchaseOrders(locationId: string, status?: string): Promise<POListRow[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  let q = supabase
    .from("purchase_orders")
    .select("id, code, status, expected_at, created_at, suppliers(name), purchase_order_items(qty_ordered, unit_price_pence)")
    .eq("location_id", locationId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (status && status !== "all") q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []).map((p) => {
    const items = (p.purchase_order_items as { qty_ordered: number; unit_price_pence: number }[] | null) ?? [];
    return {
      id: p.id as string,
      code: p.code as string,
      supplierName: joinName(p.suppliers),
      status: p.status as string,
      expectedAt: (p.expected_at as string | null) ?? null,
      createdAt: p.created_at as string,
      itemCount: items.length,
      totalPence: items.reduce((s, it) => s + num(it.qty_ordered) * num(it.unit_price_pence), 0),
    };
  });
}

export type POItem = { id: string; itemId: string; name: string; unit: string; qtyOrdered: number; qtyReceived: number; unitPricePence: number; packSize: number };
export type PODetail = {
  id: string; code: string; status: string; supplierId: string; supplierName: string; locationId: string; locationName: string;
  expectedAt: string | null; receivedAt: string | null; notes: string | null; createdAt: string; items: POItem[]; totalPence: number;
};

export async function getPurchaseOrder(id: string): Promise<PODetail | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase
    .from("purchase_orders")
    .select("id, code, status, supplier_id, location_id, expected_at, received_at, notes, created_at, suppliers(name), locations(name), purchase_order_items(id, item_id, qty_ordered, qty_received, unit_price_pence, pack_size, inventory_items(name, unit))")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const items: POItem[] = ((data.purchase_order_items as Record<string, unknown>[] | null) ?? []).map((it) => {
    const inv = (Array.isArray(it.inventory_items) ? it.inventory_items[0] : it.inventory_items) as { name?: string; unit?: string } | null;
    return { id: it.id as string, itemId: it.item_id as string, name: inv?.name ?? "—", unit: inv?.unit ?? "", qtyOrdered: num(it.qty_ordered), qtyReceived: num(it.qty_received), unitPricePence: num(it.unit_price_pence), packSize: num(it.pack_size) || 1 };
  });
  return {
    id: data.id as string,
    code: data.code as string,
    status: data.status as string,
    supplierId: data.supplier_id as string,
    supplierName: joinName(data.suppliers),
    locationId: data.location_id as string,
    locationName: joinName(data.locations),
    expectedAt: (data.expected_at as string | null) ?? null,
    receivedAt: (data.received_at as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    createdAt: data.created_at as string,
    items,
    totalPence: items.reduce((s, it) => s + it.qtyOrdered * it.unitPricePence, 0),
  };
}
