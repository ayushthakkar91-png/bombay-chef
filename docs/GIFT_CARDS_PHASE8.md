# Phase 8 — Gift Cards

A complete gift card system on the existing `gift_cards` table (`0006`) +
`orders.gift_card_id`/`gift_card_pence` (designed for this). Stripe-paid,
email-delivered, partial-balance redemption. Reuses the existing email/outbox and
Stripe infrastructure. No public-site, reservation, loyalty, CRM, or Phase-7
dashboard changes.

> **Required ordering touch:** "Redeem during checkout" and the gift-card report
> can't exist without (a) an additive checkout field + (b) a shared paid-order
> finaliser. Both are **additive with zero behaviour change for non-gift orders**,
> use the pre-existing `gift_card_*` columns, and the gift-card report is a *new*
> surface (the Phase 7 dashboards are untouched).

## 1. Files created

- `supabase/migrations/0013_gift_cards.sql` — delivery/recipient fields, `pending`
  status, `view_token`, and a `gift_card_transactions` ledger.
- `src/lib/giftcards/{constants,service}.ts` — purchase, activate+deliver, plan/
  debit redemption, refund, resend, disable, balance, scheduled delivery, card view.
- `src/lib/ordering/confirm.ts` — `confirmPaidOrder` (extracted from the webhook,
  + gift-card debit) shared by the webhook and the gift-card-covered path.
- `src/lib/repositories/admin-giftcards.ts` — admin reads + reporting stats.
- Customer: `src/app/gift/{page,actions,[token]/page}`, `src/components/giftcards/{BuyGiftCard,PrintButton}`.
- Admin: `src/app/admin/(panel)/giftcards/page`, `src/app/admin/_actions/giftcards.ts`,
  `src/components/admin/giftcards/GiftCardsManager.tsx`.
- `src/app/api/cron/giftcards/route.ts` (scheduled delivery).

## 2. Files updated (additive)

- `api/webhooks/stripe` — now dispatches to `confirmPaidOrder` (orders) or
  `confirmGiftCardPurchase` (gift cards) by metadata. Order behaviour identical.
- `order/actions` (`createCheckout`) — optional gift-card code, applied after
  promo/delivery; fully-covered orders skip Stripe via `confirmPaidOrder`.
- `components/order/CheckoutForm` — additive gift-card field.
- `repositories/orders` + order track page — show the gift-card deduction.
- `email/templates` — `gift_card_delivery`. `AdminShell` nav. README.

## 3. Database

`gift_cards` (+ delivery fields, `pending`, `view_token`),
`gift_card_transactions` (purchase/redeem/refund/void ledger),
`orders.gift_card_id`/`gift_card_pence` (redemption), `payments` (gift-card method).
Cards are bearer instruments; codes/view-tokens are unguessable; partial balance is
tracked on the card with the ledger for audit + reporting.

## 4. Purchase flow

`/gift` → choose amount (£25/£50/£100/£200 or custom £10–£500), recipient name +
email, sender name, personal message, send-now or scheduled date → Stripe hosted
Checkout (`metadata.gift_card_id`) → webhook activates the card (balance = face
value) and delivers it (now, or the cron sends it on the chosen date). The
recipient email carries the **code** + a link to a **printable card** (`/gift/[token]`
→ Print / Save as PDF).

## 5. Redemption flow

At checkout a customer enters a gift-card code → `checkGiftCard` shows the balance
→ on pay, `createCheckout` applies `min(balance, total)` as `gift_card_pence`,
charges only the remainder via Stripe (or **finalises with no Stripe** when fully
covered). The card is **debited on confirmation** (optimistic-concurrency guard,
no double-debit), and marked `redeemed` at zero balance — **remaining balance is
tracked** and reusable on future orders.

## 6. Admin & reporting

`/admin/giftcards` (restaurant_manager): KPI tiles — **cards sold, revenue (face
value), redeemed, outstanding liability** — plus a filterable table with **resend**,
**disable**, and **refund** (Stripe refund of the remaining balance + void). This is
the gift-card report; the Phase 7 dashboards are not modified.

## 7. PCI / GDPR

- **PCI**: Stripe hosted Checkout for both purchase and the remainder at redemption
  (SAQ A); no card data stored.
- **GDPR**: recipient email is used only to deliver the gift (transactional, not
  marketing); printable view is token-gated; admin actions are role-gated; the
  transaction ledger is the audit trail.

## 8. Setup

Run `0013`. Reuses existing `STRIPE_*` + `EMAIL_*` + `NEXT_PUBLIC_SITE_URL`.
Schedule `GET /api/cron/giftcards?secret=…` (scheduled deliveries; emails dispatch
via the reservations cron outbox). No feature flag.

## 9. Testing checklist

- [ ] Buy a gift card (preset + custom); pay with a Stripe test card → recipient gets the delivery email with code + printable link.
- [ ] Scheduled card: choose a future date → not sent immediately; `/api/cron/giftcards?secret=…` sends it once the date passes (re-run = no duplicate).
- [ ] `/gift/[token]` shows the card; Print / Save as PDF works.
- [ ] Redeem a code at checkout: balance shown; partial use charges the remainder via Stripe and leaves remaining balance; full coverage skips Stripe and confirms the order; the card debits exactly once.
- [ ] Track/confirmation page shows the gift-card deduction and "Paid by card".
- [ ] A used-up card shows `redeemed`; a disabled card can't be redeemed; an invalid/expired code is rejected.
- [ ] Admin: KPIs (sold/revenue/redeemed/outstanding) are correct; resend / disable / refund work; refund issues a Stripe refund + voids.
- [ ] Non-gift orders behave exactly as before; public routes still `○ Static`.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds.

## 10. Notes / deferred
- "Printable PDF" = a print-optimised card page (browser Print → Save as PDF);
  a server-generated PDF attachment would need a PDF library (avoided to stay
  dependency-free).
- Concurrent use of the *same* card on two simultaneous orders is guarded by an
  optimistic balance check (debit caps to available); serial use is the norm.
- Refund refunds the *remaining balance* and voids the card (not a full purchase
  reversal of already-spent value).
