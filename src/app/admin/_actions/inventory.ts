"use server";

import { revalidatePath } from "next/cache";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { requireRole, requireStaff } from "@/lib/auth/dal";
import { applyStockDelta } from "@/lib/inventory/stock";
import { ITEM_CATEGORIES, WASTE_REASONS } from "@/lib/inventory/constants";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

const poundsToPence = (s: string): number => Math.round((Number(s) || 0) * 100);
const numOr = (s: string, d = 0): number => { const n = Number(s); return Number.isFinite(n) ? n : d; };

async function audit(action: string, entity: string, entityId: string, locationId: string | null, after: Record<string, unknown>) {
  const service = getServiceClient();
  if (!service) return;
  const ctx = await requireStaff();
  await service.from("audit_log").insert({ actor_id: ctx.userId, action, entity, entity_id: entityId, location_id: locationId, after });
}

/* ---- Items (catalogue) ------------------------------------------------ */

export async function saveItem(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const id = str(form, "id");
  const name = str(form, "name");
  const category = str(form, "category");
  const unit = str(form, "unit");
  const costPence = poundsToPence(str(form, "cost"));
  const values = { name, unit, cost: str(form, "cost") };
  if (!name) return fail("Name is required.", { name: "Required." }, values);
  if (!ITEM_CATEGORIES.some((c) => c.id === category)) return fail("Choose a category.");
  if (!unit) return fail("Unit is required.", { unit: "Required." }, values);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const row = { name, category, unit, cost_pence: costPence };
  const { error } = id ? await supabase.from("inventory_items").update(row).eq("id", id) : await supabase.from("inventory_items").insert(row);
  if (error) return fail(error.message, undefined, values);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/stock");
  return ok(id ? "Item updated." : "Item added.");
}

/* ---- Stock levels + adjustments --------------------------------------- */

export async function setStockLevels(_p: ActionState, form: FormData): Promise<ActionState> {
  const locationId = str(form, "locationId");
  const itemId = str(form, "itemId");
  if (!locationId || !itemId) return fail("Missing item.");
  await requireRole("location_manager", locationId);
  const minQty = numOr(str(form, "minQty"));
  const reorderLevel = numOr(str(form, "reorderLevel"));
  const reorderQty = numOr(str(form, "reorderQty"));

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { data: ex } = await supabase.from("location_stock").select("item_id").eq("location_id", locationId).eq("item_id", itemId).maybeSingle();
  const levels = { min_qty: minQty, reorder_level: reorderLevel, reorder_qty: reorderQty };
  const { error } = ex
    ? await supabase.from("location_stock").update(levels).eq("location_id", locationId).eq("item_id", itemId)
    : await supabase.from("location_stock").insert({ location_id: locationId, item_id: itemId, qty: 0, ...levels });
  if (error) return fail(error.message);
  revalidatePath("/admin/inventory/stock");
  return ok("Levels saved.");
}

export async function adjustStock(_p: ActionState, form: FormData): Promise<ActionState> {
  const locationId = str(form, "locationId");
  const itemId = str(form, "itemId");
  const delta = Number(str(form, "delta"));
  const reason = str(form, "reason") || null;
  if (!locationId || !itemId) return fail("Missing item.");
  if (!Number.isFinite(delta) || delta === 0) return fail("Enter a non-zero quantity.");
  const ctx = await requireRole("location_manager", locationId);

  await applyStockDelta(locationId, itemId, delta, "adjust", { reason, actorId: ctx.userId });
  await audit("stock.adjust", "location_stock", itemId, locationId, { delta, reason });
  revalidatePath("/admin/inventory/stock");
  return ok(`Stock adjusted by ${delta > 0 ? "+" : ""}${delta}.`);
}

/* ---- Waste ------------------------------------------------------------ */

export async function recordWaste(_p: ActionState, form: FormData): Promise<ActionState> {
  const locationId = str(form, "locationId");
  const itemId = str(form, "itemId");
  const qty = Number(str(form, "qty"));
  const reason = str(form, "reason");
  const notes = str(form, "notes") || null;
  if (!locationId || !itemId) return fail("Choose an item.");
  if (!Number.isFinite(qty) || qty <= 0) return fail("Enter a quantity greater than zero.");
  if (!WASTE_REASONS.some((r) => r.id === reason)) return fail("Choose a reason.");
  const ctx = await requireRole("staff", locationId);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { data: w, error } = await supabase.from("waste_records").insert({ location_id: locationId, item_id: itemId, qty, reason, notes }).select("id").single();
  if (error || !w) return fail(error?.message ?? "Couldn't record waste.");

  await applyStockDelta(locationId, itemId, -qty, "waste", { reason, actorId: ctx.userId });
  await audit("waste.record", "waste_records", w.id as string, locationId, { itemId, qty, reason });
  revalidatePath("/admin/inventory/waste");
  revalidatePath("/admin/inventory/stock");
  return ok("Waste recorded and stock reduced.");
}

/* ---- Recipes ---------------------------------------------------------- */

export async function saveRecipeLine(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const menuItemId = str(form, "menuItemId");
  const itemId = str(form, "itemId");
  const qty = Number(str(form, "qty"));
  if (!menuItemId || !itemId) return fail("Choose an ingredient.");
  if (!Number.isFinite(qty) || qty <= 0) return fail("Enter a quantity.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("menu_item_ingredients").upsert({ menu_item_id: menuItemId, item_id: itemId, qty }, { onConflict: "menu_item_id,item_id" });
  if (error) return fail(error.message);
  revalidatePath("/admin/inventory/costing");
  return ok("Recipe updated.");
}

export async function removeRecipeLine(_p: ActionState, form: FormData): Promise<ActionState> {
  await requireRole("restaurant_manager");
  const menuItemId = str(form, "menuItemId");
  const itemId = str(form, "itemId");
  if (!menuItemId || !itemId) return fail("Missing line.");
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  await supabase.from("menu_item_ingredients").delete().eq("menu_item_id", menuItemId).eq("item_id", itemId);
  revalidatePath("/admin/inventory/costing");
  return ok("Ingredient removed.");
}
