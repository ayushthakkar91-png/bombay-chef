/** Inventory & supplier domain constants. */

export const ITEM_CATEGORIES = [
  { id: "ingredient", label: "Ingredient" },
  { id: "raw_material", label: "Raw material" },
  { id: "packaging", label: "Packaging" },
  { id: "beverage", label: "Beverage" },
] as const;

export function categoryLabel(id: string): string {
  return ITEM_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const UNITS = ["kg", "g", "l", "ml", "each", "pack", "box", "bottle"] as const;

export const PO_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  received: "Received",
  cancelled: "Cancelled",
};

export const WASTE_REASONS = [
  { id: "damaged", label: "Damaged" },
  { id: "expired", label: "Expired" },
  { id: "kitchen", label: "Kitchen waste" },
  { id: "other", label: "Other" },
] as const;

export function wasteReasonLabel(id: string): string {
  return WASTE_REASONS.find((r) => r.id === id)?.label ?? id;
}

export function gbp(pence: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(pence / 100);
}

/** Tidy numeric quantity (drops trailing zeros). */
export function qtyFmt(n: number): string {
  return Number(n).toLocaleString("en-GB", { maximumFractionDigits: 3 });
}
