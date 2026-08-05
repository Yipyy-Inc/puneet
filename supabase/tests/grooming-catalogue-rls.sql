-- ============================================================================
-- Grooming catalogue — RLS and write-integrity tests for 20260805100000.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/grooming-catalogue-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- TWO FACILITIES, because isolation is untestable with one. Salon A and Salon B
-- are unrelated businesses that both sell a service called "Full Groom" with
-- the same legacy_id — which is the realistic case (the legacy ids come from a
-- shared mock) and the one where a missing facility predicate does not merely
-- leak a row, it shows a manager somebody else's prices under their own
-- service's name.
--
-- FOUR CALLERS, one per thing that can go wrong:
--
--   owner    — view_services + manage_services + manage_rates. Writes.
--   recep    — view_services only. Reads, writes nothing (T8), and is the
--              caller used to prove the two-key split is real (T7).
--   client   — a CLIENT of Salon A, no membership anywhere. The online booking
--              page needs them to see the menu; nothing else.
--   rival    — owner of Salon B. Must see none of Salon A (T1).
--
-- TO CONFIRM THESE FAIL WITHOUT THE MIGRATION: drop the policies and re-run —
-- T1/T3/T4/T7/T8 go green-to-red. Drop the triggers instead and T5/T6 do.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f0001', 'gr-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000000f0002', 'gr-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000000f0003', 'gr-client@example.invalid'),
  ('00000000-0000-0000-0000-0000000f0004', 'gr-rival@example.invalid')
on conflict (id) do nothing;

-- `do update`, not `do nothing`: a trigger on auth.users creates the profile
-- row first, so `do nothing` would silently leave full_name null and any test
-- reading a name would pass for the wrong reason.
insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000f0001', 'gr-owner@example.invalid',  'Owner'),
  ('00000000-0000-0000-0000-0000000f0002', 'gr-recep@example.invalid',  'Reception'),
  ('00000000-0000-0000-0000-0000000f0003', 'gr-client@example.invalid', 'Client'),
  ('00000000-0000-0000-0000-0000000f0004', 'gr-rival@example.invalid',  'Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000f0010', 'GR Org',    'gr-org'),
  ('00000000-0000-0000-0000-0000000f0011', 'Rival Org', 'gr-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000f0020', '00000000-0000-0000-0000-0000000f0010',
   'Salon A', 'gr-salon-a', 'gr-a'),
  ('00000000-0000-0000-0000-0000000f0021', '00000000-0000-0000-0000-0000000f0011',
   'Salon B', 'gr-salon-b', 'gr-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000f0030', '00000000-0000-0000-0000-0000000f0020',
   '00000000-0000-0000-0000-0000000f0001', 'owner',     true),
  ('00000000-0000-0000-0000-0000000f0031', '00000000-0000-0000-0000-0000000f0020',
   '00000000-0000-0000-0000-0000000f0002', 'reception', true),
  ('00000000-0000-0000-0000-0000000f0032', '00000000-0000-0000-0000-0000000f0021',
   '00000000-0000-0000-0000-0000000f0004', 'owner',     true)
on conflict (id) do nothing;

-- A client of Salon A. `profile_id` is what private.client_facility_ids() reads.
insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000000f0040', '00000000-0000-0000-0000-0000000f0020',
   'Client', 'gr-client@example.invalid', '00000000-0000-0000-0000-0000000f0003');

-- Salon A: one live service and one DRAFT. The draft is the point of T3.
insert into public.grooming_services
  (id, facility_id, legacy_id, name, base_price, duration_min, is_active)
values
  ('00000000-0000-0000-0000-0000000f0050', '00000000-0000-0000-0000-0000000f0020',
   'groom-pkg-001', 'Full Groom', 80, 90, true),
  ('00000000-0000-0000-0000-0000000f0051', '00000000-0000-0000-0000-0000000f0020',
   'groom-pkg-002', 'Secret New Service', 999, 60, false),
  ('00000000-0000-0000-0000-0000000f0052', '00000000-0000-0000-0000-0000000f0021',
   'groom-pkg-001', 'Rival Full Groom', 75, 90, true);

insert into public.grooming_add_ons
  (id, facility_id, legacy_id, name, price, duration_min)
values
  ('00000000-0000-0000-0000-0000000f0060', '00000000-0000-0000-0000-0000000f0020',
   'ao-teeth', 'Teeth Brushing', 12, 10),
  ('00000000-0000-0000-0000-0000000f0061', '00000000-0000-0000-0000-0000000f0021',
   'ao-rival', 'Rival Add-on', 9, 5);

-- ── T0: the fixture is real ─────────────────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', '', true);
  select count(*) into c from public.grooming_services;
  perform pg_temp.t('T0  fixture: 3 services across 2 facilities', c = 3,
    format('services=%s', c));
end $$;

-- ── T1: facility isolation ──────────────────────────────────────────────────
do $$
declare c integer; nm text;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0004', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), min(name) into c, nm from public.grooming_services;
  reset role;
  perform pg_temp.t('T1  a rival facility sees ONLY its own menu',
    c = 1 and nm = 'Rival Full Groom', format('count=%s name=%s', c, nm));
exception when others then
  reset role; perform pg_temp.t('T1  isolation', false, sqlerrm);
end $$;

-- ── T2: staff see drafts ────────────────────────────────────────────────────
-- Arms T3: without this, T3's "client sees 1" could mean the draft is invisible
-- to everyone, which would be a different bug wearing the same result.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into c from public.grooming_services;
  reset role;
  perform pg_temp.t('T2  staff see their own menu INCLUDING drafts', c = 2,
    format('count=%s', c));
exception when others then
  reset role; perform pg_temp.t('T2  staff read', false, sqlerrm);
end $$;

-- ── T3: the client branch — ACTIVE ONLY ─────────────────────────────────────
-- A customer seeing a draft would be offered something they cannot book, at a
-- price the facility has not committed to.
do $$
declare c integer; nm text; drafts integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*), min(name) into c, nm from public.grooming_services;
  select count(*) into drafts from public.grooming_services where not is_active;
  reset role;
  perform pg_temp.t('T3  a CLIENT sees active services only, never the draft',
    c = 1 and nm = 'Full Groom' and drafts = 0,
    format('visible=%s name=%s drafts=%s', c, nm, drafts));
exception when others then
  reset role; perform pg_temp.t('T3  client read', false, sqlerrm);
end $$;

-- ── T4: a client writes nothing ─────────────────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_services (facility_id, name, base_price, duration_min)
    values ('00000000-0000-0000-0000-0000000f0020', 'Free Groom', 0, 60);
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T4  a client cannot add a service (or price one at $0)', ok);
exception when others then
  reset role; perform pg_temp.t('T4  client write', false, sqlerrm);
end $$;

-- ── T5: facility_id is DERIVED, not accepted ────────────────────────────────
-- The caller sends Salon B's id on a row whose parent is Salon A's. RLS gates
-- ROWS, so nothing about the policy stops that: the trigger has to.
do $$
declare got uuid;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price)
  values ('00000000-0000-0000-0000-0000000f0050',
          '00000000-0000-0000-0000-0000000f0021',   -- a lie
          'large', 95);
  reset role;
  select facility_id into got from public.grooming_service_size_prices
   where size_label = 'large';
  perform pg_temp.t('T5  a size price cannot be filed under another facility',
    got = '00000000-0000-0000-0000-0000000f0020',
    format('stored=%s (caller sent Salon B)', got));
exception when others then
  reset role; perform pg_temp.t('T5  facility derivation', false, sqlerrm);
end $$;

-- ── T6: cross-facility add-on ───────────────────────────────────────────────
-- The FK only says the add-on EXISTS. Without the second trigger a facility
-- could attach a competitor's add-on and read its name and price off their own
-- service.
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_service_default_add_ons (service_id, add_on_id, facility_id)
    values ('00000000-0000-0000-0000-0000000f0050',
            '00000000-0000-0000-0000-0000000f0061',   -- Salon B's add-on
            '00000000-0000-0000-0000-0000000f0020');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T6  cannot attach ANOTHER facility''s add-on to your service', ok);
exception when others then
  reset role; perform pg_temp.t('T6  cross-facility add-on', false, sqlerrm);
end $$;

-- ── T6b: …and the same call with your OWN add-on works ──────────────────────
-- Without this, T6 would pass against a schema that rejects every add-on rule.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  insert into public.grooming_service_default_add_ons (service_id, add_on_id, facility_id)
  values ('00000000-0000-0000-0000-0000000f0050',
          '00000000-0000-0000-0000-0000000f0060',
          '00000000-0000-0000-0000-0000000f0020');
  select count(*) into c from public.grooming_service_default_add_ons;
  reset role;
  perform pg_temp.t('T6b …but your OWN add-on attaches fine (T6 is not vacuous)',
    c = 1, format('rules=%s', c));
exception when others then
  reset role; perform pg_temp.t('T6b  same-facility add-on', false, sqlerrm);
end $$;

-- ── T7: the two-key split is REAL ───────────────────────────────────────────
-- No role PRESET separates manage_services from manage_rates (owner/admin/
-- manager hold both, reception neither) — checked, not assumed. The split is
-- still meaningful because the layers above the preset can grant one without
-- the other, and this proves it end to end rather than asserting it.
do $$
declare added boolean; priced boolean;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.membership_permissions (membership_id, permission_key, scope)
  values ('00000000-0000-0000-0000-0000000f0031', 'manage_services', 'anytime');

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_services (facility_id, name, base_price, duration_min)
    values ('00000000-0000-0000-0000-0000000f0020', 'Puppy Trim', 40, 45);
    added := true;
  exception when insufficient_privilege then added := false; end;
  begin
    insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price)
    values ('00000000-0000-0000-0000-0000000f0050',
            '00000000-0000-0000-0000-0000000f0020', 'small', 60);
    priced := true;
  exception when insufficient_privilege then priced := false; end;
  reset role;
  perform pg_temp.t('T7  manage_services WITHOUT manage_rates: adds a service, cannot price it',
    added and not priced, format('added=%s priced=%s', added, priced));
exception when others then
  reset role; perform pg_temp.t('T7  two-key split', false, sqlerrm);
end $$;

-- ── T7b: granting the second key unblocks pricing ───────────────────────────
-- Proves T7 measured the KEY and not some unrelated refusal on that table.
do $$
declare priced boolean;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.membership_permissions (membership_id, permission_key, scope)
  values ('00000000-0000-0000-0000-0000000f0031', 'manage_rates', 'anytime');

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_service_size_prices (service_id, facility_id, size_label, price)
    values ('00000000-0000-0000-0000-0000000f0050',
            '00000000-0000-0000-0000-0000000f0020', 'small', 60);
    priced := true;
  exception when insufficient_privilege then priced := false; end;
  reset role;
  perform pg_temp.t('T7b …and adding manage_rates lets them price it — T7 measured the KEY',
    priced, format('priced=%s', priced));
exception when others then
  reset role; perform pg_temp.t('T7b  two-key split', false, sqlerrm);
end $$;

-- ── T8: view_services alone writes nothing ──────────────────────────────────
do $$
declare ok boolean;
begin
  perform set_config('request.jwt.claims', '', true);
  delete from public.membership_permissions
   where membership_id = '00000000-0000-0000-0000-0000000f0031';

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0002', 'role', 'authenticated')::text, true);
  set local role authenticated;
  begin
    insert into public.grooming_add_ons (facility_id, name, price, duration_min)
    values ('00000000-0000-0000-0000-0000000f0020', 'Sneaky', 0, 0);
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('T8  view_services alone writes nothing', ok);
exception when others then
  reset role; perform pg_temp.t('T8  read-only staff', false, sqlerrm);
end $$;

-- ── T9: config is staff-only ────────────────────────────────────────────────
-- The size TIERS are the facility's internal pricing policy. A client is told a
-- price, not the rule that produced it.
do $$
declare staff_sees integer; client_sees integer;
begin
  perform set_config('request.jwt.claims', '', true);
  insert into public.grooming_config (facility_id)
  values ('00000000-0000-0000-0000-0000000f0020');

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0001', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into staff_sees from public.grooming_config;
  reset role;

  perform set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000f0003', 'role', 'authenticated')::text, true);
  set local role authenticated;
  select count(*) into client_sees from public.grooming_config;
  reset role;

  perform pg_temp.t('T9  staff read the size tiers, a client does not',
    staff_sees = 1 and client_sees = 0,
    format('staff=%s client=%s', staff_sees, client_sees));
exception when others then
  reset role; perform pg_temp.t('T9  config visibility', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
