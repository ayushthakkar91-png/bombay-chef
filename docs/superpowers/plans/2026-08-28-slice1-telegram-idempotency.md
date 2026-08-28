# Slice 1 — Telegram + Idempotency + No-Lost-Orders

> **For agentic workers:** executed inline on branch `security/batch1-f2-f3-f6`. Serverless (Supabase/Vercel) adaptation of the two ordering/Stripe specs. Reuses the existing transactional outbox — does NOT introduce Redis/BullMQ (incompatible with Vercel serverless; the DB outbox + cron is the correct equivalent).

**Goal:** Telegram order notifications that can never silently lose an order, plus end-to-end order/payment idempotency and an order event audit log — on the existing hosted-Checkout Stripe flow.

**Architecture:** Database is the source of truth. Orders are created pending; only the signature-verified Stripe webhook marks paid. On paid, a Telegram notification **job** is persisted in the existing `notifications` outbox (new `telegram` channel) and dispatched with the outbox's existing claim/retry/dead-letter machinery. Telegram is a notification channel, never a source of truth. Client + server idempotency keys make double-click / network-retry safe. A dedicated `order_events` table is the audit trail.

**Stack:** Next.js 16, Supabase (Postgres/RLS), hand-rolled Stripe REST (hosted Checkout), Telegram Bot API (REST), the DB outbox in `src/lib/notifications/outbox.ts`, cron dispatch, vitest.

**Spec:** the two pasted specs (ordering system + Stripe). Prior design: `docs/superpowers/specs/2026-08-27-balham-ordering-launch-design.md`.

## Global Constraints

- Money in integer pence, server-authoritative. Client never sends an amount.
- Order marked `paid` ONLY by the signature-verified Stripe webhook (or gift-card-fully-covered server path). Never the client redirect.
- Telegram is a channel, never a source of truth. Telegram failure MUST NOT cancel/lose an order.
- Secrets server-only: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `STRIPE_*`. Never `NEXT_PUBLIC_*`.
- New SECURITY DEFINER fns pin `search_path` + revoke execute from anon/authenticated.
- Migration `0023_slice1_reliability.sql` (append-only; NOT auto-applied — staging → prod with approval).
- Keep hosted Checkout. Do NOT switch to PaymentIntent + Payment Element.

## Task S1 — Stripe webhook hardening (dedup + amount verify + more events)

**Files:** `0023` (+`stripe_webhook_events`), `src/app/api/webhooks/stripe/route.ts`, `src/lib/stripe/client.ts`.

- `stripe_webhook_events(stripe_event_id text pk, event_type text, processed_at timestamptz default now())`.
- Webhook: after signature verify, `insert ... on conflict do nothing`; if 0 rows inserted → already processed → return 200 without side effects (idempotent, spec Stripe §6).
- **Amount/currency verify** (spec §11, audit F18): before confirming an order, assert `amount_total === order.total_pence - order.gift_card_pence` and `currency === 'gbp'`; on mismatch, record an `order_event` `PAYMENT_AMOUNT_MISMATCH` and do NOT confirm.
- Handle `payment_intent.payment_failed` (mark order event `PAYMENT_FAILED`, leave order pending) and `charge.refunded` (event log only; refunds already admin-driven).

## Task S2 — Order idempotency (client key + server dedup)

**Files:** `0023` (`orders.idempotency_key text`), `src/app/order/actions.ts` (`createCheckout`), `src/components/order/CheckoutForm.tsx` (generate + persist key), `CheckoutInput` type.

- Client generates a UUID `idempotencyKey` once per checkout attempt (persist in the cart/localStorage so a refresh/retry reuses it), sends it with `createCheckout`.
- `orders.idempotency_key` UNIQUE (partial, where not null). `createCheckout` first looks up an existing order by key: if found and still `pending_payment` → return its existing Stripe URL / track URL; if found and paid → return its track URL. Only create a new order when no key match.
- Network-failure recovery (spec §8/§49): a retried submit with the same key returns the original order, never a duplicate/charge.

## Task S3 — Stripe idempotency key on session creation

**Files:** `src/lib/stripe/client.ts` (`createCheckoutSession`), `src/app/order/actions.ts`.

- Pass an `Idempotency-Key` header (derive from the order id) to the Stripe `/checkout/sessions` POST so a retried session-create can't double-charge (spec Stripe §7).

## Task S4 — order_events audit log

**Files:** `0023` (`order_events`), new `src/lib/ordering/events.ts`, wire into `createCheckout`, `confirm.ts`, `admin/_actions/orders.ts`, the stripe webhook.

- `order_events(id, order_id fk, type text, actor_id uuid null, data jsonb, created_at)`, RLS: staff-at-location read; writes service-role.
- `recordOrderEvent(orderId, type, data?, actorId?)`. Emit: `ORDER_CREATED`, `PAYMENT_CONFIRMED`, `PAYMENT_FAILED`, `PAYMENT_AMOUNT_MISMATCH`, `ORDER_STATUS_CHANGED`, `TELEGRAM_NOTIFICATION_CREATED/SENT/FAILED`, `STAFF_ACKNOWLEDGED`.

## Task S5 — Telegram provider + enqueue on paid

**Files:** `0023` (notifications channel += `telegram`), new `src/lib/notifications/telegram.ts`, new `src/lib/ordering/telegram-notify.ts`, wire into `confirm.ts`.

- `telegram.ts`: `isTelegramConfigured()`, `sendTelegramMessage({chatId, text, replyMarkup?})` via `https://api.telegram.org/bot<token>/sendMessage` (token from env, server-only), returns message id or throws.
- `enqueueOrderTelegram(orderId)`: render the order summary text (items, totals, customer, fulfilment, address, payment) + inline action buttons, insert a `notifications` row `channel:'telegram'`, `to_address:<chat id>`, `payload:{ text, replyMarkup, orderId }`.
- `confirmPaidOrder` calls `enqueueOrderTelegram(orderId)` after marking paid (alongside the existing emails). Also `recordOrderEvent(... TELEGRAM_NOTIFICATION_CREATED)`.

## Task S6 — Telegram dispatch + dead-letter + dashboard alarm

**Files:** `src/lib/notifications/outbox.ts` (generalize dispatch to telegram) or new `dispatchTelegramDue`, the order cron / a new `src/app/api/cron/notifications/route.ts`, `confirm.ts` (`after()` immediate dispatch), admin orders read model + kitchen UI.

- Telegram dispatcher mirrors `dispatchDue`: claim queued→sending, send via `sendTelegramMessage`, on success `sent` + record `TELEGRAM_NOTIFICATION_SENT`; on error backoff + retry; at `MAX_ATTEMPTS` → `failed` (dead-letter) + record `TELEGRAM_NOTIFICATION_FAILED`.
- Immediate attempt: webhook `after(() => dispatchTelegramDue())` so it's near-instant; cron sweeps retries.
- Dashboard alarm (spec §17): admin orders/kitchen surfaces any order whose telegram notification is `failed` — a red "notification failed" banner + a retry action.

## Task S7 — Telegram callback webhook (action buttons)

**Files:** new `src/app/api/webhooks/telegram/route.ts`, `src/lib/notifications/telegram.ts` (answerCallbackQuery), status transition via existing `ORDER_TRANSITIONS`.

- Register buttons: ACCEPT / PREPARING / OUT_FOR_DELIVERY / READY / COMPLETE / REJECT with `callback_data = <action>:<orderId>`.
- Webhook validates Telegram's secret token header (`X-Telegram-Bot-Api-Secret-Token` === `TELEGRAM_WEBHOOK_SECRET`) — reject otherwise. Validates the order exists, the requested transition is legal (`ORDER_TRANSITIONS`), applies it via the service client, records `ORDER_STATUS_CHANGED` + `STAFF_ACKNOWLEDGED` (with the Telegram user id as actor context), and `answerCallbackQuery` to confirm in the chat. Illegal transitions are rejected without mutating.

## Verification

- `tsc`, `npm test` (vitest — add unit tests for idempotency lookup, telegram text render, amount-verify), `next build`.
- pgTAP: `stripe_webhook_events` dedup, `orders.idempotency_key` unique, `order_events` insert — in `rls_batch2_test.sql` (run on staging).
- Manual (staging, Stripe test + a test Telegram bot): pay → paid → Telegram message with buttons; press ACCEPT → order accepted + chat confirms; double-submit checkout → one order; replay Stripe event → no double; kill Telegram token → order still CONFIRMED, notification retries then dead-letters + dashboard shows the alarm.

## User-supplied config (documented in .env.example + checklist)

`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`; register the Telegram webhook to `/api/webhooks/telegram` with the secret token; apply `0023` to staging→prod.
