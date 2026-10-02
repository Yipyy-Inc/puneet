-- ============================================================================
-- A class knows which program it runs, and a customer sees the spots left.
--
-- The booking wizard's training "Trainer & time" (the client's mock,
-- 2026-10-01) lists a group program's classes as
--
--   OCT 3   Puppy Foundations                         2 of 6 spots left
--           Saturdays · 10:00 AM · with Alex M.
--   OCT 6   Adult Obedience                           Full · waitlist only
--
-- Three things stood in the way:
--
--   WHICH PROGRAM   a series named its course in free text, and the
--                   catalogue matched it to a program by overlapping words
--                   (`matchSeriesForCourse`). `program_id` is the facility's
--                   own program (the `training_programs` setting's id), set
--                   when a series is made for one; a series without it is
--                   matched by name exactly as before.
--   CLASS OR LESSON a one-on-one session is a one-date series of its own
--                   (the training page's "new session", and now the wizard's
--                   private lessons), and it is not a class anybody else may
--                   join. `kind` says so; every capacity-1 series already in
--                   the table is a private one, which is how the book mapper
--                   has always read it.
--   THE SPOTS       a customer may read only their OWN enrolments, so the
--                   spots they were shown were capacity minus their own dogs
--                   — every class looked emptier than it was. And the trainer
--                   was blank: customers cannot read `staff`.
--
-- `offered_training_classes()` answers both, for a client or member of the
-- facility: active classes with a session still to come, how many places are
-- left (capacity minus the enrolled, never who), and the trainer as "Alex M."
-- — only where the trainer's profile is shown online.
-- ============================================================================

alter table public.training_series
  add column program_id text,
  add column kind text not null default 'class'
    constraint training_series_kind_check check (kind in ('class', 'private'));

comment on column public.training_series.program_id is
  'The facility program (the training_programs setting id) this series runs. '
  'Null: matched to a program by name, as every series before it was.';
comment on column public.training_series.kind is
  'class = a series dogs enrol in together; private = a one-on-one session '
  '(a lesson or a consult) for one household.';

-- Every capacity-1 series is a private session: the book mapper has always
-- read it so, and nothing else makes one.
update public.training_series set kind = 'private' where capacity = 1;

create or replace function public.offered_training_classes(p_facility_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $fn$
  with allowed as (
    select private.is_platform_admin()
        or p_facility_id in (select private.client_facility_ids())
        or p_facility_id in (select private.member_facility_ids_all()) as ok
  ),
  classes as (
    select s.*,
           (select count(*) from public.training_series_sessions ss
             where ss.series_id = s.id and ss.start_at > now()
               and ss.status <> 'cancelled') as sessions_left,
           (select min(ss.start_at) from public.training_series_sessions ss
             where ss.series_id = s.id and ss.start_at > now()
               and ss.status <> 'cancelled') as next_session_at,
           (select count(*) from public.training_series_enrollments e
             where e.series_id = s.id and e.status = 'enrolled') as enrolled
      from public.training_series s
      cross join allowed
     where allowed.ok
       and s.facility_id = p_facility_id
       and s.status = 'active'
       and s.kind = 'class'
       -- One place is a one-on-one session, however it was made: the book
       -- mapper has always read capacity 1 as private.
       and s.capacity > 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id',               c.id,
           'name',             c.name,
           'courseTypeName',   c.course_type_name,
           'programId',        c.program_id,
           'dayOfWeek',        c.day_of_week,
           'startTime',        to_char(c.start_time, 'HH24:MI'),
           'durationMinutes',  c.duration_minutes,
           'startDate',        c.start_date,
           'numberOfSessions', c.number_of_sessions,
           'sessionsLeft',     c.sessions_left,
           'nextSessionAt',    c.next_session_at,
           'capacity',         c.capacity,
           -- How many places, never who holds them.
           'spotsLeft',        greatest(c.capacity - c.enrolled, 0),
           'totalPrice',       c.total_price,
           'taxable',          c.taxable,
           'locationId',       c.location_id,
           -- "Alex M.", where the trainer is shown online.
           'trainerName',      (select case when tp.visible_online
                                         then trim(st.first_name || ' ' ||
                                              left(coalesce(st.last_name, ''), 1) ||
                                              case when coalesce(st.last_name, '') = ''
                                                   then '' else '.' end)
                                    end
                                  from public.staff st
                                  left join public.training_trainer_profiles tp
                                    on tp.staff_id = st.id
                                 where st.id = c.staff_id))
         order by c.next_session_at nulls last, c.name), '[]'::jsonb)
    from classes c
   where c.sessions_left > 0;
$fn$;

comment on function public.offered_training_classes(uuid) is
  'The active training classes of a facility with a session still to come, '
  'as a client or member may see them: schedule, price, how many places are '
  'left (never who), and the trainer as "First L." where shown online.';

-- Both revokes are asserted in the test: `from public` and `from anon` are
-- different grants (20260822610000).
revoke all on function public.offered_training_classes(uuid) from public;
revoke all on function public.offered_training_classes(uuid) from anon;
grant execute on function public.offered_training_classes(uuid)
  to authenticated, service_role;
