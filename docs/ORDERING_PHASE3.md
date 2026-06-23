# Phase 3 — Ordering system

A complete collection & delivery ordering system on the existing Next.js 16 +
Supabase stack, with Stripe hosted Checkout (PCI SAQ A). Ships behind
`NEXT_PUBLIC_FEATURE_ORDERING`; the public marketing site, reservations, and
Phase 1 admin are unchanged.

---

## 1. Files created (35)

**Schema** — `supabase/migrations/0010_ordering_config.sql` (9-state lifecycle +
guard, `track_token`, `marketing_opt_in`, per-location delivery config,
`delivery_zones`), `supabase/seed_ordering.sql` (price_pence backfill + zones).

**Domain (`src/lib/ordering/`)** — `constants.ts` (statuses/transitions),
`postcode.ts`, `types.ts` (cart), `pricing.ts` (server-authoritative pricing),
`delivery.ts` (postcode→zone), `notify.ts` (order email payloads).

**Stripe** — `src/lib/stripe/client.ts` (Checkout session, refunds, webhook
signature verification — no SDK dependency).

**Repositories** — `ordering-menu.ts` (menu + modifiers + per-location), `orders.ts`
(admin + track-token reads).

**Email** — extended `src/lib/email/templates.ts` with 6 order templates.

**Customer** — `src/app/order/{layout,page,menu,checkout,track/[token]}` +
`actions.ts`; components in `src/components/order/` (OrderProvider, StartOrder,
MenuBrowser, ItemModal, CartContents, CheckoutForm, TrackingControls).

**API** — `src/app/api/webhooks/stripe/route.ts`.

**Admin** — `src/app/admin/_actions/orders.ts`; pages
`src/app/admin/(panel)/orders/{page,live,history}`; components
`src/components/admin/orders/` (OrderActions, LiveOrders, OrdersTable).

## 2. Files updated

- `src/components/admin/AdminShell.tsx` — Orders nav group.
- `src/lib/notifications/outbox.ts` — `order_id` on the outbox.
- `.env.example`, `supabase/README.md`.
- (The reservation-flow files in the modified list are from the approved Phase 2.)

## 3. Database tables used

`orders`, `order_items`, `payments`, `refunds`, `promo_codes`, `promo_redemptions`,
`menu_items`/`location_menu_items`/`item_modifiers` (read), `locations` (+ delivery
config), `delivery_zones`, `notifications`, `audit_log`. Guest create/read run
server-side (service client; `track_token` = bearer); admin via staff RLS.

## 4. API routes & server actions

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /api/webhooks/stripe` | route | Verify signature; mark order paid; record payment; send emails. **Only place an order becomes paid.** |
| `checkDeliveryAction` | action | Postcode → served + fee/min/ETA. |
| `priceCartAction` | action | Server-authoritative live totals + promo. |
| `createCheckout` | action | Validate → price → create order/items → Stripe session. |
| `setOrderStatus` / `refundOrder` | admin actions | Status transitions (with emails) / Stripe refund. |

## 5. Customer flow

`/order` (location + collection/delivery + postcode check) → `/order/menu` (browse,
modifiers via item modal, sticky desktop cart + mobile bottom bar/drawer, promo,
server totals) → `/order/checkout` (contact, address, **separate** marketing opt-in,
pay) → Stripe hosted Checkout → `/order/track/[token]` (confirmation + live status
stepper, auto-refresh). Cart persists in localStorage and clears on success.

## 6. Admin flow

`/admin/orders` (overview counts) · `/admin/orders/live` (kitchen board,
auto-refresh, Accept → Preparing → Ready/Out → Complete, Reject/Refund) ·
`/admin/orders/history` (status filter, refunds). Location-scoped to RLS grants.

## 7. Stripe workflow

Client → `createCheckout` (server prices the cart, creates a `pending_payment`
order, opens a **hosted Checkout** session for the authoritative total) → customer
pays on Stripe → `checkout.session.completed` webhook (signature-verified,
idempotent) marks the order `paid`, records the payment (ids + brand/last4 only),
increments promo usage, emails confirmation + admin. Refunds via `refundOrder` →
Stripe `/refunds` → `refunds` row + audit + `refunded` status. **No card data ever
touches our servers, logs, or DB (SAQ A).**

## 8. Email workflow

Outbox (Phase 2) + 6 order templates: confirmation, accepted, ready-for-collection,
out-for-delivery, cancelled/refunded, plus an admin new-order alert. Emails enqueue
on the webhook and on admin status changes; the existing cron route dispatches them.
Console fallback when no email key is set.

## 9. Compliance

- **PCI**: Stripe hosted Checkout (SAQ A); no raw card storage; webhook is the sole
  source of "paid"; signature verified with timing-safe HMAC + replay window.
- **GDPR**: guest data minimised; **marketing consent is a separate, optional,
  unbundled checkbox** stored as `orders.marketing_opt_in` (never required to pay);
  order/track access is via an unguessable token; refund/audit trail in `audit_log`.

## 10. Setup

1. Run `0010` + `seed_ordering.sql` (after the Phase 1/2 migrations + menu seed).
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_SITE_URL`,
   `NEXT_PUBLIC_FEATURE_ORDERING=true` (+ email env optional).
3. Add a Stripe webhook for `checkout.session.completed` → `/api/webhooks/stripe`.

## 11. Testing checklist

- [ ] `/order` lists locations; delivery postcode check returns served/fee/ETA; out-of-zone is rejected.
- [ ] Menu shows only orderable items; modifiers enforce min/max; price updates with options.
- [ ] Cart: qty controls, modifiers, notes, promo apply/remove, totals; delivery min-order blocks checkout.
- [ ] Sticky cart (desktop) + bottom bar/drawer (mobile) both work.
- [ ] Checkout → Stripe redirect; on test-card pay, webhook marks order paid and confirmation email sends.
- [ ] `/order/track/<token>` shows the stepper and auto-advances as the kitchen updates status; cart clears.
- [ ] Tampering with client prices doesn't change the charge (server reprices).
- [ ] Admin live board: Accept/Preparing/Ready/Out/Complete fire emails; Reject/Refund issues a Stripe refund and emails the customer.
- [ ] A paid order can't be cancelled without a refund; refund sets `refunded` + audit row.
- [ ] Location-scoped staff only see/act on their branch.
- [ ] Marketing opt-in is unticked by default and never blocks payment.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 12. Notes / deferred
- Stripe implemented over REST (no SDK) to keep the build dependency-free; the
  official `stripe` SDK is a clean future upgrade.
- Apple/Google Pay appear automatically in hosted Checkout; PayPal is not wired.
- Delivery uses postcode-district (outcode) zones; true radius (geocode+distance) is later.
- Card brand/last4 are stored only if present on the session; full enrichment needs a PI retrieve.
- Customer accounts + loyalty are Phase 4/5; orders here are guest + track-token.
