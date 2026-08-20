-- ============================================================================
-- Staff scheduling, phase 4: when people can actually work.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- `employeeAvailabilities` in src/data/scheduling.ts, keyed on `emp-1`,
-- `emp-2` … — legacy ids that match no staff row any more. The scheduling
-- module's conflict checker takes that array and asks "is this person free
-- then", and since the conversion to real ids the answer has been "no such
-- person" for everybody.
--
-- So the draft-review warnings were about nobody. Not wrong — ABSENT, which is
-- the more expensive kind: a manager sees "Schedule looks clean" and concludes
-- the rota was checked.
--
-- `availabilityChangeRequests` — the 664-line approval screen — was the same
-- fixture story with an Approve button on it.
--
-- ── THE PATTERN IS ROWS. THE PROPOSAL IS A DOCUMENT ───────────────────────
--
-- `staff_availability` is one row per person per weekday, because "who is free
-- on Tuesday morning" is a question the database should be able to answer and
-- a jsonb blob cannot be indexed for it.
--
-- `staff_availability_requests.proposed` is jsonb, because a proposal is only
-- ever read whole, compared side by side, and then either applied or thrown
-- away. Seven more rows in a second table with their own week semantics would
-- buy nothing and make "the proposal exactly as submitted" harder to keep.
--
-- ── AND IT SNAPSHOTS WHAT IT WOULD REPLACE ────────────────────────────────
--
-- `previous` is written at request time, not derived at read time. A decided
-- request has to stay readable years later, and the live pattern will have
-- moved on — so a screen comparing against it would show a diff that nobody
-- ever agreed to.
--
-- ── APPROVING APPLIES IT, IN ONE TRANSACTION ──────────────────────────────
--
-- The same lesson as the shift swap: a request marked approved whose change was
-- never applied is the worst state available, because both parties believe
-- something the rota disagrees with. `approve_availability_request` upserts the
-- seven rows and marks the request together, or does neither.
--
-- ── NOTHING HERE INVENTS A PERMISSION ─────────────────────────────────────
--
-- `view_own_schedule` is personal and held by all thirteen job titles — that is
-- the right key for "may propose a change to MY OWN availability", and there is
-- no separate `request_availability_change` to add.
-- `scheduling_manage_availability` (owner, admin, manager, and supervisor
-- during operating hours) approves.
-- ============================================================================

-- ── The pattern ───────────────────────────────────────────────────────────

create table if not exists public.staff_availability (
  staff_id       uuid not null references public.staff (id) on delete cascade,
  facility_id    uuid not null references public.facilities (id) on delete cascade,
  -- 0 = Sunday, matching JavaScript's `Date.getDay()`, which is what every
  -- screen reading this already uses. Choosing ISO-8601 here would put a silent
  -- off-by-one between the table and the calendar.
  day_of_week    smallint not null check (day_of_week between 0 and 6),
  is_available   boolean not null default true,
  -- `time`, not `timestamptz`: this is a weekly pattern, not an instant. Named
  -- `available_from`/`_to` rather than starts_at/ends_at so nobody reads them
  -- as the shift columns they sit next to.
  --
  -- Both NULL while available means ALL DAY. `available_to <= available_from`
  -- is a window that wraps past midnight, the same convention shifts use — a
  -- night worker free 22:00–06:00 is not a data error.
  available_from time,
  available_to   time,
  notes          text,
  updated_at     timestamptz not null default now(),
  primary key (staff_id, day_of_week),
  -- Unavailable means unavailable; carrying times on a day off is a second
  -- fact that can contradict the first.
  constraint staff_availability_unavailable_has_no_window check (
    is_available or (available_from is null and available_to is null)
  ),
  -- Half a window is not a window.
  constraint staff_availability_window_is_whole check (
    (available_from is null) = (available_to is null)
  )
);

create index if not exists staff_availability_facility_day
  on public.staff_availability (facility_id, day_of_week);

-- ── The proposal ──────────────────────────────────────────────────────────

create table if not exists public.staff_availability_requests (
  id             uuid primary key default gen_random_uuid(),
  facility_id    uuid not null references public.facilities (id) on delete cascade,
  staff_id       uuid not null references public.staff (id) on delete cascade,
  -- What the pattern was WHEN THIS WAS FILED. See the header.
  previous       jsonb not null default '[]'::jsonb,
  proposed       jsonb not null,
  -- When the new pattern should start applying. Recorded and shown; the apply
  -- is immediate on approval, because a scheduled future swap-over needs a job
  -- runner this project does not have, and pretending otherwise would be a date
  -- that silently does nothing.
  effective_from date not null,
  reason         text not null default '',
  status         public.approval_status not null default 'pending',
  requested_at   timestamptz not null default now(),
  reviewed_by    text references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  review_notes   text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint staff_availability_requests_proposed_is_a_week check (
    jsonb_typeof(proposed) = 'array' and jsonb_array_length(proposed) = 7
  ),
  constraint staff_availability_requests_previous_is_an_array check (
    jsonb_typeof(previous) = 'array'
  )
);

create index if not exists staff_availability_requests_facility_status
  on public.staff_availability_requests (facility_id, status);

create index if not exists staff_availability_requests_staff
  on public.staff_availability_requests (staff_id, requested_at desc);

-- One open proposal per person. Two pending requests means whichever is
-- approved second silently overwrites the first, and the requester has no way
-- to know which one they are now working.
create unique index if not exists staff_availability_one_pending_per_person
  on public.staff_availability_requests (staff_id)
  where (status = 'pending');

create trigger staff_availability_set_updated_at
  before update on public.staff_availability
  for each row execute function private.set_updated_at();

create trigger staff_availability_requests_set_updated_at
  before update on public.staff_availability_requests
  for each row execute function private.set_updated_at();

-- ============================================================================
-- The transition guard learns a third kind.
--
-- Same function as time off and swaps: a decision is final, and without the
-- approving permission the only move is withdrawing your own.
-- ============================================================================

create or replace function private.guard_request_transition()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_may_decide boolean;
  v_permission text := case tg_argv[0]
                         when 'time_off'     then 'scheduling_approve_time_off'
                         when 'availability' then 'scheduling_manage_availability'
                         else 'scheduling_approve_swaps'
                       end;
begin
  if new.status = old.status then
    return new;
  end if;

  if old.status <> 'pending' then
    raise exception 'That request has already been %.', old.status
      using errcode = '22023';
  end if;

  v_may_decide := private.has_permission(new.facility_id, v_permission);

  if not v_may_decide and new.status <> 'cancelled' then
    raise exception 'You do not have permission to decide this request.'
      using errcode = '42501';
  end if;

  if new.status in ('approved', 'denied') then
    new.reviewed_by := coalesce(new.reviewed_by, (select auth.jwt() ->> 'sub'));
    new.reviewed_at := coalesce(new.reviewed_at, now());
  end if;

  return new;
end;
$fn$;

create trigger staff_availability_requests_guard_transition
  before update on public.staff_availability_requests
  for each row execute function private.guard_request_transition('availability');

-- ============================================================================
-- Approving applies it.
--
-- SECURITY DEFINER for atomicity, not privilege — the permission check is the
-- first thing it does, against the caller's own cascade.
-- ============================================================================

create or replace function public.approve_availability_request(
  p_request_id uuid,
  p_notes      text default null
)
returns table (
  day_of_week    smallint,
  is_available   boolean,
  available_from time,
  available_to   time
)
language plpgsql
security definer
set search_path = ''
as $fn$
-- ── THE RETURNS TABLE COLUMNS ARE OUT PARAMETERS ────────────────────────
--
-- …and inside this body they SHADOW the identically-named columns of
-- `staff_availability`, so `on conflict (staff_id, day_of_week)` failed as
-- ambiguous — at runtime, with nothing wrong at creation time to notice. Found
-- by the probe on the first call. Column wins.
#variable_conflict use_column
declare
  v_request record;
  v_day     jsonb;
begin
  select * into v_request
    from public.staff_availability_requests
   where id = p_request_id;

  if v_request.id is null then
    raise exception 'No such availability request.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_request.facility_id, 'scheduling_manage_availability') then
    raise exception 'You do not have permission to decide availability.'
      using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'That request has already been %.', v_request.status
      using errcode = '22023';
  end if;

  -- The proposal REPLACES the week; it is not merged into it. A partial apply
  -- would leave somebody with three days from the new pattern and four from the
  -- old, which is a week nobody wrote.
  for v_day in select * from jsonb_array_elements(v_request.proposed)
  loop
    insert into public.staff_availability as sa (
      staff_id, facility_id, day_of_week, is_available,
      available_from, available_to, notes
    )
    values (
      v_request.staff_id,
      v_request.facility_id,
      (v_day ->> 'dayOfWeek')::smallint,
      coalesce((v_day ->> 'isAvailable')::boolean, false),
      -- Times are dropped when the day is not available, so the row cannot
      -- carry a window it is also saying does not exist.
      case when coalesce((v_day ->> 'isAvailable')::boolean, false)
           then nullif(v_day ->> 'startTime', '')::time end,
      case when coalesce((v_day ->> 'isAvailable')::boolean, false)
           then nullif(v_day ->> 'endTime', '')::time end,
      nullif(v_day ->> 'notes', '')
    )
    on conflict (staff_id, day_of_week) do update
      set is_available   = excluded.is_available,
          available_from = excluded.available_from,
          available_to   = excluded.available_to,
          notes          = excluded.notes,
          updated_at     = now();
  end loop;

  update public.staff_availability_requests
     set status       = 'approved',
         reviewed_by  = (select auth.jwt() ->> 'sub'),
         reviewed_at  = now(),
         review_notes = p_notes
   where id = p_request_id;

  return query
    select a.day_of_week, a.is_available, a.available_from, a.available_to
      from public.staff_availability a
     where a.staff_id = v_request.staff_id
     order by a.day_of_week;
end;
$fn$;

comment on function public.approve_availability_request(uuid, text) is
  'Approve a proposed weekly availability AND apply it, in one transaction. The proposal replaces the week rather than merging into it.';

-- ============================================================================
-- Row-level security.
-- ============================================================================

alter table public.staff_availability enable row level security;
alter table public.staff_availability_requests enable row level security;

revoke all on public.staff_availability from anon;
revoke all on public.staff_availability_requests from anon;

-- `revoke all` takes INSERT/UPDATE/DELETE with it and RLS cannot grant back a
-- privilege the role does not hold — the policy is simply never reached. Phase
-- 1 shipped that bug on facility_position_pay.
grant select, insert, update, delete
  on public.staff_availability, public.staff_availability_requests
  to authenticated;

grant execute on function public.approve_availability_request(uuid, text) to authenticated;

-- ── The pattern ───────────────────────────────────────────────────────────
--
-- READ is every member of the facility, deliberately. Who is free on Saturday
-- is what a rota is built from, and hiding it from the people building shifts
-- around each other would make the open-shift board unusable.

create policy staff_availability_read on public.staff_availability
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- WRITING the live pattern directly is a manager's act. Everybody else changes
-- it by proposing, which is the whole point of the requests table — otherwise
-- the approval flow is decorative.
create policy staff_availability_write on public.staff_availability
  for all using (private.has_permission(facility_id, 'scheduling_manage_availability'))
  with check (private.has_permission(facility_id, 'scheduling_manage_availability'));

-- ── The proposal ──────────────────────────────────────────────────────────

create policy staff_availability_requests_read on public.staff_availability_requests
  for select using (
    private.is_platform_admin()
    or (
      facility_id in (select private.member_facility_ids())
      and (
        private.has_permission(facility_id, 'scheduling_manage_availability')
        or private.has_permission(facility_id, 'scheduling_view_all')
        or staff_id in (select private.own_staff_ids())
      )
    )
  );

-- Proposing for YOURSELF needs only the personal key every job title holds.
-- Filing on somebody's behalf is a manager entering what was said in person.
create policy staff_availability_requests_insert on public.staff_availability_requests
  for insert with check (
    (
      staff_id in (select private.own_staff_ids())
      and private.has_permission(facility_id, 'view_own_schedule')
    )
    or private.has_permission(facility_id, 'scheduling_manage_availability')
  );

create policy staff_availability_requests_update on public.staff_availability_requests
  for update using (
    private.has_permission(facility_id, 'scheduling_manage_availability')
    or (staff_id in (select private.own_staff_ids()) and status = 'pending')
  )
  with check (
    private.has_permission(facility_id, 'scheduling_manage_availability')
    or staff_id in (select private.own_staff_ids())
  );

create policy staff_availability_requests_delete on public.staff_availability_requests
  for delete using (
    private.has_permission(facility_id, 'scheduling_manage_availability')
  );

comment on table public.staff_availability is
  'When somebody can work, as a weekly pattern. One row per weekday, 0 = Sunday to match Date.getDay(). NULL window while available means all day; available_to <= available_from wraps past midnight.';

comment on table public.staff_availability_requests is
  'A proposed replacement week awaiting approval. `previous` is snapshotted at request time so a decided request stays readable after the live pattern moves on.';
