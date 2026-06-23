"use server";

import { revalidatePath } from "next/cache";

import { getUserClient } from "@/lib/supabase/clients";
import { requireRole } from "@/lib/auth/dal";
import { type ActionState, fail, ok, str, bool } from "@/lib/admin/validation";

const poundsToPence = (s: string): number => Math.round((Number(s) || 0) * 100);

export async function saveSupplier(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const name = str(form, "name");
  const values = { name, contactName: str(form, "contactName"), email: str(form, "email"), phone: str(form, "phone") };
  if (!name) return fail("Supplier name is required.", { name: "Required." }, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const row = {
    name,
    contact_name: str(form, "contactName") || null,
    email: str(form, "email") || null,
    phone: str(form, "phone") || null,
    address: str(form, "address") || null,
    notes: str(form, "notes") || null,
  };
  const { error } = id ? await supabase.from("suppliers").update(row).eq("id", id) : await supabase.from("suppliers").insert(row);
  if (error) return fail(error.message, undefined, values);
  revalidatePath("/admin/inventory/suppliers");
  return ok(id ? "Supplier saved." : "Supplier added.");
}

export async function toggleSupplier(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const next = bool(form, "next");
  if (!id) return fail("Missing supplier.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("suppliers").update({ is_active: next }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/admin/inventory/suppliers");
  return ok(next ? "Supplier activated." : "Supplier deactivated.");
}

/** Add/update a supplier's price for an item; logs price changes to history. */
export async function saveSupplierProduct(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const supplierId = str(form, "supplierId");
  const itemId = str(form, "itemId");
  const sku = str(form, "sku") || null;
  const packSize = Number(str(form, "packSize")) || 1;
  const pricePence = poundsToPence(str(form, "price"));
  if (!supplierId || !itemId) return fail("Choose an item.");
  if (pricePence <= 0) return fail("Enter a price.");

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");

  const { data: existing } = await supabase.from("supplier_products").select("id, price_pence").eq("supplier_id", supplierId).eq("item_id", itemId).maybeSingle();
  let productId = existing?.id as string | undefined;
  if (existing) {
    const { error } = await supabase.from("supplier_products").update({ supplier_sku: sku, pack_size: packSize, price_pence: pricePence }).eq("id", existing.id);
    if (error) return fail(error.message);
  } else {
    const { data, error } = await supabase.from("supplier_products").insert({ supplier_id: supplierId, item_id: itemId, supplier_sku: sku, pack_size: packSize, price_pence: pricePence }).select("id").single();
    if (error || !data) return fail(error?.message ?? "Couldn't save.");
    productId = data.id as string;
  }
  // Record price history when new or changed.
  if (productId && (!existing || Number(existing.price_pence) !== pricePence)) {
    await supabase.from("supplier_price_history").insert({ supplier_product_id: productId, price_pence: pricePence });
  }
  revalidatePath(`/admin/inventory/suppliers/${supplierId}`);
  return ok("Catalogue updated.");
}

export async function deleteSupplierProduct(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const supplierId = str(form, "supplierId");
  if (!id) return fail("Missing product.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  await supabase.from("supplier_products").delete().eq("id", id);
  revalidatePath(`/admin/inventory/suppliers/${supplierId}`);
  return ok("Removed from catalogue.");
}
