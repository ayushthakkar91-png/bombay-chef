# Phase 13 — Multi-Tenant Restaurant SaaS Platform

Turns the single-restaurant app into a reusable **Restaurant OS**: a platform
control plane that provisions, bills, brands and isolates many restaurants. The
existing Bombay Bicycle Chef is **seeded as tenant #1**, so the live app keeps
working unchanged.

> **Honest scope.** A "security-first, production-ready" multi-tenant conversion of a
> live 16-migration single-tenant database is done **incrementally**, not by flipping
> every table's RLS blind. This phase ships the full **control plane** (tenants,
> plans, subscriptions, white-label, membership, operators, audit) and the
> **isolation foundation** (a `tenant_id` anchor on `locations` + `current_tenant_id()`
> / `is_platform_admin()` helpers). Retro-fitting per-tenant RLS across the existing
> domain tables (orders, menu, etc.) is the **documented rollout** in §7 — a scripted,
> verifiable migration, not a one-shot rewrite.

---

## 1. Data model (`0017`)

`plans` (Starter/Professional/Enterprise, monthly+annual, limits, features),
`tenants` (slug, status, plan, owner), `tenant_settings` (white-label: brand, colours,
logo, custom domain, staged seed menu), `subscriptions` (Stripe lifecycle),
`tenant_users` (owner/admin/member), `platform_admins` (SaaS operators),
`tenant_audit_log`, and `locations.tenant_id` (the anchor most domain data hangs off).

## 2. Security & isolation

- **Helpers** (`security definer`): `is_platform_admin()`, `is_tenant_member(t)`, `current_tenant_id()`.
- **RLS**: platform tables are operator-only for writes; tenant members can read their own tenant's rows. Plans are public (pricing).
- **Two-tier access**: `requirePlatformAdmin()` (operators) and `requireTenantAccess(id)` (operator **or** that tenant's owner/admin). `/platform/*` is gated in `proxy.ts` + the layout.
- **Audit**: every provisioning, lifecycle, plan, branding and membership change writes to `tenant_audit_log`.

## 3. Routes

| Route | Purpose |
|---|---|
| `/platform` | Operator overview — tenants, active/trialing, **MRR**, plan mix |
| `/platform/tenants` | All tenants |
| `/platform/tenants/new` | **Setup wizard**: profile → branding → locations → menu import → review |
| `/platform/tenants/[id]` | **Tenant admin**: status/plan, billing, white-label, members |
| `/platform/billing` | Plans, MRR/ARR, subscriptions |
| `/platform/analytics` | Cross-tenant + per-tenant reporting |

Super-admins reach it via the **SaaS Platform** item in the admin sidebar.

## 4. Setup wizard (provisioning)

Collects the restaurant profile + owner (creates/links the auth user), branding,
locations, and an optional pasted menu. `provisionTenant()` creates the tenant,
settings, owner membership, a manual subscription and the locations (slugs namespaced
per tenant to stay globally unique). The menu is **staged** in `tenant_settings.seed_menu`
(applied when the tenant's operational workspace is activated — see §7), so it never
pollutes the shared menu.

## 5. Subscription billing

Stripe subscriptions via `fetch` (a **separate** billing module + webhook, so the
Phase 3 order flow is untouched). Starter/Professional/Enterprise, monthly or annual.
`createSubscriptionCheckout` opens hosted Checkout; `/api/webhooks/stripe-billing`
(signature-verified, 5-min replay window) syncs `subscriptions`/`tenants`;
`createBillingPortal` opens the Stripe portal. **Without Stripe**, operators set a
tenant's plan/status manually — the platform is fully usable.

## 6. White-label

`tenant_settings` stores brand name, colours, logo, support email and **custom domain**.
The wizard + tenant page edit them. Activating a custom domain on the live storefront
needs DNS + a host→tenant resolver at the edge (Vercel domains / proxy) — the data and
admin are here; wiring the public storefront to repaint per tenant is part of §7 (and
deliberately doesn't touch the frozen BBC public site).

## 7. The data-plane rollout (documented, not flipped blind)

To make a **new** tenant fully operational (its own menu/orders/etc.), each domain
table needs `tenant_id` + tenant-scoped RLS. The safe, scriptable path:
1. `alter table <t> add column tenant_id uuid references tenants(id);`
2. Backfill: derive from `location_id` where present, else tenant #1.
3. Add a `tenant_id` RLS predicate (`is_platform_admin() or tenant_id = current_tenant_id()`) **alongside** existing role policies.
4. Scope the table's repository reads by `current_tenant_id()`.
5. Roll out table-by-table behind a verify (tsc/build) each step.

Tenant #1 keeps working throughout because it owns all existing rows. This is the
production-correct way to multi-tenant a live DB — incremental and verifiable.

## 8. Setup

Run `0017` (seeds plans + tenant #1 + maps super-admins as operators/owners).
Optionally set `STRIPE_PRICE_*` + `STRIPE_BILLING_WEBHOOK_SECRET` and point a Stripe
webhook at `/api/webhooks/stripe-billing` for self-serve subscriptions.

## 9. Testing checklist

- [ ] A super-admin sees **SaaS Platform** in the sidebar and can open `/platform`; a non-operator is redirected to `/admin`.
- [ ] `/platform` shows tenant counts and MRR; BBC appears as an active Enterprise tenant.
- [ ] The setup wizard provisions a new tenant (owner can sign in), with branding, locations and a staged menu; it appears in the list.
- [ ] Tenant page: change status/plan (operator), edit branding, add/remove members — all audited.
- [ ] With Stripe price IDs set, "Subscribe" opens Checkout and the webhook flips the tenant to active; the portal opens for an existing customer.
- [ ] Without Stripe, manual plan/status management works end-to-end.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static` · the existing BBC app is unchanged.

## 10. Notes / deferred
- Per-table tenant RLS for the domain tables is §7 (scripted rollout), not flipped in this phase.
- Custom-domain storefront routing needs edge DNS/host resolution (infra) — settings + resolver groundwork are here.
- Owner self-serve portal currently lives inside `/platform/tenants/[id]` (operators + that tenant's owner); a fully separate owner-branded portal is a later split.
