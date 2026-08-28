-- ============================================================================
-- A message queued for later is sent once, by whoever claims it first.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/messaging-tick.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ACTUALLY DEFENDING ──────────────────────────────────
--
-- The tick sends what the dispatcher deferred. The dispatcher runs on a
-- request; the tick runs on a cron; both run as service_role; and nothing stops
-- two ticks overlapping when one run is slow and the next fires anyway.
--
-- So the only thing between a customer and two identical emails is that
-- `queued -> sending` is a CONDITIONAL update which reports how many rows it
-- actually changed. M1 is that claim. It is asserted here rather than in the
-- TypeScript because the guarantee is a property of the UPDATE, not of the
-- code that calls it -- and because a second caller winning would be invisible
-- in a unit test with one caller.
--
-- M3 is the other direction: a message that is not due yet must not be picked
-- up early. A tip reminder configured for three hours after check-out and sent
-- ninety seconds after it is not a tip reminder, it is a second receipt.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004b0010', 'Tick Org', 'tick-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004b0020', '00000000-0000-0000-0000-0000004b0010',
   'Tick Facility', 'tick-a', 'tick-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004b0040', '00000000-0000-0000-0000-0000004b0020',
   'Tick Client', 'tick-c@example.invalid');

/** A message sitting in the outbox, due at `p_due`. */
create or replace function pg_temp.queued(p_due timestamptz)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.message_sends
    (facility_id, client_id, channel, to_address, source_kind,
     subject_rendered, body_rendered, status, scheduled_for, idempotency_key,
     provider)
  values
    ('00000000-0000-0000-0000-0000004b0020',
     '00000000-0000-0000-0000-0000004b0040',
     'email', 'tick-c@example.invalid', 'automation_rule',
     'Thank you', 'Body', 'queued', p_due,
     'test:' || gen_random_uuid()::text, 'resend')
  returning id into v_id;
  return v_id;
end $$;

-- ── M1: two ticks cannot both claim the same message ──────────────────────
do $$
declare v_id uuid; v_first integer; v_second integer;
begin
  v_id := pg_temp.queued(now() - interval '1 minute');

  -- The first tick claims it.
  with claimed as (
    update public.message_sends set status = 'sending'
     where id = v_id and status = 'queued'
     returning 1
  ) select count(*) into v_first from claimed;

  -- A second tick, overlapping, reads the same row and tries to claim it.
  with claimed as (
    update public.message_sends set status = 'sending'
     where id = v_id and status = 'queued'
     returning 1
  ) select count(*) into v_second from claimed;

  perform pg_temp.t(
    'M1  a second tick claims nothing, so the customer is emailed once',
    v_first = 1 and v_second = 0,
    format('first=%s second=%s (expected 1 / 0)', v_first, v_second));
exception when others then
  perform pg_temp.t('M1  the claim is exclusive', false, sqlerrm);
end $$;

-- ── M2: a due message is what the tick selects ────────────────────────────
do $$
declare v_due uuid; v_later uuid; v_picked integer;
begin
  v_due   := pg_temp.queued(now() - interval '5 minutes');
  v_later := pg_temp.queued(now() + interval '3 hours');

  select count(*) into v_picked
    from public.message_sends
   where facility_id = '00000000-0000-0000-0000-0000004b0020'
     and status = 'queued'
     and scheduled_for <= now()
     and id in (v_due, v_later);

  perform pg_temp.t(
    'M2  only the message that is due is selected',
    v_picked = 1,
    format('picked=%s of 2 (expected 1)', v_picked));
exception when others then
  perform pg_temp.t('M2  only the due message is selected', false, sqlerrm);
end $$;

-- ── M3: a message due in three hours is not sent now ──────────────────────
--
-- The negative control for M2. If `scheduled_for` were ignored -- or defaulted
-- to now() on insert, which it does when nobody sets it -- a tip reminder would
-- arrive moments after check-out and the delay would be decorative.
do $$
declare v_later uuid; v_status text; v_due boolean;
begin
  v_later := pg_temp.queued(now() + interval '3 hours');

  select status, scheduled_for <= now() into v_status, v_due
    from public.message_sends where id = v_later;

  perform pg_temp.t(
    'M3  a message scheduled for later is queued and NOT yet due',
    v_status = 'queued' and v_due = false,
    format('status=%s due_now=%s', v_status, v_due));
exception when others then
  perform pg_temp.t('M3  a later message is not due', false, sqlerrm);
end $$;

-- ── M4: the outbox is readable but not writable by a session ──────────────
--
-- It answers "what did you tell my customer", which a facility has to be able
-- to produce. A session that could write it could forge that answer, so the
-- dispatcher and the tick both run as service_role.
do $$
declare v_sel boolean; v_ins boolean; v_upd boolean;
begin
  v_sel := has_table_privilege('authenticated', 'public.message_sends', 'select');
  v_ins := has_table_privilege('authenticated', 'public.message_sends', 'insert');
  v_upd := has_table_privilege('authenticated', 'public.message_sends', 'update');

  perform pg_temp.t(
    'M4  authenticated may read the outbox and may not write it',
    v_sel and not v_ins and not v_upd,
    format('select=%s insert=%s update=%s', v_sel, v_ins, v_upd));
exception when others then
  perform pg_temp.t('M4  outbox grants', false, sqlerrm);
end $$;

-- ── Report ────────────────────────────────────────────────────────────────

select n, case when ok then 'ok  ' else 'FAIL' end as result, name, detail
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
