/** Ordering domain constants shared by customer flow, admin, and emails. */

export type Fulfilment = "collection" | "delivery";

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "accepted"
  | "preparing"
  | "ready_for_collection"
  | "out_for_delivery"
  | "completed"
  | "cancelled"
  | "refunded";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Awaiting payment",
  paid: "Paid — new",
  accepted: "Accepted",
  preparing: "Preparing",
  ready_for_collection: "Ready for collection",
  out_for_delivery: "Out for delivery",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

/** Legal next states — kept in sync with the DB guard (migration 0010). */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["paid", "cancelled"],
  paid: ["accepted", "cancelled", "refunded"],
  accepted: ["preparing", "cancelled", "refunded"],
  preparing: ["ready_for_collection", "out_for_delivery", "cancelled", "refunded"],
  ready_for_collection: ["completed", "cancelled", "refunded"],
  out_for_delivery: ["completed", "cancelled", "refunded"],
  completed: ["refunded"],
  cancelled: ["refunded"],
  refunded: [],
};

/** Statuses an order is considered "live" (open in the kitchen). */
export const LIVE_STATUSES: OrderStatus[] = [
  "paid",
  "accepted",
  "preparing",
  "ready_for_collection",
  "out_for_delivery",
];

export const CURRENCY = "gbp";
