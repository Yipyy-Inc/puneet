-- ============================================================================
-- Staff scheduling, phase 2: time off, and shift swaps that move the shifts.
--
-- ── WHAT THIS REPLACES ────────────────────────────────────────────────────
--
-- Two screens that decided things nothing recorded:
--
--   services/scheduling/time-off      useState over a fixture. Approving
--                                     stamped `reviewedBy: "emp-1"` — a
--                                     hardcoded person — and the decision was
--                                     gone on reload.
--   services/scheduling/shift-swaps   localStorage via shift-swaps-store.ts.
--                                     Approving marked the REQUEST approved and
--                                     never touched either shift, so the rota
--                                     still had both people where they started,
--                                     and then said "Both employees have been
--                                     notified."
--
-- The second one is the reason this migration exists. A swap that does not swap
-- is worse than no swap feature at all: two people believe they have traded a
-- Saturday, and the roster disagrees with both of them.
--
-- ── APPROVING A SWAP IS ONE STATEMENT, NOT THREE ──────────────────────────
--
-- `approve_shift_swap` is SECURITY DEFINER for atomicity, not for privilege —
-- it checks the caller's own permission first. Three UPDATEs from a route could
-- fail after the second and leave both shifts unassigned, which is a worse rota
-- than the one the swap was meant to fix.
--
-- Both staff ids are cleared before either is reassigned. Without that, setting
-- shift A to person B trips the phase-1 exclusion constraint against person B's
-- own shift — the very shift they are trading away.
--
-- ── AND THE CONSTRAINT IS STILL ALLOWED TO REFUSE ─────────────────────────
--
-- If the trade would put somebody in two places at once — B has a THIRD shift
-- overlapping A's — the exclusion constraint raises, the whole function rolls
-- back, and the request stays pending. Approved-but-not-applied is not a state
-- this table can reach.
--
-- ── LEAVE IS IN DAYS. SHIFTS ARE IN INSTANTS ──────────────────────────────
--
-- "I am off on the 14th" is a calendar day at the facility, not a 24-hour
-- window in UTC, so time off is `date` and shifts stay `timestamptz`. Comparing
-- them therefore needs the facility's own timezone, and exactly one function
-- does that conversion: `time_off_shift_conflicts`.
--
-- ── WHICH ANSWERS THE QUESTION NOBODY WAS ASKING ──────────────────────────
--
-- Approving leave for somebody who is still rostered on those days is the
-- failure this feature exists to prevent, and neither screen could see it. The
-- approval is still the manager's call — it is not refused — but they are told,
-- with the shifts named.
--
-- ── SELF-APPROVAL IS ALLOWED, DELIBERATELY ────────────────────────────────
--
-- Separation of duties would say an approver may not approve their own leave.
-- At most of these facilities the owner IS the only approver, so that rule
-- would mean the owner could never take a holiday. Allowed, and recorded: every
-- decision carries `reviewed_by`, so approving your own is visible rather than
-- impossible.
-- ============================================================================

create type public.time_off_type as enum (
  'vacation',
  'sick_leave',
  'personal',
  'bereavement',
  'parental',
  'unpaid',
  'other'
);

-- Shared by both tables below. `cancelled` is the requester withdrawing;
-- `denied` is somebody else refusing. Collapsing them would lose which
-- happened, which is the only thing the requester cares about later.
create type public.approval_status as enum (
  'pending',
  'approved',
  'denied',
  'cancelled'
);

-- ── Time off ──────────────────────────────────────────────────────────────

create table if not exists public.staff_time_off_requests (
  id           uuid primary key default gen_random_uuid(),
  facility_id  uuid not null references public.facilities (id) on delete cascade,
  -- CASCADE, unlike staff_shifts: a shift with no one on it is an open shift a
  -- facility still has to fill, but a leave request with no requester is not a
  -- record of anything.
  staff_id     uuid not null references public.staff (id) on delete cascade,
  type         public.time_off_type not null,
  starts_on    date not null,
  ends_on      date not null,
  reason       text not null default '',
  status       public.approval_status not null default 'pending',
  requested_at timestamptz not null default now(),
  -- A profile, not a staff row. Every authenticated caller has one; a platform
  -- admin helping a facility out does not have a staff row at that facility.
  reviewed_by  text references public.profiles (id) on delete set null,
  reviewed_at  timestamptz,
  review_notes text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint staff_time_off_ends_on_or_after_it_starts check (ends_on >= starts_on)
);

create index if not exists staff_time_off_facility_window
  on public.staff_time_off_requests (facility_id, starts_on);

create index if not exists staff_time_off_staff
  on public.staff_time_off_requests (staff_id, starts_on);

-- One person cannot be granted the same days off twice. Only APPROVED rows
-- participate: two pending requests over the same week is somebody changing
-- their mind, and refusing that would make the second request impossible to
-- file rather than impossible to grant.
--
-- Inclusive on both ends — '[]' — because a request for the 14th to the 14th is
-- one day off, not an empty range.
alter table public.staff_time_off_requests
  drop constraint if exists staff_time_off_no_double_grant;

alter table public.staff_time_off_requests
  add constraint staff_time_off_no_double_grant
  exclude using gist (
    staff_id with =,
    daterange(starts_on, ends_on, '[]') with &&
  )
  where (status = 'approved');

-- ── Shift swaps ───────────────────────────────────────────────────────────

create table if not exists public.shift_swap_requests (
  id                   uuid primary key default gen_random_uuid(),
  facility_id          uuid not null references public.facilities (id) on delete cascade,
  -- The shift being offered. CASCADE: if the shift is gone there is nothing to
  -- trade, and a swap request pointing at a deleted shift is unreadable.
  requesting_shift_id  uuid not null references public.staff_shifts (id) on delete cascade,
  requesting_staff_id  uuid not null references public.staff (id) on delete cascade,
  -- Who is being asked. Required: an offer to nobody in particular is an open
  -- shift, which the roster already has a way to express (staff_id null).
  target_staff_id      uuid not null references public.staff (id) on delete cascade,
  -- NULL is a HAND-OFF — "please take my Saturday" — rather than a trade. Both
  -- shapes exist in a real rota and the difference is one nullable column.
  target_shift_id      uuid references public.staff_shifts (id) on delete cascade,
  reason               text not null default '',
  status               public.approval_status not null default 'pending',
  requested_at         timestamptz not null default now(),
  reviewed_by          text references public.profiles (id) on delete set null,
  reviewed_at          timestamptz,
  review_notes         text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint shift_swap_two_different_people check (requesting_staff_id <> target_staff_id),
  constraint shift_swap_two_different_shifts check (
    target_shift_id is null or target_shift_id <> requesting_shift_id
  )
);

create index if not exists shift_swap_facility_status
  on public.shift_swap_requests (facility_id, status);

create index if not exists shift_swap_target
  on public.shift_swap_requests (target_staff_id, status);

-- One live offer per shift. Two pending requests to give away the same Saturday
-- means whichever is approved second silently reassigns a shift its requester
-- no longer holds.
create unique index if not exists shift_swap_one_pending_per_shift
  on public.shift_swap_requests (requesting_shift_id)
  where (status = 'pending');

-- ── updated_at ────────────────────────────────────────────────────────────

create trigger staff_time_off_requests_set_updated_at
  before update on public.staff_time_off_requests
  for each row execute function private.set_updated_at();

create trigger shift_swap_requests_set_updated_at
  before update on public.shift_swap_requests
  for each row execute function private.set_updated_at();

-- ============================================================================
-- What a request is allowed to become.
--
-- RLS decides WHO may write the row; these decide WHAT the row may become. The
-- two are different questions and answering both in a policy makes the policy
-- unreadable — `using` sees the old row, `with check` sees the new one, and
-- "pending may become cancelled but only by its requester" needs both at once.
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
                         when 'time_off' then 'scheduling_approve_time_off'
                         else 'scheduling_approve_swaps'
                       end;
begin
  if new.status = old.status then
    return new;
  end if;

  -- A decision is final. Re-opening an approved request would move somebody's
  -- shifts back with nothing recording that it happened.
  if old.status <> 'pending' then
    raise exception 'That request has already been %.', old.status
      using errcode = '22023';
  end if;

  v_may_decide := private.has_permission(new.facility_id, v_permission);

  -- Without the permission the only move is withdrawing your own request, and
  -- RLS has already established it is yours.
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

create trigger staff_time_off_requests_guard_transition
  before update on public.staff_time_off_requests
  for each row execute function private.guard_request_transition('time_off');

create trigger shift_swap_requests_guard_transition
  before update on public.shift_swap_requests
  for each row execute function private.guard_request_transition('swap');

-- ============================================================================
-- A swap request has to describe a trade that could actually happen.
--
-- RLS can say "this row is yours to insert". It cannot cheaply say "and the
-- shift you named is one you are actually on" — that is a join to another
-- table, whose own policy would then decide whether the check passes, which
-- makes the answer depend on what the caller can SEE rather than what is true.
-- ============================================================================

create or replace function private.guard_swap_shape()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_requesting record;
  v_target     record;
begin
  select staff_id, facility_id into v_requesting
    from public.staff_shifts where id = new.requesting_shift_id;

  -- The foreign key would catch this at statement end, but a BEFORE trigger
  -- runs first and every comparison below against a missing row is NULL — which
  -- would fall through to "you can only offer a shift you are assigned to" and
  -- send somebody looking for a permission problem that is not there.
  if v_requesting.facility_id is null then
    raise exception 'No such shift.' using errcode = 'P0002';
  end if;

  if v_requesting.facility_id <> new.facility_id then
    raise exception 'That shift belongs to another facility.'
      using errcode = '23514';
  end if;

  -- You can only offer a shift you are on. Otherwise a groomer could file a
  -- request giving away the manager's Saturday, and an approver clicking
  -- through a queue would apply it.
  if v_requesting.staff_id is distinct from new.requesting_staff_id then
    raise exception 'You can only offer a shift you are assigned to.'
      using errcode = '23514';
  end if;

  if new.target_shift_id is not null then
    select staff_id, facility_id into v_target
      from public.staff_shifts where id = new.target_shift_id;

    if v_target.facility_id <> new.facility_id then
      raise exception 'That shift belongs to another facility.'
        using errcode = '23514';
    end if;

    if v_target.staff_id is distinct from new.target_staff_id then
      raise exception 'The shift you asked for is not assigned to that person.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$fn$;

create trigger shift_swap_requests_guard_shape
  before insert on public.shift_swap_requests
  for each row execute function private.guard_swap_shape();

-- ============================================================================
-- Approving a swap.
--
-- SECURITY DEFINER for ATOMICITY, not for privilege: the permission check is
-- the first thing it does, against the caller's own cascade.
-- ============================================================================

create or replace function public.approve_shift_swap(
  p_request_id uuid,
  p_notes      text default null
)
returns table (
  moved_shift_id uuid,
  now_assigned   uuid
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_request record;
begin
  select * into v_request
    from public.shift_swap_requests
   where id = p_request_id;

  if v_request.id is null then
    raise exception 'No such swap request.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_request.facility_id, 'scheduling_approve_swaps') then
    raise exception 'You do not have permission to approve shift swaps.'
      using errcode = '42501';
  end if;

  if v_request.status <> 'pending' then
    raise exception 'That request has already been %.', v_request.status
      using errcode = '22023';
  end if;

  -- Both sides are vacated first. Assigning the offered shift to its new owner
  -- while they still hold the shift they are trading away trips the phase-1
  -- exclusion constraint against the exact row this statement is about to move.
  update public.staff_shifts
     set staff_id = null
   where id in (v_request.requesting_shift_id, v_request.target_shift_id);

  update public.staff_shifts
     set staff_id = v_request.target_staff_id
   where id = v_request.requesting_shift_id;

  -- A hand-off has no second shift: the requester simply gives theirs up.
  if v_request.target_shift_id is not null then
    update public.staff_shifts
       set staff_id = v_request.requesting_staff_id
     where id = v_request.target_shift_id;
  end if;

  update public.shift_swap_requests
     set status       = 'approved',
         reviewed_by  = (select auth.jwt() ->> 'sub'),
         reviewed_at  = now(),
         review_notes = p_notes
   where id = p_request_id;

  return query
    select s.id, s.staff_id
      from public.staff_shifts s
     where s.id = v_request.requesting_shift_id
        or s.id = v_request.target_shift_id
     order by s.starts_at;
end;
$fn$;

comment on function public.approve_shift_swap(uuid, text) is
  'Approve a swap AND move the shifts, in one transaction. If the trade would double-book somebody the exclusion constraint raises 23P01, everything rolls back, and the request stays pending — approved-but-not-applied is unreachable.';

-- ============================================================================
-- Which shifts a person is still rostered for during leave they have asked for.
--
-- The only place a `date` range and a `timestamptz` range are compared, and it
-- needs the facility's own timezone to do it: leave is a calendar day where the
-- facility is, and `ends_on + 1` at midnight local is the exclusive end.
-- ============================================================================

create or replace function public.time_off_shift_conflicts(p_request_id uuid)
returns table (
  shift_id  uuid,
  starts_at timestamptz,
  ends_at   timestamptz
)
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_request  record;
  v_timezone text;
begin
  select * into v_request
    from public.staff_time_off_requests
   where id = p_request_id;

  if v_request.id is null then
    raise exception 'No such time-off request.' using errcode = 'P0002';
  end if;

  if not private.has_permission(v_request.facility_id, 'scheduling_approve_time_off')
     and v_request.staff_id not in (select private.own_staff_ids()) then
    raise exception 'You do not have permission to read that request.'
      using errcode = '42501';
  end if;

  select coalesce(f.timezone, 'UTC') into v_timezone
    from public.facilities f
   where f.id = v_request.facility_id;

  return query
    select s.id, s.starts_at, s.ends_at
      from public.staff_shifts s
     where s.staff_id = v_request.staff_id
       and s.status <> 'cancelled'
       and s.starts_at < ((v_request.ends_on + 1)::timestamp at time zone v_timezone)
       and s.ends_at   > (v_request.starts_on::timestamp at time zone v_timezone)
     order by s.starts_at;
end;
$fn$;

comment on function public.time_off_shift_conflicts(uuid) is
  'Shifts the requester is still rostered for during the leave. Approving over a rostered shift is allowed — it is the manager''s call — but it is never silent.';

-- ============================================================================
-- Row-level security.
-- ============================================================================

alter table public.staff_time_off_requests enable row level security;
alter table public.shift_swap_requests enable row level security;

revoke all on public.staff_time_off_requests from anon;
revoke all on public.shift_swap_requests from anon;

-- `revoke all` above takes INSERT/UPDATE/DELETE with it, and RLS cannot grant
-- back a privilege the role does not hold — the policy is simply never reached
-- and the write fails with nothing to explain it. Phase 1 shipped that bug on
-- facility_position_pay; it is not shipping again.
grant select, insert, update, delete
  on public.staff_time_off_requests, public.shift_swap_requests
  to authenticated;

grant execute on function public.approve_shift_swap(uuid, text) to authenticated;
grant execute on function public.time_off_shift_conflicts(uuid) to authenticated;

-- ── Time off ──────────────────────────────────────────────────────────────
--
-- Reading is the same three-way shape as shifts: everything if you roster, and
-- your own either way. Somebody has to be able to see the holiday they booked
-- without being able to see everyone else's sick leave.

create policy staff_time_off_read on public.staff_time_off_requests
  for select using (
    private.is_platform_admin()
    or (
      facility_id in (select private.member_facility_ids())
      and (
        private.has_permission(facility_id, 'scheduling_approve_time_off')
        or private.has_permission(facility_id, 'scheduling_view_all')
        or staff_id in (select private.own_staff_ids())
      )
    )
  );

-- Filing for yourself needs the personal permission every job title holds.
-- Filing for somebody else needs the approver's — a manager entering the leave
-- a caretaker phoned in is legitimate; a caretaker filing in the manager's name
-- is not.
create policy staff_time_off_insert on public.staff_time_off_requests
  for insert with check (
    (
      staff_id in (select private.own_staff_ids())
      and private.has_permission(facility_id, 'request_time_off')
    )
    or private.has_permission(facility_id, 'scheduling_approve_time_off')
  );

create policy staff_time_off_update on public.staff_time_off_requests
  for update using (
    private.has_permission(facility_id, 'scheduling_approve_time_off')
    or (staff_id in (select private.own_staff_ids()) and status = 'pending')
  )
  with check (
    private.has_permission(facility_id, 'scheduling_approve_time_off')
    or staff_id in (select private.own_staff_ids())
  );

-- Withdrawing is a status, not a delete: a request that vanishes takes the
-- record that it was ever refused with it. Removing the row entirely is for
-- somebody who rosters.
create policy staff_time_off_delete on public.staff_time_off_requests
  for delete using (
    private.has_permission(facility_id, 'scheduling_approve_time_off')
  );

-- ── Swaps ─────────────────────────────────────────────────────────────────
--
-- The person being ASKED can see it too, which the read policy has to say
-- explicitly — a request aimed at somebody they cannot see is an offer nobody
-- can answer.

create policy shift_swap_read on public.shift_swap_requests
  for select using (
    private.is_platform_admin()
    or (
      facility_id in (select private.member_facility_ids())
      and (
        private.has_permission(facility_id, 'scheduling_approve_swaps')
        or private.has_permission(facility_id, 'scheduling_view_all')
        or requesting_staff_id in (select private.own_staff_ids())
        or target_staff_id in (select private.own_staff_ids())
      )
    )
  );

create policy shift_swap_insert on public.shift_swap_requests
  for insert with check (
    (
      requesting_staff_id in (select private.own_staff_ids())
      and private.has_permission(facility_id, 'request_shift_swap')
    )
    or private.has_permission(facility_id, 'scheduling_approve_swaps')
  );

create policy shift_swap_update on public.shift_swap_requests
  for update using (
    private.has_permission(facility_id, 'scheduling_approve_swaps')
    or (requesting_staff_id in (select private.own_staff_ids()) and status = 'pending')
  )
  with check (
    private.has_permission(facility_id, 'scheduling_approve_swaps')
    or requesting_staff_id in (select private.own_staff_ids())
  );

create policy shift_swap_delete on public.shift_swap_requests
  for delete using (
    private.has_permission(facility_id, 'scheduling_approve_swaps')
  );

-- ── Comments ──────────────────────────────────────────────────────────────

comment on table public.staff_time_off_requests is
  'Leave, in calendar days at the facility. Approving over a rostered shift is permitted and reported — see time_off_shift_conflicts.';

comment on table public.shift_swap_requests is
  'One offer to trade or hand off a shift. target_shift_id NULL is a hand-off. Approving goes through approve_shift_swap, which moves the shifts in the same transaction.';
