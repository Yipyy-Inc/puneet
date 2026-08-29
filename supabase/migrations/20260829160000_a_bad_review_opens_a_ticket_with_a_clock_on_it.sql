-- ============================================================================
-- A bad review opens a ticket, and the ticket has a clock on it.
--
-- ── WHAT WAS MISSING ──────────────────────────────────────────────────────
--
-- The shipped Escalations tab had no age, no due date and no resolution. One
-- ticket had been open since 27 April with nothing on screen suggesting that
-- was unusual. A queue with no time pressure is a list, and a list of
-- complaints nobody is measured on is worse than no list, because it looks like
-- a process.
--
-- This is also where Yipyy is furthest ahead of the reference product, which
-- sends a "sorry to hear that" reply and stops. Finishing it means adding the
-- clock and the closing loop, not more fields.
--
-- ── WHY A TABLE AND NOT JUST A facility_tasks ROW ─────────────────────────
--
-- `facility_tasks` has ONE `due_at` where this needs two — acknowledge and
-- resolve are different promises with different clocks. It has one
-- `assigned_to` where the resolved routing chain alerts a set. It has no
-- closed resolution vocabulary. And `private.task_owner_moves_status_only`
-- (20260823600000) forbids the assignee changing anything but status, which is
-- exactly backwards for a ticket whose whole life is the assignee recording
-- what they did.
--
-- So: this table is the case file, and a `facility_tasks` row is the assignee's
-- inbox item. Both, because a ticket nobody sees on the board they already work
-- is a ticket nobody works. The unique index reserved for this since
-- 20260823600000 — (facility_id, source, source_ref) where source_ref is not
-- null, with 'reputation_escalation' already an allowed source — makes the
-- linkage idempotent for free. That slot has been sitting unused since the day
-- it was added.
--
-- ── THE CLOCK IS BUSINESS HOURS, AND THAT IS THE WHOLE POINT ──────────────
--
-- "Opened Monday 16:00, breached Tuesday 12:00" is only true on a business-hours
-- clock. A naive four hours gives Monday 20:00 — a breach recorded while the
-- building is empty, and an alert nobody could have acted on. So the deadline
-- walks the facility's own opening hours out of `facility_settings`.
--
-- ── AND THE TICKET IS OPENED IN THE SAME TRANSACTION AS THE RATING ────────
--
-- `submit_review_response` inserts it. A 2-star that is recorded without a
-- ticket is the failure this feature exists to prevent, and making it a
-- separate call would create a window where exactly that is true.
-- ============================================================================

-- ── The business-hours clock ──────────────────────────────────────────────

create or replace function private.business_hours_deadline(
  p_facility_id uuid,
  p_from timestamptz,
  p_minutes integer
)
returns timestamptz
language plpgsql
stable
security definer
set search_path = ''
as $fn$
declare
  v_hours jsonb;
  v_zone text;
  v_cursor timestamptz := p_from;
  v_left integer := p_minutes;
  v_day text;
  v_open time;
  v_close time;
  v_local timestamp;
  v_day_open timestamptz;
  v_day_close timestamptz;
  v_available integer;
  v_guard integer := 0;
begin
  select coalesce(l.timezone, f.timezone, 'America/Toronto')
    into v_zone
    from public.facilities f
    left join public.locations l on l.facility_id = f.id and l.is_primary
   where f.id = p_facility_id;

  select s.value into v_hours
    from public.facility_settings s
   where s.facility_id = p_facility_id and s.domain = 'business_hours';

  -- No configured hours means no basis for a business-hours promise. Fall back
  -- to wall-clock rather than inventing a 9-to-5 the facility never agreed to:
  -- a deadline computed from a guess is worse than an obviously blunt one.
  if v_hours is null then
    return p_from + make_interval(mins => p_minutes);
  end if;

  -- Walk forward a day at a time, spending the minutes that fall inside opening
  -- hours. The guard is a fortnight: a facility that has marked every day
  -- closed would otherwise loop for ever, and answering "two weeks" is more
  -- useful than hanging.
  while v_left > 0 and v_guard < 14 loop
    v_guard := v_guard + 1;
    v_local := v_cursor at time zone v_zone;
    v_day := lower(to_char(v_local, 'FMday'));

    if coalesce((v_hours -> v_day ->> 'isOpen')::boolean, false) then
      v_open  := (v_hours -> v_day ->> 'openTime')::time;
      v_close := (v_hours -> v_day ->> 'closeTime')::time;

      v_day_open  := (date_trunc('day', v_local) + v_open)  at time zone v_zone;
      v_day_close := (date_trunc('day', v_local) + v_close) at time zone v_zone;

      -- Opened before the doors: the clock starts when they open.
      if v_cursor < v_day_open then
        v_cursor := v_day_open;
      end if;

      if v_cursor < v_day_close then
        v_available := ceil(extract(epoch from (v_day_close - v_cursor)) / 60);
        if v_available >= v_left then
          return v_cursor + make_interval(mins => v_left);
        end if;
        v_left := v_left - v_available;
      end if;
    end if;

    -- Next day, at midnight local, so the loop above re-reads that day's hours.
    v_cursor := (date_trunc('day', v_local) + interval '1 day') at time zone v_zone;
  end loop;

  return v_cursor;
end;
$fn$;

comment on function private.business_hours_deadline(uuid, timestamptz, integer) is
  'Walks a facility''s own opening hours forward by p_minutes. Falls back to wall-clock when no hours are configured, rather than inventing a 9-to-5.';

revoke all on function private.business_hours_deadline(uuid, timestamptz, integer) from public, anon;
grant execute on function private.business_hours_deadline(uuid, timestamptz, integer) to authenticated, service_role;

-- ── review_escalations ────────────────────────────────────────────────────

create table if not exists public.review_escalations (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  location_id uuid references public.locations(id) on delete set null,

  -- One ticket per response. A second rating cannot arrive (rate-once), so a
  -- second ticket could only ever be a duplicate of this one.
  response_id uuid not null unique
    references public.review_responses(id) on delete cascade,

  service_type text,

  state text not null default 'open' check (state in (
    'open', 'acknowledged', 'in_recovery', 'resolved', 'closed')),

  -- THE WHOLE RESOLVED CHAIN, not one name. The shipped screen showed Boarding
  -- as "Falls back to default" beside "1 assigned" for everything else - two
  -- labels for one mechanism, and no way to see who would actually be told.
  assignee_ids uuid[] not null default '{}',

  opened_at timestamptz not null default now(),
  first_response_due_at timestamptz not null,
  acknowledged_at timestamptz,
  acknowledged_by text references public.profiles(id) on delete set null,
  resolve_due_at timestamptz not null,
  resolved_at timestamptz,
  resolved_by text references public.profiles(id) on delete set null,

  -- A closed vocabulary, so "we fixed four of eight Laval complaints for the
  -- same reason" is a query rather than a hunch.
  resolution_code text check (resolution_code in (
    'contacted_apologised', 'credit_issued', 'refunded', 'policy_change',
    'staff_coached', 'no_contact_possible', 'client_satisfied')),
  resolution_note text,

  breach_notified_at timestamptz,

  created_at timestamptz not null default now(),

  -- NO `incident_id`, deliberately. There is no incidents table - src/data
  -- holds 651 lines of fixtures and three permission keys with nothing behind
  -- them - and a nullable FK to a table that does not exist is a claim the
  -- schema cannot keep. That is exactly how facility_tasks.source gained
  -- 'reputation_escalation' and then sat unused for months. Add the column in
  -- the same migration that makes incidents real.

  constraint review_escalations_resolved_says_how
    check ((resolved_at is null) = (resolution_code is null)),
  constraint review_escalations_closed_is_resolved
    check (state <> 'closed' or resolved_at is not null),
  constraint review_escalations_acknowledged_says_who
    check ((acknowledged_at is null) = (acknowledged_by is null))
);

create index if not exists review_escalations_open_idx
  on public.review_escalations (facility_id, first_response_due_at)
  where state in ('open', 'acknowledged', 'in_recovery');

create index if not exists review_escalations_breach_idx
  on public.review_escalations (first_response_due_at)
  where breach_notified_at is null
    and state in ('open', 'acknowledged', 'in_recovery');

comment on table public.review_escalations is
  'One recovery ticket per poor rating. The case file; the assignee''s to-do is a linked facility_tasks row.';

-- ── review_escalation_events ──────────────────────────────────────────────
--
-- Append-only. What was done and by whom, so a resolution code is a summary of
-- something rather than an assertion. Never updated and never deleted: a
-- recovery log that can be edited is a recovery log nobody can rely on.

create table if not exists public.review_escalation_events (
  id bigint generated always as identity primary key,
  facility_id uuid not null references public.facilities(id) on delete cascade,
  escalation_id uuid not null
    references public.review_escalations(id) on delete cascade,

  kind text not null check (kind in (
    'opened', 'assigned', 'acknowledged', 'call', 'message', 'note',
    'credit', 'refund', 'state_change', 'sla_breach', 'resolved', 'reinvited')),

  actor text references public.profiles(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index if not exists review_escalation_events_idx
  on public.review_escalation_events (escalation_id, occurred_at);

comment on table public.review_escalation_events is
  'Append-only recovery log. No update or delete grant exists, for anybody.';

-- ── Opening one ──────────────────────────────────────────────────────────
--
-- Called from `submit_review_response`, in the same transaction as the rating.
-- SECURITY DEFINER because the caller is `anon`: a customer answering a survey
-- has no session and cannot be given rights over a facility's tickets.

create or replace function private.open_review_escalation(
  p_response_id uuid
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $fn$
declare
  v_resp   public.review_responses%rowtype;
  v_req    public.review_requests%rowtype;
  v_esc    uuid;
  v_ack_minutes integer := 240;      -- four business hours
  v_res_minutes integer := 1440;     -- three business days, at 8h each
  v_service text;
  v_assignees uuid[];
  v_task_id uuid;
begin
  select * into v_resp from public.review_responses where id = p_response_id;
  if not found then return null; end if;

  select * into v_req from public.review_requests where id = v_resp.request_id;
  if not found then return null; end if;

  -- The threshold ON THE REQUEST, not current config. A facility that raised
  -- its threshold last month must not retroactively acquire tickets for ratings
  -- it deliberately let pass at the time.
  if v_resp.rating > v_req.escalation_threshold then
    return null;
  end if;

  v_service := coalesce(v_req.service_types[1], 'general');

  -- Who to tell. The person the visit was attributed to is the first candidate
  -- because they were there; a routing table can refine this later, and until
  -- it exists this is at least somebody real rather than the fixture's
  -- "Manager One".
  v_assignees := case
    when v_resp.attributed_staff_id is not null
      then array[v_resp.attributed_staff_id]
    when v_req.primary_staff_id is not null
      then array[v_req.primary_staff_id]
    else '{}'::uuid[]
  end;

  insert into public.review_escalations (
    facility_id, location_id, response_id, service_type,
    assignee_ids, first_response_due_at, resolve_due_at)
  values (
    v_req.facility_id, v_req.location_id, p_response_id, v_service,
    v_assignees,
    private.business_hours_deadline(v_req.facility_id, now(), v_ack_minutes),
    private.business_hours_deadline(v_req.facility_id, now(), v_res_minutes))
  on conflict (response_id) do nothing
  returning id into v_esc;

  if v_esc is null then return null; end if;

  insert into public.review_escalation_events
    (facility_id, escalation_id, kind, payload)
  values (
    v_req.facility_id, v_esc, 'opened',
    jsonb_build_object('rating', v_resp.rating,
                       'threshold', v_req.escalation_threshold));

  -- The assignee's inbox item. `source_ref` is the escalation, and the unique
  -- index on (facility_id, source, source_ref) makes this idempotent — a retry
  -- adds nothing rather than a second identical task.
  insert into public.facility_tasks (
    facility_id, title, description, category, priority, status,
    assigned_to, due_at, source, source_ref, created_by)
  values (
    v_req.facility_id,
    'Recovery call: ' || v_resp.rating || '-star review',
    coalesce(nullif(btrim(v_resp.comment), ''),
             'No comment left. Call and ask what went wrong.'),
    'customer-service',
    case when v_resp.rating <= 2 then 'urgent' else 'high' end,
    'pending',
    v_assignees[1],
    private.business_hours_deadline(v_req.facility_id, now(), v_ack_minutes),
    'reputation_escalation', v_esc::text, 'yipyy')
  on conflict do nothing
  returning id into v_task_id;

  return v_esc;
end;
$fn$;

comment on function private.open_review_escalation(uuid) is
  'Opens a recovery ticket for a response at or below the threshold IN FORCE WHEN ASKED, plus its facility_tasks row. Idempotent by response_id.';

revoke all on function private.open_review_escalation(uuid) from public, anon;
grant execute on function private.open_review_escalation(uuid) to authenticated, service_role;

-- ── And the rating opens it ──────────────────────────────────────────────
--
-- `submit_review_response` gains one line. Everything else about it is
-- unchanged; it is replaced whole because Postgres has no way to add a
-- statement to an existing function body.

create or replace function public.submit_review_response(
  p_token           text,
  p_rating          integer,
  p_comment         text default null,
  p_tag_ids         uuid[] default '{}',
  p_staff_id        uuid default null,
  p_display_consent boolean default false,
  p_locale          text default null,
  p_source          text default 'sms_link'
)
returns jsonb
language plpgsql volatile security definer set search_path = ''
as $fn$
declare
  v_req      public.review_requests%rowtype;
  v_response uuid;
  v_staff    uuid;
  v_escalation uuid;
begin
  if p_token is null or length(p_token) < 16 then
    raise exception 'That review link is not valid.' using errcode = '42501';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'A rating is 1 to 5.' using errcode = '22023';
  end if;

  select * into v_req
    from public.review_requests
   where token_hash = private.hash_review_token(p_token)
     and token_expires_at > now()
     and state not in ('suppressed', 'cancelled', 'expired')
   for update;

  if not found then
    raise exception 'That review link is not valid.' using errcode = '42501';
  end if;

  if p_staff_id is not null then
    select s.id into v_staff
      from public.staff s
     where s.id = p_staff_id
       and s.facility_id = v_req.facility_id
       and (v_req.staff_on_visit = '{}' or s.id = any (v_req.staff_on_visit));
  end if;
  v_staff := coalesce(v_staff, v_req.primary_staff_id);

  insert into public.review_responses (
    facility_id, request_id, rating, comment, locale, source,
    attributed_staff_id, display_consent)
  values (
    v_req.facility_id, v_req.id, p_rating, nullif(btrim(coalesce(p_comment, '')), ''),
    coalesce(p_locale, v_req.channel, 'en'),
    case when p_source in ('sms_link','email_link','report_card','portal','kiosk','staff')
         then p_source else 'sms_link' end,
    v_staff, coalesce(p_display_consent, false))
  returning id into v_response;

  insert into public.review_response_tags (response_id, tag_id)
  select v_response, t.id
    from public.review_tags t
   where t.id = any (coalesce(p_tag_ids, '{}'))
     and t.facility_id = v_req.facility_id
     and t.is_active
  on conflict do nothing;

  update public.review_requests
     set state = 'rated', state_changed_at = now()
   where id = v_req.id;

  -- THE TICKET, IN THIS TRANSACTION. A poor rating recorded without one is the
  -- failure the whole recovery half of this feature exists to prevent, and
  -- doing it in a second call would leave a window where exactly that is true.
  v_escalation := private.open_review_escalation(v_response);

  -- The rating decides what happens INTERNALLY. It does NOT decide whether the
  -- public links come back in this payload - they always do, at every rating.
  return jsonb_build_object(
    'responseId', v_response,
    'rating', p_rating,
    'escalated', v_escalation is not null,
    'showcaseEligible',
      p_rating >= v_req.showcase_min
      and coalesce(p_display_consent, false)
      and nullif(btrim(coalesce(p_comment, '')), '') is not null);

exception
  when unique_violation then
    raise exception 'That review has already been submitted.' using errcode = '42501';
end;
$fn$;

revoke all on function public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text) from public;
grant execute on function public.submit_review_response(text, integer, text, uuid[], uuid, boolean, text, text) to anon, authenticated;

-- ── RLS and grants ───────────────────────────────────────────────────────

alter table public.review_escalations       enable row level security;
alter table public.review_escalation_events enable row level security;

drop policy if exists review_escalations_read on public.review_escalations;
create policy review_escalations_read on public.review_escalations
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- Working a ticket is the marketing-reviews permission, not a task permission:
-- the person who owns the customer relationship owns the recovery.
drop policy if exists review_escalations_update on public.review_escalations;
create policy review_escalations_update on public.review_escalations
  for update using (private.has_permission(facility_id, 'marketing_manage_reviews'))
          with check (private.has_permission(facility_id, 'marketing_manage_reviews'));

drop policy if exists review_escalation_events_read on public.review_escalation_events;
create policy review_escalation_events_read on public.review_escalation_events
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

-- Logging what you did IS the permission to work the ticket. Insert only:
-- there is no update or delete policy and no grant, because a recovery log
-- that can be rewritten is not a log.
drop policy if exists review_escalation_events_insert on public.review_escalation_events;
create policy review_escalation_events_insert on public.review_escalation_events
  for insert with check (
    private.has_permission(facility_id, 'marketing_manage_reviews')
  );

revoke all on public.review_escalations       from public, anon;
revoke all on public.review_escalation_events from public, anon;

grant select, update         on public.review_escalations       to authenticated;
grant select, insert         on public.review_escalation_events to authenticated;

-- EXPLICIT. Supabase default privileges hand `authenticated` the full set on
-- every new table in `public`, so not granting is not the same as removing.
revoke insert, delete on public.review_escalations       from authenticated;
revoke update, delete on public.review_escalation_events from authenticated;

grant select, insert, update, delete on public.review_escalations       to service_role;
grant select, insert, update, delete on public.review_escalation_events to service_role;

do $verify$
begin
  if has_table_privilege('anon', 'public.review_escalations', 'select') then
    raise exception 'anon can read recovery tickets';
  end if;
  if has_table_privilege('authenticated', 'public.review_escalations', 'insert') then
    raise exception 'a session can forge a recovery ticket';
  end if;
  if has_table_privilege('authenticated', 'public.review_escalation_events', 'update') then
    raise exception 'a session can rewrite the recovery log';
  end if;
  if has_table_privilege('authenticated', 'public.review_escalation_events', 'delete') then
    raise exception 'a session can delete from the recovery log';
  end if;
  if has_function_privilege('anon', 'private.open_review_escalation(uuid)', 'execute') then
    raise exception 'anon can open tickets directly';
  end if;
end;
$verify$;
