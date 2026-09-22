-- ============================================================================
-- What a cancellation costs (see the migration
-- a_cancellation_costs_what_the_facility_says).
--
--   bun run test:sql cancellation-policy
--
-- One transaction, rolled back. Nothing here survives the run.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- C1  With NO policy, the old flat rule still applies, unchanged. This is the
--     negative control and it is first on purpose: every facility on the
--     platform is in this state, so if it ever fails, the change is live.
-- C2  The greatest `minNoticeHours` the customer actually managed wins, and
--     the array's own order does not decide it.
-- C3  The boundary is >=. Exactly 72.0 hours gets the 72h tier — the cheaper
--     side, because punctuality is not a reason to charge more.
-- C4  With no tier at 0 and a customer inside every window, NOTHING applies.
--     The nearest tier is never borrowed.
-- C5  Each charge kind produces the right figure, and none of them can exceed
--     the booking or invent money that was never paid.
-- C6  The policy is per SERVICE: one service under a policy and another under
--     the old rule, on the same facility, at the same moment.
-- C7  A policy that is present but switched off decides nothing.
--
-- The tier rule is implemented TWICE — here and in `resolveTier`
-- (src/lib/settings/cancellation.ts, tests/unit/cancellation-policy.test.ts).
-- C2, C3 and C4 are deliberately the same three cases that file asserts, so a
-- change to one that is not made to the other shows up as a failure rather
-- than as a quiet disagreement about somebody's refund.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $tap$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$tap$;

-- A booking of a given service, priced at 200, starting `p_notice` from now.
-- Built off a real row so every not-null column is satisfied without this file
-- knowing the table's shape — which is what makes it survive a new column.
create or replace function pg_temp.terms(
  p_facility uuid, p_service text, p_notice interval,
  p_total numeric default 200, p_paid numeric default 0)
returns jsonb language sql as $probe$
  select private.cancellation_terms(jsonb_populate_record(
    null::public.bookings,
    to_jsonb(b) || jsonb_build_object(
      'facility_id', to_jsonb(p_facility),
      'start_at',    to_jsonb(now() + p_notice),
      'status',      'confirmed',
      'service',     p_service,
      'total_cost',  p_total,
      'amount_paid', p_paid)))
  from public.bookings b
  limit 1;
$probe$;

-- An existing facility with its settings FORCED to known values for the run.
-- Creating one is not worth it: `facilities.org_id` is not null and the row
-- would need an organisation too, and everything here rolls back regardless.
-- What matters is that the numbers under test are this file's, not whatever a
-- real facility happens to have configured today.
do $seed$
declare
  v_facility uuid;
begin
  select id into v_facility from public.facilities order by id limit 1;

  insert into public.facility_settings (facility_id, domain, value)
  values (v_facility, 'booking_rules',
          '{"cancelPolicyHours": 24, "cancelFeePercentage": 25}'::jsonb)
  on conflict (facility_id, domain) do update set value = excluded.value;

  delete from public.facility_settings
   where facility_id = v_facility and domain = 'cancellation_policies';

  perform set_config('yipyy.test_facility', v_facility::text, true);
end;
$seed$;

-- ── C1  THE NEGATIVE CONTROL: no policy, nothing changes ──────────────────
select pg_temp.t(
  'C1 no policy, 48h out: not late, no fee',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '48 hours')->>'late') = 'false',
  pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                interval '48 hours')::text);

select pg_temp.t(
  'C1 no policy, 2h out: late, 25%, and a figure',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '2 hours')->>'feePercentage') = '25'
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                     interval '2 hours')->>'amount')::numeric = 50,
  pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                interval '2 hours')::text);

select pg_temp.t(
  'C1 no policy, the source says so',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '2 hours')->>'source') = 'booking_rules');

-- ── The facility writes a policy ──────────────────────────────────────────
-- Tiers deliberately out of order: the array's order must not decide.
insert into public.facility_settings (facility_id, domain, value)
values (current_setting('yipyy.test_facility')::uuid, 'cancellation_policies',
'{"services":{
   "boarding":{"enabled":true,"customerMayCancel":"request","tiers":[
     {"id":"ahead","minNoticeHours":72,"charge":{"kind":"none"},"refund":"original"},
     {"id":"late","minNoticeHours":0,"charge":{"kind":"percentage","value":50},"refund":"store_credit"}]},
   "grooming":{"enabled":true,"customerMayCancel":"instant","tiers":[
     {"id":"g24","minNoticeHours":24,"charge":{"kind":"flat","value":15},"refund":"original"}]},
   "daycare":{"enabled":true,"tiers":[
     {"id":"d0","minNoticeHours":0,"charge":{"kind":"forfeit_pass"},"refund":"none"}]},
   "training":{"enabled":false,"tiers":[
     {"id":"t0","minNoticeHours":0,"charge":{"kind":"flat","value":99},"refund":"none"}]}}}'::jsonb);

-- ── C2  The most notice the customer managed wins ─────────────────────────
select pg_temp.t(
  'C2 100h out takes the 72h tier, not the 0h one listed after it',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '100 hours')->>'tierId') = 'ahead');

select pg_temp.t(
  'C2 71h out drops to the catch-all',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '71 hours')->>'tierId') = 'late');

-- ── C3  The boundary is >=, on the cheaper side ───────────────────────────
select pg_temp.t(
  'C3 exactly 72h gets the 72h tier and is free',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '72 hours')->>'tierId') = 'ahead'
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                     interval '72 hours')->>'amount')::numeric = 0);

-- ── C4  No catch-all means nothing applies ────────────────────────────────
select pg_temp.t(
  'C4 grooming 2h out, no 0h tier: no tier, nothing charged',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                 interval '2 hours')->'tierId') = 'null'::jsonb
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                     interval '2 hours')->>'amount')::numeric = 0,
  pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                interval '2 hours')::text);

-- ── C5  Each charge kind, and the clamps ──────────────────────────────────
select pg_temp.t(
  'C5 percentage is a share of the booking',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '2 hours')->>'amount')::numeric = 100);

select pg_temp.t(
  'C5 flat is the figure itself',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                 interval '48 hours')->>'amount')::numeric = 15);

select pg_temp.t(
  'C5 a forfeited pass is not money, and says so',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'daycare',
                 interval '2 hours')->>'amount')::numeric = 0
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'daycare',
                     interval '2 hours')->>'forfeitsPass') = 'true');

select pg_temp.t(
  'C5 a flat fee larger than the booking is clamped to it',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                 interval '48 hours', 5)->>'amount')::numeric = 5);

-- ── C6  Per service, on one facility, at one moment ───────────────────────
select pg_temp.t(
  'C6 boarding reads the policy while training reads the old rule',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '2 hours')->>'source') = 'policy'
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'training',
                     interval '2 hours')->>'source') = 'booking_rules');

select pg_temp.t(
  'C6 and cancelling is per service too',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'boarding',
                 interval '2 hours')->>'customerMayCancel') = 'request'
  and (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'grooming',
                     interval '2 hours')->>'customerMayCancel') = 'instant');

-- ── C7  A policy switched off decides nothing ─────────────────────────────
select pg_temp.t(
  'C7 training is written but disabled, so the old rule still runs',
  (pg_temp.terms(current_setting('yipyy.test_facility')::uuid, 'training',
                 interval '2 hours')->>'amount')::numeric = 50);

select n, name, ok, detail from tap order by n;

rollback;
