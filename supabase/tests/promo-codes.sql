-- ============================================================================
-- A promo code is a row, and using one is a row too (20260911173538).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/promo-codes.sql
--
-- One transaction, rolled back. Impersonated through request.jwt.claims and
-- `set local role`, never the connection's own role, which bypasses RLS.
--
--   P1  the owner creates a code, stored upper case        (positive control)
--   P2  reception, who takes sales, cannot write the price list
--   P3  reception applies a code: 10% of $100 capped at $8 comes off the bill
--   P4  the same code twice on one bill is refused
--   P5  a code with one use left is used up by the first bill
--   P6  deleting the line gives the use back
--   P7  a code outside its dates is refused
--   P8  a code for grooming does not discount daycare
--   P9  the client cannot apply a code to their own bill
--   P10 anon can neither run the function nor read either table
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

-- Runs the redemption as a user and reports what came back: the amount, or
-- the refusal's HINT (its reason), or its SQLSTATE.
create or replace function pg_temp.redeem(p_uid uuid, p_booking uuid, p_code text)
returns text language plpgsql as $$
declare v_out jsonb; v_hint text; v_state text;
begin
  perform pg_temp.as_user(p_uid);
  set local role authenticated;
  begin
    v_out := public.redeem_promo_code(p_booking, p_code);
    reset role;
    return 'ok:' || (v_out->>'amount');
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_state = returned_sqlstate;
    reset role;
    return coalesce(nullif(v_hint, ''), v_state);
  end;
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002b9001', 'pc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002b9002', 'pc-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000002b9003', 'pc-customer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002b9001', 'pc-owner@example.invalid', 'PC Owner'),
  ('00000000-0000-0000-0000-0000002b9002', 'pc-recep@example.invalid', 'PC Reception'),
  ('00000000-0000-0000-0000-0000002b9003', 'pc-customer@example.invalid', 'PC Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002b9010', 'PC Org', 'pc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002b9020', '00000000-0000-0000-0000-0000002b9010',
   'PC Facility', 'pc-fac', 'pc-fac')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002b9030', '00000000-0000-0000-0000-0000002b9020',
   '00000000-0000-0000-0000-0000002b9001', 'owner', true),
  ('00000000-0000-0000-0000-0000002b9031', '00000000-0000-0000-0000-0000002b9020',
   '00000000-0000-0000-0000-0000002b9002', 'reception', true)
on conflict (id) do nothing;

-- Reception takes sales and nothing else.
delete from public.membership_permissions
 where membership_id = '00000000-0000-0000-0000-0000002b9031';
insert into public.membership_permissions (membership_id, permission_key, scope)
values ('00000000-0000-0000-0000-0000002b9031', 'retail_process_sale', 'anytime');

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000002b9040', '00000000-0000-0000-0000-0000002b9020',
   'PC Household', 'pc-c1@example.invalid', '00000000-0000-0000-0000-0000002b9003');

-- Three $100 bills: grooming, grooming, daycare.
insert into public.bookings (id, facility_id, client_id, service, start_at, end_at,
                             base_price, total_cost, status) values
  ('00000000-0000-0000-0000-0000002b9050', '00000000-0000-0000-0000-0000002b9020',
   '00000000-0000-0000-0000-0000002b9040', 'grooming', now() + interval '1 day',
   now() + interval '1 day 2 hours', 100, 100, 'confirmed'),
  ('00000000-0000-0000-0000-0000002b9051', '00000000-0000-0000-0000-0000002b9020',
   '00000000-0000-0000-0000-0000002b9040', 'grooming', now() + interval '2 days',
   now() + interval '2 days 2 hours', 100, 100, 'confirmed'),
  ('00000000-0000-0000-0000-0000002b9052', '00000000-0000-0000-0000-0000002b9020',
   '00000000-0000-0000-0000-0000002b9040', 'daycare', now() + interval '3 days',
   now() + interval '3 days 8 hours', 100, 100, 'confirmed');

-- ── P1: the owner creates codes ─────────────────────────────────────────────
do $$
declare v_code text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b9001');
  set local role authenticated;
  insert into public.promo_codes
    (facility_id, code, discount_type, discount_value, max_discount, applies_to)
  values
    ('00000000-0000-0000-0000-0000002b9020', 'SPRING10', 'percentage', 10, 8, '{grooming}');
  insert into public.promo_codes
    (facility_id, code, discount_type, discount_value, usage_limit)
  values ('00000000-0000-0000-0000-0000002b9020', 'ONCE5', 'fixed', 5, 1);
  insert into public.promo_codes
    (facility_id, code, discount_type, discount_value, valid_until)
  values ('00000000-0000-0000-0000-0000002b9020', 'OLD20', 'fixed', 20, current_date - 3);
  update public.promo_codes set code = 'spring10'
   where facility_id = '00000000-0000-0000-0000-0000002b9020' and code = 'SPRING10';
  reset role;
  select code into v_code from public.promo_codes
   where facility_id = '00000000-0000-0000-0000-0000002b9020' and discount_value = 10;
  perform pg_temp.t('P1  the owner creates a code, stored upper case',
    v_code = 'SPRING10', format('code=%s', v_code));
exception when others then
  reset role; perform pg_temp.t('P1  owner creates', false, sqlerrm);
end $$;

-- ── P2: reception cannot write the price list ───────────────────────────────
do $$
declare v_raised boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b9002');
  set local role authenticated;
  begin
    insert into public.promo_codes (facility_id, code, discount_type, discount_value)
    values ('00000000-0000-0000-0000-0000002b9020', 'MINE100', 'percentage', 100);
    v_raised := false;
  exception when insufficient_privilege then v_raised := true; end;
  reset role;
  perform pg_temp.t('P2  reception cannot create a code', v_raised,
    format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('P2  reception refused', false, sqlerrm);
end $$;

-- ── P3: reception applies a code; the bill comes down ──────────────────────
do $$
declare v_out text; v_due numeric; v_uses integer;
begin
  v_out := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9050', ' spring10 ');
  select amount_due into v_due from public.bookings
   where id = '00000000-0000-0000-0000-0000002b9050';
  select count(*) into v_uses from public.promo_code_redemptions
   where booking_id = '00000000-0000-0000-0000-0000002b9050';
  perform pg_temp.t('P3  10% of $100, capped at $8, comes off the bill',
    v_out = 'ok:8.00' and v_due = 92 and v_uses = 1,
    format('out=%s due=%s uses=%s', v_out, v_due, v_uses));
end $$;

-- ── P4: not twice on one bill ───────────────────────────────────────────────
do $$
declare v_out text;
begin
  v_out := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9050', 'SPRING10');
  perform pg_temp.t('P4  the same code twice on one bill is refused',
    v_out = 'promo_already_applied', format('out=%s', v_out));
end $$;

-- ── P5: one use, used ───────────────────────────────────────────────────────
do $$
declare v_first text; v_second text;
begin
  v_first := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9050', 'ONCE5');
  v_second := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9051', 'ONCE5');
  perform pg_temp.t('P5  a code with one use is used up by the first bill',
    v_first = 'ok:5.00' and v_second = 'promo_used_up',
    format('first=%s second=%s', v_first, v_second));
end $$;

-- ── P6: deleting the line gives the use back ────────────────────────────────
do $$
declare v_line uuid; v_again text;
begin
  select line_item_id into v_line from public.promo_code_redemptions
   where code = 'ONCE5' and booking_id = '00000000-0000-0000-0000-0000002b9050';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b9001');
  set local role authenticated;
  delete from public.booking_line_items where id = v_line;
  reset role;
  v_again := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9051', 'ONCE5');
  perform pg_temp.t('P6  deleting the line gives the use back',
    v_again = 'ok:5.00', format('again=%s', v_again));
exception when others then
  reset role; perform pg_temp.t('P6  use given back', false, sqlerrm);
end $$;

-- ── P7 and P8: outside its dates; the wrong service ─────────────────────────
do $$
declare v_old text; v_wrong text;
begin
  v_old := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9052', 'OLD20');
  v_wrong := pg_temp.redeem('00000000-0000-0000-0000-0000002b9002',
    '00000000-0000-0000-0000-0000002b9052', 'SPRING10');
  perform pg_temp.t('P7  a code outside its dates is refused',
    v_old = 'promo_expired', format('out=%s', v_old));
  perform pg_temp.t('P8  a grooming code does not discount daycare',
    v_wrong = 'promo_wrong_service', format('out=%s', v_wrong));
end $$;

-- ── P9: the client cannot discount their own bill ───────────────────────────
do $$
declare v_out text; v_uses integer;
begin
  v_out := pg_temp.redeem('00000000-0000-0000-0000-0000002b9003',
    '00000000-0000-0000-0000-0000002b9052', 'ONCE5');
  select count(*) into v_uses from public.promo_code_redemptions
   where booking_id = '00000000-0000-0000-0000-0000002b9052';
  perform pg_temp.t('P9  the client cannot apply a code to their own bill',
    v_out = 'promo_not_allowed' and v_uses = 0,
    format('out=%s uses=%s', v_out, v_uses));
end $$;

-- ── P10: anon holds nothing ─────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('P10 anon cannot run redeem_promo_code',
    not has_function_privilege('anon', 'public.redeem_promo_code(uuid, text)', 'execute'));
  perform pg_temp.t('P10 anon reads neither table',
    not has_table_privilege('anon', 'public.promo_codes', 'select')
      and not has_table_privilege('anon', 'public.promo_code_redemptions', 'select'));
end $$;

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
