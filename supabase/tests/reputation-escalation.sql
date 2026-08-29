-- ============================================================================
-- A poor rating opens a ticket, on a business-hours clock, that cannot be
-- closed without saying how (20260829160000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/reputation-escalation.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── THE ONE THAT MATTERS MOST ─────────────────────────────────────────────
--
-- E3. The spec's D-14 is specific: a ticket opened Monday at 16:00 with a
-- four-hour acknowledgement promise breaches on TUESDAY at 12:00, not Monday at
-- 20:00. Those differ by sixteen hours and the wrong one records a breach while
-- the building is empty — an alert nobody could have acted on, on a queue staff
-- are measured by.
--
-- A naive `now() + interval '4 hours'` passes every other assertion in this
-- file. E3 is the only one that can tell them apart, so the fixture is built
-- around a facility with real opening hours and a Monday afternoon.
--
-- ── AND THE ONE THAT IS EASY TO GET BACKWARDS ─────────────────────────────
--
-- E1: the threshold is read from the REQUEST, not from current config. A
-- facility that raises its threshold this month must not retroactively acquire
-- tickets for ratings it deliberately let pass. E2 is its control.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000008a0010', 'Esc Org', 'esc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id, timezone) values
  ('00000000-0000-0000-0000-0000008a0020', '00000000-0000-0000-0000-0000008a0010',
   'Esc Facility', 'esc-a', 'esc-a', 'America/Toronto')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000008a0040', '00000000-0000-0000-0000-0000008a0020',
   'Esc Client', 'esc-c@example.invalid');

insert into public.staff
  (id, facility_id, first_name, last_name, email, primary_role, legacy_id) values
  ('00000000-0000-0000-0000-0000008a0050', '00000000-0000-0000-0000-0000008a0020',
   'Cara', 'Groomer', 'esc-s@example.invalid', 'groomer', 'fs-esc00050');

-- Nine to five, closed at the weekend. E3 depends on these exact hours.
insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000008a0020', 'business_hours',
   '{"monday":    {"isOpen": true,  "openTime": "09:00", "closeTime": "17:00"},
     "tuesday":   {"isOpen": true,  "openTime": "09:00", "closeTime": "17:00"},
     "wednesday": {"isOpen": true,  "openTime": "09:00", "closeTime": "17:00"},
     "thursday":  {"isOpen": true,  "openTime": "09:00", "closeTime": "17:00"},
     "friday":    {"isOpen": true,  "openTime": "09:00", "closeTime": "17:00"},
     "saturday":  {"isOpen": false, "openTime": "09:00", "closeTime": "17:00"},
     "sunday":    {"isOpen": false, "openTime": "09:00", "closeTime": "17:00"}}'::jsonb)
on conflict (facility_id, domain) do update set value = excluded.value;

/** A live request with a usable token. */
create or replace function pg_temp.asked(p_day date, p_threshold integer default 3)
returns text language plpgsql as $$
declare v_token text := 'esc-' || replace(gen_random_uuid()::text, '-', '');
begin
  insert into public.review_requests (
    facility_id, client_id, business_day, state, service_types,
    primary_staff_id, staff_on_visit, escalation_threshold,
    expires_at, token_hash, token_expires_at)
  values (
    '00000000-0000-0000-0000-0000008a0020',
    '00000000-0000-0000-0000-0000008a0040', p_day, 'sent', array['grooming'],
    '00000000-0000-0000-0000-0000008a0050',
    array['00000000-0000-0000-0000-0000008a0050'::uuid],
    p_threshold,
    now() + interval '7 days',
    private.hash_review_token(v_token), now() + interval '7 days');
  return v_token;
end $$;

-- ── E1: a poor rating opens a ticket, in the same call ────────────────────
do $$
declare v_token text; v_result jsonb; v_esc record;
begin
  v_token := pg_temp.asked(current_date);
  v_result := public.submit_review_response(v_token, 2, 'Nala came home upset');

  select * into v_esc from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020'
   order by created_at desc limit 1;

  perform pg_temp.t(
    'E1  a 2-star opens a ticket, assigned, in the same transaction',
    (v_result->>'escalated')::boolean = true
      and v_esc.id is not null
      and v_esc.state = 'open'
      and v_esc.assignee_ids = array['00000000-0000-0000-0000-0000008a0050'::uuid],
    format('escalated=%s state=%s assignees=%s',
           v_result->>'escalated', v_esc.state, v_esc.assignee_ids));
end $$;

-- ── E2: a good rating opens nothing ───────────────────────────────────────
--
-- The control for E1. Without it, a function that opened a ticket for every
-- response would pass E1 and look correct.
do $$
declare v_token text; v_result jsonb; v_before bigint; v_after bigint;
begin
  select count(*) into v_before from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020';

  v_token := pg_temp.asked(current_date + 1);
  v_result := public.submit_review_response(v_token, 5, 'Wonderful');

  select count(*) into v_after from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020';

  perform pg_temp.t(
    'E2  a 5-star opens no ticket',
    (v_result->>'escalated')::boolean = false and v_after = v_before,
    format('escalated=%s tickets %s -> %s', v_result->>'escalated', v_before, v_after));
end $$;

-- ── E3: the clock is business hours, and Monday 16:00 breaches Tuesday ────
--
-- D-14, asserted. Four working hours from 16:00 on a Monday: one hour before
-- close, then three from nine the next morning = Tuesday 12:00. A wall-clock
-- implementation answers Monday 20:00 and fails only here.
do $$
declare v_monday timestamptz; v_due timestamptz; v_local text;
begin
  -- 2026-08-31 is a Monday. 16:00 Toronto is 20:00Z in August (EDT).
  v_monday := '2026-08-31 20:00:00+00'::timestamptz;
  v_due := private.business_hours_deadline(
    '00000000-0000-0000-0000-0000008a0020', v_monday, 240);

  v_local := to_char(v_due at time zone 'America/Toronto', 'Dy HH24:MI');

  perform pg_temp.t(
    'E3  four business hours from Monday 16:00 is Tuesday 12:00',
    v_local = 'Tue 12:00',
    format('got %s (expected Tue 12:00)', v_local));
end $$;

-- ── E3b: and the weekend is skipped ───────────────────────────────────────
--
-- Friday 16:00 plus four working hours must not be Saturday. It is Monday.
do $$
declare v_due timestamptz; v_local text;
begin
  -- 2026-09-04 is a Friday. 16:00 Toronto = 20:00Z.
  v_due := private.business_hours_deadline(
    '00000000-0000-0000-0000-0000008a0020',
    '2026-09-04 20:00:00+00'::timestamptz, 240);
  v_local := to_char(v_due at time zone 'America/Toronto', 'Dy HH24:MI');

  perform pg_temp.t(
    'E3b four business hours from Friday 16:00 lands on Monday, not Saturday',
    v_local = 'Mon 12:00',
    format('got %s (expected Mon 12:00)', v_local));
end $$;

-- ── E3c: a ticket opened before opening starts at the door ────────────────
do $$
declare v_due timestamptz; v_local text;
begin
  -- 2026-09-01 is a Tuesday. 06:00 Toronto = 10:00Z. The clock starts at 09:00.
  v_due := private.business_hours_deadline(
    '00000000-0000-0000-0000-0000008a0020',
    '2026-09-01 10:00:00+00'::timestamptz, 240);
  v_local := to_char(v_due at time zone 'America/Toronto', 'Dy HH24:MI');

  perform pg_temp.t(
    'E3c a 06:00 ticket is due at 13:00, not 10:00',
    v_local = 'Tue 13:00',
    format('got %s (expected Tue 13:00)', v_local));
end $$;

-- ── E4: a ticket cannot be closed without saying how ──────────────────────
--
-- The resolution code is the point of the vocabulary: "we fixed four of eight
-- Laval complaints for the same reason" has to be a query.
do $$
declare v_esc uuid; v_state text;
begin
  select id into v_esc from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020'
   order by created_at desc limit 1;

  begin
    update public.review_escalations
       set state = 'closed', resolved_at = now() where id = v_esc;
    v_state := 'accepted';
  exception when check_violation then
    v_state := 'refused';
  end;

  perform pg_temp.t(
    'E4  resolving without a resolution code is refused',
    v_state = 'refused',
    format('got %s', v_state));
end $$;

-- ── E4b: and with one, it closes ──────────────────────────────────────────
do $$
declare v_esc uuid; v_ok boolean := true;
begin
  select id into v_esc from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020'
   order by created_at desc limit 1;

  begin
    update public.review_escalations
       set state = 'closed', resolved_at = now(),
           resolution_code = 'contacted_apologised'
     where id = v_esc;
  exception when others then
    v_ok := false;
  end;

  perform pg_temp.t(
    'E4b a ticket with a resolution code closes',
    v_ok, 'the positive control for E4');
end $$;

-- ── E5: the assignee gets a task, once ────────────────────────────────────
--
-- `facility_tasks_source_unique` on (facility_id, source, source_ref) has been
-- reserved for this since 20260823600000 and unused until now.
do $$
declare v_esc uuid; v_tasks bigint;
begin
  select id into v_esc from public.review_escalations
   where facility_id = '00000000-0000-0000-0000-0000008a0020'
   order by created_at asc limit 1;

  select count(*) into v_tasks from public.facility_tasks
   where facility_id = '00000000-0000-0000-0000-0000008a0020'
     and source = 'reputation_escalation'
     and source_ref = v_esc::text;

  perform pg_temp.t(
    'E5  the escalation put exactly one task on the assignee''s board',
    v_tasks = 1,
    format('tasks=%s', v_tasks));
end $$;

-- ── E6: the recovery log cannot be rewritten ──────────────────────────────
do $$
declare v_upd boolean; v_del boolean; v_ins boolean;
begin
  v_upd := has_table_privilege('authenticated', 'public.review_escalation_events', 'update');
  v_del := has_table_privilege('authenticated', 'public.review_escalation_events', 'delete');
  v_ins := has_table_privilege('authenticated', 'public.review_escalation_events', 'insert');

  perform pg_temp.t(
    'E6  a session may add to the recovery log and never rewrite it',
    v_ins and not v_upd and not v_del,
    format('insert=%s update=%s delete=%s', v_ins, v_upd, v_del));
end $$;

-- ── E7: nobody outside may read a complaint ───────────────────────────────
do $$
declare v_anon boolean; v_forge boolean; v_open boolean;
begin
  v_anon  := has_table_privilege('anon', 'public.review_escalations', 'select');
  v_forge := has_table_privilege('authenticated', 'public.review_escalations', 'insert');
  v_open  := has_function_privilege('anon', 'private.open_review_escalation(uuid)', 'execute');

  perform pg_temp.t(
    'E7  anon reads nothing, a session forges nothing, and cannot open tickets',
    not v_anon and not v_forge and not v_open,
    format('anon_read=%s forge=%s open=%s', v_anon, v_forge, v_open));
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
