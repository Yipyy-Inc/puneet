-- ============================================================================
-- Who is on the daycare floor (20260806880000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/daycare-attendance.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE FLOOR IS NOT THE DASHBOARD (D1). `reception` holds
--    `daycare_check_in_out` and NOT `daycare_view_dashboard`. If the read had
--    been gated on the dashboard permission the board would be invisible to
--    the people standing at it — the mistake 20260806540000 corrected for
--    stylists and 20260806660000 for kennels.
--
-- 2. AND THE MANAGER IS NOT THE FLOOR (D2). `manager` holds
--    `daycare_manage_groups` and NOT `daycare_check_in_out`. Managers arrange
--    the groups; the floor checks the dogs in. That split is the preset's, and
--    it is honoured rather than widened.
--
-- 3. THE STATUS IS THE TIMESTAMPS (D3). A generated column, so it refuses to be
--    written by anyone — "column status can only be updated to DEFAULT". The
--    fixture stored `status` beside `checkInTime` and `checkOutTime`, which is
--    the same one-fact-in-two-places defect `payment_status` had.
--
-- 4. A DOG CANNOT LEAVE BEFORE IT ARRIVES (D3b). The CHECK refuses a checkout
--    with no check-in, and one that precedes it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002b0001', 'dc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002b0002', 'dc-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000002b0003', 'dc-manager@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002b0001', 'dc-owner@example.invalid',   'Owner'),
  ('00000000-0000-0000-0000-0000002b0002', 'dc-recep@example.invalid',   'Reception'),
  ('00000000-0000-0000-0000-0000002b0003', 'dc-manager@example.invalid', 'Manager')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002b0010', 'DC Org', 'dc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002b0020', '00000000-0000-0000-0000-0000002b0010',
   'DC Facility', 'dc-a', 'dc-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002b0030', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0001', 'owner', true),
  ('00000000-0000-0000-0000-0000002b0031', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0002', 'reception', true),
  ('00000000-0000-0000-0000-0000002b0032', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0003', 'manager', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000002b0040', '00000000-0000-0000-0000-0000002b0020',
   'Owner', 'dc-c@example.invalid');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

create or replace function pg_temp.bk() returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-0000002b0020', '00000000-0000-0000-0000-0000002b0040',
     'daycare', 'confirmed', now(), now() + interval '8 hours', 50, 0, 50)
  returning id into v_id;
  return v_id;
end $$;

-- ── D1: the floor is not the dashboard ─────────────────────────────────────
do $$
declare v_b uuid; v_st text; v_can boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0001');
  set local role authenticated;
  v_b := pg_temp.bk();
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0002');
  set local role authenticated;
  v_can := private.has_permission(
    '00000000-0000-0000-0000-0000002b0020', 'daycare_view_dashboard');
  insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
  values (v_b, '00000000-0000-0000-0000-0000002b0020', now());
  select status into v_st from public.daycare_attendance where booking_id = v_b;
  reset role;

  perform pg_temp.t('D1  reception checks a dog in WITHOUT the dashboard permission',
    v_st = 'checked-in' and v_can = false,
    format('status=%s dashboard=%s', v_st, v_can));
exception when others then
  reset role; perform pg_temp.t('D1  reception check-in', false, sqlerrm);
end $$;

-- ── D2: and the manager is not the floor ───────────────────────────────────
do $$
declare v_b uuid; v_err text := 'no error'; v_rows integer; v_can boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0001');
  set local role authenticated;
  v_b := pg_temp.bk();
  reset role;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0003');
  set local role authenticated;
  v_can := private.has_permission(
    '00000000-0000-0000-0000-0000002b0020', 'daycare_manage_groups');
  begin
    insert into public.daycare_attendance (booking_id, facility_id, checked_in_at)
    values (v_b, '00000000-0000-0000-0000-0000002b0020', now());
  exception when others then v_err := sqlerrm;
  end;
  reset role;
  select count(*) into v_rows from public.daycare_attendance where booking_id = v_b;

  perform pg_temp.t('D2  a manager manages groups and cannot check a dog in',
    v_can and v_err <> 'no error' and v_rows = 0,
    format('groups=%s err=%s rows=%s', v_can, left(v_err, 40), v_rows));
end $$;

-- ── D3: the status is the timestamps, and time runs forwards ───────────────
do $$
declare v_b uuid; v_e1 text := 'no error'; v_e2 text := 'no error';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0001');
  set local role authenticated;
  v_b := pg_temp.bk();
  insert into public.daycare_attendance (booking_id, facility_id)
  values (v_b, '00000000-0000-0000-0000-0000002b0020');

  begin
    update public.daycare_attendance set status = 'checked-in' where booking_id = v_b;
  exception when others then v_e1 := sqlerrm; end;

  begin
    update public.daycare_attendance set checked_out_at = now() where booking_id = v_b;
  exception when others then v_e2 := sqlerrm; end;
  reset role;

  perform pg_temp.t('D3  status cannot be written at all',
    v_e1 like '%only be updated to DEFAULT%', left(v_e1, 50));
  perform pg_temp.t('D3b a dog cannot be collected before it arrives',
    v_e2 like '%leaves_after_arriving%', left(v_e2, 60));
exception when others then
  reset role; perform pg_temp.t('D3  generated status', false, sqlerrm);
end $$;

-- ── D4: a member of the facility sees the floor ────────────────────────────
do $$
declare v_visible integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000002b0002');
  set local role authenticated;
  select count(*) into v_visible from public.daycare_attendance;
  reset role;
  perform pg_temp.t('D4  a member of the facility sees the floor',
    v_visible >= 1, format('visible=%s', v_visible));
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
