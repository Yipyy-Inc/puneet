-- ============================================================================
-- A tag marked "client visible" reaches the client. An internal one does not.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/client-visible-tags.sql
--
-- One transaction, rolled back.
--
-- ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
--
-- `facility_tags.visibility` shipped with two values on 2026-08-28 and decided
-- NOTHING for nine days: both read policies admitted only
-- `private.member_facility_ids()`, so a client_visible tag was visible to
-- exactly the same people as an internal one. The customer portal filtered in
-- the browser instead, through an `isCustomerView` prop each of three call
-- sites had to remember.
--
-- 20260906221303 moved that decision into RLS. This reads it back.
--
-- ── WHAT MUST HOLD, AND WHY EACH ONE SEPARATELY ───────────────────────────
--
--   1  a customer reads a client_visible tag at their own facility
--   2  a customer CANNOT read an INTERNAL tag at that same facility
--        — catches a policy that opened to clients without checking visibility
--   3  a customer CANNOT read a client_visible tag at ANOTHER facility
--        — catches a visibility check with no tenancy join
--   4  a customer reads the assignment on their OWN pet
--   5  a customer CANNOT read an assignment carrying an internal tag, even on
--      their own pet
--        — an assignment whose tag is unreadable still says "this dog is
--          flagged for something", so the row itself has to be invisible
--   6  a customer CANNOT read an assignment on somebody else's pet
--   7  a customer CANNOT create a tag
--   8  a customer CANNOT assign one
--   9  STAFF still read both tags
--        — the customer branch was ADDED to the policy, not substituted for
--          the staff one, and asserting only the new half is how the old half
--          gets dropped by the next edit
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two facilities, and a customer of exactly one of them ─────────────────

insert into public.profiles (id, email, full_name) values
  ('user_cvtAdmin000000000000000000000', 'cvtadmin@yipyy.invalid', 'CVT Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_cvtAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvtAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000f-0000-4000-8000-000000000001'::uuid,
    'Epsilon Pets', 'epsilon-pets-cvt', 'America/Toronto', 'E Owner', 'eowner@epsilon.invalid');
  perform public.provision_facility('0000000f-0000-4000-8000-000000000002'::uuid,
    'Zeta Pets', 'zeta-pets-cvt', 'America/Toronto', 'Z Owner', 'zowner@zeta.invalid');
end $$;

reset role;

-- Both facilities define the same two tags. The INTERNAL one is the control:
-- every other condition is satisfied for it at the customer's own facility, so
-- only `visibility` can keep it out.
insert into public.facility_tags
  (facility_id, entity_type, name, color, priority, visibility)
select id, 'pet', 'Shown to owners', '#0F7A52', 'informational', 'client_visible'
  from public.facilities where slug in ('epsilon-pets-cvt', 'zeta-pets-cvt');

insert into public.facility_tags
  (facility_id, entity_type, name, color, priority, visibility)
select id, 'pet', 'Bites handlers', '#B23B3B', 'critical', 'internal'
  from public.facilities where slug in ('epsilon-pets-cvt', 'zeta-pets-cvt');

-- Epsilon's staff enter this person as a client, with a dog. Zeta has its own
-- unrelated client and dog, which is what assertion 6 reads for.
insert into public.clients (facility_id, name, email, status, details)
select id, 'Wren Okafor', 'wren-cvt@okafor.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'epsilon-pets-cvt';

insert into public.clients (facility_id, name, email, status, details)
select id, 'Sam Nkemelu', 'sam-cvt@nkemelu.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'zeta-pets-cvt';

insert into public.pets (client_id, name, species)
select c.id, 'Kofi', 'dog'
  from public.clients c join public.facilities f on f.id = c.facility_id
 where f.slug = 'epsilon-pets-cvt' and c.email = 'wren-cvt@okafor.invalid';

insert into public.pets (client_id, name, species)
select c.id, 'Nala', 'dog'
  from public.clients c join public.facilities f on f.id = c.facility_id
 where f.slug = 'zeta-pets-cvt' and c.email = 'sam-cvt@nkemelu.invalid';

-- Kofi carries BOTH of Epsilon's tags; Nala carries Zeta's visible one.
insert into public.facility_tag_assignments (tag_id, entity_type, entity_id)
select t.id, 'pet', p.id
  from public.facility_tags t
  join public.facilities f on f.id = t.facility_id
  join public.clients c on c.facility_id = f.id
  join public.pets p on p.client_id = c.id
 where f.slug = 'epsilon-pets-cvt' and p.name = 'Kofi';

insert into public.facility_tag_assignments (tag_id, entity_type, entity_id)
select t.id, 'pet', p.id
  from public.facility_tags t
  join public.facilities f on f.id = t.facility_id
  join public.clients c on c.facility_id = f.id
  join public.pets p on p.client_id = c.id
 where f.slug = 'zeta-pets-cvt' and p.name = 'Nala'
   and t.visibility = 'client_visible';

insert into public.profiles (id, email, full_name) values
  ('user_cvtWren0000000000000000000000', 'wren-cvt@okafor.invalid', 'Wren Okafor')
on conflict (id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvtWren0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.link_client_record('epsilon-pets-cvt');
end $$;

-- ── 1, 2, 3. The tag rows ─────────────────────────────────────────────────

do $$
declare n int;
begin
  select count(*) into n from public.facility_tags t
    join public.facilities f on f.id = t.facility_id
   where f.slug = 'epsilon-pets-cvt' and t.name = 'Shown to owners';
  perform pg_temp.t(1,
    'a customer reads a client_visible tag at their own facility',
    n = 1, n || ' rows');

  select count(*) into n from public.facility_tags t
    join public.facilities f on f.id = t.facility_id
   where f.slug = 'epsilon-pets-cvt' and t.name = 'Bites handlers';
  perform pg_temp.t(2,
    'a customer CANNOT read an INTERNAL tag at their own facility',
    n = 0, n || ' rows — the policy opened to clients without checking visibility');

  select count(*) into n from public.facility_tags t
    join public.facilities f on f.id = t.facility_id
   where f.slug = 'zeta-pets-cvt' and t.name = 'Shown to owners';
  perform pg_temp.t(3,
    'a customer CANNOT read a client_visible tag at another facility',
    n = 0, n || ' rows — visibility is checked but the tenancy join is not');
end $$;

-- ── 4, 5, 6. The assignments ──────────────────────────────────────────────

do $$
declare visible int; internal int; other int;
begin
  select count(*) into visible
    from public.facility_tag_assignments a
    join public.pets p on p.id = a.entity_id
   where p.name = 'Kofi'
     and a.tag_id in (select id from public.facility_tags
                       where visibility = 'client_visible');
  perform pg_temp.t(4,
    'a customer reads the client_visible assignment on their own pet',
    visible = 1, visible || ' rows');

  -- `entity_id` is read straight rather than joined through `pets`, so this
  -- cannot pass merely because the PET became unreadable. The assignment row
  -- itself has to be refused.
  select count(*) into internal
    from public.facility_tag_assignments a
   where a.tag_id in (select id from public.facility_tags
                       where name = 'Bites handlers');
  perform pg_temp.t(5,
    'a customer CANNOT read an assignment carrying an internal tag',
    internal = 0,
    internal || ' rows — an unreadable tag on a readable assignment still says the pet is flagged');

  select count(*) into other
    from public.facility_tag_assignments a
    join public.pets p on p.id = a.entity_id
   where p.name = 'Nala';
  perform pg_temp.t(6,
    'a customer CANNOT read an assignment on somebody else''s pet',
    other = 0, other || ' rows');
end $$;

-- ── 7, 8. Reading is not writing ──────────────────────────────────────────

do $$
declare state text; v_fac uuid;
begin
  select id into v_fac from public.facilities where slug = 'epsilon-pets-cvt';
  begin
    insert into public.facility_tags
      (facility_id, entity_type, name, color, priority, visibility)
    values (v_fac, 'pet', 'Invented by a customer', '#0F58C6', 'informational',
            'client_visible');
    state := 'WROTE';
  exception when others then state := 'refused: ' || sqlstate;
  end;
  perform pg_temp.t(7, 'a customer CANNOT create a tag', state <> 'WROTE', state);
end $$;

do $$
declare state text; v_tag uuid; v_pet uuid;
begin
  -- Both ids are looked up as the ADMIN would see them, using values the
  -- customer can legitimately read, so the refusal below is the write policy
  -- and not a failed lookup.
  select t.id into v_tag from public.facility_tags t
    join public.facilities f on f.id = t.facility_id
   where f.slug = 'epsilon-pets-cvt' and t.name = 'Shown to owners';
  select p.id into v_pet from public.pets p where p.name = 'Kofi';

  begin
    insert into public.facility_tag_assignments (tag_id, entity_type, entity_id)
    values (v_tag, 'pet', v_pet);
    state := 'WROTE';
  exception when others then state := 'refused: ' || sqlstate;
  end;
  perform pg_temp.t(8,
    'a customer CANNOT assign a tag to their own pet', state <> 'WROTE', state);
end $$;

reset role;

-- ── 9. Staff still read everything ────────────────────────────────────────
--
-- The customer branch was ADDED to each policy. Asserting only the new half is
-- how the old half gets dropped by the next edit — and the old half is the one
-- the whole facility depends on.

-- A real membership row, not the owner `provision_facility` invited: that owner
-- has a GRANT waiting to be claimed at first sign-in, not a membership, so
-- reading a profile id out of `facility_memberships` here returned null and the
-- assertion measured an empty JWT rather than a staff member.
insert into public.profiles (id, email, full_name) values
  ('user_cvtStaff000000000000000000000', 'staff-cvt@epsilon.invalid', 'CVT Staff')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_cvtStaff000000000000000000000', f.id, 'reception', true
  from public.facilities f where f.slug = 'epsilon-pets-cvt'
on conflict (profile_id, facility_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_cvtStaff000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare n int;
begin
  select count(*) into n from public.facility_tags t
    join public.facilities f on f.id = t.facility_id
   where f.slug = 'epsilon-pets-cvt';
  perform pg_temp.t(9,
    'staff read both the internal and the client_visible tag',
    n = 2, n || ' of 2 tags');
end $$;

-- ── 10. A tag that does not exist is a 23503, not a 500 ───────────────────
--
-- `private.tag_assignment_facility()` is a BEFORE trigger, so it runs ahead of
-- the `with check` policy: a caller naming a nonexistent tag never reaches RLS
-- at all. It raised P0001 until 20260906224835, nothing mapped P0001, and
-- `writeFailure` returned 500 with a raw Postgres message. Asserted here rather
-- than trusted to the migration that changed it, because the errcode is one
-- `using` clause a later edit can drop without anything noticing.

do $$
declare state text;
begin
  begin
    insert into public.facility_tag_assignments (tag_id, entity_type, entity_id)
    values ('00000000-0000-4000-8000-000000000000'::uuid, 'pet',
            '00000000-0000-4000-8000-000000000000'::uuid);
    state := 'inserted';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(10,
    'assigning a nonexistent tag raises 23503, which the API turns into a 400',
    state = '23503', state || ' — anything else reaches the caller as a 500');
end $$;

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
