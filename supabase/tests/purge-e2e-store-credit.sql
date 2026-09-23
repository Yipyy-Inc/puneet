-- ============================================================================
-- public.purge_e2e_store_credit() — see
-- 20260924090000_the_suite_takes_its_store_credit_back_out.sql
--
--   bun run test:sql purge-e2e-store-credit
--
-- One transaction, rolled back. It builds its own client and entries on the
-- demo facility, so it never depends on what the suite has left lying around
-- — which is the very thing the function exists to correct.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T0  NEGATIVE CONTROL, and it runs first. The ledger REFUSES a delete. That
--     is `prevent_money_mutation()`, and it is the entire reason this purge
--     corrects rather than removes. If this assertion ever passes trivially,
--     the guard has been weakened and somebody should decide whether the
--     purge ought to be deleting after all — rather than discovering later
--     that it silently could.
-- T1  THE ONE THAT MATTERS. A real customer's credit is untouched. A purge
--     that cannot tell the suite's rows from somebody's money is worse than
--     no purge.
-- T2  The suite's invented balance comes back to zero, and the history GROWS
--     rather than shrinking — the correction is an entry, not a removal.
-- T3  IDEMPOTENT. A second run writes nothing, because the correction wears
--     the marker it matched on. Running the purge twice must not hand a
--     customer a negative balance.
-- T4  A row tied to a PAYMENT is left alone even when it wears the marker.
--     `store_credit_debit_matches_payment` keeps a spend and its payment in
--     step; correcting around one would leave the payment deducting from a
--     balance that no longer explains it.
-- T5  The grants. `revoke from public` and `revoke from anon` are different
--     grants and a function is reachable through either, so both are asserted
--     against has_function_privilege() rather than trusted.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── T0 the guard this whole design defers to ───────────────────────────────
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_client   uuid;
  v_entry    uuid;
  v_refused  boolean := false;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_client from public.clients
   where facility_id = v_facility order by ref limit 1;

  insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, note, author_name)
  values (v_facility, v_client, 5, 'added',
    'Gift card E2E-GC-control-' || v_stamp, 'sql-test')
  returning id into v_entry;

  begin
    delete from public.store_credit_entries where id = v_entry;
  exception when others then
    v_refused := true;
  end;

  perform pg_temp.t(
    'T0 the ledger refuses a delete, which is why this purge corrects',
    v_refused,
    case when v_refused
      then 'prevent_money_mutation() raised, as the function assumes'
      else 'THE DELETE SUCCEEDED — the append-only guard is gone'
    end);
end $$;

-- ── T1-T4 the function itself ──────────────────────────────────────────────
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_mine     uuid;  -- a client whose credit is the suite's invention
  v_theirs   uuid;  -- a client whose credit is real
  v_written  integer;
  v_again    integer;
  v_bal      numeric;
  v_real     numeric;
  v_rows     integer;
  v_before   integer;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_mine from public.clients
   where facility_id = v_facility order by ref limit 1;
  select id into v_theirs from public.clients
   where facility_id = v_facility and id <> v_mine order by ref limit 1;

  -- What `gift-cards.spec` leaves behind, twice.
  insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, note, author_name)
  values
    (v_facility, v_mine, 45, 'gift_card',
     'Gift card E2E-GC-to-credit-' || v_stamp, 'sql-test'),
    (v_facility, v_mine, 30, 'gift_card',
     'Gift card E2E-GC-to-credit-b-' || v_stamp, 'sql-test');

  -- And what a REAL customer has, shaped the same but unmarked.
  insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, note, author_name)
  values (v_facility, v_theirs, 60, 'added',
    'Goodwill after a late pickup ' || v_stamp, 'sql-test');

  select count(*) into v_before from public.store_credit_entries;

  v_written := public.purge_e2e_store_credit();

  select coalesce(sum(amount), 0) into v_real
    from public.store_credit_entries where client_id = v_theirs;
  perform pg_temp.t(
    'T1 a real customer''s credit is untouched',
    v_real >= 60,
    format('their balance is %s, and 60 of it is this test''s', v_real));

  select coalesce(sum(amount), 0) into v_bal
    from public.store_credit_entries e
   where e.client_id = v_mine
     and (e.note like 'Gift card E2E-GC-%'
          or e.note like '%[e2e store-credit]%');
  select count(*) into v_rows from public.store_credit_entries;
  perform pg_temp.t(
    'T2 the invented balance is corrected to nothing, and the history GREW',
    abs(v_bal) <= 0.005 and v_rows > v_before and v_written >= 1,
    format('marked balance=%s rows %s -> %s, corrections written=%s',
      v_bal, v_before, v_rows, v_written));

  v_again := public.purge_e2e_store_credit();
  select coalesce(sum(amount), 0) into v_bal
    from public.store_credit_entries e
   where e.client_id = v_mine
     and (e.note like 'Gift card E2E-GC-%'
          or e.note like '%[e2e store-credit]%');
  perform pg_temp.t(
    'T3 a second run writes nothing and does not overshoot',
    v_again = 0 and abs(v_bal) <= 0.005,
    format('second run wrote %s, marked balance still %s', v_again, v_bal));
exception when others then
  perform pg_temp.t('T1-T3 purge', false, sqlerrm);
end $$;

-- ── T4 a marked row something else depends on is left out ──────────────────
--
-- Deliberately NOT built by spending credit through a real payment. The first
-- draft did that, and `store_credit_never_overdrawn` refused it — because a
-- payment carrying `store_credit_applied` writes its own debit, so the manual
-- one was a SECOND withdrawal of the same money. Proving a one-clause guard
-- does not need the whole till.
--
-- A marked entry carrying a `booking_id` is the same case for this purge's
-- purposes: the filter excludes it, so its value must not appear in the
-- correction and the row must still be there afterwards.
do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_client   uuid;
  v_booking  uuid;
  v_entry    uuid;
  v_before   numeric;
  v_after    numeric;
  v_kept     numeric;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
begin
  select id into v_client from public.clients
   where facility_id = v_facility order by ref limit 1;

  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values (v_facility, v_client, 'boarding', 'confirmed',
    now() + interval '600 days', now() + interval '601 days', 80, 0, 80)
  returning id into v_booking;

  select coalesce(sum(amount), 0) into v_before
    from public.store_credit_entries where client_id = v_client;

  insert into public.store_credit_entries
    (facility_id, client_id, amount, reason, note, author_name, booking_id)
  values (v_facility, v_client, 80, 'added',
    'Gift card E2E-GC-attached-' || v_stamp, 'sql-test', v_booking)
  returning id into v_entry;

  perform public.purge_e2e_store_credit();

  select amount into v_kept
    from public.store_credit_entries where id = v_entry;
  select coalesce(sum(amount), 0) into v_after
    from public.store_credit_entries where client_id = v_client;

  perform pg_temp.t(
    'T4 a marked entry a booking depends on is never corrected around',
    -- Still there, and the balance rose by its full value — so no correction
    -- was written against it.
    v_kept = 80 and v_after = v_before + 80,
    format('entry=%s balance %s -> %s', v_kept, v_before, v_after));
exception when others then
  perform pg_temp.t('T4 attached entry', false, sqlerrm);
end $$;

-- ── T5 the grants ──────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t(
    'T5 only the service role may run it',
    not has_function_privilege('anon',
      'public.purge_e2e_store_credit()', 'execute')
      and not has_function_privilege('authenticated',
        'public.purge_e2e_store_credit()', 'execute')
      and has_function_privilege('service_role',
        'public.purge_e2e_store_credit()', 'execute')
      and 0 = (select count(*) from information_schema.routine_privileges
                 where routine_schema = 'public'
                   and routine_name   = 'purge_e2e_store_credit'
                   and grantee        = 'PUBLIC'),
    format('anon=%s authenticated=%s service_role=%s',
      has_function_privilege('anon', 'public.purge_e2e_store_credit()', 'execute'),
      has_function_privilege('authenticated', 'public.purge_e2e_store_credit()', 'execute'),
      has_function_privilege('service_role', 'public.purge_e2e_store_credit()', 'execute')));
exception when others then
  perform pg_temp.t('T5 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
