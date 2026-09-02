# Go Live — Online Ordering (Balham)

Ordering is **ON by default** in code now (`src/lib/flags.ts`). Customers reach
the in-house `/order` flow the moment `site-updates` is merged to `main` and
deployed. **Set every env var below in Vercel BEFORE merging to `main`**, or the
cart will load but checkout will error.

All values go in **Vercel → Project → Settings → Environment Variables**
(Production). **Never commit keys to git.** After setting them, **Redeploy**
(env — especially `NEXT_PUBLIC_*` — is baked in at build time).

The flow: `customer pays → Stripe → /api/webhooks/stripe → order marked paid
(admin) + Telegram ping`. The **webhook is the linchpin** for both the admin
order and the Telegram alert.

---

## Required env vars

| Variable | Where to get it | Needed for |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe → Developers → API keys → **Secret key** (`sk_live_…`) | creating the payment |
| `STRIPE_WEBHOOK_SECRET` | Stripe → Developers → **Webhooks** → your endpoint → **Signing secret** (`whsec_…`) | **marking the order paid** + firing Telegram |
| `UPSTASH_REDIS_REST_URL` | Upstash → your Redis DB → REST API | checkout rate-limit (**fail-closed** — without it every checkout is blocked) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash → your Redis DB → REST API | same |
| `TELEGRAM_BOT_TOKEN` | @BotFather → your bot token | Telegram order alerts |
| `TELEGRAM_CHAT_ID` | the chat/group id the bot posts to | Telegram order alerts |
| `NEXT_PUBLIC_FEATURE_ORDERING` | **leave UNSET** (on by default). Only set to `false` to turn ordering OFF. | kill switch |

Already set (keep them): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and your email/`CRON_SECRET` vars.

---

## The Stripe webhook endpoint (do this once)

1. Stripe Dashboard → **Live mode** (top-right) — must match your `sk_live_` key.
2. Developers → Webhooks → **Add endpoint** → **Webhook endpoint**.
3. URL: `https://bombay-bicycle-chef.com/api/webhooks/stripe`
4. Events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`.
5. Create → **Reveal signing secret** → that `whsec_…` is `STRIPE_WEBHOOK_SECRET`.

> A **live** key with a **test** webhook secret (or vice versa) = every order
> fails signature verification → no paid orders, no Telegram. Match the modes.

---

## Prove it in TEST mode first (no real money)

1. Set the **test** versions of all vars above (test Stripe keys + a **test-mode**
   webhook endpoint + Upstash + Telegram), redeploy a preview.
2. Go to `/order`, place a Balham order, pay with card `4242 4242 4242 4242`
   (any future expiry, any CVC).
3. Confirm: the order shows in **admin → Orders (Balham)** as `paid`, **and** the
   Telegram chat gets the new-order message with Accept/Ready buttons.
4. Only then swap the two Stripe values to **live** and redeploy.

---

## Before going live — checklist

- [ ] Menu seeded: `seed.sql` → `seed_ordering.sql` → `seed_balham_ordering.sql` (Supabase SQL editor).
- [ ] Migration `0025_pos.sql` applied (safe/additive; needed only for the POS, not ordering).
- [ ] All env vars above set in Vercel (test first, then live).
- [ ] Stripe live webhook endpoint created + `whsec_` in Vercel.
- [ ] **Rotate the Telegram bot token** (it was pasted in chat during setup) and update `TELEGRAM_BOT_TOKEN`.
- [ ] Redeploy after every env change.
- [ ] Merge `site-updates` → `main` to put it on the live domain (your call — ordering is on-by-default once merged).

---

## Telegram not pinging? Check in this order

1. Order actually reached `paid` in admin? If not → the **webhook** isn't firing
   (wrong `whsec_`, wrong mode, or endpoint URL). Fix that first — Telegram only
   fires after the paid-flip.
2. `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` set in Vercel + redeployed?
3. Bot is a member of the target chat/group and not blocked?
4. The queued job retries via the cron sweep (`/api/cron/notifications`) — a
   transient Telegram outage self-heals; a permanent misconfig dead-letters and
   shows in the `notifications` table with `status='failed'`.
