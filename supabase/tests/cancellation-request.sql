-- ============================================================================
-- "Ask us, do not just cancel" — per service, where the facility said so
-- (see the migration a_customer_asks_the_facility_to_cancel).
--
--   bun run test:sql cancellation-request
--
-- One transaction, rolled back. Nothing here survives the run.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- R0  THE NEGATIVE CONTROL, AND IT IS FIRST ON PURPOSE. With no policy the
--     customer still cancels, exactly as they always could. Every facility on
--     the platform is in this state; if R0 ever fails, a shipped capability
--     has been taken away from all of them.
-- R1  With customerMayCancel: "request", cancelling is refused.
-- R2  ... by a plain UPDATE too, not only through cancel_my_booking. Hiding a
--     button is not a rule: this row is reachable through PostgREST by anyone
--     signed in as its owner, so the refusal has to live in the trigger.
-- R3  A WITHDRAWAL IS STILL ALLOWED under the same policy. The facility has
--     not accepted the booking yet, and "ask us first" is about a booking that
--     was agreed — not about a request nobody has looked at.
-- R4  It is PER SERVICE: daycare stays instant while boarding asks.
-- R5  A policy switched OFF decides nothing here either, which is the same
--     promise cancellation-policy.sql makes about the money.
-- R6  The preview tells the portal which of the two it is looking at, so the
--     screen and the trigger cannot disagree about whether there is a button.
-- R7  The customer is not left with nowhere to go: the note rail takes
--     'cancel_request', and still refuses a kind nobody defined.
-- R8  The doors. anon has none.
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
  ('00000000-0000-0000-0000-0000004d2001', 'cr-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004d2001', 'cr-owner@example.invalid', 'CR Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004d2010', 'CR Org', 'cr-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2010',
   'CR Asks', 'cr-a', 'cr-a')
on conflict do nothing;

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000004d2040', '00000000-0000-0000-0000-0000004d2020',
   '00000000-0000-0000-0000-0000004d2001', 'CR Owner', 'cr-owner@example.invalid');

-- Written as the database itself (no session), so they are what they say.
insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000004d2051', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 200),
  ('00000000-0000-0000-0000-0000004d2052', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 200),
  ('00000000-0000-0000-0000-0000004d2053', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 200),
  ('00000000-0000-0000-0000-0000004d2054', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'boarding', 'request_submitted', now() + interval '4 days', now() + interval '6 days', 0),
  ('00000000-0000-0000-0000-0000004d2055', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'daycare', 'confirmed', now() + interval '10 days', now() + interval '10 days 8 hours', 40),
  ('00000000-0000-0000-0000-0000004d2056', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'grooming', 'confirmed', now() + interval '10 days', now() + interval '10 days 2 hours', 80),
  ('00000000-0000-0000-0000-0000004d2057', '00000000-0000-0000-0000-0000004d2020', '00000000-0000-0000-0000-0000004d2040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 200);

create temp table r as
  select right(id::text, 1)::int as k, ref from public.bookings
   where id::text like '00000000-0000-0000-0000-0000004d205_';
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

-- ── R0  THE NEGATIVE CONTROL: no policy, the customer still cancels ───────
select pg_temp.as_user('00000000-0000-0000-0000-0000004d2001');
set local role authenticated;

select pg_temp.t(
  'R0 with no policy written, a confirmed booking still cancels',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 1), null)$q$) = 'accepted');

select pg_temp.t(
  'R0 and the preview says instant, because that is what it has always been',
  (public.my_booking_cancel_terms((select ref from r where k = 2))->>'customerMayCancel') = 'instant');

reset role;

-- ── The facility writes a policy ──────────────────────────────────────────
-- Boarding asks. Daycare does not. Grooming asks but is switched off.
insert into public.facility_settings (facility_id, domain, value)
values ('00000000-0000-0000-0000-0000004d2020', 'cancellation_policies',
'{"services":{
   "boarding":{"enabled":true,"customerMayCancel":"request","tiers":[
     {"id":"b0","minNoticeHours":0,"charge":{"kind":"none"},"refund":"original"}]},
   "daycare":{"enabled":true,"customerMayCancel":"instant","tiers":[
     {"id":"d0","minNoticeHours":0,"charge":{"kind":"none"},"refund":"original"}]},
   "grooming":{"enabled":false,"customerMayCancel":"request","tiers":[
     {"id":"g0","minNoticeHours":0,"charge":{"kind":"none"},"refund":"original"}]}}}'::jsonb)
on conflict (facility_id, domain) do update set value = excluded.value;

set local role authenticated;

-- ── R1 / R2  The refusal, through both doors ──────────────────────────────
select pg_temp.t(
  'R1 boarding asks, so cancel_my_booking is refused',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 2), null)$q$) = '42501');

select pg_temp.t(
  'R2 and a plain update is refused the same way',
  pg_temp.refusal($q$update public.bookings set status = 'cancelled'
                      where ref = (select ref from r where k = 3)$q$) = '42501');

-- ── R3  A withdrawal is not a cancellation ────────────────────────────────
select pg_temp.t(
  'R3 a request the facility has not accepted can still be withdrawn',
  (select (c->>'withdrawal')::boolean
     from (select public.cancel_my_booking((select ref from r where k = 4), null) c) x));

-- ── R4  Per service ───────────────────────────────────────────────────────
select pg_temp.t(
  'R4 daycare on the same facility, at the same moment, still cancels',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 5), null)$q$) = 'accepted');

-- ── R5  Switched off decides nothing ──────────────────────────────────────
select pg_temp.t(
  'R5 grooming says request but is disabled, so the customer still cancels',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 6), null)$q$) = 'accepted');

-- ── R6  The screen reads the same answer the trigger acts on ──────────────
select pg_temp.t(
  'R6 the preview says request for boarding and instant for grooming',
  (public.my_booking_cancel_terms((select ref from r where k = 7))->>'customerMayCancel') = 'request'
  and (public.my_booking_cancel_terms((select ref from r where k = 6))->>'customerMayCancel') = 'instant');

-- ── R7  Somewhere to go instead ───────────────────────────────────────────
select pg_temp.t(
  'R7 the note rail takes a cancel_request',
  public.add_owner_booking_note((select ref from r where k = 7), 'cancel_request',
    'Our plans changed, please cancel this one.') is not null);

select pg_temp.t(
  'R7 and the booking still stands until the facility acts on it',
  (select status = 'confirmed' from public.bookings where ref = (select ref from r where k = 7)));

select pg_temp.t(
  'R7 a kind nobody defined is still refused',
  pg_temp.refusal($q$select public.add_owner_booking_note((select ref from r where k = 7), 'delete_it', 'no')$q$) = '22023');

reset role;

select pg_temp.t(
  'R7 the request is filed on the booking, readable by both sides',
  (select count(*) = 1 from public.notes
    where entity_id = '00000000-0000-0000-0000-0000004d2057'
      and customer_request = 'cancel_request'
      and visibility = 'shared_with_customer'));

-- ── R8  The doors ─────────────────────────────────────────────────────────
--
-- `public`, `anon` and `authenticated` are three different grants. A revoke
-- naming a privilege the role does not hold succeeds silently and looks
-- exactly like one that worked, so the state is read back rather than assumed.
select pg_temp.t(
  'R8 authenticated may ask, anon may not',
  has_function_privilege('authenticated',
        'public.add_owner_booking_note(bigint, text, text)', 'execute')
  and not has_function_privilege('anon',
        'public.add_owner_booking_note(bigint, text, text)', 'execute')
  and not has_function_privilege('anon',
        'public.cancel_my_booking(bigint, text)', 'execute'));

select n, name, ok, detail from tap order by n;

rollback;
