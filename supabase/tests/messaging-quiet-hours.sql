-- ============================================================================
-- The outbox columns that quiet hours, the lateness cut-off and the pacing cap
-- move a message through (20260829090000, and sendOneQueued).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/messaging-quiet-hours.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE CAN AND CANNOT PROVE ───────────────────────────────────
--
-- The ARITHMETIC of quiet hours is TypeScript and is proven in
-- tests/unit/quiet-hours.test.ts: the boundary minute, a window crossing
-- midnight, two timezones and a DST transition. Repeating it here in SQL would
-- be a second implementation to keep in step.
--
-- What that tier CANNOT prove is that the outbox will hold the states those
-- decisions need. A deferral is an UPDATE that leaves the row `queued` with a
-- later `scheduled_for`; a drop is `skipped` with `expired`; both have to
-- survive the freeze trigger, the status CHECK and the RLS on the table. Those
-- are properties of the schema, so they are asserted where the schema is.
--
-- Q3 is the one that matters most: a deferral must never look like a send.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000006a0010', 'Quiet Org', 'quiet-org')
on conflict do nothing;

-- A facility NOT on UTC, because that is the only kind this can be wrong for.
insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000006a0020', '00000000-0000-0000-0000-0000006a0010',
   'Quiet Facility', 'quiet-a', 'quiet-a', 'America/Vancouver')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000006a0040', '00000000-0000-0000-0000-0000006a0020',
   'Quiet Client', 'quiet-c@example.invalid');

/** A queued message due at `p_due`. */
create or replace function pg_temp.queued(p_due timestamptz)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.message_sends
    (facility_id, client_id, channel, to_address, source_kind,
     subject_rendered, body_rendered, status, scheduled_for,
     idempotency_key, provider)
  values
    ('00000000-0000-0000-0000-0000006a0020',
     '00000000-0000-0000-0000-0000006a0040',
     'email', 'quiet-c@example.invalid', 'review_request',
     'How did we do?', 'Body', 'queued', p_due,
     'qh:' || gen_random_uuid()::text, 'resend')
  returning id into v_id;
  return v_id;
end $$;

-- ── Q1: a review request is a first-class kind in the outbox ──────────────
--
-- The CHECK was widened rather than the kind folded into 'manual'. Without
-- this, the History tab could not tell a templated ask from a message somebody
-- typed, and the scheduler's insert would simply fail.
do $$
declare v_id uuid; v_kind text;
begin
  v_id := pg_temp.queued(now());
  select source_kind into v_kind from public.message_sends where id = v_id;

  perform pg_temp.t(
    'Q1  a review request can be queued as its own source_kind',
    v_kind = 'review_request',
    format('source_kind=%s', v_kind));
exception when others then
  perform pg_temp.t('Q1  review_request is an allowed source_kind', false, sqlerrm);
end $$;

-- ── Q2: an unknown kind is still refused ──────────────────────────────────
--
-- The positive control for Q1. A CHECK widened to five values proves nothing
-- unless a sixth is still rejected.
do $$
declare v_state text;
begin
  begin
    insert into public.message_sends
      (facility_id, client_id, channel, to_address, source_kind,
       body_rendered, status, idempotency_key, provider)
    values
      ('00000000-0000-0000-0000-0000006a0020',
       '00000000-0000-0000-0000-0000006a0040',
       'email', 'quiet-c@example.invalid', 'something_invented',
       'Body', 'queued', 'qh:invalid', 'resend');
    v_state := 'accepted';
  exception when check_violation then
    v_state := 'refused';
  end;

  perform pg_temp.t(
    'Q2  an invented source_kind is still refused',
    v_state = 'refused',
    format('got %s', v_state));
end $$;

-- ── Q3: a deferral moves the clock and STAYS QUEUED ───────────────────────
--
-- The property the whole design rests on. Quiet hours is the one rung of the
-- ladder that reschedules instead of suppressing, because a dropped message and
-- a message nobody sent are indistinguishable from the facility's side. If this
-- row could not be pushed forward while remaining `queued`, the only available
-- behaviours would be "send at 4 a.m." and "silently discard".
do $$
declare v_id uuid; v_status text; v_when timestamptz; v_sent timestamptz;
begin
  v_id := pg_temp.queued(now());

  update public.message_sends
     set scheduled_for = now() + interval '9 hours'
   where id = v_id and status = 'queued';

  select status, scheduled_for, sent_at into v_status, v_when, v_sent
    from public.message_sends where id = v_id;

  perform pg_temp.t(
    'Q3  a deferred message is still queued, later, and NOT sent',
    v_status = 'queued' and v_when > now() and v_sent is null,
    format('status=%s in_future=%s sent_at=%s',
           v_status, (v_when > now())::text, coalesce(v_sent::text, 'null')));
end $$;

-- ── Q4: a message too late to matter is skipped, and says why ─────────────
--
-- The direct fix for a nudge that arrived 49 days after its request. `expired`
-- has to be distinguishable from a suppression, or the Automations screen
-- cannot tell an outage from a consent list doing its job.
do $$
declare v_id uuid; v_status text; v_reason text;
begin
  v_id := pg_temp.queued(now() - interval '5 days');

  update public.message_sends
     set status = 'skipped', skip_reason = 'expired'
   where id = v_id and status = 'queued';

  select status, skip_reason into v_status, v_reason
    from public.message_sends where id = v_id;

  perform pg_temp.t(
    'Q4  an abandoned message is skipped with a reason of its own',
    v_status = 'skipped' and v_reason = 'expired',
    format('status=%s reason=%s', v_status, v_reason));
end $$;

-- ── Q5: the facility carries a timezone at all ────────────────────────────
--
-- Everything above is decided on the facility's clock. A null here would send
-- the whole calculation through the container's zone, which is UTC — the exact
-- shape of the 4 a.m. SMS the audit found.
do $$
declare v_zone text; v_ok boolean;
begin
  select timezone into v_zone
    from public.facilities where id = '00000000-0000-0000-0000-0000006a0020';

  -- And it is a zone Postgres itself recognises, not a free-text string.
  select count(*) > 0 into v_ok from pg_timezone_names where name = v_zone;

  perform pg_temp.t(
    'Q5  the facility has a real IANA timezone to be quiet in',
    v_zone is not null and v_ok,
    format('timezone=%s recognised=%s', coalesce(v_zone, 'null'), v_ok));
end $$;

-- ── Q6: a sent message cannot be rewritten ────────────────────────────────
--
-- `message_sends_freeze` (20260827111420). It matters here because deferral is
-- an UPDATE on the same row: the mechanism that moves a queued message must not
-- also be able to rewrite what a customer was already told.
do $$
declare v_id uuid; v_state text;
begin
  v_id := pg_temp.queued(now() - interval '1 hour');
  update public.message_sends
     set status = 'sent', sent_at = now() where id = v_id;

  begin
    update public.message_sends
       set body_rendered = 'Something else entirely' where id = v_id;
    v_state := 'rewritten';
  exception when others then
    v_state := 'frozen';
  end;

  perform pg_temp.t(
    'Q6  a sent message cannot have its body rewritten',
    v_state = 'frozen',
    format('got %s', v_state));
end $$;

-- ── Q7: the outbox is readable and not writable by a session ──────────────
--
-- The deferral and the drop are both writes, and both are done by the tick as
-- service_role. A session that could write them could forge the record of what
-- it told a customer, and quiet hours would be advisory.
do $$
declare v_sel boolean; v_upd boolean;
begin
  v_sel := has_table_privilege('authenticated', 'public.message_sends', 'select');
  v_upd := has_table_privilege('authenticated', 'public.message_sends', 'update');

  perform pg_temp.t(
    'Q7  a session may read the outbox and may not reschedule it',
    v_sel and not v_upd,
    format('select=%s update=%s', v_sel, v_upd));
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
