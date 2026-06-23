# Phase 4 — Customer accounts

Guest-first customer accounts on the existing Supabase Auth + `0003` schema. No
new migration. Guest checkout and guest reservations stay fully available; an
account is optional and never forced.

---

## 1. Files created (40)

**Auth/domain** — `src/lib/auth/customer.ts` (customer DAL).

**Repositories** — `src/lib/repositories/account.ts` (customer-scoped reads),
`src/lib/repositories/admin-customers.ts` (admin directory).

**Actions** — `src/app/account/_actions/auth.ts` (register/login/logout + guest
linking), `src/app/account/_actions/profile.ts` (profile, consent, addresses,
favourites, GDPR).

**Customer pages** — `src/app/account/{login,register}` +
`src/app/account/(app)/{layout, page, orders, orders/[id], reservations,
addresses, favourites, preferences}`.

**Components** — `src/components/account/` (AccountShell, forms, LoginForm,
RegisterForm, ReorderButton, AddressManager, FavouritesManager, PreferencesForm).

**Admin** — `src/app/admin/(panel)/customers/{page,[id]}`.

## 2. Files updated

- `src/proxy.ts` — now also guards `/account/*` (session refresh + login redirect).
- `src/components/admin/AdminShell.tsx` — Customers nav (restaurant_manager+).
- Ordering integration (minimal, account-only): `ItemModal` (favourite heart),
  `MenuBrowser` + `order/menu/page` (pass favourite ids), `order/track` page
  (post-checkout "create account" CTA), `order/actions` (store modifier id for reorder).
- `supabase/README.md`.

## 3. Database usage

Reuses: `auth.users` + `profiles` (auto-created by the 0002 trigger), `customers`,
`addresses`, `consents` (append-only marketing consent), `favourites`,
`data_requests` (GDPR queue). Reads `orders`/`reservations` by `customer_id`.
Customer reads/writes go through RLS (own rows); the admin directory uses the
service client (role-gated at the page).

## 4. Auth flow

Supabase Auth (email + password) via `@supabase/ssr` — the same auth as admin.
`register` → `signUp`; `login` → `signInWithPassword`; both then run
`linkAndEnsure` (creates the `customers` row and **safely links guest orders +
reservations placed with the same — now verified — email**). `logout` → `signOut`.
The `proxy` refreshes the session and bounces signed-out `/account/*` visitors to
`/account/login`; the login/register pages redirect already-signed-in users in.

## 5. Customer flow

`/account` dashboard (recent order + next reservation + quick links) · `/account/orders`
+ `/account/orders/[id]` (with **reorder** — rebuilds the cart and opens the menu) ·
`/account/reservations` (upcoming + past; "Manage" links to the existing token flow) ·
`/account/addresses` (CRUD + default) · `/account/favourites` (heart a dish in the
order modal; manage here) · `/account/preferences` (name/phone, **marketing consent**,
data export/deletion).

**Guest-first:** checkout never requires an account; after checkout the track page
offers "Create an account" and the order links to it on next sign-in by email.

## 6. Admin flow

`/admin/customers` (search by name/email) → `/admin/customers/[id]`: profile,
order history, reservation history, **marketing-consent state**, and saved
addresses. Read-only; gated to `restaurant_manager` (org-wide).

## 7. GDPR flow

- **Marketing consent is separate from account creation** — an optional, unticked
  checkbox on register, fully managed in the preference centre; every change is an
  append-only `consents` row (source-stamped).
- **Data export** and **account deletion** are self-service requests
  (`/account/preferences`) that queue a `data_requests` row (dedup-guarded) for the
  team to fulfil within 30 days. Deletion is a request (not instant) because some
  records are retained where the law requires (e.g. tax) — anonymisation is the
  admin/job step.
- Email is shown read-only (changing the login email is a separate verified flow).

## 8. Testing checklist

- [ ] Register a new account; with email-confirm OFF you're signed straight in, with it ON you see "check your email".
- [ ] Place a **guest** order/reservation with email X, then register/login with X → it appears under the account (linked).
- [ ] Guest checkout still works end-to-end without an account.
- [ ] Track page shows "Create an account" only when signed out.
- [ ] Login/logout; signed-out `/account/*` redirects to `/account/login?next=…`.
- [ ] Edit name/phone; toggle marketing email/SMS → consent rows recorded; reload reflects state.
- [ ] Add/edit/delete an address; set default.
- [ ] Heart a dish in the order modal (logged in) → appears in Favourites; guest heart → prompted to log in.
- [ ] Reorder a past order → cart repopulates at that location's menu.
- [ ] Request data export and account deletion → confirmation shown, `data_requests` row queued (no duplicates).
- [ ] Admin → Customers: search, open a profile, see orders/reservations/consent/addresses.
- [ ] `npx tsc --noEmit` clean · `npm run build` succeeds · public routes still `○ Static`.

## 9. Notes / deferred
- `customers.lifetime_value_pence`/`orders_count` aren't auto-maintained yet; the
  admin profile computes spend from orders on the fly. (Loyalty phase wires the cache.)
- Changing the account email and password reset use Supabase's flows — not surfaced in the UI yet.
- A header "Account" link isn't added (the public navbar is frozen); entry is via
  the post-checkout CTA and `/account`.
- Loyalty, email marketing, advanced CRM: not built (later phases).
