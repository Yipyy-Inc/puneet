-- ============================================================================
-- A training absence is recorded, and a dog's attendance is read from the
-- sessions it was booked into.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- Every attendance screen in training — a student's History and Overview
-- tabs, the no-show risk on the profile, the calendar sidebar's attendance
-- rate, the pre-session briefing, the session view's roster and the owner's My
-- Pets tab — read `sessionAttendances`, a fixture. A session view's "Complete
-- session" checked in the dogs marked present or late and wrote nothing for a
-- dog marked absent, and nothing said a dog was late.
--
-- ── A MARK BESIDE THE TIMES ───────────────────────────────────────────────
--
-- training_attendance (20260806980000) is one row per booking, and its status
-- is generated from the check-in and check-out times. `mark` says what the
-- times cannot:
--
--   late      checked in, after the start
--   absent    did not come
--   excused   did not come, and the owner said
--
-- A dog that simply came has no mark. An absent or excused one has no times;
-- a late one has a check-in.
--
-- ── READING IT ────────────────────────────────────────────────────────────
--
-- training_attendance_history() returns one row per session booking of an
-- enrolled dog that has ended or been recorded, with its times and its mark. A
-- session that ended with no row comes back too: the dog was booked and
-- nobody checked it in. SECURITY INVOKER — the bookings, sessions and
-- attendance policies decide what comes back; p_facility_id narrows staff to
-- the facility on screen, p_pet_ref to one dog.
-- ============================================================================

alter table public.training_attendance
  add column if not exists mark text;

alter table public.training_attendance
  drop constraint if exists training_attendance_mark_is_known;
alter table public.training_attendance
  add constraint training_attendance_mark_is_known
  check (mark is null or mark in ('late', 'absent', 'excused'));

alter table public.training_attendance
  drop constraint if exists training_attendance_mark_agrees_with_the_times;
alter table public.training_attendance
  add constraint training_attendance_mark_agrees_with_the_times
  check (
    mark is null
    or (mark = 'late' and checked_in_at is not null)
    or (mark in ('absent', 'excused') and checked_in_at is null and checked_out_at is null)
  );

comment on column public.training_attendance.mark is
  'What the times cannot say: late (checked in after the start), absent (did not come) or excused (did not come, and the owner said). Null for a dog that simply came.';

create or replace function public.training_attendance_history(
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

-- ── A revoke is not verified by having been written ───────────────────────

do $check$
begin
  if has_function_privilege('anon', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'anon can execute training_attendance_history()';
  end if;
  if not has_function_privilege('authenticated', 'public.training_attendance_history(uuid, bigint)', 'execute') then
    raise exception 'authenticated cannot execute training_attendance_history()';
  end if;
end;
$check$;
