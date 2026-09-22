-- ============================================================================
-- A customer cancels before the start, and the booking says on what terms
-- (a_customer_cancels_before_the_start).
--
--   C  cancel_my_booking cancels the caller's own booking and records who,
--      when, why and on what terms — early, late (with the facility's fee),
--      or a withdrawal of a request, which is never late
--   S  a confirmed booking that has started is refused
--   N  a facility with no booking rules saved has no late cancellations
--   O  someone else's booking: the preview answers nothing and the cancel is
--      refused
--   F  a customer cannot write details.cancellation themselves
--   P  anon cannot call either function
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;
grant usage on sequence tap_n_seq to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000004d1001', 'oc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004d1002', 'oc-other@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004d1001', 'oc-owner@example.invalid', 'OC Owner'),
  ('00000000-0000-0000-0000-0000004d1002', 'oc-other@example.invalid', 'OC Other')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004d1010', 'OC Org', 'oc-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1010',
   'OC Ruled', 'oc-a', 'oc-a'),
  ('00000000-0000-0000-0000-0000004d1021', '00000000-0000-0000-0000-0000004d1010',
   'OC Unruled', 'oc-b', 'oc-b')
on conflict do nothing;

insert into public.facility_settings (facility_id, domain, value) values
  ('00000000-0000-0000-0000-0000004d1020', 'booking_rules',
   '{"cancelPolicyHours": 48, "cancelFeePercentage": 50}'::jsonb)
on conflict (facility_id, domain) do update set value = excluded.value;

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000004d1040', '00000000-0000-0000-0000-0000004d1020',
   '00000000-0000-0000-0000-0000004d1001', 'OC Owner', 'oc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004d1041', '00000000-0000-0000-0000-0000004d1021',
   '00000000-0000-0000-0000-0000004d1001', 'OC Owner', 'oc-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000004d1042', '00000000-0000-0000-0000-0000004d1020',
   '00000000-0000-0000-0000-0000004d1002', 'OC Other', 'oc-other@example.invalid');

-- Written as the database itself (no session), so they are what they say.
insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000004d1051', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1040',
   'daycare', 'confirmed', now() + interval '10 days', now() + interval '10 days 8 hours', 40),
  ('00000000-0000-0000-0000-0000004d1052', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1040',
   'daycare', 'confirmed', now() + interval '10 hours', now() + interval '18 hours', 40),
  ('00000000-0000-0000-0000-0000004d1053', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1040',
   'daycare', 'request_submitted', now() + interval '2 hours', now() + interval '10 hours', 0),
  ('00000000-0000-0000-0000-0000004d1054', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1040',
   'boarding', 'confirmed', now() - interval '1 hour', now() + interval '2 days', 90),
  ('00000000-0000-0000-0000-0000004d1055', '00000000-0000-0000-0000-0000004d1021', '00000000-0000-0000-0000-0000004d1041',
   'daycare', 'confirmed', now() + interval '3 hours', now() + interval '11 hours', 40),
  ('00000000-0000-0000-0000-0000004d1056', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1042',
   'daycare', 'confirmed', now() + interval '10 days', now() + interval '10 days 8 hours', 40),
  ('00000000-0000-0000-0000-0000004d1057', '00000000-0000-0000-0000-0000004d1020', '00000000-0000-0000-0000-0000004d1040',
   'daycare', 'confirmed', now() + interval '12 days', now() + interval '12 days 8 hours', 40);

create temp table r as
  select right(id::text, 1)::int as k, ref from public.bookings
   where id::text like '00000000-0000-0000-0000-0000004d105_';
grant select on r to authenticated;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text, 'role', 'authenticated')::text end,
    true);
end $$;

create or replace function pg_temp.refusal(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'accepted';
exception when others then
  return sqlstate;
end $$;

select pg_temp.as_user('00000000-0000-0000-0000-0000004d1001');
set local role authenticated;

select pg_temp.t('C0  the preview says a booking ten hours out is cancellable, and late',
  (select (t->>'cancellable')::boolean and (t->>'late')::boolean
          and (t->>'feePercentage')::numeric = 50
     from (select public.my_booking_cancel_terms((select ref from r where k = 2)) t) x));

select pg_temp.t('C1  ten days ahead: cancelled, not late, with the reason',
  (select (c->>'late')::boolean = false and c->>'by' = 'customer'
          and c->>'reason' = 'Plans changed' and c->>'feePercentage' is null
     from (select public.cancel_my_booking((select ref from r where k = 1), '  Plans changed ') c) x));

select pg_temp.t('C2  ten hours ahead under a 48-hour rule: late, at 50%',
  (select (c->>'late')::boolean and (c->>'feePercentage')::numeric = 50
          and (c->>'noticeHours')::numeric = 48
     from (select public.cancel_my_booking((select ref from r where k = 2), null) c) x));

select pg_temp.t('C3  withdrawing a request two hours ahead is never late',
  (select (c->>'withdrawal')::boolean and not (c->>'late')::boolean
     from (select public.cancel_my_booking((select ref from r where k = 3), 'Found a sitter') c) x));

select pg_temp.t('S1  a stay that has started is refused',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 4), 'too late')$q$) = '55000');

select pg_temp.t('S2  … by a plain update too, not only through the function',
  pg_temp.refusal($q$update public.bookings set status = 'cancelled'
                      where ref = (select ref from r where k = 4)$q$) = '55000');

select pg_temp.t('S3  … and the preview says it is not cancellable',
  (select not (public.my_booking_cancel_terms((select ref from r where k = 4))->>'cancellable')::boolean));

select pg_temp.t('N1  no booking rules saved: three hours ahead is not late',
  (select not (c->>'late')::boolean and c->'noticeHours' = 'null'::jsonb
     from (select public.cancel_my_booking((select ref from r where k = 5), null) c) x));

select pg_temp.t('O1  someone else''s booking: the preview answers nothing',
  public.my_booking_cancel_terms((select ref from r where k = 6)) is null);

select pg_temp.t('O2  … and the cancel is refused',
  pg_temp.refusal($q$select public.cancel_my_booking((select ref from r where k = 6), null)$q$) = 'P0002');

update public.bookings
   set details = coalesce(details, '{}'::jsonb)
                 || '{"cancellation": {"late": false, "by": "facility"}}'::jsonb,
       special_requests = 'forged'
 where ref = (select ref from r where k = 7);
reset role;

select pg_temp.t('F1  a customer cannot write the cancellation record',
  (select not (details ? 'cancellation') from public.bookings where ref = (select ref from r where k = 7)));

select pg_temp.t('F2  … nor rewrite one the trigger made',
  (select (details->'cancellation'->>'late')::boolean
     from public.bookings where ref = (select ref from r where k = 2)));

select pg_temp.t('C4  the cancelled bookings are cancelled, and the started one is not',
  (select count(*) from public.bookings
    where ref in ((select ref from r where k = 1), (select ref from r where k = 2), (select ref from r where k = 3), (select ref from r where k = 5))
      and status = 'cancelled') = 4
  and (select status from public.bookings where ref = (select ref from r where k = 4)) = 'confirmed'
  and (select status from public.bookings where ref = (select ref from r where k = 6)) = 'confirmed');

-- `private.cancel_terms` was dropped on 2026-09-22: the evaluator takes the
-- whole booking row now, because the per-service policy needs to know which
-- service it is looking at. Both roles are named, because `from public`,
-- `from anon` and `from authenticated` are three different grants and revoking
-- one leaves the others.
select pg_temp.t('P1  anon calls neither function; the evaluator is nobody''s',
  not has_function_privilege('anon', 'public.cancel_my_booking(bigint,text)', 'execute')
  and not has_function_privilege('anon', 'public.my_booking_cancel_terms(bigint)', 'execute')
  and not has_function_privilege('authenticated',
        'private.cancellation_terms(public.bookings)', 'execute')
  and not has_function_privilege('anon',
        'private.cancellation_terms(public.bookings)', 'execute')
  and not has_function_privilege('authenticated',
        'private.deposit_for_booking(public.bookings)', 'execute'));

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
