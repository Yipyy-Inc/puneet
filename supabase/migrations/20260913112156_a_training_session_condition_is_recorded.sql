-- ============================================================================
-- A training session's conditions are kept with each dog who came.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- A student's History tab draws a session's weather and distraction level
-- next to its ratings — a 3 on recall in pouring rain beside a road is not a
-- 3 on a still morning. Only fixture rows had any: the session view had no
-- control for them, and the one dialog that did
-- (session-completion-dialog.tsx) is imported by nothing.
--
-- ── ON THE ATTENDANCE ROW ─────────────────────────────────────────────────
--
-- training_attendance.conditions is one object, or null when nobody said:
--
--   { "weather": ["rain", "windy"], "distractionLevel": "high" }
--
-- weather is any of sunny, cloudy, rain, hot, cold, windy; distractionLevel
-- one of low, medium, high. The session view saves the same conditions with
-- every dog it checked in, as it saves the session notes. A dog that did not
-- come worked through nothing, so an absent or excused row has none.
--
-- training_attendance_history() returns it. Its return type changes, so it is
-- dropped and made again with the same grants.
-- ============================================================================

create or replace function private.training_session_conditions_are_valid(p_conditions jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $fn$
  select p_conditions is null or (
    jsonb_typeof(p_conditions) = 'object'
    and not exists (
      select 1 from jsonb_object_keys(p_conditions) k(key)
       where k.key not in ('weather', 'distractionLevel')
    )
    and (
      not (p_conditions ? 'weather')
      or (
        jsonb_typeof(p_conditions -> 'weather') = 'array'
        and jsonb_array_length(p_conditions -> 'weather') <= 6
        and not exists (
          select 1 from jsonb_array_elements(p_conditions -> 'weather') w(value)
           where jsonb_typeof(w.value) <> 'string'
              or (w.value #>> '{}') not in ('sunny', 'cloudy', 'rain', 'hot', 'cold', 'windy')
        )
      )
    )
    and (
      not (p_conditions ? 'distractionLevel')
      or (
        jsonb_typeof(p_conditions -> 'distractionLevel') = 'string'
        and (p_conditions ->> 'distractionLevel') in ('low', 'medium', 'high')
      )
    )
  );
$fn$;

alter table public.training_attendance
  add column if not exists conditions jsonb;

alter table public.training_attendance
  drop constraint if exists training_attendance_conditions_are_known;
alter table public.training_attendance
  add constraint training_attendance_conditions_are_known
  check (private.training_session_conditions_are_valid(conditions));

alter table public.training_attendance
  drop constraint if exists training_attendance_no_conditions_without_the_dog;
alter table public.training_attendance
  add constraint training_attendance_no_conditions_without_the_dog
  check (mark is null or mark = 'late' or conditions is null);

comment on column public.training_attendance.conditions is
  'What the dog worked through in this session: {"weather": [sunny|cloudy|rain|hot|cold|windy], "distractionLevel": low|medium|high}. Null when nobody said, and for an absence.';

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
  conditions       jsonb,
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
         a.conditions,
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

revoke all on function private.training_session_conditions_are_valid(jsonb) from public;
revoke all on function private.training_session_conditions_are_valid(jsonb) from anon;
-- The constraint runs it as whoever writes the row, so staff need it.
grant execute on function private.training_session_conditions_are_valid(jsonb) to authenticated, service_role;

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_function_privilege('anon', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'anon can execute training_attendance_history()';
  end if;
  if not has_function_privilege('authenticated', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'authenticated cannot execute training_attendance_history()';
  end if;
  if has_function_privilege('anon', 'private.training_session_conditions_are_valid(jsonb)', 'execute') then
    raise exception 'anon can execute training_session_conditions_are_valid()';
  end if;
  if not has_function_privilege('authenticated', 'private.training_session_conditions_are_valid(jsonb)', 'execute') then
    raise exception 'authenticated cannot execute training_session_conditions_are_valid()';
  end if;
  if not private.training_session_conditions_are_valid('{"weather": ["rain", "windy"], "distractionLevel": "high"}')
     or private.training_session_conditions_are_valid('{"weather": ["snow"]}')
     or private.training_session_conditions_are_valid('{"mood": "grumpy"}')
     or private.training_session_conditions_are_valid('{"distractionLevel": "extreme"}') then
    raise exception 'training_session_conditions_are_valid() does not tell a condition from a word';
  end if;
end;
$check$;
