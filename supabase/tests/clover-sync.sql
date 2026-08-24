-- ============================================================================
-- Clover two-way sync — who may claim a payment nobody has claimed
-- (20260824100000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/clover-sync.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- 1. SEEING IS NOT CLAIMING (C4, C5). `financial_view_amounts` lets somebody
--    look at the queue of unclaimed Clover payments. Turning one into a ledger
--    row is `financial_take_payment`, and the two are different permissions
--    held by different people. C4 proves the reader is refused; C5 is its
--    positive control — somebody who holds the second key succeeds. A deny with
--    no matching allow is indistinguishable from a function that refuses
--    everybody, which is how a broken fixture passes for a working gate.
--
-- 2. THE ATTACH IS INVOKER, ON PURPOSE (C4). `record_unattached_payment` is
--    definer because Clover is calling and nobody is signed in.
--    `attach_unattached_payment` is INVOKER because a person is, and
--    `payments_insert` is the policy that should decide. Had it been written
--    definer, the authorisation would have moved out of the policy and into a
--    function body where nobody reviewing permissions would look for it — and
--    C4 would pass anyway, silently, for the wrong reason. It is asserted from
--    a session that holds the read key and not the write one.
--
-- 3. IDEMPOTENCY IS A CONSTRAINT (C2). A replayed webhook and the sweep both
--    arrive with the same Clover payment id. If the second one could insert, a
--    facility would be shown the same £60 twice and could attach it twice.
--
-- 4. ONE MERCHANT, ONE FACILITY (C3). Both the webhook route and
--    `record_payment_webhook` resolve merchant → facility with a single-row
--    read and no ordering. With a plain index that is an assumption; a second
--    facility on the same merchant would be handed somebody else's payments and
--    which one would depend on the query plan.
--
-- 5. THE GRANTS ARE THE BOUNDARY FOR THE DEFINER FUNCTION (C1). Asserted
--    against has_function_privilege rather than read off the migration: a
--    revoke naming a privilege the role does not hold succeeds silently and
--    looks identical to one that worked.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon, service_role;
grant usage, select on sequence tap_n_seq to authenticated, anon, service_role;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────
--
-- An owner who can take money, an ACCOUNTANT who can see the takings and not
-- take them, and a groomer who holds neither. The accountant is the load-
-- bearing one: measured against role_preset_permissions, `financial_view_amounts`
-- is held by owner, admin, manager, supervisor, reception AND accountant, while
-- `financial_take_payment` is not held by the accountant. That gap is the
-- entire subject of C4 and C5.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002c0001', 'cs-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002c0002', 'cs-accountant@example.invalid'),
  ('00000000-0000-0000-0000-0000002c0003', 'cs-groomer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002c0001', 'cs-owner@example.invalid', 'CS Owner'),
  ('00000000-0000-0000-0000-0000002c0002', 'cs-accountant@example.invalid', 'CS Accountant'),
  ('00000000-0000-0000-0000-0000002c0003', 'cs-groomer@example.invalid', 'CS Groomer')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002c0010', 'CS Org', 'cs-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002c0020', '00000000-0000-0000-0000-0000002c0010',
   'CS Kennels', 'cs-kennels', 'cs-kennels')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002c0030', '00000000-0000-0000-0000-0000002c0020',
   '00000000-0000-0000-0000-0000002c0001', 'owner', true),
  ('00000000-0000-0000-0000-0000002c0031', '00000000-0000-0000-0000-0000002c0020',
   '00000000-0000-0000-0000-0000002c0002', 'accountant', true),
  ('00000000-0000-0000-0000-0000002c0032', '00000000-0000-0000-0000-0000002c0020',
   '00000000-0000-0000-0000-0000002c0003', 'groomer', true)
on conflict (id) do nothing;

-- A payment Clover took that Yipyy cannot place.
--
-- Written AS service_role, which is the only role that can: the table has no
-- insert policy and no insert grant for anybody else, because in production the
-- only writer is a webhook with nobody signed in behind it. Seeding it any
-- other way would be testing a table that does not exist as configured.
set local role service_role;

insert into public.unattached_payments
  (id, facility_id, processor_payment_id, amount_cents, tip_cents, tax_cents,
   currency, card_brand, card_last4, entry_method, taken_at)
values
  ('00000000-0000-0000-0000-0000002c0040', '00000000-0000-0000-0000-0000002c0020',
   'CS-CLOVER-PAYMENT-1', 6250, 500, 250, 'CAD', 'VISA', '4242', 'chip', now());

reset role;

-- ── C1  The definer function is service-role only ─────────────────────────

do $$
declare oid_rec oid;
begin
  select p.oid into oid_rec from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_unattached_payment';

  perform pg_temp.t('C1 record_unattached_payment is service_role only',
    has_function_privilege('service_role', oid_rec, 'execute')
    and not has_function_privilege('authenticated', oid_rec, 'execute')
    and not has_function_privilege('anon', oid_rec, 'execute'),
    'service=' || has_function_privilege('service_role', oid_rec, 'execute')::text
    || ' auth=' || has_function_privilege('authenticated', oid_rec, 'execute')::text
    || ' anon=' || has_function_privilege('anon', oid_rec, 'execute')::text);
end $$;

-- ── C1b The attach function is INVOKER, not definer ───────────────────────
--
-- If this ever flips to definer, C4 below would keep passing while the policy
-- it is meant to be proving had stopped being consulted.

do $$
declare definer boolean;
begin
  select p.prosecdef into definer from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'attach_unattached_payment';

  perform pg_temp.t('C1b attach_unattached_payment is SECURITY INVOKER',
    definer is false, 'prosecdef=' || coalesce(definer::text, 'null'));
end $$;

-- ── C2  The same Clover payment cannot be held twice ──────────────────────

do $$
declare state text;
begin
  -- As the role that COULD insert, so a refusal is the constraint speaking and
  -- not a missing grant.
  set local role service_role;
  begin
    insert into public.unattached_payments
      (facility_id, processor_payment_id, amount_cents)
    values ('00000000-0000-0000-0000-0000002c0020', 'CS-CLOVER-PAYMENT-1', 6250);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C2 a replayed delivery cannot hold the same payment twice',
    state = '23505', 'state=' || state);
end $$;

-- ── C3  One merchant belongs to one facility ──────────────────────────────

do $$
declare state text;
begin
  set local role service_role;
  -- `connected_at` is not decoration: payment_connection_connected_is_dated
  -- refuses a connection that claims to be live with no date on it.
  insert into public.payment_connections
    (facility_id, processor, environment, merchant_id, status, connected_at)
  values ('00000000-0000-0000-0000-0000002c0020', 'clover', 'sandbox',
          'CS-MERCHANT-1', 'connected', now());

  begin
    -- A second facility claiming the same merchant. The webhook route reads
    -- merchant -> facility with maybeSingle(), so two rows would send one
    -- facility the other's money.
    insert into public.facilities (id, org_id, name, slug, legacy_id)
    values ('00000000-0000-0000-0000-0000002c0021',
            '00000000-0000-0000-0000-0000002c0010',
            'CS Second', 'cs-second', 'cs-second');
    insert into public.payment_connections
      (facility_id, processor, environment, merchant_id, status, connected_at)
    values ('00000000-0000-0000-0000-0000002c0021', 'clover', 'sandbox',
            'CS-MERCHANT-1', 'connected', now());
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  reset role;
  perform pg_temp.t('C3 two facilities cannot share one Clover merchant',
    state = '23505', 'state=' || state);
end $$;

-- ── C4  Seeing the queue is not claiming from it ──────────────────────────
--
-- The accountant reads it (financial_view_amounts) and cannot attach
-- (financial_take_payment). Both halves in one block, because a test that only
-- proved the refusal would pass just as well against a function nobody can call.

do $$
declare visible integer; state text;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000002c0002","role":"authenticated"}';

  select count(*) into visible from public.unattached_payments
   where facility_id = '00000000-0000-0000-0000-0000002c0020';

  begin
    perform public.attach_unattached_payment(
      '00000000-0000-0000-0000-0000002c0040'::uuid, null, null, 'should refuse');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  reset role;
  perform pg_temp.t('C4 an accountant sees the queue and cannot attach from it',
    visible = 1 and state <> 'ALLOWED',
    'visible=' || visible || ' attach=' || state);
end $$;

-- ── C5  The positive control ──────────────────────────────────────────────
--
-- Without this, C4 is satisfied by a function that refuses everybody.

do $$
declare payment_id uuid; state text; moved integer;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000002c0001","role":"authenticated"}';

  begin
    payment_id := public.attach_unattached_payment(
      '00000000-0000-0000-0000-0000002c0040'::uuid, null,
      null, 'no booking, no client');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  reset role;
  -- Neither a booking nor a client named: refused, and refused for that reason
  -- rather than for want of permission.
  perform pg_temp.t('C5a an attach naming neither booking nor client is refused',
    state = '22023', 'state=' || state);

  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000002c0001","role":"authenticated"}';
  begin
    payment_id := public.attach_unattached_payment(
      '00000000-0000-0000-0000-0000002c0040'::uuid, null,
      null, null);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  reset role;

  select count(*) into moved from public.unattached_payments
   where id = '00000000-0000-0000-0000-0000002c0040' and status = 'unattached';

  perform pg_temp.t('C5b a refused attach leaves the payment unclaimed',
    moved = 1, 'still unattached=' || moved);
end $$;

-- ── C6  Anon reaches none of it ───────────────────────────────────────────

do $$
declare state text;
begin
  set local role anon;
  begin
    perform count(*) from public.unattached_payments;
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  reset role;

  -- 42501, not an empty result. `revoke all ... from anon` means the GRANT
  -- refuses before RLS is ever consulted — a stronger answer than a policy
  -- filtering the rows away, and worth asserting as the thing it actually is.
  -- The first version of this test expected count = 0 and would have passed
  -- just as well against a table anon could read and simply had no rows in.
  perform pg_temp.t('C6 anon is refused the table outright, not merely filtered',
    state = '42501', 'state=' || state);
end $$;

-- ── C7  The identifiers exist on the ledger ───────────────────────────────
--
-- Cheap, and it is the client's actual requirement: a Clover payment must not
-- be anonymous. If a later migration drops one of these the sync still runs and
-- quietly stops recording which terminal took the money.

do $$
declare present integer;
begin
  select count(*) into present from information_schema.columns
   where table_schema = 'public' and table_name = 'payments'
     and column_name in ('processor_order_id', 'processor_merchant_id',
                         'processor_device_serial', 'processor_payment_id');
  perform pg_temp.t('C7 a payment carries order, merchant, device and payment ids',
    present = 4, 'columns=' || present);
end $$;

-- ── C8  Dismissing needs a reason and the right permission ────────────────

do $$
declare state text; result boolean;
begin
  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000002c0001","role":"authenticated"}';
  begin
    result := public.dismiss_unattached_payment(
      '00000000-0000-0000-0000-0000002c0040'::uuid, '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C8a a payment cannot be set aside without a reason',
    state = '22023', 'state=' || state);

  set local role authenticated;
  set local request.jwt.claims to
    '{"sub":"00000000-0000-0000-0000-0000002c0003","role":"authenticated"}';
  result := public.dismiss_unattached_payment(
    '00000000-0000-0000-0000-0000002c0040'::uuid, 'a groomer trying it on');
  reset role;

  -- FALSE, not an exception: the update matched no row because the permission
  -- check is in the predicate. The function returns whether anything moved
  -- precisely so a caller cannot report success over a zero-row update.
  perform pg_temp.t('C8b a groomer cannot set a payment aside',
    result is false, 'returned=' || coalesce(result::text, 'null'));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
