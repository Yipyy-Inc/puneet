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

insert into public.profiles (id, email, full_name) values
  ('user_3probeAlice0000000000000000', 'alice@example.com',     'Alice Johnson'),
  ('user_3probeThief0000000000000000', 'thief@example.invalid', 'Opportunist')
on conflict (id) do nothing;

-- Captured BEFORE dropping to `authenticated`, because the whole point of C4 is
-- to compare what the customer sees against what exists. Ask after the role
-- switch and both sides of the comparison are already filtered, which is how a
-- scoping test passes while proving nothing.
create temp table totals as
  select (select count(*) from public.bookings) as all_bookings,
         (select count(*) from public.clients)  as all_clients;
grant all on totals to authenticated;

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
  v := public.link_client_record();
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
  v := public.link_client_record();
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
  v := public.link_client_record();
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
