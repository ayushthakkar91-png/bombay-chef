# Phase 1 — Admin foundation & menu management

The back-of-house shell and the full menu-data CRUD, built on the existing
Next.js 16 + Supabase stack. The public marketing site is untouched.

> Scope: admin layout, login protection, sidebar, menu dashboard, categories,
> dishes, per-location availability, `price_pence` editing, allergens/dietary,
> image-URL preview, role-based access. **Not** in this phase: ordering,
> reservations, loyalty, CRM, email.

---

## 1. Architecture in one breath

- **Auth**: Supabase Auth (email + password) via `@supabase/ssr`. The `proxy.ts`
  (Next 16's renamed middleware) refreshes the session and bounces signed-out
  visitors off `/admin/*` — **scoped to `/admin` only, so the public site is
  never intercepted**. The real authorisation is the **DAL** (`requireRole`) +
  **Postgres RLS** (migrations 0002/0004). Three layers, defence in depth.
- **Data**: read repositories (`admin-menu.ts`, `admin-locations.ts`) use the
  RLS-enforced session client; writes are Server Actions that re-check role and
  let RLS enforce it again. No service-role needed for menu management.
- **Chrome isolation**: `PublicChrome` renders the marketing navbar/footer/Lenis
  for every route except `/admin`, which gets a bare admin shell.

## 2. Role matrix

| Capability | staff | location_manager | restaurant_manager | super_admin |
|---|:--:|:--:|:--:|:--:|
| View dashboard / menu overview | ✓ | ✓ | ✓ | ✓ |
| Per-location availability | own branch | own branch | all | all |
| Categories CRUD | — | — | ✓ | ✓ |
| Dishes CRUD (price, allergens, …) | — | — | ✓ | ✓ |
| View locations | — | ✓ | ✓ | ✓ |
| Edit locations | — | — | ✓ | ✓ |

Enforced in three places: nav visibility (`AdminShell`), page guards
(`requireRole`), and RLS policies. A `staff` user hitting `/admin/menu/items`
directly is redirected to `/admin?denied=1`.

## 3. Files

### Created — data & auth layer
- `proxy.ts` — admin-only session refresh + optimistic auth gate.
- `src/lib/supabase/clients.ts` — `getUserClient()` (RLS session) + `getServiceClient()`.
- `src/lib/auth/roles.ts` — role ranks + `roleAtLeast` (mirrors SQL `role_at_least`).
- `src/lib/auth/dal.ts` — `getStaffContext`, `requireStaff`, `requireRole`, `can`.
- `src/lib/admin/validation.ts` — `ActionState`, field parsing, pence helpers.
- `src/lib/repositories/admin-menu.ts` — categories, items, allergens reads.
- `src/lib/repositories/admin-locations.ts` — locations + availability matrix reads.

### Created — Server Actions (`src/app/admin/_actions/`)
- `auth.ts` (login/logout) · `categories.ts` · `items.ts` · `availability.ts` · `locations.ts`

### Created — routes (`src/app/admin/`)
- `login/page.tsx`
- `(panel)/layout.tsx` · `(panel)/loading.tsx` · `(panel)/page.tsx` (dashboard)
- `(panel)/menu/page.tsx` · `menu/categories/page.tsx` · `menu/items/page.tsx` · `menu/availability/page.tsx`
- `(panel)/locations/page.tsx`

### Created — components (`src/components/admin/`)
- `AdminShell.tsx` (sidebar + topbar + drawer) · `LoginForm.tsx`
- `primitives.tsx` (Button, SubmitButton, Banner, Field, inputs, Badge, EmptyState, Spinner)
- `ui.tsx` (PageHeader, Panel, Stat, table cells) · `Modal.tsx` (native `<dialog>`)
- `useActionResult.ts` (refresh-on-success hook)
- `CategoriesManager.tsx` · `ItemsManager.tsx` · `AvailabilityManager.tsx` · `LocationsManager.tsx` · `ImageUrlField.tsx`
- `src/components/layout/PublicChrome.tsx`

### Created — Supabase
- `supabase/grant_admin.sql` — bootstrap the first admin role.
- (schema) migrations `0002`–`0008` from the architecture phase.

### Updated
- `src/app/layout.tsx` — delegates chrome to `PublicChrome` (public output identical).
- `src/lib/flags.ts` — added `reservationsV2`, `loyalty`, `marketing` flags.
- `supabase/README.md`, `.env.example` — admin setup notes.

## 4. Database tables used

Reads/writes touch: `menu_categories`, `menu_items` (+ `price_pence`, `image_url`,
`is_signature`, `spice_level`, `dietary`, `calories`), `item_allergens`,
`allergens`, `location_menu_items`, `locations`. Auth reads `auth.users`,
`profiles`, `staff_roles`. All from migrations `0001`, `0002`, `0004`.

## 5. Setup (step by step)

1. **Env**: copy `.env.example` → `.env.local`, fill the three Supabase vars.
2. **Schema**: in Supabase SQL Editor run migrations in order — at minimum
   `0001`, `0002`, `0004` for this phase (see `supabase/README.md`).
3. **Seed menu** (optional): run `supabase/seed.sql`.
4. **Create an admin user**: Supabase → Authentication → Users → Add user
   (Auto Confirm). The `profiles` row is auto-created by the 0002 trigger.
5. **Grant a role**: edit the email in `supabase/grant_admin.sql` and run it.
6. **Run**: `npm run dev`, visit `/admin` → you're redirected to `/admin/login`.

## 6. Environment variables

No new variables beyond the existing three: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. The new
feature-flag vars all default to `false` and are irrelevant to Phase 1.

## 7. Testing checklist

**Public site unaffected**
- [ ] `/`, `/menu`, `/about`, `/locations`, `/reservations` render exactly as before (navbar, footer, smooth scroll, grain, animations).
- [ ] No admin nav/footer leaks onto public pages; no Lenis on `/admin`.

**Auth & protection**
- [ ] Visiting `/admin` while signed out → redirected to `/admin/login?next=/admin`.
- [ ] Wrong password → "Email or password is incorrect."
- [ ] A non-staff (customer) login → "This account doesn't have admin access." and stays signed out (no loop).
- [ ] Valid staff login → lands on the dashboard; refresh keeps the session.
- [ ] Sign out → back to login; `/admin` no longer accessible.
- [ ] `staff`-role user navigating directly to `/admin/menu/items` → `/admin?denied=1`.

**Menu management**
- [ ] Dashboard shows correct counts (categories, dishes, unavailable, locations).
- [ ] Create / edit / delete a category; deleting one with dishes warns first.
- [ ] Create a dish: price `11.55` saves as `1155` pence and shows `£11.55`; invalid price is rejected inline.
- [ ] Edit allergens + dietary; reopen the dish and they persist.
- [ ] Image URL shows a live preview; a broken URL shows the fallback, not a broken box.
- [ ] Toggle a dish's availability from the table; the row reflects it.
- [ ] Per-location availability: toggling a cell 86's the dish at one branch only; a faint switch = default.
- [ ] A location-scoped manager can only toggle their own branch (others are locked).

**States**
- [ ] Empty states show when there are no categories / dishes / locations.
- [ ] Validation errors render under the relevant field; success shows a banner; the list refreshes without a full reload.
- [ ] Navigation shows the loading skeleton.

**Build**
- [ ] `npx tsc --noEmit` clean · `npm run lint` clean · `npm run build` succeeds.

## 8. Deliberately deferred (note for Phase 2+)
- Audit-log writes on admin mutations (table exists in 0002; wire via service client).
- Binary image upload to Supabase Storage (Phase 1 stores an external URL).
- Drag-and-drop reordering (sort order is editable as a number for now).
- Zod validation (kept dependency-free here; recommended once added to deps).
