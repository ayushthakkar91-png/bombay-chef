/** Messaging domain constants. */

export type Channel = "sms" | "whatsapp";
export type Category = "reservation" | "order" | "marketing";

export const CHANNEL_LABEL: Record<Channel, string> = { sms: "SMS", whatsapp: "WhatsApp" };
export const CATEGORY_LABEL: Record<Category, string> = { reservation: "Reservation", order: "Order", marketing: "Marketing" };

export const MESSAGE_STATUS_LABEL: Record<string, string> = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  skipped: "Skipped (no consent)",
};

/** Order statuses we message on → template key. Others (paid, cancelled) are silent here. */
export const ORDER_STATUS_TEMPLATE: Record<string, string> = {
  accepted: "order_accepted",
  preparing: "order_preparing",
  ready_for_collection: "order_ready_for_collection",
  out_for_delivery: "order_out_for_delivery",
  completed: "order_completed",
};

/** Statuses that count as a successful delivery for reporting. */
export const DELIVERED_STATUSES = ["delivered", "read"];
export const SENT_OR_BETTER = ["sent", "delivered", "read"];

/** Normalise a UK-ish phone to E.164 (best effort). Returns null if implausible. */
export function toE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = "+" + s.slice(2);
  if (!s.startsWith("+")) {
    if (s.startsWith("0")) s = "+44" + s.slice(1); // assume UK
    else if (s.length >= 10) s = "+" + s;
    else return null;
  }
  return s.length >= 8 && s.length <= 16 ? s : null;
}
