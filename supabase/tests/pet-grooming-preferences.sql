-- ============================================================================
-- A pet's groom preferences: one row per pet, kept for every groom, written by
-- whoever may edit pet records or manage grooming styles
-- (20261003150810_a_pet_has_grooming_preferences).
--
--   bun run test:sql pet-grooming-preferences
--
-- One transaction, rolled back. It works on the demo facility's own staff.
--
-- P1  The owner saves a pet's preferences; the facility comes from the pet,
--     whatever the request said, and the author's name is stamped.
-- P2  Saving again updates the one row — a pet never has two.
-- P3  A groomer, caretaker or reception (none holds edit_pet_records or
--     grooming_manage_styles) is refused a write, and changes nothing.
-- P4  But all three can READ them (view_pet_records).
-- P5  The accountant, without view_pet_records, reads nothing.
-- P6  anon holds no privilege on the table.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

create temp table ctx (
  facility uuid, other_facility uuid, pet uuid,
  owner text, groomer text, caretaker text, reception text, accountant text);
grant all on ctx to authenticated;

insert into ctx
select f.id,
       (select o.id from public.facilities o where o.id <> f.id order by o.created_at limit 1),
       (select p.id from public.pets p where p.facility_id = f.id order by p.ref limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'owner' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'groomer' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'caretaker' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'reception' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'accountant' and m.is_active limit 1)
  from public.facilities f
 where f.slug = 'yipyy-demo-facility';

-- Start from no row for this pet.
delete from public.pet_grooming_preferences where pet_id = (select pet from ctx);

create or replace function pg_temp.as_user(p_profile text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_profile, 'role', 'authenticated')::text, true);
$$;

-- ── P1, P2 ─────────────────────────────────────────────────────────────────

select pg_temp.as_user(owner) from ctx;
set local role authenticated;

do $$
declare v_ok boolean := true; v_msg text;
begin
  begin
    insert into public.pet_grooming_preferences (pet_id, facility_id, cut, behavior)
    select pet, other_facility, 'Teddy bear', 'Nervous with the dryer' from ctx;
  exception when others then v_ok := false; v_msg := sqlerrm;
  end;
  perform pg_temp.t(1, 'the owner saves a pet''s preferences', v_ok, coalesce(v_msg, ''));

  begin
    insert into public.pet_grooming_preferences (pet_id, cut)
    select pet, 'Puppy cut' from ctx
    on conflict (pet_id) do update set cut = excluded.cut;
  exception when others then v_ok := false; v_msg := sqlerrm;
  end;
  perform pg_temp.t(2, 'saving again updates the same row', v_ok, coalesce(v_msg, ''));
end $$;

reset role;

do $$
declare v_row public.pet_grooming_preferences; v_rows int;
begin
  select count(*) into v_rows from public.pet_grooming_preferences, ctx
   where pet_id = ctx.pet;
  select g.* into v_row from public.pet_grooming_preferences g, ctx
   where g.pet_id = ctx.pet;
  perform pg_temp.t(1, 'its facility is the pet''s, not the one the request named',
    v_row.facility_id = (select facility from ctx), coalesce(v_row.facility_id::text, 'none'));
  perform pg_temp.t(1, 'and the author is stamped',
    v_row.updated_by = (select owner from ctx) and coalesce(v_row.updated_by_name, '') <> '',
    coalesce(v_row.updated_by_name, 'no name'));
  perform pg_temp.t(2, 'one row for the pet, holding the new cut',
    v_rows = 1 and v_row.cut = 'Puppy cut' and v_row.behavior = 'Nervous with the dryer',
    format('%s row(s), cut %s', v_rows, v_row.cut));
end $$;

-- ── P3, P4 ─────────────────────────────────────────────────────────────────

create or replace function pg_temp.try_write(p_cut text) returns text
language plpgsql as $$
declare v_rows int;
begin
  begin
    update public.pet_grooming_preferences set cut = p_cut
     where pet_id = (select pet from ctx);
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      insert into public.pet_grooming_preferences (pet_id, cut)
      select pet, p_cut from ctx;
      return 'inserted';
    end if;
    return format('updated %s', v_rows);
  exception when others then
    return 'refused';
  end;
end $$;

create or replace function pg_temp.can_read() returns boolean
language sql as $$
  select exists (select 1 from public.pet_grooming_preferences g, ctx where g.pet_id = ctx.pet);
$$;

do $$ begin perform pg_temp.as_user(groomer) from ctx; end $$;
set local role authenticated;
do $$
declare v_out text;
begin
  v_out := pg_temp.try_write('Groomer cut');
  perform pg_temp.t(3, 'a groomer without the permission is refused a write',
    v_out = 'refused', v_out);
  perform pg_temp.t(4, 'a groomer can read the preferences', pg_temp.can_read());
end $$;
reset role;

do $$ begin perform pg_temp.as_user(caretaker) from ctx; end $$;
set local role authenticated;
do $$
declare v_out text;
begin
  v_out := pg_temp.try_write('Caretaker cut');
  perform pg_temp.t(3, 'a caretaker is refused a write', v_out = 'refused', v_out);
  perform pg_temp.t(4, 'a caretaker can read them', pg_temp.can_read());
end $$;
reset role;

do $$ begin perform pg_temp.as_user(reception) from ctx; end $$;
set local role authenticated;
do $$
declare v_out text;
begin
  v_out := pg_temp.try_write('Reception cut');
  perform pg_temp.t(3, 'reception is refused a write', v_out = 'refused', v_out);
  perform pg_temp.t(4, 'reception can read them', pg_temp.can_read());
end $$;
reset role;

do $$
declare v_cut text;
begin
  select g.cut into v_cut from public.pet_grooming_preferences g, ctx where g.pet_id = ctx.pet;
  perform pg_temp.t(3, 'and none of them changed anything', v_cut = 'Puppy cut', v_cut);
end $$;

-- ── P5 ─────────────────────────────────────────────────────────────────────

do $$ begin perform pg_temp.as_user(accountant) from ctx; end $$;
set local role authenticated;
do $$
begin
  perform pg_temp.t(5, 'the accountant, without view_pet_records, reads nothing',
    not pg_temp.can_read());
end $$;
reset role;

-- ── P6 ─────────────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(6, 'anon holds no privilege on the table',
    not has_table_privilege('anon', 'public.pet_grooming_preferences', 'select')
      and not has_table_privilege('anon', 'public.pet_grooming_preferences', 'insert')
      and not has_table_privilege('anon', 'public.pet_grooming_preferences', 'update')
      and not has_table_privilege('anon', 'public.pet_grooming_preferences', 'delete'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
