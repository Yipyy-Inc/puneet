-- ============================================================================
-- ONE ADD-ONS LIST (2026-09-26, 20260926223644).
--
--   bun run test:sql service-add-ons
--
-- One transaction, rolled back, with facilities of its own. NO SAVEPOINTS, and
-- no `tap` write inside a block that can raise: a caught exception rolls its
-- block back, `tap` rows included.
--
-- A0  A member holding manage_services creates a category, an add-on in it and
--     an override for one of the facility's locations; the override's
--     facility comes from the add-on, not from what the caller sent.
-- A1  An OFFBOARDED member can neither create nor change one.
-- A2  DELETING A CATEGORY KEEPS ITS ADD-ONS, uncategorised — the promise the
--     confirmation makes, kept by `on delete set null` alone.
-- A3  A client of the facility sees its LIVE add-ons: not an inactive one, not
--     an archived (deleted) one.
-- A4  A member of another facility sees none of them.
-- A5  anon holds no privilege on any of the three tables.
-- A6  A category, a location or an override location from ANOTHER facility is
--     refused — a foreign key cannot say "the same facility".
-- A7  A malformed service reference is refused.
-- A8  What the one list replaced is gone (20260930190455): the
--     `grooming_add_ons` view, the `grooming_appointment_add_ons` table and
--     its trigger function, and the `service_addons` settings rows. Which
--     grooming add-ons a groom offers is `/api/grooming/add-ons`'s, by the
--     add-on rules' own `appliesToService`.
--
-- The actors are ordinary members: `has_permission` lets a platform admin
-- through everything, so measuring RLS as one measures nothing.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Two facilities of this file's own ───────────────────────────────────────

insert into public.profiles (id, email, full_name) values
  ('user_sadAdmin000000000000000000000', 'sadadmin@yipyy.invalid', 'SAD Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_sadAdmin000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_sadAdmin000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000d-0000-4000-8000-0000000000a1'::uuid,
    'Add-on Pets', 'add-on-pets-sad', 'America/Toronto', 'A Owner', 'aowner@sad.invalid');
  perform public.provision_facility('0000000d-0000-4000-8000-0000000000b1'::uuid,
    'Rival Pets', 'rival-pets-sad', 'America/Toronto', 'B Owner', 'bowner@sad.invalid');
end $$;

reset role;

do $$
declare v_a uuid; v_b uuid;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';
  select id into v_b from public.facilities where slug = 'rival-pets-sad';

  insert into public.profiles (id, email, full_name) values
    ('user_sadKeeps000000000000000000000', 'sadkeeps@yipyy.invalid',  'SAD Manager'),
    ('user_sadGone0000000000000000000000', 'sadgone@yipyy.invalid',   'SAD Leaver'),
    ('user_sadRival000000000000000000000', 'sadrival@yipyy.invalid',  'SAD Rival'),
    ('user_sadClient00000000000000000000', 'sadclient@yipyy.invalid', 'SAD Client')
  on conflict (id) do nothing;

  insert into public.facility_memberships
    (facility_id, profile_id, role, access_level, is_active)
  values
    (v_a, 'user_sadKeeps000000000000000000000', 'owner',   'admin', true),
    (v_a, 'user_sadGone0000000000000000000000', 'manager', 'staff', false),
    (v_b, 'user_sadRival000000000000000000000', 'owner',   'admin', true)
  on conflict do nothing;

  insert into public.clients (facility_id, name, email, profile_id)
  values (v_a, 'SAD Client', 'sadclient@yipyy.invalid', 'user_sadClient00000000000000000000');

  -- A second location for A, for the override.
  insert into public.locations (facility_id, name, is_primary, timezone)
  values (v_a, 'SAD Uptown', false, 'America/Toronto');

  insert into public.boarding_services (facility_id, legacy_id, name, price, unit)
  values (v_a, 'sad-bd', 'SAD Boarding night', 80, 'night');
end $$;

-- ── A0 a manager creates a category, an add-on in it, and an override ──────

do $$
declare
  v_a uuid; v_b uuid; v_uptown uuid; v_cat uuid; v_add uuid;
  v_override_facility uuid; v_made int := 0;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';
  select id into v_b from public.facilities where slug = 'rival-pets-sad';
  select id into v_uptown from public.locations where facility_id = v_a and name = 'SAD Uptown';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  insert into public.service_add_on_categories (facility_id, name)
  values (v_a, 'SAD Treats') returning id into v_cat;

  insert into public.service_add_ons (facility_id, legacy_id, category_id, name, price, duration_min)
  values (v_a, 'sad-live', v_cat, 'SAD Nail trim', 15, 10) returning id into v_add;

  -- Sent with the RIVAL's facility id: the trigger must put A's there.
  insert into public.service_add_on_location_overrides (add_on_id, facility_id, location_id, price)
  values (v_add, v_b, v_uptown, 18)
  returning facility_id into v_override_facility;

  select count(*) into v_made from public.service_add_ons where facility_id = v_a;

  execute 'reset role';

  perform pg_temp.t(0,
    'a member holding manage_services creates a category, an add-on and an override',
    v_cat is not null and v_add is not null and v_made = 1 and v_override_facility = v_a,
    format('category %s, add-on %s, override facility %s',
      v_cat is not null, v_add is not null,
      case when v_override_facility = v_a then 'the add-on''s' else 'WRONG' end));
end $$;

-- ── A1 an offboarded member can neither create nor change one ──────────────

do $$
declare v_a uuid; v_insert_refused boolean := false; v_changed int; v_name text;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadGone0000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    insert into public.service_add_ons (facility_id, name, price)
    values (v_a, 'SAD By a leaver', 1);
  exception when insufficient_privilege then
    v_insert_refused := true;
  end;

  update public.service_add_ons set name = 'SAD Renamed by a leaver'
   where facility_id = v_a and legacy_id = 'sad-live';
  get diagnostics v_changed = row_count;

  execute 'reset role';

  select name into v_name from public.service_add_ons
   where facility_id = v_a and legacy_id = 'sad-live';

  perform pg_temp.t(1,
    'an offboarded member can neither create an add-on nor change one',
    v_insert_refused and v_changed = 0 and v_name = 'SAD Nail trim',
    format('insert refused %s, %s row(s) changed, name now %s', v_insert_refused, v_changed, v_name));
end $$;

-- ── A2 deleting a category keeps its add-ons ────────────────────────────────

do $$
declare v_a uuid; v_removed int; v_survivor record;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  delete from public.service_add_on_categories where facility_id = v_a and name = 'SAD Treats';
  get diagnostics v_removed = row_count;

  execute 'reset role';

  select id, category_id into v_survivor from public.service_add_ons
   where facility_id = v_a and legacy_id = 'sad-live';

  perform pg_temp.t(2,
    'deleting a category keeps its add-ons, now uncategorised',
    v_removed = 1 and v_survivor.id is not null and v_survivor.category_id is null,
    format('%s category removed, add-on %s, category now %s',
      v_removed, case when v_survivor.id is null then 'GONE' else 'kept' end,
      coalesce(v_survivor.category_id::text, 'none')));
end $$;

-- ── A3 a client sees live add-ons only; A4 a rival sees none ──────────────

do $$
declare v_a uuid; v_client text; v_rival int;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';

  -- One inactive and one archived beside the live one.
  insert into public.service_add_ons (facility_id, legacy_id, name, price, is_active)
  values (v_a, 'sad-off', 'SAD Paused', 5, false);
  insert into public.service_add_ons (facility_id, legacy_id, name, price, archived_at)
  values (v_a, 'sad-gone', 'SAD Deleted', 5, now());

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadClient00000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';
  select string_agg(legacy_id, ',' order by legacy_id) into v_client
    from public.service_add_ons where facility_id = v_a;
  execute 'reset role';

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadRival000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';
  select count(*) into v_rival from public.service_add_ons where facility_id = v_a;
  execute 'reset role';

  perform pg_temp.t(3,
    'a client of the facility sees its live add-ons only',
    v_client = 'sad-live',
    format('client sees %s', coalesce(v_client, 'nothing')));

  perform pg_temp.t(4,
    'a member of another facility sees none of them',
    v_rival = 0,
    format('rival sees %s', v_rival));
end $$;

-- ── A5 anon holds nothing ───────────────────────────────────────────────────

do $$
declare v_held text;
begin
  select string_agg(t.rel || ':' || t.priv, ', ') into v_held
    from (values ('public.service_add_ons'), ('public.service_add_on_categories'),
                 ('public.service_add_on_location_overrides')) r(rel)
    cross join (values ('select'), ('insert'), ('update'), ('delete')) p(priv)
    cross join lateral (select r.rel, p.priv) t
   where has_table_privilege('anon', r.rel, p.priv);

  perform pg_temp.t(5,
    'anon holds no privilege on the add-on tables',
    v_held is null,
    coalesce('anon holds ' || v_held, 'none held'));
end $$;

-- ── A6 another facility's category, location or override location ─────────

do $$
declare
  v_a uuid; v_b uuid; v_b_cat uuid; v_b_loc uuid; v_add uuid;
  v_cat_refused boolean := false; v_loc_refused boolean := false; v_ovr_refused boolean := false;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';
  select id into v_b from public.facilities where slug = 'rival-pets-sad';
  select id into v_add from public.service_add_ons where facility_id = v_a and legacy_id = 'sad-live';
  select id into v_b_loc from public.locations where facility_id = v_b limit 1;
  insert into public.service_add_on_categories (facility_id, name)
  values (v_b, 'SAD Rival heading') returning id into v_b_cat;

  perform set_config('request.jwt.claims',
    json_build_object('sub','user_sadKeeps000000000000000000000','role','authenticated')::text, true);
  execute 'set local role authenticated';

  begin
    update public.service_add_ons set category_id = v_b_cat where id = v_add;
  exception when foreign_key_violation then v_cat_refused := true;
  end;

  begin
    update public.service_add_ons set location_ids = array[v_b_loc] where id = v_add;
  exception when foreign_key_violation then v_loc_refused := true;
  end;

  begin
    insert into public.service_add_on_location_overrides (add_on_id, facility_id, location_id, price)
    values (v_add, v_a, v_b_loc, 1);
  exception when foreign_key_violation then v_ovr_refused := true;
  end;

  execute 'reset role';

  perform pg_temp.t(6,
    'another facility''s category, location or override location is refused',
    v_cat_refused and v_loc_refused and v_ovr_refused,
    format('category %s, location %s, override %s',
      v_cat_refused, v_loc_refused, v_ovr_refused));
end $$;

-- ── A7 a malformed service reference ────────────────────────────────────────

do $$
declare v_a uuid; v_refused boolean := false;
begin
  select id into v_a from public.facilities where slug = 'add-on-pets-sad';
  begin
    insert into public.service_add_ons (facility_id, name, applies_to_all_services, service_refs)
    values (v_a, 'SAD Junk ref', false, array['boarding:not-a-uuid']);
  exception when check_violation then v_refused := true;
  end;

  perform pg_temp.t(7,
    'a malformed service reference is refused',
    v_refused,
    case when v_refused then 'refused' else 'ACCEPTED' end);
end $$;

-- ── A8 what the one list replaced is gone ─────────────────────────────────

do $$
declare v_left text;
begin
  select string_agg(name, ', ') into v_left
    from (
      select 'the grooming_add_ons view' as name
       where to_regclass('public.grooming_add_ons') is not null
      union all
      select 'the grooming_appointment_add_ons table'
       where to_regclass('public.grooming_appointment_add_ons') is not null
      union all
      select 'private.grooming_line_same_facility()'
       where to_regprocedure('private.grooming_line_same_facility()') is not null
      union all
      select 'service_addons settings rows'
       where exists (select 1 from public.facility_settings
                      where domain = 'service_addons')
    ) left_over;

  perform pg_temp.t(8,
    'the view, the table and the settings the one list replaced are gone',
    v_left is null,
    coalesce('still there: ' || v_left, 'nothing left'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
