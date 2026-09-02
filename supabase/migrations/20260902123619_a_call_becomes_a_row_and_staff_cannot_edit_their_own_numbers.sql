-- ============================================================================
-- A call becomes a row, and the numbers about a person are not editable by them.
--
-- Nothing in this product has ever stored a call. `/api/twilio/recording`
-- parsed its payload and dropped it; the Call Log, the Analytics tab, the QA
-- screens and the missed-call queue all read `src/data/calling.ts`.
--
-- ── TWO TABLES, BECAUSE A WEBHOOK RETRIES ─────────────────────────────────
--
-- `call_event` is what the carrier told us, append-only. `call_record` is the
-- projection a screen reads, maintained from it by trigger — the same shape as
-- `private.derive_booking_payment()` maintaining a booking's totals from the
-- ledger.
--
-- The unique constraint on (provider_call_sid, type, occurred_at) is the whole
-- reason the event table exists. Carriers retry for hours when a webhook is
-- slow, and a retry that inserted a second `completed` would add another call
-- to every count on the Analytics tab. Idempotency has to live in the database,
-- because the thing being deduplicated is a request that already arrived twice.
--
-- ── THE RLS DECISION THAT MATTERS: NO UPDATE POLICY ON call_record ────────
--
-- A column-blind UPDATE policy would let a member of staff edit `status` and
-- `duration_s` — the very numbers the answer-rate report and the QA screens
-- publish ABOUT THEM. "Missed" becomes "completed" and nobody can tell, because
-- the projection is also the audit trail.
--
-- So: `grant select` and nothing else, exactly as `message_sends` does
-- (20260827111420). The projection is written by trigger, running as the
-- definer, from events only service_role can insert. Human edits — notes, tags,
-- follow-up, assignment, QA score — go through `annotate_call()`, which
-- re-checks permission and CANNOT reach the measured fields at all. Not by
-- convention: they are not parameters.
--
-- ── AND RECORDINGS ARE A SEPARATE TABLE ───────────────────────────────────
--
-- `calling_view_recordings` is a real permission key, and a permission that
-- gates a COLUMN cannot be expressed in RLS — policies filter rows. A groomer
-- without it must select zero recording rows rather than see a call row with
-- some columns blanked by a component that might forget.
-- ============================================================================

-- ── call_event ────────────────────────────────────────────────────────────

create table if not exists public.call_event (
  id                uuid        primary key default gen_random_uuid(),
  facility_id       uuid        not null references public.facilities (id) on delete cascade,
  provider          text        not null default 'twilio',
  provider_call_sid text        not null,
  type              text        not null,
  occurred_at       timestamptz not null,
  payload           jsonb       not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  constraint call_event_type_check check (type in (
    'initiated', 'ringing', 'answered', 'completed',
    'no_answer', 'busy', 'failed', 'voicemail_left', 'recording_ready'
  )),
  constraint call_event_sid_check check (length(provider_call_sid) between 8 and 64),
  -- Idempotency. See the banner: without it a carrier retry double-counts.
  constraint call_event_once unique (provider_call_sid, type, occurred_at)
);

comment on table public.call_event is
  'Append-only log of what the carrier reported. UPDATE and DELETE are blocked for every role by trigger. Inserted only by service_role.';

create index if not exists call_event_facility_idx
  on public.call_event (facility_id, occurred_at desc);
create index if not exists call_event_sid_idx
  on public.call_event (provider_call_sid);

alter table public.call_event enable row level security;

-- Append-only, enforced for EVERY role including the one that writes it. The
-- audit log (20260807460000) does the same, and for the same reason: a log that
-- can be edited is not evidence of anything.
create or replace function private.call_event_is_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  raise exception
    'call_event is append-only: % is not permitted on a call event', tg_op
    using errcode = '42501',
          hint = 'Call events are immutable; insert a corrective event instead.';
end
$fn$;

drop trigger if exists call_event_no_update on public.call_event;
create trigger call_event_no_update
  before update or delete on public.call_event
  for each row execute function private.call_event_is_append_only();

drop policy if exists call_event_read on public.call_event;
create policy call_event_read on public.call_event
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'calling_view')
  );

-- ── call_record ───────────────────────────────────────────────────────────

create table if not exists public.call_record (
  id                 uuid        primary key default gen_random_uuid(),
  facility_id        uuid        not null references public.facilities (id) on delete cascade,
  provider_call_sid  text        not null unique,
  direction          text        not null default 'inbound',
  from_number        text,
  to_number          text,

  -- ── Measured. Written by trigger from call_event, by nobody else. ──
  status             text        not null default 'ringing',
  started_at         timestamptz,
  answered_at        timestamptz,
  ended_at           timestamptz,
  duration_s         integer,

  -- ── Matched. How confident the ANI lookup was, recorded honestly. ──
  client_id          uuid        references public.clients (id) on delete set null,
  client_match       text        not null default 'none',

  -- ── Annotated. Written only through annotate_call(). ──
  handled_by         uuid        references public.staff (id) on delete set null,
  location_id        uuid        references public.locations (id) on delete set null,
  notes              text,
  tags               text[]      not null default '{}',
  follow_up_status   text,
  qa_score           integer,
  booking_id         uuid        references public.bookings (id) on delete set null,
  attribution_source text,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  constraint call_record_direction_check check (direction in ('inbound', 'outbound')),
  constraint call_record_status_check check (status in (
    'ringing', 'in_progress', 'completed', 'missed', 'failed', 'voicemail'
  )),
  constraint call_record_match_check check (client_match in ('exact', 'ambiguous', 'none')),
  constraint call_record_follow_up_check check (
    follow_up_status is null
    or follow_up_status in ('pending', 'in_progress', 'completed', 'no_action')
  ),
  constraint call_record_qa_check check (qa_score is null or qa_score between 1 and 5),
  constraint call_record_duration_check check (duration_s is null or duration_s >= 0),
  constraint call_record_attribution_check check (
    attribution_source is null
    or attribution_source in ('in_call', 'post_call_window', 'manual')
  ),
  -- A booking attributed to a call must say HOW, or the revenue figure has no
  -- denominator anybody can check.
  constraint call_record_attribution_needs_booking check (
    (booking_id is null) = (attribution_source is null)
  )
);

comment on table public.call_record is
  'One row per call, projected from call_event by trigger. No UPDATE policy: staff must not be able to edit the numbers reported about them. Annotations go through public.annotate_call().';
comment on column public.call_record.client_match is
  'exact | ambiguous | none — how the caller was identified. Recorded so an attribution rate can state its denominator.';

create index if not exists call_record_facility_idx
  on public.call_record (facility_id, started_at desc);
create index if not exists call_record_client_idx
  on public.call_record (client_id) where client_id is not null;
create index if not exists call_record_follow_up_idx
  on public.call_record (facility_id, follow_up_status)
  where follow_up_status is not null;

alter table public.call_record enable row level security;

drop policy if exists call_record_read on public.call_record;
create policy call_record_read on public.call_record
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'calling_view')
  );

-- DELIBERATELY NO INSERT, UPDATE OR DELETE POLICY. See the banner.

-- ── call_recording ────────────────────────────────────────────────────────

create table if not exists public.call_recording (
  id                     uuid        primary key default gen_random_uuid(),
  facility_id            uuid        not null references public.facilities (id) on delete cascade,
  call_record_id         uuid        not null references public.call_record (id) on delete cascade,
  provider_recording_sid text        not null unique,
  recording_url          text,
  duration_s             integer,
  transcript             text,
  created_at             timestamptz not null default now(),
  constraint call_recording_duration_check check (duration_s is null or duration_s >= 0)
);

comment on table public.call_recording is
  'Separate from call_record because calling_view_recordings gates ROWS. A policy cannot hide a column.';

create index if not exists call_recording_call_idx
  on public.call_recording (call_record_id);

alter table public.call_recording enable row level security;

drop policy if exists call_recording_read on public.call_recording;
create policy call_recording_read on public.call_recording
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'calling_view_recordings')
  );

-- ── The projection ────────────────────────────────────────────────────────

create or replace function private.derive_call_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_status text;
begin
  -- What this event says the call's state is. Only forward: a late 'ringing'
  -- arriving after 'completed' must not walk the call backwards, which carriers
  -- do deliver when a retry overtakes a later event.
  v_status := case new.type
    when 'initiated'      then 'ringing'
    when 'ringing'        then 'ringing'
    when 'answered'       then 'in_progress'
    when 'completed'      then 'completed'
    when 'no_answer'      then 'missed'
    when 'busy'           then 'missed'
    when 'failed'         then 'failed'
    when 'voicemail_left' then 'voicemail'
    else null
  end;

  insert into public.call_record as r (
    facility_id, provider_call_sid, direction,
    from_number, to_number, status,
    started_at, answered_at, ended_at, duration_s
  )
  values (
    new.facility_id,
    new.provider_call_sid,
    coalesce(nullif(new.payload ->> 'direction', ''), 'inbound'),
    nullif(new.payload ->> 'from', ''),
    nullif(new.payload ->> 'to', ''),
    coalesce(v_status, 'ringing'),
    case when new.type in ('initiated', 'ringing') then new.occurred_at end,
    case when new.type = 'answered' then new.occurred_at end,
    case when new.type in ('completed','no_answer','busy','failed','voicemail_left')
         then new.occurred_at end,
    case when new.type = 'completed'
         then nullif(new.payload ->> 'duration_s', '')::integer end
  )
  on conflict (provider_call_sid) do update set
    -- A terminal status is never overwritten by a later non-terminal one.
    status = case
      when r.status in ('completed', 'missed', 'failed', 'voicemail')
        then r.status
      else coalesce(v_status, r.status)
    end,
    from_number = coalesce(r.from_number, excluded.from_number),
    to_number   = coalesce(r.to_number, excluded.to_number),
    started_at  = least(coalesce(r.started_at, excluded.started_at), coalesce(excluded.started_at, r.started_at)),
    answered_at = coalesce(r.answered_at, excluded.answered_at),
    ended_at    = coalesce(r.ended_at, excluded.ended_at),
    duration_s  = coalesce(r.duration_s, excluded.duration_s),
    updated_at  = now();

  return new;
end
$fn$;

drop trigger if exists call_event_projects on public.call_event;
create trigger call_event_projects
  after insert on public.call_event
  for each row execute function private.derive_call_record();

-- ── annotate_call ─────────────────────────────────────────────────────────

create or replace function public.annotate_call(
  p_call_id            uuid,
  p_notes              text    default null,
  p_tags               text[]  default null,
  p_follow_up_status   text    default null,
  p_handled_by         uuid    default null,
  p_qa_score           integer default null,
  p_booking_id         uuid    default null,
  p_attribution_source text    default null
)
returns public.call_record
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_row      public.call_record;
begin
  select facility_id into v_facility
  from public.call_record where id = p_call_id;

  if v_facility is null then
    raise exception 'No such call' using errcode = '42704';
  end if;

  -- Re-checked here rather than trusted from the caller. This function is
  -- SECURITY DEFINER and therefore bypasses the RLS that would otherwise have
  -- stopped it.
  if not private.has_permission(v_facility, 'calling_view') then
    raise exception 'Not permitted to annotate calls at this facility'
      using errcode = '42501';
  end if;

  -- A QA score is a judgement about a colleague, so it takes the routing
  -- permission rather than the viewing one.
  if p_qa_score is not null
     and not private.has_permission(v_facility, 'calling_manage_routing') then
    raise exception 'Not permitted to score calls at this facility'
      using errcode = '42501';
  end if;

  update public.call_record set
    notes              = coalesce(p_notes, notes),
    tags               = coalesce(p_tags, tags),
    follow_up_status   = coalesce(p_follow_up_status, follow_up_status),
    handled_by         = coalesce(p_handled_by, handled_by),
    qa_score           = coalesce(p_qa_score, qa_score),
    booking_id         = coalesce(p_booking_id, booking_id),
    attribution_source = coalesce(p_attribution_source, attribution_source),
    updated_at         = now()
  where id = p_call_id
  returning * into v_row;

  -- `status`, `duration_s`, `started_at`, `answered_at`, `ended_at` and
  -- `client_match` are absent from that SET list and from this signature. They
  -- are what the reports measure, and no human edit reaches them.
  return v_row;
end
$fn$;

-- ── The grants ARE the boundary ───────────────────────────────────────────

grant select on public.call_event     to authenticated;
grant select on public.call_record    to authenticated;
grant select on public.call_recording to authenticated;

revoke all on public.call_event     from public, anon;
revoke all on public.call_record    from public, anon;
revoke all on public.call_recording from public, anon;

-- EXPLICIT, because granting only SELECT above does not take the rest away.
revoke insert, update, delete on public.call_event     from authenticated;
revoke insert, update, delete on public.call_record    from authenticated;
revoke insert, update, delete on public.call_recording from authenticated;

revoke all on function public.annotate_call(uuid, text, text[], text, uuid, integer, uuid, text)
  from public, anon;
grant execute on function public.annotate_call(uuid, text, text[], text, uuid, integer, uuid, text)
  to authenticated;
