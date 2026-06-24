-- Bombay Bicycle Chef — 0018 Supabase security-linter hardening (resilient)
--
-- Pure security hardening: no schema/data/feature/RLS-policy changes.
-- Self-guarding — every statement skips objects that don't exist, so it runs
-- cleanly whether or not the SaaS migration (0017) was applied.
-- Requires Postgres 15+ for the view's security_invoker option.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1) current_consent view → evaluate with the querying user's RLS, not the owner's.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('public.current_consent') is not null then
    execute 'alter view public.current_consent set (security_invoker = true)';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Pin a non-mutable search_path on every helper/trigger function that exists.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  fn text;
  sigs text[] := array[
    'public.set_updated_at()',
    'public.handle_new_user()',
    'public.role_rank(text)',
    'public.current_role_rank(uuid)',
    'public.is_staff()',
    'public.role_at_least(text, uuid)',
    'public.loyalty_apply_ledger()',
    'public.orders_guard_status()',
    'public.reservations_guard_status()',
    'public.is_platform_admin()',
    'public.is_tenant_member(uuid)',
    'public.current_tenant_id()'
  ];
begin
  foreach fn in array sigs loop
    if to_regprocedure(fn) is not null then
      execute format('alter function %s set search_path = public, pg_temp', fn);
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Revoke anon/authenticated RPC reach on internal-only / trigger functions.
--    (Owner keeps EXECUTE, so the SECURITY DEFINER call-chain + triggers still work.)
--    The RLS-referenced helpers — role_at_least, is_staff, is_platform_admin,
--    is_tenant_member — are intentionally NOT in this list; they must stay executable
--    by the querying role or policies would error.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  fn text;
  sigs text[] := array[
    'public.role_rank(text)',
    'public.current_role_rank(uuid)',
    'public.current_tenant_id()',
    'public.handle_new_user()',
    'public.set_updated_at()',
    'public.loyalty_apply_ledger()',
    'public.orders_guard_status()',
    'public.reservations_guard_status()'
  ];
begin
  foreach fn in array sigs loop
    if to_regprocedure(fn) is not null then
      execute format('revoke execute on function %s from public, anon, authenticated', fn);
    end if;
  end loop;
end $$;

-- Unchanged on purpose: notifications (deny-all, server-only). Leaked-password
-- protection is an Auth setting — enable it manually in the Dashboard.
