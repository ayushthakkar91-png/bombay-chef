# Phase 5 — Loyalty & Retention

Points-based rewards + birthday rewards on the existing `0007` loyalty schema.
Ships behind `NEXT_PUBLIC_FEATURE_LOYALTY`. Ordering and reservations flows are
**unchanged** — redemptions ride the existing promo-code path.

---

## Design (why ordering didn't change)

Redeeming points (or receiving a birthday reward) **mints a single-use personal
promo code** bound to the customer. The customer enters it in the existing Phase 3
promo field at checkout. So the only schema change is `0011`: a `birthday` column
and a `customer_id` on `promo_codes`. Points are debited when the voucher is
minted (an explicit account action), so an abandoned checkout never loses points.

## 1. Files created

- `supabase/migrations/0011_loyalty_phase5.sql`, `supabase/seed_loyalty.sql` (rewards catalogue).
- `src/lib/loyalty/{constants,service}.ts` — earn/redeem/birthday/tier/adjust.
- `src/lib/repositories/loyalty.ts` — balance, vouchers, ledger, catalogue.
- `src/app/account/_actions/loyalty.ts` (redeem) · `src/app/admin/_actions/loyalty.ts` (manual adjust).
- `src/app/account/(app)/rewards/page.tsx` · `src/components/account/RewardsCatalogue.tsx`.
- `src/app/api/cron/loyalty/route.ts` (birthday) · `src/components/admin/customers/PointsAdjuster.tsx`.

## 2. Files updated

- `api/webhooks/stripe` — accrue points on `paid`.
- `admin/_actions/orders` — reverse points on full refund.
- `email/templates` — `loyalty_birthday` template.
- `auth/customer` (+birthday), `account/_actions/profile` (save birthday),
  `account/PreferencesForm` (birthday input), `account/AccountShell` (Rewards tab),
  `admin-customers` + admin customer page (loyalty panel).

## 3. Database usage

`loyalty_accounts` + `loyalty_ledger` (append-only; balance via the 0007 trigger),
`rewards` (catalogue), `promo_codes` (personal vouchers via new `customer_id`),
`customers.birthday`. All ledger/voucher writes are service-client (no public
insert policy); customers read their own via RLS.

## 4. Earning & redemption

- **Earn**: £1 = 1 point, on **net food spend** (`subtotal − discount`, excludes
  delivery), credited once per order on `paid` (idempotency-guarded). Reversed on
  full refund.
- **Redeem**: catalogue rewards (seeded: £5/500pts, £10/1000pts, free delivery/200pts)
  → debits points, mints a single-use promo voucher (100 points = £1 of value).
- **Tiers**: Bronze/Silver/Gold/VIP from lifetime points (display + progress).

## 5. Birthday rewards

Customer sets their birthday in **Preferences**. The daily `GET /api/cron/loyalty`
finds today's birthdays (London), mints a one-per-year **10% off** voucher, and
emails it (`loyalty_birthday`). Dedup-guarded so it issues at most once per year.

## 6. Admin

The customer profile (`/admin/customers/[id]`) shows tier + points and lets a
manager make an **audited manual adjustment** (gated to restaurant_manager + flag).

## 7. Testing checklist

- [ ] With `NEXT_PUBLIC_FEATURE_LOYALTY=true`, a logged-in customer's paid order credits `floor(net/£1)` points (visible in /account/rewards activity).
- [ ] Refunding that order reverses the points.
- [ ] Redeem a reward → points debited, a voucher code appears; entering it at checkout discounts the order; it's single-use.
- [ ] Insufficient points / higher-tier reward → redeem button disabled with the right label.
- [ ] Set a birthday = today, run `/api/cron/loyalty?secret=…` → a 10% voucher is minted + emailed; running again the same year is a no-op.
- [ ] Tier + "points to next tier" display correctly.
- [ ] Admin customer page shows loyalty; a manual adjustment changes the balance and writes an `audit_log` row.
- [ ] With the flag OFF: no Rewards tab, no earning, `/account/rewards` shows "coming soon", cron returns `skipped`.
- [ ] Guest orders earn nothing (no account). Reservations don't earn.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 8. Notes / deferred (NOT built — later phases)
- Birthday "free dessert" alternative is implemented as the 10% voucher (promo can't
  encode a specific free item); a fixed-amount "dessert on us" voucher is a trivial config swap.
- Personal vouchers are bearer + single-use (not hard-bound to the redeemer at
  checkout) — acceptable voucher semantics; tightening is optional.
- Refund re-crediting of *redeemed* voucher points isn't done (earned points are
  reversed); edge case.
- Referrals, anniversary rewards, VIP perks, points expiry: deferred (CRM/marketing phases).
