-- ============================================================================
-- A facility can see what its own fees earned
-- (20260923140000_a_facility_can_see_what_its_fees_earned).
--
--   bun run test:sql facility-report-service-charges
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- R0  THE NEGATIVE CONTROL, FIRST ON PURPOSE. The branch answers `[]` before
--     any fee line exists. A report that returns rows from an empty period is
--     reading somebody else's data, and every assertion below would pass just
--     as happily against it.
-- R1  ANOTHER FACILITY'S FEE LINE IS NOT IN THE ANSWER. The second control,
--     and the one that matters: the whole function is SECURITY INVOKER and
--     scoped by `p_facility_id`, so a leak here is a facility reading a
--     competitor's takings.
-- R2  A fee line is counted, under its name, with what it earned.
-- R3  GROUPED BY `fee_id`, NOT BY NAME. Renaming a fee must not split its
--     history in two, and the name reported is the most recent one.
-- R4  A line with NO `fee_id` — a time fee, a retail item — is NOT a service
--     charge and stays out.
-- R5  A CANCELLED booking's fee is not earnings.
-- R6  A discount authored as a custom fee is a negative, and it is SUBTRACTED
--     rather than dropped.
-- R7  The period window is respected: last period's fee lands in
--     `previousTotal`, not in `current`.
-- R8  THE GRANTS, ASSERTED. A revoke naming a privilege the role never held
--     succeeds silently and looks exactly like one that worked. `anon` and
--     `public` must not execute this; `authenticated` and `service_role` must.
-- R9  It is still SECURITY INVOKER. Making it DEFINER would hand every caller
--     the owner's reach and no test above would notice.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $tap$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$tap$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000005c1001', 'sc-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000005c1001', 'sc-owner@example.invalid', 'SC Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000005c1010', 'SC Org', 'sc-org')
on conflict do nothing;

-- TWO facilities. The second exists only to be excluded.
insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000005c1020', '00000000-0000-0000-0000-0000005c1010',
   'SC Facility', 'sc-a', 'sc-a'),
  ('00000000-0000-0000-0000-0000005c1021', '00000000-0000-0000-0000-0000005c1010',
   'SC Other', 'sc-b', 'sc-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000005c1030', '00000000-0000-0000-0000-0000005c1020',
   '00000000-0000-0000-0000-0000005c1001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000005c1040', '00000000-0000-0000-0000-0000005c1020',
   'SC Buyer', 'sc-c@example.invalid'),
  ('00000000-0000-0000-0000-0000005c1041', '00000000-0000-0000-0000-0000005c1021',
   'SC Stranger', 'sc-d@example.invalid');

-- `now() + 10 days` is THIS period below; `now() - 40 days` is the previous one.
insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000005c1051', '00000000-0000-0000-0000-0000005c1020', '00000000-0000-0000-0000-0000005c1040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 100),
  ('00000000-0000-0000-0000-0000005c1052', '00000000-0000-0000-0000-0000005c1020', '00000000-0000-0000-0000-0000005c1040',
   'boarding', 'confirmed', now() + interval '11 days', now() + interval '13 days', 100),
  -- cancelled, same period
  ('00000000-0000-0000-0000-0000005c1053', '00000000-0000-0000-0000-0000005c1020', '00000000-0000-0000-0000-0000005c1040',
   'boarding', 'cancelled', now() + interval '12 days', now() + interval '14 days', 100),
  -- last period
  ('00000000-0000-0000-0000-0000005c1054', '00000000-0000-0000-0000-0000005c1020', '00000000-0000-0000-0000-0000005c1040',
   'boarding', 'confirmed', now() - interval '40 days', now() - interval '38 days', 100),
  -- ANOTHER facility, same period
  ('00000000-0000-0000-0000-0000005c1055', '00000000-0000-0000-0000-0000005c1021', '00000000-0000-0000-0000-0000005c1041',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 100);

-- ── R0  THE NEGATIVE CONTROL: nothing charged yet ─────────────────────────
select pg_temp.t(
  'R0 the branch answers [] before any fee line exists',
  (select public.facility_report_dataset(
            '00000000-0000-0000-0000-0000005c1020', 'service-charges',
            now() + interval '1 day', now() + interval '30 days',
            now() - interval '60 days', now() - interval '30 days')->'current'
          = '[]'::jsonb),
  (select (public.facility_report_dataset(
            '00000000-0000-0000-0000-0000005c1020', 'service-charges',
            now() + interval '1 day', now() + interval '30 days',
            now() - interval '60 days', now() - interval '30 days'))::text));

-- ── The lines ─────────────────────────────────────────────────────────────
insert into public.booking_line_items
  (booking_id, facility_id, kind, name, unit_price, quantity, fee_id, source_id, created_at)
values
  -- R2/R3: the same fee on two bookings, RENAMED on the newer line.
  ('00000000-0000-0000-0000-0000005c1051', '00000000-0000-0000-0000-0000005c1020',
   'fee', 'Cleaning fee', 15, 1, 'cf-clean', null, now() - interval '2 days'),
  ('00000000-0000-0000-0000-0000005c1052', '00000000-0000-0000-0000-0000005c1020',
   'fee', 'Deep cleaning fee', 15, 1, 'cf-clean', null, now() - interval '1 day'),
  -- R4: no fee_id, so not a service charge.
  ('00000000-0000-0000-0000-0000005c1051', '00000000-0000-0000-0000-0000005c1020',
   'fee', 'Late pickup', 40, 1, null, 'time-fee', now()),
  -- R5: on a cancelled booking.
  ('00000000-0000-0000-0000-0000005c1053', '00000000-0000-0000-0000-0000005c1020',
   'fee', 'Cleaning fee', 15, 1, 'cf-clean', null, now()),
  -- R6: a discount, authored as a fee, written as a negative item.
  ('00000000-0000-0000-0000-0000005c1051', '00000000-0000-0000-0000-0000005c1020',
   'item', 'Loyalty rebate', -5, 1, 'cf-rebate', null, now()),
  -- R7: last period.
  ('00000000-0000-0000-0000-0000005c1054', '00000000-0000-0000-0000-0000005c1020',
   'fee', 'Cleaning fee', 15, 1, 'cf-clean', null, now() - interval '40 days'),
  -- R1: another facility's line, this period.
  ('00000000-0000-0000-0000-0000005c1055', '00000000-0000-0000-0000-0000005c1021',
   'fee', 'Stranger fee', 999, 1, 'cf-stranger', null, now());

create temp view sc as
  select public.facility_report_dataset(
           '00000000-0000-0000-0000-0000005c1020', 'service-charges',
           now() + interval '1 day', now() + interval '30 days',
           now() - interval '60 days', now() - interval '30 days') as d;

-- ── R1  Another facility's takings are not in the answer ──────────────────
select pg_temp.t(
  'R1 another facility''s fee line is not in the answer',
  (select (d->>'current') not like '%Stranger%' and (d->>'current') not like '%999%' from sc),
  (select (d->>'current') from sc));

-- ── R2  The fee is counted, under its name ────────────────────────────────
select pg_temp.t(
  'R2 the fee is counted with what it earned',
  (select (d->'current'->0->>'revenue')::numeric = 30 from sc),
  (select (d->>'current') from sc));

-- ── R3  Grouped by fee_id; the newest name wins ───────────────────────────
select pg_temp.t(
  'R3 a renamed fee stays ONE row, under its most recent name',
  (select jsonb_array_length(d->'current') = 2
      and (d->'current'->0->>'name') = 'Deep cleaning fee'
      and (d->'current'->0->>'timesCharged')::int = 2
     from sc),
  (select (d->>'current') from sc));

-- ── R4  A line with no fee_id is not a service charge ─────────────────────
select pg_temp.t(
  'R4 a line with no fee_id is left out',
  (select (d->>'current') not like '%Late pickup%' from sc),
  (select (d->>'current') from sc));

-- ── R5  A cancelled booking is not earnings ───────────────────────────────
-- Three `cf-clean` lines exist this period; one is on a cancelled booking.
select pg_temp.t(
  'R5 a cancelled booking''s fee is not counted',
  (select (d->'current'->0->>'timesCharged')::int = 2 from sc),
  (select (d->>'current') from sc));

-- ── R6  A discount subtracts ──────────────────────────────────────────────
select pg_temp.t(
  'R6 a discount authored as a fee is subtracted, not dropped',
  (select (d->>'total')::numeric = 25 from sc),   -- 15 + 15 - 5
  (select (d->>'total') from sc));

-- ── R7  The window holds ──────────────────────────────────────────────────
select pg_temp.t(
  'R7 last period''s fee is in previousTotal, not in current',
  (select (d->>'previousTotal')::numeric = 15 from sc),
  (select (d->>'previousTotal') from sc));

-- ── R8  The grants, asserted rather than assumed ──────────────────────────
select pg_temp.t(
  'R8 anon cannot execute the report function',
  not has_function_privilege('anon',
    'public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)',
    'EXECUTE'));

select pg_temp.t(
  'R8 public cannot execute the report function',
  not has_function_privilege('public',
    'public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)',
    'EXECUTE'));

select pg_temp.t(
  'R8 authenticated can execute the report function',
  has_function_privilege('authenticated',
    'public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)',
    'EXECUTE'));

select pg_temp.t(
  'R8 service_role can execute the report function',
  has_function_privilege('service_role',
    'public.facility_report_dataset(uuid, text, timestamptz, timestamptz, timestamptz, timestamptz)',
    'EXECUTE'));

-- ── R9  Still SECURITY INVOKER ────────────────────────────────────────────
select pg_temp.t(
  'R9 the function is SECURITY INVOKER, so RLS still decides',
  (select not pr.prosecdef
     from pg_proc pr join pg_namespace ns on ns.oid = pr.pronamespace
    where ns.nspname = 'public' and pr.proname = 'facility_report_dataset'));

select n, name, ok, detail from tap order by n;

rollback;
