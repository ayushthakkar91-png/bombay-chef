# Balham Ordering Launch — Go-Live Checklist

Living checklist for taking Balham live on the internal ordering system. Work
top to bottom. **Do not flip `NEXT_PUBLIC_FEATURE_ORDERING=true` until every
"Before flip" box is checked.**

## Code gate (done in this branch)

- [x] `npx tsc --noEmit` clean (exit 0)
- [x] `npm test` — vitest passing (ratelimit fail-closed, ordering routing)
- [x] `npx next build` clean (exit 0)
- [x] Security Batch 2 committed: F4, F5, F7, F8, F9
- [x] Launch wiring committed: provider model, branch picker, CTA routing, guards

## Before flip — database (staging first, then production)

- [ ] Apply migration `0021_security_batch1_f2_f3.sql` to **staging**.
- [ ] Apply migration `0022_security_batch2.sql` to **staging**.
- [ ] Run `supabase test db` on staging — `rls_batch1_test.sql` AND
      `rls_batch2_test.sql` all green (F2/F3/F4/F5/F8). If a pgTAP fixture column
      doesn't match the live schema (e.g. `customers`/`orders` NOT NULLs), adjust
      the fixture, not the assertion.
- [ ] Run `supabase/seed_ordering.sql` on staging (aligns branch config: Balham
      collection+delivery ON; Battersea/Kilburn OFF).
- [ ] Confirm in the DB: `select slug, collection_enabled, delivery_enabled from
      locations;` → only Balham true.
- [ ] Balham menu is populated: `menu_items.price_pence` set for orderable items
      (run the price backfill in `seed_ordering.sql` if needed).

## Before flip — environment (production)

- [ ] `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` set in Vercel
      (checkout / login / gift / reservations FAIL CLOSED without them).
- [ ] `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` set; webhook endpoint
      `/api/webhooks/stripe` registered in Stripe for `checkout.session.completed`.
- [ ] `NEXT_PUBLIC_SITE_URL` correct (used for Stripe success/cancel + track URLs).
- [ ] Rotate `BREVO_API_KEY` (was exposed in chat during the audit).
- [ ] Supabase dashboard (not visible in code): email confirmation policy,
      password policy, leaked-password protection, allowed redirect URLs, any
      Storage bucket policies.

## Deploy order

1. [ ] Merge this branch → deploy to production with `NEXT_PUBLIC_FEATURE_ORDERING`
       still **false** (or unset). Site behaves exactly as today (all Order Online
       CTAs external).
2. [ ] Apply `0021` then `0022` to **production** (explicit approval; `supabase db
       push` or paste into SQL editor). Code-first/migration-second is safe.
3. [ ] Run `seed_ordering.sql` on production.
4. [ ] Smoke while flag still OFF where possible (admin reachable, no customer
       regressions).
5. [ ] Flip `NEXT_PUBLIC_FEATURE_ORDERING=true` in Vercel → redeploy.

## Post-flip smoke (production, Stripe live or test as agreed)

- [ ] `/order` shows the 3-branch picker. Balham → menu; Battersea/Kilburn → open
      the partner locator in a new tab.
- [ ] Typed `/order/menu?loc=battersea` → falls back to Balham / picker (never
      orders Battersea). Typed `/order/checkout?loc=kilburn` → "unavailable".
- [ ] Balham **collection** order as a guest → Stripe payment → webhook →
      order appears in `/admin` kitchen and on `/order/track/<token>`.
- [ ] Balham **delivery** order to a served postcode, **logged in** →
      `orders.customer_id` set → loyalty earns exactly once (no double on webhook
      retry).
- [ ] Apply a valid public promo → discount shows. Apply another customer's
      `BDAY-`/`PTS-` personal code → rejected (F4).
- [ ] A single-use promo used concurrently → only one order gets it (F5).
- [ ] Fully gift-card-covered order → paid; a second concurrent attempt on a
      drained card → rejected, no free order (F7).

## Rollback

- Fastest: set `NEXT_PUBLIC_FEATURE_ORDERING=false` in Vercel → redeploy. Every
  branch instantly reverts to the external platform; no DB change needed.
- Code: `git revert` the launch commits.
- Migration rollback (only if reverting code while `0021`/`0022` are live — see
  `SECURITY_AUDIT_AND_BATCH1.txt` §DEPLOYMENT for `0021`; for `0022` drop the
  added index/functions/trigger if a full reversal is required).
