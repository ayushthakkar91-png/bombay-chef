import "server-only";

import { getUserClient } from "@/lib/supabase/clients";

const num = (v: unknown): number => Number(v ?? 0);

export type Supplier = { id: string; name: string; contactName: string | null; email: string | null; phone: string | null; address: string | null; notes: string | null; isActive: boolean };

function mapSupplier(s: Record<string, unknown>): Supplier {
  return { id: s.id as string, name: s.name as string, contactName: (s.contact_name as string | null) ?? null, email: (s.email as string | null) ?? null, phone: (s.phone as string | null) ?? null, address: (s.address as string | null) ?? null, notes: (s.notes as string | null) ?? null, isActive: (s.is_active as boolean) ?? true };
}

export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("suppliers").select("id, name, contact_name, email, phone, address, notes, is_active").order("name");
  return (data ?? []).map(mapSupplier);
}

export async function getSupplier(id: string): Promise<Supplier | null> {
  const supabase = await getUserClient();
  if (!supabase) return null;
  const { data } = await supabase.from("suppliers").select("id, name, contact_name, email, phone, address, notes, is_active").eq("id", id).maybeSingle();
  return data ? mapSupplier(data) : null;
}

export type SupplierProduct = { id: string; itemId: string; itemName: string; unit: string; sku: string | null; packSize: number; pricePence: number; perUnitPence: number };

export async function listSupplierProducts(supplierId: string): Promise<SupplierProduct[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase
    .from("supplier_products")
    .select("id, item_id, supplier_sku, pack_size, price_pence, inventory_items(name, unit)")
    .eq("supplier_id", supplierId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((p) => {
    const it = (Array.isArray(p.inventory_items) ? p.inventory_items[0] : p.inventory_items) as { name?: string; unit?: string } | null;
    const pack = num(p.pack_size) || 1;
    return { id: p.id as string, itemId: p.item_id as string, itemName: it?.name ?? "—", unit: it?.unit ?? "", sku: (p.supplier_sku as string | null) ?? null, packSize: pack, pricePence: num(p.price_pence), perUnitPence: Math.round(num(p.price_pence) / pack) };
  });
}

export async function listPriceHistory(supplierProductId: string): Promise<{ pricePence: number; createdAt: string }[]> {
  const supabase = await getUserClient();
  if (!supabase) return [];
  const { data } = await supabase.from("supplier_price_history").select("price_pence, created_at").eq("supplier_product_id", supplierProductId).order("created_at", { ascending: false }).limit(20);
  return (data ?? []).map((h) => ({ pricePence: num(h.price_pence), createdAt: h.created_at as string }));
}
