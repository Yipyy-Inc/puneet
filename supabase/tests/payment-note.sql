-- ============================================================================
-- A refund says why, and saying so did not open a hole (20260825190000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/payment-note.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. THE REASON SURVIVES (N1/N2). `RefundModal` has always asked for one and
--    the string was dropped on the floor: parsed by the route's Zod schema and
--    never read, or turned into `p_credit_note` and written to a table that
--    only exists when the refund goes back AS store credit. The ledger could
--    say a facility gave $200 back and not why. It is a column now, and this is
--    the test that it actually arrives.
--
-- 2. BLANK IS NULL, NOT '' (N3). "Nobody was asked" and "somebody typed
--    nothing" must read the same way, or a report has to know which flavour of
--    empty it is holding.
--
-- 3. THE COLUMN DID NOT MAKE THE LEDGER EDITABLE (N4/N5/N6). `payments` refuses
--    UPDATE in three layers and a note is exactly the field somebody would
--    want to "correct" later. It is written at insert and never again — a
--    reason that could be rewritten afterwards is worth less than none. N4
--    exists because an UPDATE matching NO rows succeeds: without it, a broken
--    setup reports that the ledger is editable, which is what the first draft
--    of this file did.
--
-- 4. THERE IS STILL EXACTLY ONE `record_payment` (N7). This is the trap
--    20260806760000 warned about and the reason that migration refused to add
--    a 23rd argument: `create or replace` with a different arity creates an
--    OVERLOAD, not a replacement, and PostgREST would then have two candidates
--    to choose between. The 22-argument version had to be DROPPED first. If a
--    later change forgets that, this assertion is what says so.
--
-- 5. AND DROPPING IT DID NOT DROP THE LOCKS (N8-N11). `drop function` takes
--    the ACL with it, so every grant had to be restated — and a revoke is not
--    verified by having been written. `public` and `anon` are DIFFERENT grants:
--    20260822610000 exists because revoking one and calling it done leaves the
--    other standing. Asserted against `has_function_privilege`, which is the
--    only thing that knows. SECURITY INVOKER is checked for the same reason
--    20260819220000 exists: attributes not restated revert silently.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000019e001', 'note-owner@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000019e001', 'note-owner@example.invalid', 'Owner')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-00000019e010', 'Note Org', 'note-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-00000019e020', '00000000-0000-0000-0000-00000019e010',
   'Note Facility', 'note-a', 'note-a')
on conflict do nothing;

-- owner holds financial_take_payment AND process_refund, so this file tests the
-- column rather than re-testing the permission split that
-- booking-payment-derivation.sql already covers.
insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-00000019e030', '00000000-0000-0000-0000-00000019e020',
   '00000000-0000-0000-0000-00000019e001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-00000019e040', '00000000-0000-0000-0000-00000019e020',
   'Noted', 'note-c1@example.invalid');

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

create or replace function pg_temp.new_booking(p_total numeric default 100)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into public.bookings
    (facility_id, client_id, service, status, start_at, end_at,
     base_price, discount, total_cost)
  values
    ('00000000-0000-0000-0000-00000019e020', '00000000-0000-0000-0000-00000019e040',
     'daycare', 'confirmed', now() + interval '1 day', now() + interval '1 day 8 hours',
     p_total, 0, p_total)
  returning id into v_id;
  return v_id;
end $$;

-- ── N1/N2/N3  the reason arrives, trimmed, and blank means null ────────────
--
-- The three notes are collected under `authenticated` and asserted after
-- `reset role`. `pg_temp.t` inserts into the tap table, whose SEQUENCE is not
-- granted — calling it while the role is still switched fails with "permission
-- denied for sequence tap_n_seq", which reads like a test failure and is not
-- one. Every other file in this directory resets first; this one does too.

do $$
declare
  v_booking uuid;
  v_out     jsonb;
  v_sale    text;
  v_refund  text;
  v_blank   text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000019e001');
  set local role authenticated;

  v_booking := pg_temp.new_booking(800);

  -- Paid in full.
  v_out := public.record_payment(
    p_facility_id    => '00000000-0000-0000-0000-00000019e020',
    p_method         => 'new-card',
    p_subtotal       => 800, p_tax => 0, p_tip => 0,
    p_amount_charged => 800, p_grand_total => 800,
    p_booking_id     => v_booking,
    p_client_id      => '00000000-0000-0000-0000-00000019e040');
  select note into v_sale from public.payments
   where id = (v_out->>'payment_id')::uuid;

  -- $200 back, with the reason somebody typed — padded, as a text input is.
  v_out := public.record_payment(
    p_facility_id    => '00000000-0000-0000-0000-00000019e020',
    p_method         => 'new-card',
    p_subtotal       => -200, p_tax => 0, p_tip => 0,
    p_amount_charged => -200, p_grand_total => -200,
    p_booking_id     => v_booking,
    p_client_id      => '00000000-0000-0000-0000-00000019e040',
    p_note           => '  Boarding shortened by one night  ');
  select note into v_refund from public.payments
   where id = (v_out->>'payment_id')::uuid;

  -- Somebody opened the box and typed spaces.
  v_out := public.record_payment(
    p_facility_id    => '00000000-0000-0000-0000-00000019e020',
    p_method         => 'new-card',
    p_subtotal       => -1, p_tax => 0, p_tip => 0,
    p_amount_charged => -1, p_grand_total => -1,
    p_booking_id     => v_booking,
    p_client_id      => '00000000-0000-0000-0000-00000019e040',
    p_note           => '   ');
  select note into v_blank from public.payments
   where id = (v_out->>'payment_id')::uuid;

  reset role;

  perform pg_temp.t('N1  an ordinary sale carries no note',
    v_sale is null, format('note=%L', v_sale));
  perform pg_temp.t('N2  a refund keeps its reason, trimmed',
    v_refund = 'Boarding shortened by one night', format('note=%L', v_refund));
  perform pg_temp.t('N3  a blank reason is NULL, not an empty string',
    v_blank is null, format('note=%L', v_blank));
exception when others then
  reset role; perform pg_temp.t('N1-N3 reason round trip', false, sqlerrm);
end $$;

-- ── N4/N5  the note did not make the ledger editable ───────────────────────
--
-- N0 FIRST, and it is not padding. An UPDATE that matches no rows SUCCEEDS,
-- silently, and would report "the ledger is editable" — the same shape as a
-- revoke naming a privilege the role never held. The first draft of this file
-- failed exactly that way: N1-N3 errored, no row carried the note, `v_id` was
-- null, and N5 announced that the table owner had rewritten the ledger.

do $$
declare
  v_id      uuid;
  v_touched integer;
begin
  select id into v_id from public.payments
   where facility_id = '00000000-0000-0000-0000-00000019e020'
     and note = 'Boarding shortened by one night';

  perform pg_temp.t('N4  the row to attack actually exists',
    v_id is not null, format('id=%s', v_id));
  if v_id is null then return; end if;

  begin
    perform pg_temp.as_user('00000000-0000-0000-0000-00000019e001');
    set local role authenticated;
    update public.payments set note = 'rewritten' where id = v_id;
    get diagnostics v_touched = row_count;
    reset role;
    perform pg_temp.t('N5  authenticated cannot rewrite a reason', false,
      format('the UPDATE touched %s row(s)', v_touched));
  exception when others then
    reset role;
    perform pg_temp.t('N5  authenticated cannot rewrite a reason', true, sqlerrm);
  end;

  -- The trigger fires for EVERY role, which is the layer that actually binds.
  begin
    update public.payments set note = 'rewritten by the owner' where id = v_id;
    get diagnostics v_touched = row_count;
    perform pg_temp.t('N6  not even the table owner can', false,
      format('the UPDATE touched %s row(s)', v_touched));
  exception when others then
    perform pg_temp.t('N6  not even the table owner can', true, sqlerrm);
  end;
end $$;

-- ── N7-N11  one function, still locked, still INVOKER ───────────────────────

do $$
declare
  v_count   integer;
  v_oid     oid;
  v_definer boolean;
begin
  select count(*) into v_count
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_payment';

  perform pg_temp.t('N7  exactly one record_payment — the 23rd argument replaced, did not overload',
    v_count = 1, format('found %s', v_count));

  if v_count <> 1 then return; end if;

  select p.oid, p.prosecdef into v_oid, v_definer
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'record_payment';

  perform pg_temp.t('N8  still SECURITY INVOKER, so both inserts face their own policies',
    v_definer = false, format('prosecdef=%s', v_definer));

  -- `public` and `anon` are DIFFERENT grants. Both, every time.
  perform pg_temp.t('N9  anon cannot execute it',
    not has_function_privilege('anon', v_oid, 'execute'), '');
  perform pg_temp.t('N10 PUBLIC cannot execute it',
    not has_function_privilege('public', v_oid, 'execute'), '');

  -- The positive control. Without it, a function nobody can call would pass
  -- N8 and N9 and look perfectly locked down.
  perform pg_temp.t('N11 authenticated still can — the lock is not a wall',
    has_function_privilege('authenticated', v_oid, 'execute'), '');
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
