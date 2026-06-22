# Supabase setup (Phase 2 — connect the live database)

Until this is done, the site runs fine on the bundled seed data (`src/data/menu.ts`).
Connecting Supabase makes the menu (and later locations, orders, customers)
editable without code.

## 1. Create the project
1. Sign up at [supabase.com](https://supabase.com) and create a new project.
2. Project Settings → API. Copy the **Project URL**, the **anon public** key, and
   the **service_role** key.

## 2. Add the env vars
Create `.env.local` (copy from `.env.example`) and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Add the same three to the Vercel project (Settings → Environment Variables) for
production.

## 3. Create the schema
In the Supabase dashboard → SQL Editor, paste and run
[`migrations/0001_init.sql`](./migrations/0001_init.sql).

## 4. Seed the menu
In the SQL Editor, paste and run [`seed.sql`](./seed.sql). It loads the current
menu into the tables (safe to re-run). After that, edit the menu from the
Supabase **Table Editor** and the live site updates within ~60s.

## How it fits together
- `src/lib/supabase/server.ts` — public read-only client (returns `null` when env
  is absent → seed fallback).
- `src/lib/repositories/menu.ts` — `getMenu()`: Supabase when connected, else seed,
  with error fallback so the menu never renders empty.
- Row Level Security: anon can **read**; writes require the service role key.
