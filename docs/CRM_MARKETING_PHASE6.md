# Phase 6 — CRM & Email Marketing

Built on the `0008` CRM tables. Marketing email is sent through the **existing
Brevo provider + notifications outbox** (Phase 2) — consent-gated, console
fallback in dev, no external ESP sync. Ships behind `NEXT_PUBLIC_FEATURE_MARKETING`.
Ordering, reservations, and the public design are unchanged.

---

## 1. Files created (52 total this phase)

- `supabase/migrations/0012_crm_marketing.sql` — `marketing_contacts` (operational
  list + unsubscribe tokens) and campaign authoring/targeting columns.
- `src/lib/marketing/` — `contacts` (subscribe/unsubscribe/consent-sync/welcome),
  `segments` (recompute), `campaigns` (send), `lifecycle` (abandoned cart).
- `src/lib/repositories/admin-marketing.ts` — admin reads.
- `src/app/admin/_actions/marketing.ts` — campaign/segment/promo actions.
- Admin pages `src/app/admin/(panel)/marketing/{page,campaigns,segments,promotions}`
  + components in `src/components/admin/marketing/`.
- Public: `src/app/newsletter/{page,actions}` + `src/app/unsubscribe/{page,actions}`
  + `src/components/marketing/{NewsletterForm,UnsubscribeForm}`.
- `src/app/api/cron/marketing/route.ts`.

## 2. Files updated

- `api/webhooks/stripe` — subscribe checkout opt-in payers (+welcome).
- `account/_actions/{auth,profile}` — subscribe on register/consent change.
- `email/templates` — `marketing_welcome`, `abandoned_cart`, `marketing_campaign`
  (+ unsubscribe footer on all marketing mail).
- `admin/AdminShell` — Marketing nav group. README, `.env.example`.

## 3. Database usage

`marketing_contacts` (operational list + tokens), `customer_segments` + `segment_members`
(0008, recomputed), `campaigns` (0008 + authoring columns), `promo_codes` (public
discount codes), `consents` (GDPR log — unchanged), `notifications` (outbox).
The `consents` log stays the GDPR evidence; `marketing_contacts` is the working list.

## 4. Audience & consent

- **One marketing list**, `marketing_contacts`, with a per-contact `unsubscribe_token`.
  Kept in sync with: customer consent toggles (preferences), account registration
  opt-in, checkout opt-in (on paid), and newsletter signups.
- **Every marketing email carries an unsubscribe link** (PECR/PECR-compliant);
  one-click unsubscribe sets `consent=false` and logs a `consents` revocation.
- Sends are **consent-gated by construction** — only opted-in, not-unsubscribed
  contacts are ever in the audience.

## 5. Segments

Recomputed from behaviour (nightly cron or "Refresh now"): new (<1 order),
returning (≥2), high-value (≥£150 lifetime), inactive (>90d since last order),
delivery-leaning, dine-in (has a reservation). Stored in `segment_members`.

## 6. Campaigns

Admin composes (name, subject, plain-text body, audience = all or a segment) →
**Send** enqueues a `marketing_campaign` email to every consenting contact in the
audience via the outbox; the reservations cron's dispatch delivers them. Segment
campaigns reach contacts linked to a customer in that segment; "all" reaches every
subscriber. Recipient count is recorded on the campaign.

## 7. Lifecycle automations

- **Welcome series**: a welcome email on newsletter signup / register-with-consent /
  checkout opt-in.
- **Abandoned cart**: the cron finds `pending_payment` orders 30 min–24 h old where
  the customer opted in at checkout (`marketing_opt_in`), and emails a reminder
  (once, dedup-guarded). Consent-safe.
- **Birthday**: already shipped in Phase 5 (loyalty), not duplicated here.

## 8. Admin (CRM)

`/admin/marketing` overview · `campaigns` (compose + send) · `segments` (sizes +
refresh) · `promotions` (public discount-code CRUD). Gated to restaurant_manager.
Customer marketing-consent + history are visible on the Phase 4 customer profile.

## 9. GDPR

Consent is unbundled and revocable; the append-only `consents` log records every
change with source; unsubscribe is one-click and reflected immediately;
transactional email (orders/bookings) is never gated by marketing consent.

## 10. Testing checklist

- [ ] With `NEXT_PUBLIC_FEATURE_MARKETING=true`: `/newsletter` signup adds a contact + sends a welcome (console if no email key).
- [ ] Customer opts into marketing in preferences → appears subscribed; opts out → unsubscribed; both logged in `consents`.
- [ ] Register with the marketing box ticked → subscribed + welcome.
- [ ] Pay an order with checkout marketing opt-in → subscribed.
- [ ] Run `/api/cron/marketing?secret=…` → segment counts populate; a 30min-old unpaid opted-in order triggers one abandoned-cart email (re-run = no duplicate).
- [ ] Admin → Campaigns: draft + send to "all" and to a segment → recipient count matches consenting contacts; unsubscribe link present in the email.
- [ ] Click unsubscribe → confirm → `consent=false`; that contact is excluded from the next campaign.
- [ ] Admin → Promotions: create a % and a £ code; deactivate one; codes work / don't at checkout.
- [ ] With the flag OFF: no Marketing emails sent, `/newsletter` shows "opening soon", cron returns `skipped`, admin Marketing shows the disabled notice.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 11. Notes / deferred (NOT built)
- Open/click tracking and per-recipient analytics need tracking pixels or an ESP;
  campaigns record recipient counts only (opens/clicks stay 0).
- No external ESP sync (Mailchimp/Klaviyo) — by design (chose reuse-existing-infra);
  an adapter is a clean future addition.
- No HTML/rich campaign editor — plain text wrapped in the brand shell.
- A newsletter signup isn't added to the public footer (the navbar/footer are frozen);
  entry is the `/newsletter` page.
- Reporting dashboards (revenue/CLV/retention) remain Phase 7.
