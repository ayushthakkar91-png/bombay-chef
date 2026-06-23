# Phase 7 — Analytics, Reporting & BI

Read-only admin dashboards over the data the previous phases generate. **Nothing
else changes** — no public site, ordering, reservations, loyalty, or CRM
modifications; no new migration, env var, or feature flag. Gated to
`restaurant_manager` (org-wide). Charts are pure CSS/SVG — no chart dependency.

---

## 1. Files created

- `src/lib/reports/range.ts` — date-range presets + series helpers.
- `src/lib/reports/queries.ts` — all aggregate reads (service client).
- `src/components/admin/reports/charts.tsx` — `BarChart`, `BarList`, `StackedBar`, `DataRow`.
- `src/components/admin/reports/ReportFilters.tsx` — range + location filter.
- Pages `src/app/admin/(panel)/reports/{page,sales,reservations,customers,marketing,loyalty}`.
- `src/app/api/admin/reports/export/route.ts` — CSV export (role-checked, 403 not redirect).

## 2. Files updated

- `src/components/admin/AdminShell.tsx` — Reports nav group. `supabase/README.md`.

## 3. Data usage (read-only)

`orders` + `order_items` (revenue, AOV, top dishes, fulfilment mix, refunds),
`reservations` (bookings, covers, no-show/cancel rates, occasions), `profiles` +
`orders` (new vs returning, repeat rate, lifetime value, top customers),
`marketing_contacts` + `campaigns` + `segment_members` (audience + campaigns),
`loyalty_ledger` + `loyalty_accounts` + `promo_codes` (points + tiers + vouchers).
Aggregation is done in JS over date-scoped fetches (fine at a restaurant's scale;
materialised SQL views are the documented scale-up path).

## 4. Reports

- **Dashboard** (`/admin/reports`) — KPI row (revenue, orders, AOV, covers, new
  customers, points redeemed), revenue-by-day, order mix, top dishes, reservation
  + marketing/loyalty snapshots.
- **Sales** — revenue/orders by day, by location, fulfilment + status breakdown, refunds.
- **Reservations** — bookings/covers, no-show & cancel rates, by day, occasion, location.
- **Customers** — total/new/ordering, repeat rate, average lifetime value, acquisition, top customers.
- **Marketing** — subscribers, opt-in rate, segment sizes, recent campaign performance.
- **Loyalty** — points issued/redeemed/net, active vouchers, members by tier.

All operational reports take a **date-range** (7/30/90/365 days) and a **location**
filter. Sales/Reservations/Customers offer **CSV export**.

## 5. Definitions

- **Revenue** = sum of order totals for paid→completed statuses; refunded orders
  are excluded and reported separately. (Gross booked revenue.)
- **AOV** = revenue ÷ counted orders. **Covers** = sum of party sizes of non-cancelled bookings.
- **Repeat rate** = ordering customers with ≥2 orders ÷ ordering customers.
- **Lifetime value** = all-time order spend per ordering customer (not date-bound).
- **Segments** reflect the last marketing recompute (Phase 6 cron / "Refresh now").

## 6. Testing checklist

- [ ] `/admin/reports` loads for a restaurant_manager; a location_manager/staff can't reach it.
- [ ] KPIs and charts reflect real order/reservation data; changing the range/location updates them.
- [ ] Revenue excludes refunded orders; refunds show in the Sales "Refunded" stat.
- [ ] Top dishes, top customers, segments, and tier counts populate.
- [ ] CSV export downloads for sales/reservations/customers; a non-manager hitting the export URL gets 403.
- [ ] Empty/zero states render cleanly when there's no data in a window.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 7. Notes / deferred
- Open/click email analytics need tracking pixels or an ESP (Phase 6 note) — marketing
  report shows recipients, not opens.
- Charts are intentionally lightweight (CSS/SVG); a charting library + materialised
  SQL views are the upgrade path if data volume or richness grows.
- Reports read across all locations via the service client, authorised at the page
  (restaurant_manager); a location-scoped reporting view is a possible future refinement.
