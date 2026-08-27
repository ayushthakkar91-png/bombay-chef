# Database / RLS regression tests

These are pgTAP tests that exercise Row-Level Security by impersonating real
roles (`authenticated` + a JWT-claims GUC), exactly as PostgREST does per request.
They are the correct layer to prove RLS behaviour — the same boundary a client
hits when calling `/rest/v1` directly with the public anon key.

## Running

Requires the Supabase CLI **and Docker** (the local Postgres runs in a container):

```bash
supabase start          # boots local Postgres + applies migrations
supabase test db         # runs every *_test.sql under supabase/tests/
```

To reset to a clean, fully-migrated DB first:

```bash
supabase db reset        # re-applies all migrations (0001 … 0021) + seed
supabase test db
```

## Files

- `rls_batch1_test.sql` — security batch 1:
  - **F2** — a customer cannot UPDATE protected `customers` columns or DELETE the
    row (self-READ only), and cannot read another customer's row.
  - **F3** — a customer cannot INSERT / UPDATE / DELETE `reservations`, and
    cannot read another customer's booking (self-READ only).
  - **F10 (reproduction)** — asserts that a staff status change currently ERRORS
    because the status-history trigger cannot insert under the authenticated
    role. This assertion is expected to PASS today (bug present); replace it with
    a `lives_ok(...)` assertion once the proposed 0022 trigger fix is applied.

## Note on this environment

At authoring time these tests were **written but not executed** — the dev
environment had no Docker, local Postgres, or `psql`, and the only live Supabase
project is production (which must not be used for tests). Run the commands above
against a local instance to execute them. The `auth.users` fixture columns are
the common Supabase set; if your local auth schema differs, adjust the fixture
INSERT accordingly.

## Direct-PostgREST check (optional, needs a running instance)

The pgTAP tests prove RLS at the SQL layer. To additionally prove it end-to-end
through the REST API with a real customer JWT, point a short script at a local /
staging instance:

```
GET/PATCH {SUPABASE_URL}/rest/v1/customers?id=eq.<self>
  apikey: <anon key>            Authorization: Bearer <customer access_token>
  body: { "lifetime_value_pence": 999999 }
  → expect 0 rows updated / 403; then GET proves the value is unchanged.
```

Never run this against production.
