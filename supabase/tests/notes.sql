-- ============================================================================
-- A note belongs to the facility of what it is about, and only that
-- facility's staff can read or write it.
--
--   bun run test:sql notes
--
-- One transaction, rolled back.
--
-- ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
--
-- 20260910201745 made notes a table. Until then they lived in React state and
-- a fixture array, so nothing about who could read one had ever been decided
-- in the database. This reads the decisions back:
--
--   1  an owner writes a note on their own pet
--   2  the facility is the PET's, even when the caller names another
--        — a note cannot be filed into a facility by asking for it
--   3  the owner reads it
--   4  another facility's owner CANNOT read it
--   5  another facility's owner CANNOT write one on that pet
--        — the write policy checks the pet's facility, not the caller's
--   6  a note about a pet that does not exist is refused, 23503
--   7  the pet's own customer CANNOT read an internal note
--   8  anon holds no privilege on the table at all
--   9  once a note is SHARED, the pet's customer reads it — and not the
--        internal one beside it (20260910202241)
--  10  sharing a note does not show it to another facility
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two facilities, each with an owner who already has an account ─────────

insert into public.profiles (id, email, full_name) values
  ('user_ntAdmin0000000000000000000000', 'ntadmin@notes.invalid', 'NT Admin'),
  ('user_ntOwnerA000000000000000000000', 'owner-a@notes.invalid', 'Ana Owner'),
  ('user_ntOwnerB000000000000000000000', 'owner-b@notes.invalid', 'Ben Owner'),
  ('user_ntClient0000000000000000000000', 'client-nt@notes.invalid', 'Cleo Client')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_ntAdmin0000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntAdmin0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Notes Alpha', 'notes-alpha', 'America/Toronto', 'Ana Owner', 'owner-a@notes.invalid');
  perform public.provision_facility('0000000e-0000-4000-8000-000000000002'::uuid,
    'Notes Beta', 'notes-beta', 'America/Toronto', 'Ben Owner', 'owner-b@notes.invalid');
end $$;

reset role;

insert into public.clients (facility_id, name, email, status, details)
select id, 'Cleo Client', 'client-nt@notes.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'notes-alpha';

insert into public.pets (client_id, name, species)
select c.id, 'Pepper', 'dog'
  from public.clients c join public.facilities f on f.id = c.facility_id
 where f.slug = 'notes-alpha' and c.email = 'client-nt@notes.invalid';

-- ── 1, 2, 3. The owner of Alpha ───────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntOwnerA000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare
  v_pet uuid;
  v_beta uuid;
  v_alpha uuid;
  v_row public.notes;
  n int;
begin
  select p.id into v_pet from public.pets p where p.name = 'Pepper';
  select id into v_alpha from public.facilities where slug = 'notes-alpha';
  select id into v_beta from public.facilities where slug = 'notes-beta';

  insert into public.notes (facility_id, category, entity_id, content, created_by_name)
  values (v_beta, 'pet', v_pet, 'Nervous around the dryer.', 'Ana Owner')
  returning * into v_row;

  perform pg_temp.t(1, 'an owner writes a note on their own pet',
    v_row.id is not null, coalesce(v_row.id::text, 'no row'));

  perform pg_temp.t(2, 'the facility is the pet''s, not the one the caller named',
    v_row.facility_id = v_alpha,
    'stored ' || v_row.facility_id || ', expected ' || v_alpha);

  select count(*) into n from public.notes where entity_id = v_pet;
  perform pg_temp.t(3, 'the owner reads it', n = 1, n || ' rows');
end $$;

-- ── 4, 5. The owner of Beta ───────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntOwnerB000000000000000000000','role','authenticated')::text, true);

do $$
declare n int;
begin
  select count(*) into n from public.notes;
  perform pg_temp.t(4, 'another facility''s owner CANNOT read the note',
    n = 0, n || ' rows readable from Beta');
end $$;

-- Beta cannot see the pet, which is not what 5 is testing — so its id is
-- handed over through a temp table the database owner fills.
reset role;
create temp table beta_target as select id from public.pets where name = 'Pepper';
grant select on beta_target to authenticated;
set local role authenticated;

do $$
declare
  refused boolean := false;
begin
  begin
    insert into public.notes (facility_id, category, entity_id, content)
    select p.id, 'pet', t.id, 'Written from Beta.'
      from beta_target t, public.facilities p where p.slug = 'notes-beta';
  exception when insufficient_privilege then
    refused := true;
  end;
  perform pg_temp.t(5, 'another facility''s owner CANNOT write a note on that pet',
    refused, case when refused then '' else 'the insert went through' end);
end $$;

-- ── 6. A note about nothing ───────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntOwnerA000000000000000000000','role','authenticated')::text, true);

do $$
declare
  v_state text := 'none';
begin
  begin
    insert into public.notes (facility_id, category, entity_id, content)
    select id, 'pet', gen_random_uuid(), 'About a ghost.'
      from public.facilities where slug = 'notes-alpha';
  exception when others then
    v_state := sqlstate;
  end;
  perform pg_temp.t(6, 'a note about a pet that does not exist is refused, 23503',
    v_state = '23503', 'sqlstate ' || v_state);
end $$;

-- ── 7. The pet's own customer ─────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntClient0000000000000000000000','role','authenticated')::text, true);

do $$
declare n int;
begin
  perform public.link_client_record('notes-alpha');
  select count(*) into n from public.notes;
  perform pg_temp.t(7, 'the pet''s own customer CANNOT read an internal note',
    n = 0, n || ' rows');
end $$;

-- ── 9, 10. Shared with the customer ───────────────────────────────────────

reset role;
update public.notes set visibility = 'shared_with_customer'
 where content = 'Nervous around the dryer.';
insert into public.notes (facility_id, category, entity_id, content, visibility)
select f.id, 'pet', p.id, 'Bit a groomer.', 'internal'
  from public.pets p, public.facilities f
 where p.name = 'Pepper' and f.slug = 'notes-alpha';
set local role authenticated;

do $$
declare n int; body text;
begin
  select count(*), min(content) into n, body from public.notes;
  perform pg_temp.t(9, 'the pet''s own customer reads the note shared with them, and only that one',
    n = 1 and body = 'Nervous around the dryer.', n || ' rows, ' || coalesce(body, 'none'));
end $$;

select set_config('request.jwt.claims',
  json_build_object('sub','user_ntOwnerB000000000000000000000','role','authenticated')::text, true);

do $$
declare n int;
begin
  select count(*) into n from public.notes;
  perform pg_temp.t(10, 'a shared note is still not another facility''s to read',
    n = 0, n || ' rows');
end $$;

-- ── 8. anon ───────────────────────────────────────────────────────────────

reset role;

do $$
begin
  perform pg_temp.t(8, 'anon holds no privilege on notes',
    not has_table_privilege('anon', 'public.notes', 'select')
    and not has_table_privilege('anon', 'public.notes', 'insert')
    and not has_table_privilege('anon', 'public.notes', 'update')
    and not has_table_privilege('anon', 'public.notes', 'delete'),
    'anon can reach the table');
end $$;

select n, name, ok, detail from tap order by n;

rollback;
