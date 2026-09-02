import { NextResponse } from "next/server";

import { getServiceClient } from "@/lib/supabase/clients";
import { answerCallbackQuery, editMessageText, restaurantChatId } from "@/lib/notifications/telegram";
import { renderOrderMessage, buttonsForStatus, loadOrderForTelegram } from "@/lib/ordering/telegram-notify";
import { recordOrderEvent } from "@/lib/ordering/events";
import { enqueueOrderEmail } from "@/lib/ordering/notify";
import { ORDER_TRANSITIONS, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/ordering/constants";

export const dynamic = "force-dynamic";

const STATUS_EMAIL: Partial<Record<OrderStatus, "order_accepted" | "order_ready_collection" | "order_out_for_delivery" | "order_cancelled">> = {
  accepted: "order_accepted",
  ready_for_collection: "order_ready_collection",
  out_for_delivery: "order_out_for_delivery",
  cancelled: "order_cancelled",
};

/**
 * POST /api/webhooks/telegram — inline-button actions from the restaurant chat.
 *
 * Trust boundary: Telegram callback data is attacker-controllable, so we
 * (1) require Telegram's secret-token header to match TELEGRAM_WEBHOOK_SECRET,
 * (2) re-load the order from the DB, and (3) only apply the transition if it is
 * legal from the CURRENT status (ORDER_TRANSITIONS). The DB is the source of
 * truth; Telegram never dictates state directly.
 */
export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  // Fail closed: no secret configured, or header mismatch → reject.
  if (!secret || request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = (await request.json().catch(() => null)) as {
    callback_query?: {
      id: string;
      data?: string;
      from?: { id: number; username?: string };
      message?: { message_id: number; chat: { id: number } };
    };
  } | null;

  const cb = update?.callback_query;
  if (!cb?.data || !cb.message) return NextResponse.json({ ok: true }); // ignore non-actionable updates

  // Defence-in-depth: even past the secret-token gate, only accept actions coming
  // from the configured restaurant chat. If the secret ever leaks, this stops any
  // other chat from driving order state.
  const chatId = restaurantChatId();
  if (chatId && String(cb.message.chat.id) !== chatId) return NextResponse.json({ ok: true });

  const [action, orderId] = cb.data.split(":");
  const target = action as OrderStatus;
  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ ok: true });

  const { data: order } = await supabase.from("orders").select("id, status, fulfilment, location_id").eq("id", orderId).maybeSingle();
  if (!order) {
    await answerCallbackQuery(cb.id, "Order not found.");
    return NextResponse.json({ ok: true });
  }

  const current = order.status as OrderStatus;
  // Validate the transition against the state machine (same guard as the DB trigger).
  if (!ORDER_TRANSITIONS[current]?.includes(target)) {
    await answerCallbackQuery(cb.id, `Can't move a ${ORDER_STATUS_LABEL[current]} order there.`);
    return NextResponse.json({ ok: true });
  }

  const { error } = await supabase.from("orders").update({ status: target }).eq("id", orderId).eq("status", current);
  if (error) {
    await answerCallbackQuery(cb.id, "Couldn't update — please try again.");
    return NextResponse.json({ ok: true });
  }

  await recordOrderEvent(orderId, "ORDER_STATUS_CHANGED", { from: current, to: target, via: "telegram", telegramUserId: cb.from?.id ?? null });
  if (target === "accepted") await recordOrderEvent(orderId, "STAFF_ACKNOWLEDGED", { via: "telegram", telegramUserId: cb.from?.id ?? null });

  const tmpl = STATUS_EMAIL[target];
  if (tmpl) await enqueueOrderEmail(orderId, tmpl);

  // Reflect the new status + fresh action buttons back into the chat message.
  const fresh = await loadOrderForTelegram(orderId);
  if (fresh) {
    await editMessageText({
      chatId: String(cb.message.chat.id),
      messageId: cb.message.message_id,
      text: renderOrderMessage(fresh),
      buttons: buttonsForStatus(target, orderId, order.fulfilment as string),
    });
  }
  await answerCallbackQuery(cb.id, `Order ${ORDER_STATUS_LABEL[target]}.`);
  return NextResponse.json({ ok: true });
}
