-- ============================================================================
-- A customer's request gets an ANSWER, and the answer cannot lie
-- (see the migration a_facility_answers_a_customers_request).
--
--   bun run test:sql request-decision
--
-- One transaction, rolled back. Nothing here survives the run.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- D0  THE NEGATIVE CONTROL, FIRST. An undecided request is undecided — the
--     columns default to null and a request made before this migration
--     existed still reads as waiting. If D0 fails, every request in the
--     system has silently acquired an answer nobody gave.
-- D1  A decision is recorded, and the pending read stops returning it.
-- D2  Only 'approved' or 'declined'. A typo is a constraint violation, not a
--     third state the list has to guess at.
-- D3  A decision belongs to a REQUEST. A plain note cannot carry one, because
--     the pending list would then have to defend itself against rows that
--     mean nothing.
-- D4  Decided implies WHEN and BY WHOM. Half an answer is not an answer, and
--     "who agreed to this cancellation" must always have a row to point at.
-- D5  `customer_request` itself is still immutable to staff — the guard
--     trigger restores the old value on update, so answering a request cannot
--     quietly turn a date change into a cancellation.
-- D6  A decided request is spent: the partial index and the list's own
--     predicate agree about what "pending" means.
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
  ('00000000-0000-0000-0000-0000004d3001', 'rd-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000004d3001', 'rd-owner@example.invalid', 'RD Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000004d3010', 'RD Org', 'rd-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000004d3020', '00000000-0000-0000-0000-0000004d3010',
   'RD Asks', 'rd-a', 'rd-a')
on conflict do nothing;

insert into public.clients (id, facility_id, profile_id, name, email) values
  ('00000000-0000-0000-0000-0000004d3040', '00000000-0000-0000-0000-0000004d3020',
   '00000000-0000-0000-0000-0000004d3001', 'RD Owner', 'rd-owner@example.invalid');

insert into public.bookings (id, facility_id, client_id, service, status, start_at, end_at, total_cost) values
  ('00000000-0000-0000-0000-0000004d3051', '00000000-0000-0000-0000-0000004d3020', '00000000-0000-0000-0000-0000004d3040',
   'boarding', 'confirmed', now() + interval '10 days', now() + interval '12 days', 200);

-- Written as the database itself. `yipyy.owner_note` is what lets
-- `customer_request` be set at all; see private.guard_customer_request.
select set_config('yipyy.owner_note', 'on', true);
insert into public.notes
  (id, facility_id, category, entity_id, content, visibility, customer_request)
values
  ('00000000-0000-0000-0000-0000004d3061', '00000000-0000-0000-0000-0000004d3020',
   'booking', '00000000-0000-0000-0000-0000004d3051',
   'Please cancel this one.', 'shared_with_customer', 'cancel_request'),
  ('00000000-0000-0000-0000-0000004d3062', '00000000-0000-0000-0000-0000004d3020',
   'booking', '00000000-0000-0000-0000-0000004d3051',
   'Could we move it a week?', 'shared_with_customer', 'change_dates'),
  ('00000000-0000-0000-0000-0000004d3063', '00000000-0000-0000-0000-0000004d3020',
   'booking', '00000000-0000-0000-0000-0000004d3051',
   'He likes the window run.', 'shared_with_customer', 'note');
select set_config('yipyy.owner_note', '', true);

-- ── D0  The negative control ──────────────────────────────────────────────
select pg_temp.t(
  'D0 a request with no answer reads as undecided',
  (select count(*) = 2 from public.notes
    where entity_id = '00000000-0000-0000-0000-0000004d3051'
      and customer_request is not null
      and customer_request <> 'note'
      and customer_request_decision is null));

-- ── D1  An answer is recorded ─────────────────────────────────────────────
update public.notes
   set customer_request_decision = 'approved',
       customer_request_decided_at = now(),
       customer_request_decided_by = 'staff-1'
 where id = '00000000-0000-0000-0000-0000004d3061';

select pg_temp.t(
  'D1 the answer is stored and the request leaves the pending list',
  (select customer_request_decision = 'approved'
     from public.notes where id = '00000000-0000-0000-0000-0000004d3061')
  and (select count(*) = 1 from public.notes
        where entity_id = '00000000-0000-0000-0000-0000004d3051'
          and customer_request is not null
          and customer_request <> 'note'
          and customer_request_decision is null));

-- ── D2  Only the two answers ──────────────────────────────────────────────
do $$
begin
  begin
    update public.notes set
      customer_request_decision = 'maybe',
      customer_request_decided_at = now(),
      customer_request_decided_by = 'staff-1'
     where id = '00000000-0000-0000-0000-0000004d3062';
    insert into tap(name, ok, detail) values ('D2 a third answer is refused', false, 'accepted "maybe"');
  exception when check_violation then
    insert into tap(name, ok) values ('D2 a third answer is refused', true);
  end;
end $$;

-- ── D3  A decision belongs to a request ───────────────────────────────────
do $$
begin
  begin
    update public.notes set
      customer_request_decision = 'approved',
      customer_request_decided_at = now(),
      customer_request_decided_by = 'staff-1'
     where id = '00000000-0000-0000-0000-0000004d3063';
    insert into tap(name, ok, detail) values ('D3 a plain note cannot be answered', false, 'accepted a decision on a note');
  exception when check_violation then
    insert into tap(name, ok) values ('D3 a plain note cannot be answered', true);
  end;
end $$;

-- ── D4  Decided implies when and by whom ──────────────────────────────────
do $$
begin
  begin
    update public.notes set customer_request_decision = 'declined'
     where id = '00000000-0000-0000-0000-0000004d3062';
    insert into tap(name, ok, detail) values ('D4 an unattributed answer is refused', false, 'accepted a decision with no author');
  exception when check_violation then
    insert into tap(name, ok) values ('D4 an unattributed answer is refused', true);
  end;
end $$;

-- ── D5  The KIND is still immutable ───────────────────────────────────────
--
-- Answering must not be a way to rewrite the question. The guard trigger
-- restores the old value on update, so this succeeds and changes nothing —
-- which is the point, and is why it is asserted rather than assumed.
update public.notes
   set customer_request = 'cancel_request'
 where id = '00000000-0000-0000-0000-0000004d3062';

select pg_temp.t(
  'D5 answering cannot turn a date change into a cancellation',
  (select customer_request = 'change_dates'
     from public.notes where id = '00000000-0000-0000-0000-0000004d3062'));

-- ── D6  Pending means one thing ───────────────────────────────────────────
--
-- The partial index and the list route share a predicate. If they ever drift,
-- the screen and the index disagree about what is waiting.
select pg_temp.t(
  'D6 the pending index covers exactly the pending predicate',
  (select count(*) = 1 from pg_indexes
    where tablename = 'notes'
      and indexname = 'notes_pending_customer_request_idx'
      and indexdef like '%customer_request IS NOT NULL%'
      and indexdef like '%customer_request_decision IS NULL%'));

select n, name, ok, detail from tap order by n;

rollback;
