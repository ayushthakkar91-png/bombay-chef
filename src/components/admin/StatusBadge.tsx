import { cx } from "./cx";

/**
 * Consistent, platform-wide status colours. Functional indicators only — these
 * are muted, desaturated chips that sit inside the existing luxury palette (the
 * same emerald/amber/red vocabulary already used for semantic states); they do
 * not alter the brand identity. One source of truth for reservations + orders.
 */

type Meta = { label: string; cls: string };

const BLUE = "bg-blue-50 text-blue-700 border-blue-200";
const GREEN = "bg-emerald-50 text-emerald-700 border-emerald-200";
const ORANGE = "bg-orange-50 text-orange-700 border-orange-200";
const PURPLE = "bg-violet-50 text-violet-700 border-violet-200";
const GREY = "bg-stone-100 text-stone-600 border-stone-200";
const RED = "bg-red-50 text-red-700 border-red-200";

const RESERVATION: Record<string, Meta> = {
  pending: { label: "Pending", cls: BLUE },
  confirmed: { label: "Confirmed", cls: BLUE },
  seated: { label: "Seated", cls: GREEN },
  completed: { label: "Completed", cls: GREY },
  no_show: { label: "No-show", cls: RED },
  cancelled: { label: "Cancelled", cls: RED },
};

const ORDER: Record<string, Meta> = {
  pending_payment: { label: "Pending", cls: BLUE },
  paid: { label: "Paid", cls: BLUE },
  accepted: { label: "Accepted", cls: BLUE },
  preparing: { label: "Preparing", cls: ORANGE },
  ready_for_collection: { label: "Ready", cls: PURPLE },
  out_for_delivery: { label: "Out for delivery", cls: PURPLE },
  completed: { label: "Completed", cls: GREEN },
  cancelled: { label: "Cancelled", cls: RED },
  refunded: { label: "Refunded", cls: RED },
};

const MAPS: Record<string, Record<string, Meta>> = { reservation: RESERVATION, order: ORDER };

export function statusMeta(kind: "reservation" | "order", status: string): Meta {
  return MAPS[kind]?.[status] ?? { label: status.replace(/_/g, " "), cls: GREY };
}

export function StatusBadge({ kind, status, className }: { kind: "reservation" | "order"; status: string; className?: string }) {
  const m = statusMeta(kind, status);
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize", m.cls, className)}>{m.label}</span>;
}
