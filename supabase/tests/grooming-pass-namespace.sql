-- ============================================================================
-- A grooming pass names a grooming service (20260806580000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-pass-namespace.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE PASS IS SPENDABLE (N1). The positive control, and the whole point: a
--    pool created from a portal package now names an id the grooming counter
--    can resolve. Every other assertion here is a deny, and a file of denies
--    proves only that nothing works.
--
-- 2. THE NAMESPACE CANNOT DRIFT BACK (N2/N3). An `srv-*` id is refused on
--    insert AND on update. Without the update arm, an existing line could be
--    edited back into the unspendable state the migration just left.
--
-- 3. THE RULE IS PER FACILITY (N4). `grooming_services.legacy_id` is unique per
--    facility, not globally. A line naming another facility's service is not
--    redeemable at this one and is refused.
--
-- 4. OTHER MODULES ARE LEFT ALONE (N5). Boarding, daycare and training have no
--    catalogue in Postgres yet and still carry `srv-*` ids. If the trigger
--    caught those it would take the whole portal shop down with it.
--
-- 5. THE SNAPSHOT IS NOT CONSTRAINED (N6). `customer_package_lines` is what
--    somebody bought. A pass already sold must survive its service being
--    retired from the menu, so the guard is on the catalogue only.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001a0010', 'NS Org', 'ns-org')
on conflict do nothing;

-- Two facilities, because the rule is per facility and N4 needs a second one.
insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001a0020', '00000000-0000-0000-0000-0000001a0010',
   'Salon A', 'ns-a', 'ns-a'),
  ('00000000-0000-0000-0000-0000001a0021', '00000000-0000-0000-0000-0000001a0010',
   'Salon B', 'ns-b', 'ns-b')
on conflict do nothing;

insert into public.grooming_services
  (id, facility_id, legacy_id, name, base_price, duration_min)
values
  ('00000000-0000-0000-0000-0000001a0060', '00000000-0000-0000-0000-0000001a0020',
   'ns-bath', 'Basic Bath', 35, 60),
  -- B's own service. A's packages must not be able to name it.
  ('00000000-0000-0000-0000-0000001a0061', '00000000-0000-0000-0000-0000001a0021',
   'ns-only-at-b', 'Bath at B', 35, 60);

insert into public.prepaid_packages
  (id, facility_id, legacy_id, name, package_price, validity_days)
values
  ('00000000-0000-0000-0000-0000001a0070', '00000000-0000-0000-0000-0000001a0020',
   'ns-pkg-1', 'Bath Pack', 140, 365);

-- ── N1: a grooming pool names something the counter can resolve ────────────
do $$
declare v_matches boolean;
begin
  insert into public.prepaid_package_lines
    (package_id, service_id, service_name, quantity, price_per_session, module)
  values ('00000000-0000-0000-0000-0000001a0070', 'ns-bath', 'Basic Bath',
          4, 35, 'grooming');

  -- The question the counter asks when a pass is offered against an
  -- appointment: does this pool name a service I have?
  select exists (
    select 1
      from public.prepaid_package_lines l
      join public.prepaid_packages p on p.id = l.package_id
      join public.grooming_services g
        on g.facility_id = p.facility_id
       and g.legacy_id = l.service_id
     where l.package_id = '00000000-0000-0000-0000-0000001a0070'
  ) into v_matches;

  perform pg_temp.t('N1  a grooming pass names a service the counter can resolve',
    v_matches, format('resolves=%s', v_matches));
exception when others then
  perform pg_temp.t('N1  pass is spendable', false, sqlerrm);
end $$;

-- ── N2: an srv-* id is refused on insert ───────────────────────────────────
--
-- The exact row the portal seed used to write, and the reason a bought pass sat
-- unspendable: the counter looks for `ns-bath` and the pool said `srv-005`.
do $$
declare v_raised boolean; v_message text;
begin
  begin
    insert into public.prepaid_package_lines
      (package_id, service_id, service_name, quantity, price_per_session, module)
    values ('00000000-0000-0000-0000-0000001a0070', 'srv-005', 'Bath & Brush',
            1, 40, 'grooming');
    v_raised := false;
  exception when others then v_raised := true; v_message := sqlerrm; end;

  perform pg_temp.t('N2  a grooming line cannot name a service from the other catalogue',
    v_raised and v_message like '%srv-005%',
    format('raised=%s message=%s', v_raised, coalesce(v_message, '-')));
exception when others then
  perform pg_temp.t('N2  srv-* refused on insert', false, sqlerrm);
end $$;

-- ── N3: and cannot be edited back into it ──────────────────────────────────
--
-- The arm that is easy to forget. A BEFORE INSERT trigger alone would let the
-- good row from N1 be updated straight back to `srv-005`.
do $$
declare v_raised boolean; v_after text;
begin
  begin
    update public.prepaid_package_lines
       set service_id = 'srv-005'
     where package_id = '00000000-0000-0000-0000-0000001a0070';
    v_raised := false;
  exception when others then v_raised := true; end;

  select service_id into v_after
    from public.prepaid_package_lines
   where package_id = '00000000-0000-0000-0000-0000001a0070'
   limit 1;

  perform pg_temp.t('N3  an existing grooming line cannot be edited back to srv-*',
    v_raised and v_after = 'ns-bath',
    format('raised=%s service_id=%s', v_raised, v_after));
exception when others then
  perform pg_temp.t('N3  srv-* refused on update', false, sqlerrm);
end $$;

-- ── N4: another facility's service is not this facility's to sell ──────────
do $$
declare v_raised boolean;
begin
  begin
    insert into public.prepaid_package_lines
      (package_id, service_id, service_name, quantity, price_per_session, module)
    values ('00000000-0000-0000-0000-0000001a0070', 'ns-only-at-b', 'Bath at B',
            1, 35, 'grooming');
    v_raised := false;
  exception when others then v_raised := true; end;

  perform pg_temp.t('N4  a package cannot sell passes for another facility''s service',
    v_raised, format('raised=%s', v_raised));
exception when others then
  perform pg_temp.t('N4  cross-facility service', false, sqlerrm);
end $$;

-- ── N5: the modules with no Postgres catalogue are untouched ───────────────
--
-- Boarding, daycare and training still key on `srv-*` because there is nowhere
-- else for them to point yet. A trigger that caught them would empty the shop.
do $$
declare v_written integer;
begin
  insert into public.prepaid_package_lines
    (package_id, service_id, service_name, quantity, price_per_session, module)
  values ('00000000-0000-0000-0000-0000001a0070', 'srv-001', 'Standard Boarding',
          2, 45, 'boarding');

  select count(*) into v_written
    from public.prepaid_package_lines
   where package_id = '00000000-0000-0000-0000-0000001a0070'
     and module = 'boarding';

  perform pg_temp.t('N5  a boarding line still keys on srv-*, as it must',
    v_written = 1, format('boarding lines=%s', v_written));
exception when others then
  perform pg_temp.t('N5  other modules untouched', false, sqlerrm);
end $$;

-- ── N6: what somebody already bought is not re-judged ──────────────────────
--
-- customer_package_lines is a snapshot. If the guard reached it, retiring a
-- service from the menu would break every pass already sold against it.
do $$
declare v_written integer;
begin
  insert into public.clients (id, facility_id, name, email) values
    ('00000000-0000-0000-0000-0000001a0040', '00000000-0000-0000-0000-0000001a0020',
     'Buyer', 'ns-buyer@example.invalid');

  insert into public.customer_packages
    (id, facility_id, client_id, package_id, package_name, price_paid, purchased_at, expires_at)
  values
    ('00000000-0000-0000-0000-0000001a0080', '00000000-0000-0000-0000-0000001a0020',
     '00000000-0000-0000-0000-0000001a0040', '00000000-0000-0000-0000-0000001a0070',
     'Bath Pack', 140, now(), now() + interval '365 days');

  -- A service that no longer exists in the catalogue at all.
  insert into public.customer_package_lines
    (customer_package_id, service_id, service_name, passes_total, module)
  values ('00000000-0000-0000-0000-0000001a0080', 'ns-retired', 'Retired Bath',
          4, 'grooming');

  select count(*) into v_written
    from public.customer_package_lines
   where customer_package_id = '00000000-0000-0000-0000-0000001a0080';

  perform pg_temp.t('N6  a pass already sold survives its service leaving the menu',
    v_written = 1, format('snapshot lines=%s', v_written));
exception when others then
  perform pg_temp.t('N6  snapshot not constrained', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
