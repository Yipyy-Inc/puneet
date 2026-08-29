-- ============================================================================
-- An incident can be written down by whoever saw it, changed only by somebody
-- accountable, and deleted by nobody (20260829180000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/incidents.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- I1/I2 are the permission SPLIT, and it is the whole design. Reporting is a
-- care act: the caretaker who saw a dog get hurt must be able to write it down
-- immediately, at 6pm, without finding a manager. Changing severity or closing
-- it is a management act, because it is somebody taking responsibility for the
-- answer. A single incidents permission would have forced the choice between
-- "the person who saw it cannot record it" and "anybody can close it".
--
-- I4 is the one with teeth. There is no DELETE policy and no delete grant, for
-- anybody. An incident is the record that something happened to an animal in
-- this care, and it is the first thing anybody would want gone after a bad
-- outcome.
--
-- I6 is the loop the reputation spec is about: a 1-star review reading "Nala
-- had a cut and staff did not mention it" can now point at the incident.
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
  ('00000000-0000-0000-0000-0000009a0010', 'Inc Org', 'inc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000009a0020', '00000000-0000-0000-0000-0000009a0010',
   'Inc Facility', 'inc-a', 'inc-a')
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000009a0040', '00000000-0000-0000-0000-0000009a0020',
   'Inc Client', 'inc-c@example.invalid');

-- Two people with different permissions, which is the point of I1 and I2.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000009a0100', 'inc-care@example.invalid'),
  ('00000000-0000-0000-0000-0000009a0101', 'inc-mgr@example.invalid')
on conflict do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000009a0100', 'inc-care@example.invalid', 'Cara Caretaker'),
  ('00000000-0000-0000-0000-0000009a0101', 'inc-mgr@example.invalid', 'Morgan Manager')
on conflict do nothing;

insert into public.facility_memberships (facility_id, profile_id, role) values
  ('00000000-0000-0000-0000-0000009a0020', '00000000-0000-0000-0000-0000009a0100', 'caretaker'),
  ('00000000-0000-0000-0000-0000009a0020', '00000000-0000-0000-0000-0000009a0101', 'manager')
on conflict do nothing;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

-- ── I1: a caretaker can write down what they saw ──────────────────────────
do $$
declare v_state text; v_id uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000009a0100');
  set local role authenticated;
  begin
    insert into public.incidents
      (facility_id, kind, severity, title, occurred_at, reported_by)
    values
      ('00000000-0000-0000-0000-0000009a0020', 'injury', 'medium',
       'Scratch during play', now(), '00000000-0000-0000-0000-0000009a0100')
    returning id into v_id;
    v_state := 'recorded';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;

  perform pg_temp.t(
    'I1  a caretaker can report an incident without finding a manager',
    v_state = 'recorded',
    format('got %s', v_state));
end $$;

-- ── I2: and cannot then change it ─────────────────────────────────────────
--
-- The other half of the split, and what makes I1 mean something. An UPDATE
-- refused by RLS returns ZERO ROWS rather than raising, so this counts what
-- changed. A test looking only for an exception would pass against a policy
-- that silently let it through.
do $$
declare v_rows integer; v_id uuid;
begin
  select id into v_id from public.incidents
   where facility_id = '00000000-0000-0000-0000-0000009a0020' limit 1;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009a0100');
  set local role authenticated;
  with touched as (
    update public.incidents set severity = 'low' where id = v_id returning 1
  ) select count(*) into v_rows from touched;
  reset role;

  perform pg_temp.t(
    'I2  a caretaker cannot change the incident afterwards',
    v_rows = 0,
    format('rows changed=%s (expected 0)', v_rows));
end $$;

-- ── I3: a manager can ─────────────────────────────────────────────────────
do $$
declare v_rows integer; v_id uuid;
begin
  select id into v_id from public.incidents
   where facility_id = '00000000-0000-0000-0000-0000009a0020' limit 1;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000009a0101');
  set local role authenticated;
  with touched as (
    update public.incidents set severity = 'high' where id = v_id returning 1
  ) select count(*) into v_rows from touched;
  reset role;

  perform pg_temp.t(
    'I3  a manager can change it - the positive control for I2',
    v_rows = 1,
    format('rows changed=%s (expected 1)', v_rows));
end $$;

-- ── I4: nobody deletes an incident ────────────────────────────────────────
do $$
declare v_delete boolean; v_anon boolean;
begin
  v_delete := has_table_privilege('authenticated', 'public.incidents', 'delete');
  v_anon   := has_table_privilege('anon', 'public.incidents', 'select');

  perform pg_temp.t(
    'I4  no session can delete an incident, and anon cannot read one',
    not v_delete and not v_anon,
    format('delete=%s anon_read=%s', v_delete, v_anon));
end $$;

-- ── I5: resolved means resolved AT some point ─────────────────────────────
do $$
declare v_state text; v_id uuid;
begin
  select id into v_id from public.incidents
   where facility_id = '00000000-0000-0000-0000-0000009a0020' limit 1;

  begin
    update public.incidents set status = 'resolved' where id = v_id;
    v_state := 'accepted';
  exception when check_violation then
    v_state := 'refused';
  end;

  perform pg_temp.t(
    'I5  closing an incident without a resolved_at is refused',
    v_state = 'refused',
    format('got %s', v_state));
end $$;

-- ── I6: and a bad review can point at it ──────────────────────────────────
--
-- The loop the spec describes, closed. Until this migration the Protection
-- Rules could block a review request on "this booking has a critical incident"
-- while nothing in the product could create one.
do $$
declare v_ok boolean := true; v_incident uuid;
begin
  select id into v_incident from public.incidents
   where facility_id = '00000000-0000-0000-0000-0000009a0020' limit 1;

  begin
    -- An update matching no rows still resolves every column it names, so a
    -- missing one raises 42703 whether or not any escalation exists.
    update public.review_escalations
       set incident_id = v_incident
     where id = '00000000-0000-0000-0000-000000000000';
  exception when undefined_column then
    v_ok := false;
  end;

  perform pg_temp.t(
    'I6  an escalation can name the incident it turned out to be about',
    v_ok and v_incident is not null,
    format('incident=%s', coalesce(v_incident::text, 'none')));
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
