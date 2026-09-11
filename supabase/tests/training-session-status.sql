-- ============================================================================
-- A training session can be marked held — its status, and nothing else
-- (20260911143447).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/training-session-status.sql
--
-- One transaction, rolled back. Impersonated through request.jwt.claims and
-- `set local role`, never the connection's own role, which bypasses RLS.
--
--   S1  the owner marks a session completed               (positive control)
--   S2  nobody moves a session: start_at is not theirs to write
--   S3  a customer of the facility cannot mark a session
--   S4  anon holds no UPDATE on the table at all
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid::text, 'role', 'authenticated')::text, true);
end $$;

create temp table state (key text primary key, value text);
grant all on state to authenticated, anon;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001f9001', 'tss-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001f9003', 'tss-customer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001f9001', 'tss-owner@example.invalid', 'TSS Owner'),
  ('00000000-0000-0000-0000-0000001f9003', 'tss-customer@example.invalid', 'TSS Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001f9010', 'TSS Org', 'tss-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001f9020', '00000000-0000-0000-0000-0000001f9010',
   'TSS Facility', 'tss-fac', 'tss-fac')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001f9030', '00000000-0000-0000-0000-0000001f9020',
   '00000000-0000-0000-0000-0000001f9001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001f9040', '00000000-0000-0000-0000-0000001f9020',
   'TSS Household', 'tss-c1@example.invalid', '00000000-0000-0000-0000-0000001f9003');

-- The series and its one session, written the way the app writes them.
do $$
declare v_series uuid; v_session uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  select (s).id into v_series from public.create_training_series(
    '00000000-0000-0000-0000-0000001f9020', 'TSS Puppy class',
    2::smallint, '18:00'::time, 60, current_date + 7, 1, 6, 60
  ) s;
  reset role;
  select id into v_session from public.training_series_sessions
   where series_id = v_series;
  insert into state values ('session', v_session::text);
exception when others then
  reset role; perform pg_temp.t('setup  the series exists', false, sqlerrm);
end $$;

-- ── S1: the owner marks the session held ────────────────────────────────────
do $$
declare v_session uuid; v_status text; v_touched integer;
begin
  select value::uuid into v_session from state where key = 'session';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  update public.training_series_sessions set status = 'completed'
   where id = v_session;
  get diagnostics v_touched = row_count;
  reset role;
  select status into v_status from public.training_series_sessions
   where id = v_session;
  perform pg_temp.t('S1  the owner marks a session completed',
    v_touched = 1 and v_status = 'completed',
    format('touched=%s status=%s', v_touched, v_status));
exception when others then
  reset role; perform pg_temp.t('S1  owner marks held', false, sqlerrm);
end $$;

-- ── S2: the schedule is not writable, even by the owner ────────────────────
do $$
declare v_session uuid; v_raised boolean;
begin
  select value::uuid into v_session from state where key = 'session';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9001');
  set local role authenticated;
  begin
    update public.training_series_sessions
       set start_at = start_at + interval '1 day'
     where id = v_session;
    v_raised := false;
  exception when insufficient_privilege then v_raised := true; end;
  reset role;
  perform pg_temp.t('S2  nobody moves a session — start_at is refused',
    v_raised, format('raised=%s', v_raised));
exception when others then
  reset role; perform pg_temp.t('S2  schedule frozen', false, sqlerrm);
end $$;

-- ── S3: a customer cannot mark a session ────────────────────────────────────
do $$
declare v_session uuid; v_touched integer; v_status text;
begin
  select value::uuid into v_session from state where key = 'session';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001f9003');
  set local role authenticated;
  update public.training_series_sessions set status = 'cancelled'
   where id = v_session;
  get diagnostics v_touched = row_count;
  reset role;
  select status into v_status from public.training_series_sessions
   where id = v_session;
  perform pg_temp.t('S3  a customer cannot mark a session',
    v_touched = 0 and v_status = 'completed',
    format('touched=%s status=%s', v_touched, v_status));
exception when others then
  reset role; perform pg_temp.t('S3  customer refused', false, sqlerrm);
end $$;

-- ── S4: anon holds no UPDATE ────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('S4  anon holds no UPDATE on training sessions',
    not has_table_privilege('anon', 'public.training_series_sessions', 'update')
      and not has_column_privilege('anon', 'public.training_series_sessions',
                                   'status', 'update'));
end $$;

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
