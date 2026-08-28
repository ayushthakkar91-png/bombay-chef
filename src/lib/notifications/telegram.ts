import "server-only";

/**
 * Telegram Bot API client (REST, no SDK). Bot token is server-only — NEVER
 * NEXT_PUBLIC. Telegram is a NOTIFICATION CHANNEL, never a source of truth: a
 * failure here must not affect order/payment state. Config via env:
 *   TELEGRAM_BOT_TOKEN     — the bot's token (server secret)
 *   TELEGRAM_CHAT_ID       — the restaurant's chat/group id to notify
 *   TELEGRAM_WEBHOOK_SECRET— shared secret for the callback webhook
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export function isTelegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT_ID);
}

export function restaurantChatId(): string | null {
  return CHAT_ID ?? null;
}

export type InlineButton = { text: string; callback_data: string };

async function telegramApi(method: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not configured");
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json()) as { ok: boolean; description?: string; result?: Record<string, unknown> };
  if (!res.ok || !data.ok) {
    throw new Error(`Telegram ${method} failed: ${data.description ?? res.status}`);
  }
  return (data.result as Record<string, unknown>) ?? {};
}

/** Send a message with optional inline keyboard. Returns the message id. */
export async function sendTelegramMessage(opts: {
  chatId: string;
  text: string;
  buttons?: InlineButton[][];
}): Promise<{ messageId: number }> {
  const body: Record<string, unknown> = {
    chat_id: opts.chatId,
    text: opts.text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (opts.buttons?.length) body.reply_markup = { inline_keyboard: opts.buttons };
  const result = await telegramApi("sendMessage", body);
  return { messageId: (result.message_id as number) ?? 0 };
}

/** Acknowledge a callback query (removes the button "loading" spinner). */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await telegramApi("answerCallbackQuery", { callback_query_id: callbackQueryId, text: text ?? "" });
  } catch {
    // Non-critical: the state change already succeeded; the spinner clears on its own.
  }
}

/** Edit a message's inline keyboard (e.g. reflect the new status after an action). */
export async function editMessageText(opts: {
  chatId: string;
  messageId: number;
  text: string;
  buttons?: InlineButton[][];
}): Promise<void> {
  try {
    const body: Record<string, unknown> = {
      chat_id: opts.chatId,
      message_id: opts.messageId,
      text: opts.text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (opts.buttons?.length) body.reply_markup = { inline_keyboard: opts.buttons };
    await telegramApi("editMessageText", body);
  } catch {
    // Best-effort — the underlying order state is already updated.
  }
}
