-- ============================================================================
-- A dog's exercise ratings are kept with its attendance.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- A session view's Exercises step rates every dog on every exercise covered,
-- 1 to 5. "Complete session" put those ratings into the query cache and
-- nowhere else, so a student's History tab showed no exercises after a
-- reload, and the progress chart had nothing to draw.
--
-- ── ON THE ATTENDANCE ROW ─────────────────────────────────────────────────
--
-- training_attendance.exercises is a list, one entry per exercise the dog did:
--
--   { "exerciseName": "Sit", "rating": 4 }
--
-- A rating is what one dog did in one session, and it is never read apart
-- from that attendance — so it is a column on that row, not a table. The
-- names are the trainer's, as the session showed them. A dog that did not
-- come did no exercises, so an absent or excused row has none.
--
-- training_attendance_history() returns the list. Its return type changes, so
-- it is dropped and made again with the same grants.
-- ============================================================================

create or replace function private.training_exercise_ratings_are_valid(p_exercises jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select jsonb_typeof(p_exercises) = 'array'
     and jsonb_array_length(p_exercises) <= 50
     and not exists (
       select 1 from jsonb_array_elements(p_exercises) x(e)
        where jsonb_typeof(x.e) <> 'object'
           or jsonb_typeof(x.e -> 'exerciseName') is distinct from 'string'
           or length(btrim(x.e ->> 'exerciseName')) not between 1 and 200
           or jsonb_typeof(x.e -> 'rating') is distinct from 'number'
           or (x.e ->> 'rating') not in ('1', '2', '3', '4', '5')
     );
$fn$;

alter table public.training_attendance
  add column if not exists exercises jsonb not null default '[]'::jsonb;

alter table public.training_attendance
  drop constraint if exists training_attendance_exercises_are_ratings;
alter table public.training_attendance
  add constraint training_attendance_exercises_are_ratings
  check (private.training_exercise_ratings_are_valid(exercises));

alter table public.training_attendance
  drop constraint if exists training_attendance_no_exercises_without_the_dog;
alter table public.training_attendance
  add constraint training_attendance_no_exercises_without_the_dog
  check (
    mark is null or mark = 'late' or exercises = '[]'::jsonb
  );

comment on column public.training_attendance.exercises is
  'The exercises this dog did in this session and how it did: [{"exerciseName": text, "rating": 1-5}]. Empty for an absence.';

drop function if exists public.training_attendance_history(uuid, bigint);

create function public.training_attendance_history(
  p_facility_id uuid default null,
  p_pet_ref bigint default null
)
returns table (
  booking_id       uuid,
  booking_ref      bigint,
  facility_id      uuid,
  timezone         text,
  session_id       uuid,
  session_number   integer,
  session_start_at timestamptz,
  session_end_at   timestamptz,
  series_id        uuid,
  enrollment_id    uuid,
  pet_ref          bigint,
  pet_name         text,
  checked_in_at    timestamptz,
  checked_out_at   timestamptz,
  mark             text,
  session_notes    text,
  exercises        jsonb,
  recorded_at      timestamptz,
  updated_at       timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $fn$
  select b.id, b.ref, b.facility_id, f.timezone,
         s.id, s.session_number, s.start_at, s.end_at, s.series_id,
         e.id, p.ref, p.name,
         a.checked_in_at, a.checked_out_at, a.mark, a.session_notes,
         coalesce(a.exercises, '[]'::jsonb),
         a.created_at, a.updated_at
    from public.bookings b
    join public.training_series_sessions s on s.id = b.training_series_session_id
    join lateral (
      select x.pet_id from public.booking_pets x
       where x.booking_id = b.id
       order by x.pet_id
       limit 1
    ) bp on true
    join public.pets p on p.id = bp.pet_id
    join lateral (
      select y.id from public.training_series_enrollments y
       where y.series_id = s.series_id and y.pet_id = bp.pet_id and y.client_id = b.client_id
       order by y.enrolled_at desc
       limit 1
    ) e on true
    left join public.facilities f on f.id = b.facility_id
    left join public.training_attendance a on a.booking_id = b.id
   where b.service = 'training'
     and (p_facility_id is null or b.facility_id = p_facility_id)
     and (p_pet_ref is null or p.ref = p_pet_ref)
     and b.status::text not in ('cancelled', 'declined')
     and (s.end_at < now() or a.booking_id is not null)
   order by s.start_at desc
   limit 5000;
$fn$;

revoke all on function public.training_attendance_history(uuid, bigint) from public;
revoke all on function public.training_attendance_history(uuid, bigint) from anon;
grant execute on function public.training_attendance_history(uuid, bigint) to authenticated;

revoke all on function private.training_exercise_ratings_are_valid(jsonb) from public;
revoke all on function private.training_exercise_ratings_are_valid(jsonb) from anon;
-- The constraint runs it as whoever writes the row, so staff need it.
grant execute on function private.training_exercise_ratings_are_valid(jsonb) to authenticated, service_role;

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_function_privilege('anon', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'anon can execute training_attendance_history()';
  end if;
  if not has_function_privilege('authenticated', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'authenticated cannot execute training_attendance_history()';
  end if;
  if has_function_privilege('anon', 'private.training_exercise_ratings_are_valid(jsonb)', 'execute') then
    raise exception 'anon can execute training_exercise_ratings_are_valid()';
  end if;
  if not has_function_privilege('authenticated', 'private.training_exercise_ratings_are_valid(jsonb)', 'execute') then
    raise exception 'authenticated cannot execute training_exercise_ratings_are_valid()';
  end if;
end;
$check$;
