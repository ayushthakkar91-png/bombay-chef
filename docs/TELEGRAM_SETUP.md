# Telegram Order Notifications — Setup

The restaurant gets a Telegram message for every paid order, with inline buttons
to drive the order (Accept / Preparing / Ready / Out for delivery / Complete /
Reject). **Telegram is only a notification channel — the database is the source
of truth.** If Telegram is down, the order is still `CONFIRMED`; the job retries
and, if it keeps failing, dead-letters and shows on the dashboard.

## 1. Create the bot

1. In Telegram, message **@BotFather** → `/newbot` → follow prompts.
2. Copy the **bot token** it gives you → set `TELEGRAM_BOT_TOKEN`.

## 2. Get the chat id

1. Create a Telegram **group** for the restaurant (or use a direct chat).
2. Add your bot to the group.
3. Get the chat id: send any message in the group, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser and read
   `result[].message.chat.id` (group ids are negative, e.g. `-1001234567890`).
4. Set `TELEGRAM_CHAT_ID` to that value.

## 3. Set the webhook secret

Pick a long random string → set `TELEGRAM_WEBHOOK_SECRET` (e.g.
`openssl rand -hex 32`).

## 4. Register the callback webhook

So the ACCEPT/PREPARING/… buttons reach the app, register the bot's webhook to
the app's Telegram endpoint, passing the same secret:

```
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<your-domain>/api/webhooks/telegram" \
  -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
```

The endpoint rejects any callback whose `X-Telegram-Bot-Api-Secret-Token` header
doesn't match the secret, and only applies a status change that is a legal
transition for the order's current state.

## 5. Apply the migration + schedule the worker

- Apply `supabase/migrations/0023_slice1_reliability.sql` (staging → prod).
- Schedule `GET /api/cron/notifications` (with `?secret=<CRON_SECRET>` or the
  `Authorization: Bearer` header) every 1–2 minutes — this sweeps notification
  retries. The immediate send happens right after payment; the cron is the
  recovery path for retries / server restarts.

## Environment variables

```
TELEGRAM_BOT_TOKEN=      # from @BotFather
TELEGRAM_CHAT_ID=        # restaurant group/chat id
TELEGRAM_WEBHOOK_SECRET= # random; also passed to setWebhook
```

All three are **server-only**. Never prefix with `NEXT_PUBLIC_`.

## Failure behaviour (by design)

| Situation | Order | Telegram job |
|-----------|-------|--------------|
| Telegram API down at payment time | `CONFIRMED` (paid) | `queued` → retried by cron with backoff |
| Still failing after 6 attempts | `CONFIRMED` | `failed` (dead-letter) → dashboard alarm |
| Telegram recovers before dead-letter | `CONFIRMED` | `sent` automatically |

No order is ever lost because Telegram failed.
