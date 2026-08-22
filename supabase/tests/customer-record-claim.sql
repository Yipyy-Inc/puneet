-- ============================================================================
-- A customer may claim their own record, and only their own (20260807180000).
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/customer-record-claim.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- public.link_client_record() is the only thing connecting a signed-in pet
-- owner to their `clients` row, and it could never work: it changes
-- profile_id, and private.enforce_client_integrity() refused any such change
-- unless the caller held `edit_clients` — which a customer, by definition,
-- does not.
--
--   42501: You may not change which account a client record belongs to.
--
-- SECURITY DEFINER did not save it. The function runs as the owner, but the
-- trigger reads auth.jwt()->>'sub', which is still the customer. So profile_id
-- stayed NULL for everybody and the customer portal had nothing to show even
-- once it started asking — the other half of the MOCK_CUSTOMER_ID defect.
--
-- THE RULE IS STILL THE RULE. The carve-out is three conditions wide: an
-- UNCLAIMED row, claimed FOR YOURSELF, carrying YOUR VERIFIED ADDRESS. C6/C7
-- are the ones that matter — without the address check this would let any
-- customer take any unclaimed record, including one belonging to somebody who
-- has not signed up yet.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────
-- Two signed-up people: one whose address is on a seeded client record, one
-- whose is not. No memberships — these are customers, not staff.

-- ── THE FIXTURE OWNS ITS OWN ROWS ──────────────────────────────────────────
--
-- It did not. It borrowed a REAL client record — `alice@example.com`, client
-- ref 15 at the demo facility — and claimed it. That worked when this database
-- was nearly empty and stopped working the moment a real person claimed that
-- row, because `link_client_at` will not re-assign a record that already has a
-- profile. The failure looked like the claim was broken; the claim was fine.
--
-- A test that asserts about claiming has to own an UNCLAIMED row.

insert into public.profiles (id, email, full_name) values
  ('user_3probeAdmin0000000000000000', 'crcadmin@yipyy.invalid', 'CRC Admin'),
  ('user_3probeAlice0000000000000000', 'crc-alice@example.invalid', 'Alice Probe'),
  ('user_3probeThief0000000000000000', 'thief@example.invalid',     'Opportunist')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role)
values ('user_3probeAdmin0000000000000000', 'superadmin')
on conflict (profile_id) do update set role = excluded.role;

select set_config('request.jwt.claims',
  json_build_object('sub','user_3probeAdmin0000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000d-0000-4000-8000-000000000001'::uuid,
    'CRC Probe Kennels', 'crc-probe', 'America/Toronto', 'C Owner', 'c@crc.invalid');
end $$;

reset role;
select set_config('request.jwt.claims', '', true);

-- The record the facility's front desk entered for Alice before she signed up.
-- No profile_id: that is exactly what makes it claimable.
insert into public.clients (facility_id, name, email, status, details)
select id, 'Alice Probe', 'crc-alice@example.invalid', 'active', '{}'::jsonb
  from public.facilities where slug = 'crc-probe';

-- One booking against it, so C4 has something to resolve that is strictly
-- fewer than every booking on the platform.
insert into public.bookings (facility_id, client_id, service, start_at, end_at)
select c.facility_id, c.id, 'Daycare', now() + interval '1 day',
       now() + interval '1 day 4 hours'
  from public.clients c
  join public.facilities f on f.id = c.facility_id
 where f.slug = 'crc-probe' and c.email = 'crc-alice@example.invalid';

-- Captured BEFORE dropping to `authenticated`, because the whole point of C4 is
-- to compare what the customer sees against what exists. Ask after the role
-- switch and both sides of the comparison are already filtered, which is how a
-- scoping test passes while proving nothing.
create temp table totals as
  select (select count(*) from public.bookings) as all_bookings,
         (select count(*) from public.clients)  as all_clients;
grant all on totals to authenticated;

-- ── THE FACILITY TO CLAIM AT ───────────────────────────────────────────────
--
-- `link_client_record` takes a facility SLUG now. It did not when this file was
-- written, and the unscoped version it replaced is precisely the defect phase 5
-- removed: one call claimed a record at every facility on the platform at once.
-- So a test calling the no-argument form is not just stale, it is asking for the
-- behaviour that was deliberately taken away.
--
-- Captured HERE, before the role switch, and for the same reason `totals` is:
-- once the session drops to Alice-who-has-claimed-nothing, `clients_read` hides
-- the very row this needs to find.
create temp table claim_target as select 'crc-probe'::text as slug;
grant all on claim_target to authenticated;

-- ── The owner of the address ────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_3probeAlice0000000000000000','role','authenticated')::text, true);
set local role authenticated;

-- C1: before claiming, `clients_read` shows them nothing. Not an error — they
-- are signed in and simply own no record yet.
select pg_temp.t(1, 'C1 an unlinked customer sees no client record',
  (select count(*) from public.clients) = 0);

do $$
declare v uuid;
begin
  v := public.link_client_record((select slug from claim_target));
  perform pg_temp.t(2, 'C2 they claim the row carrying their verified address',
    v is not null, coalesce(v::text, 'refused'));
exception when others then
  perform pg_temp.t(2, 'C2 they claim their own row', false, sqlerrm);
end $$;

-- C3: and see exactly ONE — theirs — out of every client in the facility. This
-- is RLS filtering, not a WHERE clause: clients_read admits `profile_id = sub`.
select pg_temp.t(3, 'C3 and now sees exactly their own record',
  (select count(*) from public.clients) = 1,
  (select string_agg(name, ', ') from public.clients));

-- C4: their bookings come with it, through own_client_ids() — and STRICTLY
-- FEWER than exist, so this is scoping rather than an open door.
select pg_temp.t(4, 'C4 their bookings resolve, and not everybody else''s',
  (select count(*) from public.bookings) > 0
    and (select count(*) from public.bookings) < (select all_bookings from totals),
  (select count(*)::text from public.bookings) || ' of '
    || (select all_bookings::text from totals));

-- C5: the route calls this whenever a direct read finds nothing, so a second
-- call must be a no-op rather than an error or a re-claim.
do $$
declare v uuid;
begin
  v := public.link_client_record((select slug from claim_target));
  perform pg_temp.t(5, 'C5 a second call is idempotent', v is not null);
exception when others then
  perform pg_temp.t(5, 'C5 a second call is idempotent', false, sqlerrm);
end $$;

-- ── Somebody else ───────────────────────────────────────────────────────────
-- THE ASSERTIONS THAT MATTER. A signed-up customer whose address is on no
-- client record must come away with nothing.

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_3probeThief0000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v uuid;
begin
  v := public.link_client_record((select slug from claim_target));
  perform pg_temp.t(6, 'C6 a stranger claims nothing — no address matches them',
    v is null, coalesce(v::text, 'null'));
exception when others then
  perform pg_temp.t(6, 'C6 a stranger claims nothing', false, sqlerrm);
end $$;

select pg_temp.t(7, 'C7 and still sees no client rows at all',
  (select count(*) from public.clients) = 0);

reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
