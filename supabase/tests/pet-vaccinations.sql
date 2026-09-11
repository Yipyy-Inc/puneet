-- ============================================================================
-- Vaccination records: who reads them, who writes them, and where they land
-- (20260828134018, first given a route on 2026-09-11).
--
--   bun run test:sql pet-vaccinations
--
-- The table sat unused for two weeks with its policies in place. The day a
-- screen started writing to it, these are the promises the screen relies on.
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   V1  the owner records a vaccination; the facility is the PET's, even when
--       the insert names another one
--   V2  a groomer (a member without edit_pet_medical) reads it
--   V3  the groomer cannot record one
--   V4  the groomer cannot approve one — zero rows, status unchanged
--   V5  another business's owner reads none of it
--   V6  another business's owner cannot record one against this pet
--   V7  anon reads none of it
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001b0001', 'vax-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0002', 'vax-groom@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0003', 'vax-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001b0001', 'vax-owner@example.invalid', 'VAX Owner'),
  ('00000000-0000-0000-0000-0000001b0002', 'vax-groom@example.invalid', 'VAX Groomer'),
  ('00000000-0000-0000-0000-0000001b0003', 'vax-rival@example.invalid', 'VAX Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001b0010', 'VAX Org', 'vax-org'),
  ('00000000-0000-0000-0000-0000001b0011', 'VAX Rival Org', 'vax-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001b0020', '00000000-0000-0000-0000-0000001b0010',
   'VAX Kennels', 'vax-kennels', 'vax-kennels'),
  ('00000000-0000-0000-0000-0000001b0021', '00000000-0000-0000-0000-0000001b0011',
   'VAX Rival Kennels', 'vax-rival', 'vax-rival')
on conflict (id) do nothing;

insert into public.facility_memberships (facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001b0020', '00000000-0000-0000-0000-0000001b0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001b0020', '00000000-0000-0000-0000-0000001b0002', 'groomer', true),
  ('00000000-0000-0000-0000-0000001b0021', '00000000-0000-0000-0000-0000001b0003', 'owner', true)
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000001b0040', '00000000-0000-0000-0000-0000001b0020',
   'VAX Client', 'vax-client@example.invalid')
on conflict (id) do nothing;

insert into public.pets (id, client_id, facility_id, name, species) values
  ('00000000-0000-0000-0000-0000001b0050', '00000000-0000-0000-0000-0000001b0040',
   '00000000-0000-0000-0000-0000001b0020', 'VAX Dog', 'dog')
on conflict (id) do nothing;

-- ── V1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_facility uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0001');
  set local role authenticated;
  begin
    -- Names the RIVAL facility on purpose: the trigger takes it from the pet.
    insert into public.pet_vaccinations (id, pet_id, facility_id, vaccine_name, expires_on, status)
    values ('00000000-0000-0000-0000-0000001b0060',
            '00000000-0000-0000-0000-0000001b0050',
            '00000000-0000-0000-0000-0000001b0021',
            'Rabies', current_date + 200, 'pending_review');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  select facility_id into v_facility from public.pet_vaccinations
   where id = '00000000-0000-0000-0000-0000001b0060';
  perform pg_temp.t('V1  the owner records one, and it lands at the pet''s facility',
    v_state = 'inserted' and v_facility = '00000000-0000-0000-0000-0000001b0020',
    v_state || ' / facility ' || coalesce(v_facility::text, 'none'));
end $$;

-- ── V2 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0002');
  set local role authenticated;
  select count(*) into v_rows from public.pet_vaccinations
   where pet_id = '00000000-0000-0000-0000-0000001b0050';
  reset role;
  perform pg_temp.t('V2  a groomer reads the facility''s records', v_rows = 1,
    'rows ' || v_rows);
end $$;

-- ── V3 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0002');
  set local role authenticated;
  begin
    insert into public.pet_vaccinations (pet_id, facility_id, vaccine_name)
    values ('00000000-0000-0000-0000-0000001b0050',
            '00000000-0000-0000-0000-0000001b0020', 'Bordetella');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select count(*) into v_rows from public.pet_vaccinations
   where pet_id = '00000000-0000-0000-0000-0000001b0050';
  perform pg_temp.t('V3  a groomer cannot record a vaccination',
    v_state <> 'inserted' and v_rows = 1, v_state || ' / rows ' || v_rows);
end $$;

-- ── V4 ────────────────────────────────────────────────────────────────────
do $$
declare v_touched int; v_status text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0002');
  set local role authenticated;
  update public.pet_vaccinations set status = 'approved'
   where id = '00000000-0000-0000-0000-0000001b0060';
  get diagnostics v_touched = row_count;
  reset role;
  select status into v_status from public.pet_vaccinations
   where id = '00000000-0000-0000-0000-0000001b0060';
  perform pg_temp.t('V4  a groomer cannot approve one',
    v_touched = 0 and v_status = 'pending_review',
    'touched ' || v_touched || ' / status ' || v_status);
end $$;

-- ── V5 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0003');
  set local role authenticated;
  select count(*) into v_rows from public.pet_vaccinations
   where pet_id = '00000000-0000-0000-0000-0000001b0050';
  reset role;
  perform pg_temp.t('V5  another business reads none of it', v_rows = 0,
    'rows ' || v_rows);
end $$;

-- ── V6 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001b0003');
  set local role authenticated;
  begin
    -- Names its OWN facility; the trigger moves the row to the pet's, where
    -- this owner has no permission, and the policy refuses it.
    insert into public.pet_vaccinations (pet_id, facility_id, vaccine_name)
    values ('00000000-0000-0000-0000-0000001b0050',
            '00000000-0000-0000-0000-0000001b0021', 'Distemper');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  select count(*) into v_rows from public.pet_vaccinations
   where pet_id = '00000000-0000-0000-0000-0000001b0050';
  perform pg_temp.t('V6  another business cannot record one against this pet',
    v_state <> 'inserted' and v_rows = 1, v_state || ' / rows ' || v_rows);
end $$;

-- ── V7 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int := -1; v_state text := 'read';
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
  begin
    select count(*) into v_rows from public.pet_vaccinations;
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('V7  anon reads none of it',
    v_state <> 'read' or v_rows = 0, v_state || ' / rows ' || v_rows);
end $$;

select n, name, ok, detail from tap order by n;

rollback;
