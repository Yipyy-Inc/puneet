-- ============================================================================
-- An unfinished booking is followed up once, by the messaging tick.
--
-- The abandonment_recovery settings held templates and delays that nothing
-- read. The tick now evaluates every abandoned draft whose moment has come,
-- queues the step's email and/or SMS into message_sends (source_kind
-- 'booking_recovery'), and records the outcome here.
--
--   recovery_not_before   when the tick should look at it next. Set to now() on
--                         insert and on every customer re-save; pushed forward
--                         by the tick while the facility's delay has not passed
--   recovery_resolved_at  claimed by the tick, once; never cleared
--   recovery_outcome      queued | none | skipped, with recovery_detail saying why
--
-- Only service_role writes the recovery columns: a customer who could clear
-- them could have themselves messaged again, and staff record their own
-- follow-up as `contacted`.
--
-- Tested by supabase/tests/unfinished-bookings.sql, U7–U11.
-- ============================================================================

alter table public.unfinished_bookings
  add column if not exists recovery_not_before timestamptz not null default now(),
  add column if not exists recovery_resolved_at timestamptz,
  add column if not exists recovery_outcome text
    check (recovery_outcome is null or recovery_outcome in ('queued', 'none', 'skipped')),
  add column if not exists recovery_detail text
    check (recovery_detail is null or length(recovery_detail) <= 500);

alter table public.unfinished_bookings
  drop constraint if exists unfinished_bookings_recovery_resolved_together;
alter table public.unfinished_bookings
  add constraint unfinished_bookings_recovery_resolved_together
  check ((recovery_resolved_at is null) = (recovery_outcome is null));

create index if not exists unfinished_bookings_recovery_due_idx
  on public.unfinished_bookings (recovery_not_before)
  where status = 'abandoned' and recovery_resolved_at is null;

create or replace function private.unfinished_booking_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_facility uuid;
  v_staff boolean;
  v_service boolean := current_setting('role', true) = 'service_role';
begin
  if tg_op = 'INSERT' then
    select facility_id into v_facility from public.clients where id = new.client_id;
    if v_facility is null then
      raise exception 'No such client.' using errcode = '23503';
    end if;
    new.facility_id := v_facility;
    new.status := 'abandoned';
    new.notes := '[]'::jsonb;
    new.last_contacted_at := null;
    new.recovered_at := null;
    new.abandoned_at := now();
    new.created_at := now();
    new.updated_at := now();
    new.recovery_not_before := now();
    new.recovery_resolved_at := null;
    new.recovery_outcome := null;
    new.recovery_detail := null;
    return new;
  end if;

  new.id := old.id;
  new.facility_id := old.facility_id;
  new.client_id := old.client_id;
  new.created_at := old.created_at;

  if not v_service then
    -- The follow-up record is the tick's alone.
    new.recovery_resolved_at := old.recovery_resolved_at;
    new.recovery_outcome := old.recovery_outcome;
    new.recovery_detail := old.recovery_detail;
    new.recovery_not_before := old.recovery_not_before;
    new.abandoned_at := old.abandoned_at;
  end if;

  v_staff := private.is_platform_admin()
    or private.has_permission(old.facility_id, 'edit_bookings');
  if not v_staff and not v_service then
    -- A customer may re-save their draft or say they came back; the outreach
    -- record is the facility's.
    if new.status is distinct from old.status and new.status <> 'recovered' then
      raise exception 'Only the facility marks a booking as contacted.'
        using errcode = '42501';
    end if;
    new.notes := old.notes;
    new.last_contacted_at := old.last_contacted_at;

    -- Leaving the form again restarts the clock, until the one message is owed.
    if (new.draft is distinct from old.draft or new.step is distinct from old.step)
       and old.recovery_resolved_at is null then
      new.abandoned_at := now();
      new.recovery_not_before := now();
    end if;
  end if;

  if new.status = 'recovered' and old.status <> 'recovered' then
    new.recovered_at := now();
  elsif new.status <> 'recovered' then
    new.recovered_at := null;
  end if;
  if new.status = 'contacted' and old.status <> 'contacted' then
    new.last_contacted_at := now();
  end if;
  new.updated_at := now();
  return new;
end;
$fn$;

revoke all on function private.unfinished_booking_guard() from public;
revoke all on function private.unfinished_booking_guard() from anon;

-- Drafts left before this existed are not followed up: nobody chose to send them.
update public.unfinished_bookings
   set recovery_resolved_at = now(), recovery_outcome = 'none',
       recovery_detail = 'left before recovery messages existed'
 where recovery_resolved_at is null;

alter table public.message_sends
  drop constraint if exists message_sends_source_kind_check;
alter table public.message_sends
  add constraint message_sends_source_kind_check
  check (source_kind in (
    'automation_rule', 'workflow', 'manual', 'rebook', 'review_request',
    'booking_recovery'));

do $check$
begin
  if has_function_privilege('anon', 'private.unfinished_booking_guard()', 'execute') then
    raise exception 'anon can execute the unfinished booking guard';
  end if;
end $check$;
