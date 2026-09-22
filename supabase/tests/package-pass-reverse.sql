-- ============================================================================
-- Giving a pass back (a_pass_can_be_given_back).
--
--   bun run test:sql package-pass-reverse
--
-- One transaction, rolled back. Nothing here survives the run.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- R0  THE NEGATIVE CONTROL, FIRST. A booking that spent no pass gives none
--     back and changes no balance. Every booking on the platform is in that
--     state, because `booking_id` was null on all 25 redemptions before this
--     work — so if R0 ever fails, the function is inventing passes for
--     bookings that never had one.
-- R1  A booking that DID spend one gets it back, and the pool says so.
-- R2  IT CANNOT MINT. A second call returns null and the balance does not
--     move. The guard is a count of redeemed against reversed, so a repeated
--     cancel, a retried request and a double click are all the same nothing.
-- R3  The ledger says what happened: 'reversed', +1, against that booking.
-- R4  A CUSTOMER CANNOT HAND THEMSELVES A PASS. RLS already drew that line —
--     `package_pass_entries_redeem_own` admits only 'redeemed' at -1 — and
--     this function is not SECURITY DEFINER precisely so it keeps applying.
-- R5  The doors. anon has none.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
grant usage on sequence tap_n_seq to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $tap$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$tap$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000004d3001', 'pr-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004d3002', 'pr-cust@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004d3001', 'pr-owner@example.invalid', 'PR Owner'),
  ('00000000-0000-0000-0000-0000004d3002', 'pr-cust@example.invalid', 'PR Customer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004d3010', 'PR Org', 'pr-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004d3020', '00000000-0000-0000-0000-0000004d3010',
   'PR Daycare', 'pr-a', 'pr-a')
on conflict do nothing;

-- An owner holds `financial_take_payment`, which is what the ledger's insert
-- policy asks for. A groomer does not, which is R4's other half.
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004d3030', '00000000-0000-0000-0000-0000004d3020',
   '00000000-0000-0000-0000-0000004d3001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000004d3040', '00000000-0000-0000-0000-0000004d3020',
   '00000000-0000-0000-0000-0000004d3002', 'PR Customer', 'pr-cust@example.invalid');

-- Ten daycare days, bought up front. The client's own example: daycare is
-- sold as passes, and a late cancellation is what takes one.
insert into public.customer_packages (id, facility_id, client_id, package_name, price_paid)
values ('00000000-0000-0000-0000-0000004d3050', '00000000-0000-0000-0000-0000004d3020',
        '00000000-0000-0000-0000-0000004d3040', 'Ten Daycare Days', 400);

insert into public.customer_package_lines
  (customer_package_id, service_id, service_name, passes_total, module)
values ('00000000-0000-0000-0000-0000004d3050', 'daycare-full-day', 'Full Day', 10, 'daycare');

-- Two bookings: one spent a pass, one did not.
insert into public.bookings
  (id, facility_id, client_id, service, status, start_at, end_at, total_cost)
values
  ('00000000-0000-0000-0000-0000004d3061', '00000000-0000-0000-0000-0000004d3020',
   '00000000-0000-0000-0000-0000004d3040', 'daycare', 'confirmed',
   now() + interval '3 days', now() + interval '3 days 8 hours', 40),
  ('00000000-0000-0000-0000-0000004d3062', '00000000-0000-0000-0000-0000004d3020',
   '00000000-0000-0000-0000-0000004d3040', 'daycare', 'confirmed',
   now() + interval '4 days', now() + interval '4 days 8 hours', 40);

-- The pass that booking …61 spent, linked to it — the link this whole change
-- exists to create.
insert into public.package_pass_entries
  (facility_id, customer_package_id, service_id, passes, reason, booking_id, service_label)
values
  ('00000000-0000-0000-0000-0000004d3020', '00000000-0000-0000-0000-0000004d3050',
   'daycare-full-day', -1, 'redeemed',
   '00000000-0000-0000-0000-0000004d3061', 'Full Day');

create temp table r as
  select right(id::text, 1)::int as k, ref from public.bookings
   where id::text like '00000000-0000-0000-0000-0000004d306_';
grant select on r to authenticated;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $as$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $as$;

create or replace function pg_temp.refusal(p_sql text) returns text
language plpgsql as $ref$
begin
  execute p_sql;
  return 'accepted';
exception when others then
  return sqlstate;
end $ref$;

create or replace function pg_temp.left_in_pool() returns integer
language sql as $pool$
  select s.passes_remaining from public.customer_package_pool_status s
   where s.customer_package_id = '00000000-0000-0000-0000-0000004d3050'
     and s.service_id = 'daycare-full-day';
$pool$;
grant execute on function pg_temp.left_in_pool() to authenticated;

-- One spent of ten.
select pg_temp.t('R0 the pool starts at nine of ten',
  pg_temp.left_in_pool() = 9, pg_temp.left_in_pool()::text);

-- ── R4  A customer cannot give themselves a pass ──────────────────────────
-- Before the staff path, so the refusal is not confused with "already done".
select pg_temp.as_user('00000000-0000-0000-0000-0000004d3002');
set local role authenticated;

select pg_temp.t(
  'R4 the customer whose pass it is cannot hand it back to themselves',
  pg_temp.refusal($q$select public.reverse_package_pass((select ref from r where k = 1), 'mine')$q$) = '42501');

reset role;

select pg_temp.t('R4 and nothing moved',
  pg_temp.left_in_pool() = 9, pg_temp.left_in_pool()::text);

-- ── The staff path ────────────────────────────────────────────────────────
select pg_temp.as_user('00000000-0000-0000-0000-0000004d3001');
set local role authenticated;

-- ── R0  THE NEGATIVE CONTROL: a booking that spent nothing ────────────────
select pg_temp.t(
  'R0 a booking that spent no pass gives none back',
  public.reverse_package_pass((select ref from r where k = 2), 'nothing to give') is null);

select pg_temp.t('R0 and the pool is untouched',
  pg_temp.left_in_pool() = 9, pg_temp.left_in_pool()::text);

-- ── R1  The pass comes back ───────────────────────────────────────────────
select pg_temp.t(
  'R1 the booking that spent one gets it back, and the pool says ten',
  public.reverse_package_pass((select ref from r where k = 1), 'cancelled in time') = 10);

-- ── R2  It cannot mint ────────────────────────────────────────────────────
select pg_temp.t(
  'R2 a second call gives nothing back',
  public.reverse_package_pass((select ref from r where k = 1), 'again') is null);

select pg_temp.t('R2 and the pool is still ten, not eleven',
  pg_temp.left_in_pool() = 10, pg_temp.left_in_pool()::text);

reset role;

-- ── R3  The ledger says what happened ─────────────────────────────────────
select pg_temp.t(
  'R3 one reversed entry, +1, against that booking',
  (select count(*) = 1 from public.package_pass_entries e
    where e.booking_id = '00000000-0000-0000-0000-0000004d3061'
      and e.reason = 'reversed' and e.passes = 1
      and e.service_id = 'daycare-full-day'));

select pg_temp.t(
  'R3 and the reason it was given back is on the row',
  (select note = 'cancelled in time' from public.package_pass_entries e
    where e.booking_id = '00000000-0000-0000-0000-0000004d3061'
      and e.reason = 'reversed'));

-- ── R5  The doors ─────────────────────────────────────────────────────────
--
-- `public`, `anon` and `authenticated` are three different grants. A revoke
-- naming a privilege the role does not hold succeeds silently and looks
-- exactly like one that worked, so the state is read back rather than assumed.
select pg_temp.t(
  'R5 authenticated may ask, anon and public may not',
  has_function_privilege('authenticated', 'public.reverse_package_pass(bigint, text)', 'execute')
  and not has_function_privilege('anon', 'public.reverse_package_pass(bigint, text)', 'execute')
  and not has_function_privilege('public', 'public.reverse_package_pass(bigint, text)', 'execute'));

select n, name, ok, detail from tap order by n;

rollback;
