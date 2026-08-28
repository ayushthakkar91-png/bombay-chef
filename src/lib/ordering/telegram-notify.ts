import "server-only";

import { getServiceClient } from "@/lib/supabase/clients";
import { restaurantChatId } from "@/lib/notifications/telegram";
import { recordOrderEvent } from "./events";
import { ORDER_STATUS_LABEL, ORDER_TRANSITIONS, type OrderStatus } from "./constants";
import type { InlineButton } from "@/lib/notifications/telegram";

/**
 * Renders a paid order into a Telegram message + inline action buttons and
 * enqueues it in the notifications outbox (channel 'telegram'). The outbox
 * worker (telegram-dispatch) sends + retries + dead-letters. Telegram is a
 * channel, never a source of truth — enqueue failures never touch order state.
 */

const money = (p: number) => `£${(p / 100).toFixed(2)}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Friendly button label per target status. */
const ACTION_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: "✅ Accept",
  preparing: "👨‍🍳 Preparing",
  ready_for_collection: "📦 Ready",
  out_for_delivery: "🚗 Out for delivery",
  completed: "✅ Completed",
  cancelled: "❌ Reject",
};

/**
 * Inline keyboard for an order's CURRENT status: one button per legal next
 * status that a staffer drives from Telegram. `refunded` is excluded (admin-only
 * via Stripe). Two buttons per row. callback_data = `<targetStatus>:<orderId>`.
 */
export function buttonsForStatus(status: OrderStatus, orderId: string, fulfilment: string): InlineButton[][] {
  const targets = (ORDER_TRANSITIONS[status] ?? []).filter((t) => t !== "refunded");
  const buttons: InlineButton[] = [];
  for (const t of targets) {
    // Collection orders don't go "out for delivery"; delivery orders don't go "ready for collection".
    if (t === "out_for_delivery" && fulfilment !== "delivery") continue;
    if (t === "ready_for_collection" && fulfilment !== "collection") continue;
    const label = ACTION_LABEL[t];
    if (!label) continue;
    buttons.push({ text: label, callback_data: `${t}:${orderId}` });
  }
  const rows: InlineButton[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  return rows;
}

type OrderRow = {
  code: string;
  status: OrderStatus;
  fulfilment: string;
  subtotal_pence: number;
  delivery_fee_pence: number;
  discount_pence: number;
  gift_card_pence: number;
  total_pence: number;
  contact_name: string | null;
  contact_phone: string | null;
  notes: string | null;
  delivery_address: Record<string, string> | null;
  order_items: { name: string; qty: number }[] | null;
};

/** Full Telegram message text for an order (used on enqueue and on button edits). */
export function renderOrderMessage(o: OrderRow): string {
  const items = (o.order_items ?? []).map((i) => `${i.qty}× ${esc(i.name)}`).join("\n");
  const lines: string[] = [
    `🔔 <b>NEW ORDER ${esc(o.code)}</b>`,
    `Status: <b>${ORDER_STATUS_LABEL[o.status]}</b>`,
    "",
    items || "(no items)",
    "",
    `Subtotal: ${money(o.subtotal_pence)}`,
  ];
  if (o.discount_pence > 0) lines.push(`Discount: −${money(o.discount_pence)}`);
  if (o.fulfilment === "delivery") lines.push(`Delivery: ${money(o.delivery_fee_pence)}`);
  if (o.gift_card_pence > 0) lines.push(`Gift card: −${money(o.gift_card_pence)}`);
  lines.push(`<b>TOTAL: ${money(o.total_pence)}</b>`, "", `👤 ${esc(o.contact_name ?? "—")}`);
  if (o.contact_phone) lines.push(`📞 ${esc(o.contact_phone)}`);
  if (o.fulfilment === "delivery" && o.delivery_address) {
    const a = o.delivery_address;
    lines.push(`🚚 DELIVERY`, esc([a.line1, a.line2, a.city, a.postcode].filter(Boolean).join(", ")));
  } else {
    lines.push(`🏪 COLLECTION`);
  }
  if (o.notes) lines.push(`📝 ${esc(o.notes)}`);
  lines.push(`💳 PAID`);
  return lines.join("\n");
}

const ORDER_SELECT =
  "code, status, fulfilment, subtotal_pence, delivery_fee_pence, discount_pence, gift_card_pence, total_pence, contact_name, contact_phone, notes, delivery_address, order_items(name, qty)";

/** Load an order shaped for Telegram rendering. */
export async function loadOrderForTelegram(orderId: string): Promise<OrderRow | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;
  const { data } = await supabase.from("orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  return (data as OrderRow | null) ?? null;
}

/**
 * Enqueue a Telegram order notification. Called from confirmPaidOrder after the
 * order is marked paid. No-op (silent) when Telegram isn't configured.
 */
export async function enqueueOrderTelegram(orderId: string): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) return;
  const chatId = restaurantChatId();
  if (!chatId) return; // Telegram not configured — email still goes out.

  const order = await loadOrderForTelegram(orderId);
  if (!order) return;

  const text = renderOrderMessage(order);
  const buttons = buttonsForStatus(order.status, orderId, order.fulfilment);

  await supabase.from("notifications").insert({
    channel: "telegram",
    template: "order_telegram",
    to_address: chatId,
    payload: { text, buttons, orderId },
    status: "queued",
    send_after: new Date().toISOString(),
    order_id: orderId,
  });
  await recordOrderEvent(orderId, "TELEGRAM_NOTIFICATION_CREATED", { chatId });
}
