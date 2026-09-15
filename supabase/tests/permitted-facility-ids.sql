-- ============================================================================
-- A ledger read asks the viewer's permission once per query
-- (a_ledger_read_asks_the_permission_once_per_query).
--
--   bun run test:sql permitted-facility-ids
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- The five money ledgers' read policies stopped calling
-- `has_permission(facility_id, …)` per row and match
-- `facility_id in (select private.permitted_facility_ids(…))` instead. That is
-- only safe if the helper gives exactly `has_permission`'s answer, so this file
-- asserts the equivalence rather than the new policy text alone.
--
--   P1  for every real member and every permission the ledgers use, the
--       helper's facilities are exactly the facilities has_permission admits
--   P2  a suspended subscription admits nobody through either
--   P3  a platform admin is admitted to every facility through either
--   P4  no signed-in user is admitted to anything
--   P5  the five ledger read policies use the helper, not a per-row check
--   P6  anon may execute it exactly when anon may execute has_permission
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid, 'role', 'authenticated')::text end, true);
end $$;

-- Facilities has_permission admits, and facilities the helper returns, for the
-- user currently in request.jwt.claims.
create or replace function pg_temp.by_check(p_permission text) returns uuid[] language sql as $$
  select coalesce(array_agg(f.id order by f.id), '{}')
    from public.facilities f
   where private.has_permission(f.id, p_permission);
$$;

create or replace function pg_temp.by_helper(p_permission text) returns uuid[] language sql as $$
  select coalesce(array_agg(id order by id), '{}')
    from (select distinct private.permitted_facility_ids(p_permission) as id) t;
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000009f0010', 'Perm Org', 'perm-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000009f0020', '00000000-0000-0000-0000-0000009f0010',
   'Perm Suspended', 'perm-suspended', 'perm-suspended', 'America/Toronto')
on conflict do nothing;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009f0100', 'perm-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000009f0101', 'perm-admin@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009f0100', 'perm-owner@example.invalid', 'Pia Owner'),
  ('00000000-0000-0000-0000-0000009f0101', 'perm-admin@example.invalid', 'Pat Admin')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009f0020', '00000000-0000-0000-0000-0000009f0100', 'owner')
on conflict do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('00000000-0000-0000-0000-0000009f0101', 'superadmin')
on conflict do nothing;

-- ── P1 ────────────────────────────────────────────────────────────────────
do $$
declare
  v_profile text;
  v_permission text;
  v_mismatch text := '';
  v_pairs int := 0;
begin
  for v_profile in
    select distinct m.profile_id from public.facility_memberships m
     where m.profile_id not in ('00000000-0000-0000-0000-0000009f0100')
  loop
    perform pg_temp.as_user(v_profile);
    foreach v_permission in array array[
      'financial_manage_gift_cards', 'marketing_view', 'financial_view_amounts',
      'view_bookings', 'manage_staff']
    loop
      v_pairs := v_pairs + 1;
      if pg_temp.by_check(v_permission) is distinct from pg_temp.by_helper(v_permission) then
        v_mismatch := v_mismatch || format('%s/%s ', v_profile, v_permission);
      end if;
    end loop;
  end loop;
  perform pg_temp.t('P1  every member, every ledger permission: the same facilities',
    v_mismatch = '' and v_pairs > 0,
    format('pairs=%s mismatches=%s', v_pairs, nullif(v_mismatch, '')));
end $$;

-- ── P2 ────────────────────────────────────────────────────────────────────
do $$
declare v_active_check uuid[]; v_active_helper uuid[]; v_sus_check uuid[]; v_sus_helper uuid[];
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009f0100');
  v_active_check := pg_temp.by_check('financial_view_amounts');
  v_active_helper := pg_temp.by_helper('financial_view_amounts');

  insert into public.facility_subscriptions
    (facility_id, tier_id, tier_name, status, billing_cycle, amount_cents, currency, period_start)
  values
    ('00000000-0000-0000-0000-0000009f0020',
     (select id from public.subscription_tiers order by id limit 1),
     'Perm', 'suspended', 'monthly', 0, 'CAD', now())
  on conflict (facility_id) do update set status = 'suspended';

  v_sus_check := pg_temp.by_check('financial_view_amounts');
  v_sus_helper := pg_temp.by_helper('financial_view_amounts');

  perform pg_temp.t('P2  suspended closes the facility through both; active opens it through both',
    '00000000-0000-0000-0000-0000009f0020' = any(v_active_helper)
      and v_active_check = v_active_helper
      and not ('00000000-0000-0000-0000-0000009f0020' = any(v_sus_helper))
      and v_sus_check = v_sus_helper,
    format('active check=%s helper=%s / suspended check=%s helper=%s',
      v_active_check, v_active_helper, v_sus_check, v_sus_helper));
end $$;

-- ── P3 ────────────────────────────────────────────────────────────────────
do $$
declare v_all int; v_helper int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009f0101');
  select count(*) into v_all from public.facilities;
  select cardinality(pg_temp.by_helper('financial_manage_gift_cards')) into v_helper;
  perform pg_temp.t('P3  a platform admin is admitted everywhere, as by has_permission',
    v_helper = v_all
      and pg_temp.by_check('financial_manage_gift_cards') = pg_temp.by_helper('financial_manage_gift_cards'),
    format('facilities=%s helper=%s', v_all, v_helper));
end $$;

-- ── P4 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.as_user(null);
  perform pg_temp.t('P4  nobody signed in is admitted anywhere',
    cardinality(pg_temp.by_helper('financial_view_amounts')) = 0
      and cardinality(pg_temp.by_check('financial_view_amounts')) = 0,
    format('helper=%s', pg_temp.by_helper('financial_view_amounts')));
end $$;

-- ── P5 ────────────────────────────────────────────────────────────────────
do $$
declare v_bad text;
begin
  select string_agg(c.relname || '.' || pol.polname, ', ') into v_bad
    from (values ('gift_cards', 'gift_cards_read'),
                 ('gift_card_transactions', 'gift_card_transactions_read'),
                 ('loyalty_transactions', 'loyalty_transactions_read'),
                 ('payments', 'payments_read'),
                 ('store_credit_entries', 'store_credit_read')) want(tbl, pol)
    left join pg_class c on c.relname = want.tbl and c.relnamespace = 'public'::regnamespace
    left join pg_policy pol on pol.polrelid = c.oid and pol.polname = want.pol
   where pol.oid is null
      or pg_get_expr(pol.polqual, pol.polrelid) ~ 'has_permission\(\s*facility_id'
      or pg_get_expr(pol.polqual, pol.polrelid) !~ 'permitted_facility_ids';
  perform pg_temp.t('P5  the five ledger reads ask once per query', v_bad is null,
    coalesce(v_bad, ''));
end $$;

-- ── P6 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('P6  anon may execute the helper exactly as it may has_permission',
    has_function_privilege('anon', 'private.permitted_facility_ids(text)', 'execute')
      = has_function_privilege('anon', 'private.has_permission(uuid,text)', 'execute'),
    'grants differ');
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
