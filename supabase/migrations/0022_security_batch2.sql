-- Bombay Bicycle Chef — 0022 security batch 2 (F4, F5, F7-adjacent, F8).
-- Stacks on 0021. Append-only. NOT applied automatically — run on staging first,
-- run `supabase test db`, then apply to production with explicit approval.
--
-- Contents (appended by plan tasks):
--   F8  loyalty double-earn        — unique index on loyalty_ledger(order_id, reason)
--   F5  atomic promo single-use    — reserve_promo / release_promo RPCs + sync trigger

-- ============================================================================
-- F8: prevent loyalty double-earn / double-reversal on webhook retries.
-- NULL order_id rows (redeem/adjustment/birthday) stay unconstrained because
-- NULLs are distinct in a unique index — only order-linked rows are capped.
-- ============================================================================
create unique index if not exists loyalty_ledger_order_reason_uidx
  on loyalty_ledger (order_id, reason)
  where order_id is not null;

-- ============================================================================
-- F5: atomic single-use / per-customer / first-order promo enforcement.
-- The row lock on promo_codes serialises concurrent checkouts, so a
-- global_limit=N code can never be reserved more than N times. The
-- promo_redemptions row is the source of truth; used_count is display only.
-- reserve_promo raises SQLSTATE 23514 (check_violation) when a cap is hit.
-- ============================================================================
create or replace function reserve_promo(
  p_promo_id uuid, p_order_id uuid, p_customer_id uuid
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_global   int;
  v_per_cust int;
  v_first    boolean;
  v_used     int;
  v_by_cust  int;
  v_prior    int;
begin
  select global_limit, per_customer_limit, first_order_only
    into v_global, v_per_cust, v_first
    from promo_codes where id = p_promo_id for update;   -- lock serialises concurrent reserves
  if not found then
    raise exception 'unknown promo' using errcode = 'check_violation';
  end if;

  select count(*) into v_used from promo_redemptions where promo_id = p_promo_id;
  if v_global is not null and v_used >= v_global then
    raise exception 'promo global limit reached' using errcode = 'check_violation';
  end if;

  if p_customer_id is not null then
    select count(*) into v_by_cust
      from promo_redemptions where promo_id = p_promo_id and customer_id = p_customer_id;
    if v_per_cust is not null and v_by_cust >= v_per_cust then
      raise exception 'promo per-customer limit reached' using errcode = 'check_violation';
    end if;
    if v_first then
      select count(*) into v_prior
        from orders where customer_id = p_customer_id and status <> 'pending_payment';
      if v_prior > 0 then
        raise exception 'promo is first-order only' using errcode = 'check_violation';
      end if;
    end if;
  end if;

  insert into promo_redemptions (promo_id, order_id, customer_id)
    values (p_promo_id, p_order_id, p_customer_id);
end $$;

-- Free a code when a checkout fails before payment, or an order is cancelled.
create or replace function release_promo(p_order_id uuid) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  delete from promo_redemptions where order_id = p_order_id;
end $$;

revoke execute on function reserve_promo(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function release_promo(uuid) from public, anon, authenticated;

-- Belt-and-braces: one redemption per (promo, order).
create unique index if not exists promo_redemptions_promo_order_uidx
  on promo_redemptions (promo_id, order_id);

-- Keep promo_codes.used_count in sync with redemptions (display only; the cap is
-- enforced by reserve_promo above, not by this counter).
create or replace function sync_promo_used_count() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update promo_codes p set used_count = (
    select count(*) from promo_redemptions r where r.promo_id = p.id
  ) where p.id = coalesce(new.promo_id, old.promo_id);
  return null;
end $$;
drop trigger if exists promo_redemptions_count on promo_redemptions;
create trigger promo_redemptions_count
  after insert or delete on promo_redemptions
  for each row execute function sync_promo_used_count();
revoke execute on function sync_promo_used_count() from public, anon, authenticated;
