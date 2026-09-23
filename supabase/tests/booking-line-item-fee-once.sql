-- ============================================================================
-- A service charge lands once, and nothing else is disturbed
-- (20260923090000_a_service_charge_is_a_line_on_the_bill).
--
--   bun run test:sql booking-line-item-fee-once
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- F0  THE NEGATIVE CONTROL, AND IT IS FIRST ON PURPOSE. Four writers already
--     put `kind: 'fee'` rows on bookings with no `fee_id` — time fees, the
--     cancellation fee, the grooming matting surcharge, mark-ready charges —
--     and several of them legitimately write TWO rows carrying the same
--     `source_id`. If the new constraint over-fires on those, existing
--     revenue stops being billable. NULLs are distinct in Postgres; this
--     proves it rather than trusting it.
-- F1  The same fee twice on one booking is refused (23505). That refusal IS
--     MoéGo's "each fee can only be added once per appointment".
-- F2  The same fee on a DIFFERENT booking is fine — the rule is per booking,
--     not per facility.
-- F3  Two DIFFERENT fees on one booking are fine.
-- F4  A fee line still moves the bill: `price` is generated, `extras_total`
--     and `amount_due` grow. A constraint that quietly broke the derivation
--     would be worse than no constraint.
-- F5  The till permission is unchanged — `retail_process_sale`, not
--     `edit_bookings`, and the accountant is still refused.
-- F6  The index the reports branch will read exists and is partial.
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
  ('00000000-0000-0000-0000-0000004f1001', 'fo-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004f1003', 'fo-acct@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004f1001', 'fo-owner@example.invalid', 'FO Owner'),
  ('00000000-0000-0000-0000-0000004f1003', 'fo-acct@example.invalid',  'FO Accountant')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004f1010', 'FO Org', 'fo-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004f1020', '00000000-0000-0000-0000-0000004f1010',
   'FO Facility', 'fo-a', 'fo-a')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000004f1030', '00000000-0000-0000-0000-0000004f1020',
   '00000000-0000-0000-0000-0000004f1001', 'owner', true),
  ('00000000-0000-0000-0000-0000004f1032', '00000000-0000-0000-0000-0000004f1020',
   '00000000-0000-0000-0000-0000004f1003', 'accountant', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000004f1040', '00000000-0000-0000-0000-0000004f1020',
   'FO Buyer', 'fo-c@example.invalid');

insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020', '00000000-0000-0000-0000-0000004f1040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 100),
  ('00000000-0000-0000-0000-0000004f1052', '00000000-0000-0000-0000-0000004f1020', '00000000-0000-0000-0000-0000004f1040',
   'boarding', 'confirmed', now() + interval '20 days', now() + interval '22 days', 100);

-- ── F0  THE NEGATIVE CONTROL ──────────────────────────────────────────────
--
-- Two fee rows, no fee_id, SAME source_id — the shape the existing writers
-- produce. Both must insert. If this fails, the constraint is over-firing and
-- nothing else in this file matters.
do $$
begin
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, source_id)
  values
    ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020',
     'fee', 'Late pickup', 10, 1, 'time-fee'),
    ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020',
     'fee', 'Early drop-off', 8, 1, 'time-fee');
  insert into tap(name, ok) values
    ('F0 two fee rows with no fee_id and one source_id both insert', true);
exception when others then
  insert into tap(name, ok, detail) values
    ('F0 two fee rows with no fee_id and one source_id both insert', false, sqlerrm);
end $$;

-- ── F1  The same fee twice on one booking ─────────────────────────────────
insert into public.booking_line_items
  (booking_id, facility_id, kind, name, unit_price, quantity, fee_id)
values
  ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020',
   'fee', 'Cleaning fee', 15, 1, 'cf-cleaning');

do $$
begin
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, fee_id)
  values
    ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020',
     'fee', 'Cleaning fee', 15, 1, 'cf-cleaning');
  insert into tap(name, ok, detail) values
    ('F1 the same fee twice on one booking is refused', false, 'the second insert was accepted');
exception when unique_violation then
  insert into tap(name, ok) values
    ('F1 the same fee twice on one booking is refused', true);
end $$;

-- ── F2  The same fee on another booking ───────────────────────────────────
do $$
begin
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, fee_id)
  values
    ('00000000-0000-0000-0000-0000004f1052', '00000000-0000-0000-0000-0000004f1020',
     'fee', 'Cleaning fee', 15, 1, 'cf-cleaning');
  insert into tap(name, ok) values
    ('F2 the same fee on a different booking is allowed', true);
exception when others then
  insert into tap(name, ok, detail) values
    ('F2 the same fee on a different booking is allowed', false, sqlerrm);
end $$;

-- ── F3  Two different fees on one booking ─────────────────────────────────
do $$
begin
  insert into public.booking_line_items
    (booking_id, facility_id, kind, name, unit_price, quantity, fee_id)
  values
    ('00000000-0000-0000-0000-0000004f1051', '00000000-0000-0000-0000-0000004f1020',
     'fee', 'Travel fee', 12, 1, 'cf-travel');
  insert into tap(name, ok) values
    ('F3 two different fees on one booking are allowed', true);
exception when others then
  insert into tap(name, ok, detail) values
    ('F3 two different fees on one booking are allowed', false, sqlerrm);
end $$;

-- ── F4  The bill still moves ──────────────────────────────────────────────
--
-- 10 + 8 (F0) + 15 (F1) + 12 (F3) = 45 on top of a 100 booking.
select pg_temp.t(
  'F4 a fee line is generated, totalled and owed',
  (select price = 15 from public.booking_line_items
    where booking_id = '00000000-0000-0000-0000-0000004f1051' and fee_id = 'cf-cleaning')
  and (select extras_total = 45 and amount_due = 145
         from public.bookings where id = '00000000-0000-0000-0000-0000004f1051'),
  (select format('extras_total=%s amount_due=%s', extras_total, amount_due)
     from public.bookings where id = '00000000-0000-0000-0000-0000004f1051'));

-- ── F5  The till permission is unchanged ──────────────────────────────────
--
-- Decision 4 of 20260806820000: putting something on a bill is a till job.
-- `booking-line-items.sql` L6 already proves an accountant cannot, by trying
-- it as that session — this asserts the narrower thing this migration could
-- have broken: that adding a column and a constraint did not rewrite the gate
-- the policy names.
select pg_temp.t(
  'F5 the insert policy still names retail_process_sale',
  (select count(*) = 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'booking_line_items'
      and cmd        = 'INSERT'
      and with_check like '%retail_process_sale%'),
  (select coalesce(string_agg(policyname || ':' || cmd, ', '), 'no policies')
     from pg_policies
    where schemaname = 'public' and tablename = 'booking_line_items'));

-- ── F6  The reports index ─────────────────────────────────────────────────
select pg_temp.t(
  'F6 the fee index exists and is partial',
  (select count(*) = 1 from pg_indexes
    where tablename  = 'booking_line_items'
      and indexname  = 'booking_line_items_fee_idx'
      and indexdef like '%fee_id IS NOT NULL%'));

select n, name, ok, detail from tap order by n;

rollback;
