-- ============================================================================
-- A care log entry can be taken back — by whoever may record it, and the
-- booking's history says so (20261003150843_a_care_log_entry_can_be_cleared).
--
--   bun run test:sql care-log-clear
--
-- One transaction, rolled back. It works on the demo facility's own staff.
--
-- L1  A caretaker, who logs feedings, can clear a feeding they could log.
-- L2  The entry is gone, and audit_log names it against the booking.
-- L3  A groomer, who may READ the log, may not clear a feeding (42501).
-- L4  Reception may not either: taking money is not recording care.
-- L5  An entry that does not exist says so (P0002) rather than succeeding.
-- L6  Neither anon nor public may call the function.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

create temp table ctx (booking uuid, pet uuid, caretaker text, groomer text, reception text);
grant all on ctx to authenticated;

insert into ctx
select b.id,
       (select bp.pet_id from public.booking_pets bp where bp.booking_id = b.id limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'caretaker' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'groomer' and m.is_active limit 1),
       (select m.profile_id from public.facility_memberships m
         where m.facility_id = f.id and m.role = 'reception' and m.is_active limit 1)
  from public.bookings b
  join public.facilities f on f.id = b.facility_id
 where f.slug = 'yipyy-demo-facility'
 order by b.ref
 limit 1;

-- Three feedings to clear, written as the facility (the trigger takes the
-- facility from the booking).
insert into public.care_log_entries
  (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
select booking, pet, k, 'feeding', current_date, '08:00', 'ate_all'
  from ctx, unnest(array['tap-clear-1', 'tap-clear-2', 'tap-clear-3']) k;

create or replace function pg_temp.as_user(p_profile text) returns void
language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_profile, 'role', 'authenticated')::text, true);
$$;

create or replace function pg_temp.clear(p_key text) returns text
language plpgsql as $$
declare v_id uuid; v_code text;
begin
  select e.id into v_id from public.care_log_entries e, ctx
   where e.booking_id = ctx.booking and e.task_key = p_key;
  begin
    perform public.clear_care_log_entry(coalesce(v_id, gen_random_uuid()));
    return 'cleared';
  exception when others then
    get stacked diagnostics v_code = returned_sqlstate;
    return v_code;
  end;
end $$;

-- ── L1, L2 ─────────────────────────────────────────────────────────────────

select pg_temp.as_user(caretaker) from ctx;
set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.clear('tap-clear-1');
  perform pg_temp.t(1, 'a caretaker can clear a feeding they could log',
    v_out = 'cleared', v_out);
end $$;

reset role;

do $$
declare v_rows int; v_audit int;
begin
  select count(*) into v_rows from public.care_log_entries e, ctx
   where e.booking_id = ctx.booking and e.task_key = 'tap-clear-1';
  select count(*) into v_audit from public.audit_log a, ctx
   where a.action = 'Care log entry cleared'
     and a.entity_type = 'booking'
     and a.entity_id = ctx.booking::text
     and a.changes::text like '%tap-clear-1%';
  perform pg_temp.t(2, 'the entry is gone and the history names it',
    v_rows = 0 and v_audit = 1,
    format('%s row(s) left, %s audit row(s)', v_rows, v_audit));
end $$;

-- ── L3, L4 ─────────────────────────────────────────────────────────────────

select pg_temp.as_user(groomer) from ctx;
set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.clear('tap-clear-2');
  perform pg_temp.t(3, 'a groomer may not clear a feeding',
    v_out = '42501', v_out);
end $$;

reset role;
select pg_temp.as_user(reception) from ctx;
set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.clear('tap-clear-3');
  perform pg_temp.t(4, 'reception may not clear a feeding',
    v_out = '42501', v_out);
end $$;

reset role;

do $$
declare v_rows int;
begin
  select count(*) into v_rows from public.care_log_entries e, ctx
   where e.booking_id = ctx.booking and e.task_key in ('tap-clear-2', 'tap-clear-3');
  perform pg_temp.t(4, 'and both entries are still there',
    v_rows = 2, format('%s row(s)', v_rows));
end $$;

-- ── L5 ─────────────────────────────────────────────────────────────────────

select pg_temp.as_user(caretaker) from ctx;
set local role authenticated;

do $$
declare v_out text;
begin
  v_out := pg_temp.clear('tap-never-logged');
  perform pg_temp.t(5, 'an entry that does not exist is P0002, not a success',
    v_out = 'P0002', v_out);
end $$;

reset role;

-- ── L6 ─────────────────────────────────────────────────────────────────────

do $$
begin
  perform pg_temp.t(6, 'neither anon nor public may call it',
    not has_function_privilege('anon', 'public.clear_care_log_entry(uuid)', 'execute')
      and not exists (
        select 1 from information_schema.routine_privileges
         where routine_schema = 'public'
           and routine_name = 'clear_care_log_entry'
           and grantee = 'PUBLIC'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
