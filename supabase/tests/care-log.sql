-- ============================================================================
-- A care log entry is written by the person who did the work, and by nobody
-- else.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" -f supabase/tests/care-log.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- The first draft of `care_log_entries` gated writes on `edit_pet_records`.
-- That reads sensibly and is wrong for the product: measured against the
-- presets, `edit_pet_records` belongs to owner, admin, manager and supervisor —
-- so the caretaker and the boarding attendant, the people who actually put the
-- bowl down and hold the pill, could not record having done it.
--
-- C1 and C2 are the assertions that would have caught that. They are the point
-- of this file: a permission model is only right if the person doing the work
-- can record the work.
--
-- C5 is the other half. Recording care is not the same as being able to see
-- the animal, so a groomer — who holds `view_pet_records` and not
-- `log_feedings` — must be refused. Without it, "everyone who can read can
-- write" passes silently.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_booking  uuid;
  v_pet      uuid;
  v_ok       boolean;
  v_msg      text;
  v_rows     int;
begin
  select b.id into v_booking
    from public.bookings b
    join public.facilities f on f.id = b.facility_id
   where f.slug = 'yipyy-demo-facility'
   order by b.ref limit 1;
  select bp.pet_id into v_pet
    from public.booking_pets bp where bp.booking_id = v_booking limit 1;

  -- ── C1/C2: the people who do the work can record it ─────────────────────
  for v_msg in
    select m.profile_id from public.facility_memberships m
      join public.facilities f on f.id = m.facility_id
     where f.slug = 'yipyy-demo-facility' and m.role = 'caretaker' and m.is_active
     limit 1
  loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_msg, 'role', 'authenticated')::text, true);
  end loop;
  execute 'set local role authenticated';

  v_ok := true;
  begin
    insert into public.care_log_entries
      (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
    values (v_booking, v_pet, 'tap-feed', 'feeding', current_date, '08:00', 'ate_all');
  exception when others then v_ok := false; v_msg := sqlerrm;
  end;
  perform pg_temp.t(1, 'a caretaker can log a feeding', v_ok, coalesce(v_msg, ''));

  v_ok := true;
  begin
    insert into public.care_log_entries
      (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
    values (v_booking, v_pet, 'tap-med', 'medication', current_date, '08:00', 'given');
  exception when others then v_ok := false; v_msg := sqlerrm;
  end;
  perform pg_temp.t(2, 'a caretaker can log a medication', v_ok, coalesce(v_msg, ''));

  -- ── C3: one record per task per day, corrected rather than duplicated ────
  insert into public.care_log_entries
    (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
  values (v_booking, v_pet, 'tap-feed', 'feeding', current_date, '08:30', 'ate_some')
  on conflict (booking_id, task_key, occurred_on) do update
    set outcome = excluded.outcome, executed_at = excluded.executed_at;

  select count(*) into v_rows from public.care_log_entries
   where booking_id = v_booking and task_key = 'tap-feed' and occurred_on = current_date;
  perform pg_temp.t(3, 'logging the same slot twice corrects it, it does not duplicate',
                    v_rows = 1, format('%s row(s)', v_rows));

  select count(*) into v_rows from public.care_log_entries
   where booking_id = v_booking and task_key = 'tap-feed' and outcome = 'ate_some';
  perform pg_temp.t(4, 'and the correction is what is stored', v_rows = 1);

  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  -- ── C5: seeing the animal is not permission to record care for it ───────
  for v_msg in
    select m.profile_id from public.facility_memberships m
      join public.facilities f on f.id = m.facility_id
     where f.slug = 'yipyy-demo-facility' and m.role = 'groomer' and m.is_active
     limit 1
  loop
    perform set_config('request.jwt.claims',
      json_build_object('sub', v_msg, 'role', 'authenticated')::text, true);
  end loop;
  execute 'set local role authenticated';

  v_ok := false;
  begin
    insert into public.care_log_entries
      (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
    values (v_booking, v_pet, 'tap-groomer', 'feeding', current_date, '09:00', 'ate_all');
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(5, 'a groomer, who may READ pet records, may not log a feeding',
                    v_ok, coalesce(v_msg, 'the insert succeeded'));

  -- ── C6: a groomer can still READ the log ────────────────────────────────
  select count(*) into v_rows from public.care_log_entries where booking_id = v_booking;
  perform pg_temp.t(6, 'a groomer can read the care log', v_rows >= 2,
                    format('%s row(s) visible', v_rows));

  -- ── C7: the facility is derived, never accepted ─────────────────────────
  execute 'reset role';
  perform set_config('request.jwt.claims', '', true);

  select count(*) into v_rows from public.care_log_entries c
    join public.bookings b on b.id = c.booking_id
   where c.booking_id = v_booking and c.facility_id <> b.facility_id;
  perform pg_temp.t(7, 'every entry carries its booking''s facility', v_rows = 0);

  -- ── C8: a pet from another client cannot be attached ────────────────────
  v_ok := false;
  begin
    insert into public.care_log_entries
      (booking_id, pet_id, task_key, task_type, occurred_on, executed_at, outcome)
    select v_booking, p.id, 'tap-alien', 'feeding', current_date, '10:00', 'ate_all'
      from public.pets p
     where p.client_id <> (select client_id from public.bookings where id = v_booking)
     limit 1;
  exception when others then v_ok := true; v_msg := sqlerrm;
  end;
  perform pg_temp.t(8, 'a pet from another client cannot be logged against this booking',
                    v_ok, coalesce(v_msg, 'the insert succeeded'));
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
