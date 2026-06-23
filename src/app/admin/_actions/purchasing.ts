"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getUserClient, getServiceClient } from "@/lib/supabase/clients";
import { requireRole, requireStaff } from "@/lib/auth/dal";
import { applyStockDelta } from "@/lib/inventory/stock";
import { type ActionState, fail, ok, str } from "@/lib/admin/validation";

async function poLocation(poId: string): Promise<string | null> {
  const service = getServiceClient();
  if (!service) return null;
  const { data } = await service.from("purchase_orders").select("location_id").eq("id", poId).maybeSingle();
  return data ? (data.location_id as string) : null;
}

export async function createPurchaseOrder(_p: ActionState, form: FormData): Promise<ActionState> {
  const supplierId = str(form, "supplierId");
  const locationId = str(form, "locationId");
  const expectedAt = str(form, "expectedAt") || null;
  if (!supplierId || !locationId) return fail("Choose a supplier and location.");
  const ctx = await requireRole("location_manager", locationId);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { data, error } = await supabase.from("purchase_orders").insert({ supplier_id: supplierId, location_id: locationId, expected_at: expectedAt, notes: str(form, "notes") || null, created_by: ctx.userId }).select("id").single();
  if (error || !data) return fail(error?.message ?? "Couldn't create the order.");
  redirect(`/admin/inventory/purchase-orders/${data.id}`);
}

export async function addPurchaseOrderItem(_p: ActionState, form: FormData): Promise<ActionState> {
  const poId = str(form, "poId");
  const itemId = str(form, "itemId");
  const qtyOrdered = Number(str(form, "qtyOrdered"));
  const unitPricePence = Math.round((Number(str(form, "unitPrice")) || 0) * 100);
  const packSize = Number(str(form, "packSize")) || 1;
  if (!poId || !itemId) return fail("Choose an item.");
  if (!Number.isFinite(qtyOrdered) || qtyOrdered <= 0) return fail("Enter a quantity.");

  const locationId = await poLocation(poId);
  if (!locationId) return fail("Order not found.");
  await requireRole("location_manager", locationId);

  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("purchase_order_items").insert({ po_id: poId, item_id: itemId, qty_ordered: qtyOrdered, unit_price_pence: unitPricePence, pack_size: packSize });
  if (error) return fail(error.message);
  revalidatePath(`/admin/inventory/purchase-orders/${poId}`);
  return ok("Item added.");
}

export async function removePurchaseOrderItem(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const poId = str(form, "poId");
  if (!id || !poId) return fail("Missing line.");
  const locationId = await poLocation(poId);
  if (!locationId) return fail("Order not found.");
  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  await supabase.from("purchase_order_items").delete().eq("id", id);
  revalidatePath(`/admin/inventory/purchase-orders/${poId}`);
  return ok("Item removed.");
}

export async function setPurchaseOrderStatus(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  const next = str(form, "status");
  if (!id || !["sent", "cancelled"].includes(next)) return fail("Invalid action.");
  const locationId = await poLocation(id);
  if (!locationId) return fail("Order not found.");
  await requireRole("location_manager", locationId);
  const supabase = await getUserClient();
  if (!supabase) return fail("Unavailable.");
  const { error } = await supabase.from("purchase_orders").update({ status: next }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  return ok(next === "sent" ? "Order marked sent." : "Order cancelled.");
}

/** Receive an order in full: add stock, log movements, update item costs. */
export async function receivePurchaseOrder(_p: ActionState, form: FormData): Promise<ActionState> {
  const id = str(form, "id");
  if (!id) return fail("Missing order.");
  const locationId = await poLocation(id);
  if (!locationId) return fail("Order not found.");
  const ctx = await requireRole("location_manager", locationId);

  const supabase = await getUserClient();
  const service = getServiceClient();
  if (!supabase || !service) return fail("Unavailable.");

  const { data: po } = await supabase.from("purchase_orders").select("status").eq("id", id).maybeSingle();
  if (!po || po.status === "received" || po.status === "cancelled") return fail("This order can't be received.");

  const { data: items } = await supabase.from("purchase_order_items").select("id, item_id, qty_ordered, qty_received, unit_price_pence, pack_size").eq("po_id", id);
  for (const it of items ?? []) {
    const remainingPacks = Number(it.qty_ordered) - Number(it.qty_received);
    if (remainingPacks <= 0) continue;
    const packSize = Number(it.pack_size) || 1;
    const unitCost = Math.round(Number(it.unit_price_pence) / packSize);
    await applyStockDelta(locationId, it.item_id as string, remainingPacks * packSize, "receive", { unitCostPence: unitCost, poId: id, actorId: ctx.userId });
    await service.from("purchase_order_items").update({ qty_received: it.qty_ordered }).eq("id", it.id);
    await service.from("inventory_items").update({ cost_pence: unitCost }).eq("id", it.item_id); // latest cost
  }

  await supabase.from("purchase_orders").update({ status: "received", received_at: new Date().toISOString() }).eq("id", id);
  const actorId = (await requireStaff()).userId;
  await service.from("audit_log").insert({ actor_id: actorId, action: "po.receive", entity: "purchase_orders", entity_id: id, location_id: locationId });

  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  revalidatePath("/admin/inventory/stock");
  return ok("Order received — stock updated.");
}
