-- ============================================================================
-- A make-up seat is in the dog's own history.
--
-- ── WHAT WAS WRONG ────────────────────────────────────────────────────────
--
-- A make-up (offer_training_makeup, 20260913090803) is a $0 booking in a
-- session of ANOTHER series. training_attendance_history() found a booking's
-- enrollment in the booking's own series — and a dog is not enrolled in the
-- series that hosts its make-up — so the lateral join found nothing and the
-- row was dropped. Whatever the trainer recorded at the make-up never reached
-- the dog's History tab or the owner's.
--
-- ── THE RULE NOW ──────────────────────────────────────────────────────────
--
-- A booking's enrollment is the dog's enrollment in the booking's series, or,
-- for the host booking of an offered make-up, its enrollment in the series it
-- missed. The booking's own series wins when both exist. `makeup` says which:
-- true when the enrollment is not in the session's series.
--
-- The return type gains a column, so the function is dropped and made again
-- with the same grants. SECURITY INVOKER as before: training_makeups' own
-- policy admits staff and the dog's owner, and nobody else.
-- ============================================================================

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
  makeup           boolean,
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
         e.series_id <> s.series_id,
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
    left join lateral (
      select ms.series_id from public.training_makeups m
        join public.training_series_sessions ms on ms.id = m.missed_session_id
       where m.host_booking_id = b.id
         and m.status = 'offered'
       limit 1
    ) mk on true
    join lateral (
      select y.id, y.series_id from public.training_series_enrollments y
       where y.pet_id = bp.pet_id
         and y.client_id = b.client_id
         and (y.series_id = s.series_id or y.series_id = mk.series_id)
       order by (y.series_id = s.series_id) desc, y.enrolled_at desc
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

comment on function public.training_attendance_history(uuid, bigint) is
  'Every ended or recorded session booking of an enrolled dog, with its times, mark, exercises and conditions. A make-up seat (training_makeups, offered) is read under the enrollment of the series the dog missed, with makeup = true.';

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
