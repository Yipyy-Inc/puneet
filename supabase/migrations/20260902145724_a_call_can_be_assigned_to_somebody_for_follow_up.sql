-- ============================================================================
-- Somebody owes the call back, and it is rarely whoever missed it.
--
-- `call_record` carried `handled_by` — who TOOK the call — and the screens also
-- assign a missed call to somebody to ring back. Those are different people
-- answering different questions, so the Assign control could only ever be
-- local React state: a name that appeared on one screen and was gone on
-- reload, leaving a follow-up queue nobody could divide up.
--
-- ── THE FUNCTION IS DROPPED, NOT REPLACED ─────────────────────────────────
--
-- Adding a parameter makes a NEW function with a different signature.
-- `create or replace` would leave the eight-argument version behind, still
-- carrying its grant to `authenticated` — two functions of the same name, one
-- of them reachable and stale. A moment without either is the better trade,
-- and supabase/tests/call-record-rls.sql asserts the surviving signature by
-- name so a leftover would fail the suite rather than lurk.
-- ============================================================================

alter table public.call_record
  add column if not exists assigned_to uuid;

do $mig$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'call_record_assigned_to_fkey'
  ) then
    alter table public.call_record
      add constraint call_record_assigned_to_fkey
      foreign key (assigned_to) references public.staff (id) on delete set null;
  end if;
end
$mig$;

comment on column public.call_record.assigned_to is
  'Who owes the follow-up. Distinct from handled_by, which is who took the call.';

create index if not exists call_record_assigned_idx
  on public.call_record (facility_id, assigned_to)
  where assigned_to is not null;

drop function if exists public.annotate_call(
  uuid, text, text[], text, uuid, integer, uuid, text);

create or replace function public.annotate_call(
  p_call_id            uuid,
  p_notes              text    default null,
  p_tags               text[]  default null,
  p_follow_up_status   text    default null,
  p_handled_by         uuid    default null,
  p_assigned_to        uuid    default null,
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

  if not private.has_permission(v_facility, 'calling_view') then
    raise exception 'Not permitted to annotate calls at this facility'
      using errcode = '42501';
  end if;

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
    assigned_to        = coalesce(p_assigned_to, assigned_to),
    qa_score           = coalesce(p_qa_score, qa_score),
    booking_id         = coalesce(p_booking_id, booking_id),
    attribution_source = coalesce(p_attribution_source, attribution_source),
    updated_at         = now()
  where id = p_call_id
  returning * into v_row;

  -- `status`, `duration_s`, `started_at`, `answered_at`, `ended_at` and
  -- `client_match` remain absent from that SET list and from this signature.
  -- They are what the reports measure, and no human edit reaches them.
  return v_row;
end
$fn$;

revoke all on function public.annotate_call(
  uuid, text, text[], text, uuid, uuid, integer, uuid, text) from public, anon;
grant execute on function public.annotate_call(
  uuid, text, text[], text, uuid, uuid, integer, uuid, text) to authenticated;
