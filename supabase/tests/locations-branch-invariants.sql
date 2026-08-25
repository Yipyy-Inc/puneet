-- ============================================================================
-- A location is a branch: one primary, a closed status set, and no silent
-- erasure of where a booking happened.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/locations-branch-invariants.sql
--
-- One transaction, rolled back. It creates real branches against a real
-- facility to do its work, so the rollback is the only teardown.
--
-- ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
--
-- 20260825095825 gave `public.locations` the columns a branch needs and two
-- guards. 20260825101500 exists ONLY because the first guard had a bug that no
-- amount of reading found: the trigger's own demote-the-incumbent UPDATE
-- re-entered the trigger and tripped the "a facility must have a primary"
-- check, because inside the promoted row's BEFORE trigger that row is not
-- written yet. Promoting a second branch was impossible.
--
-- T3 is that bug. It is the reason this file is not optional.
--
-- ── EVERY DENY HAS A POSITIVE CONTROL ─────────────────────────────────────
--
-- "The primary cannot be deleted" passes just as well when nothing can be
-- deleted at all. T8 removes an ordinary branch cleanly, which is what makes
-- T6 and T7 mean something.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac       uuid;
  v_incumbent uuid;
  v_branch    uuid;
  v_spare     uuid;
  v_msg       text;
  n           int;
  ok          boolean;
begin
  -- The demo facility, because it is the one with booking history — T6 needs a
  -- branch that has actually traded, and an invented booking would be testing
  -- the test rather than the data.
  select id into v_fac from public.facilities where legacy_id = '11';
  if v_fac is null then
    raise exception 'no facility with legacy_id 11 — this file has nothing to test against';
  end if;

  select id into v_incumbent from public.locations
   where facility_id = v_fac and is_primary;
  if v_incumbent is null then
    raise exception 'facility 11 has no primary location — the invariant is already broken';
  end if;

  -- ── the shape of the row ────────────────────────────────────────────────

  perform pg_temp.t(1, 'locations carries the seven branch columns',
    (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'locations'
        and column_name in ('short_code','address','email','phone',
                            'status','capacity','color')) = 7);

  insert into public.locations (facility_id, name, short_code, status)
  values (v_fac, '[sqltest] Branch', 'SQLT', 'active')
  returning id into v_branch;

  perform pg_temp.t(2, 'a second branch can exist at all',
    v_branch is not null);

  -- ── T3: the bug 20260825101500 fixes ────────────────────────────────────

  begin
    update public.locations set is_primary = true where id = v_branch;
    ok := true;
    v_msg := '';
  exception when others then
    ok := false;
    get stacked diagnostics v_msg = message_text;
  end;
  perform pg_temp.t(3, 'promoting a branch is permitted at all', ok, v_msg);

  select count(*) into n from public.locations
   where facility_id = v_fac and is_primary;
  perform pg_temp.t(4, 'promoting leaves EXACTLY one primary', n = 1, n::text);

  perform pg_temp.t(5, 'and it is the promoted one',
    (select is_primary from public.locations where id = v_branch));

  -- ── the guards ──────────────────────────────────────────────────────────

  -- Put the incumbent back; the rest of the file assumes it.
  update public.locations set is_primary = true where id = v_incumbent;

  begin
    delete from public.locations where id = v_incumbent;
    ok := false;
    v_msg := 'the primary was deleted while another branch existed';
  exception when others then
    ok := true;
    get stacked diagnostics v_msg = message_text;
  end;
  perform pg_temp.t(6, 'the primary cannot be deleted beside another branch',
    ok, v_msg);

  -- A branch with booking history. `bookings_location_id_fkey` is ON DELETE
  -- SET NULL, so without the guard this succeeds and silently detaches every
  -- booking from the branch it happened at.
  select count(*) into n from public.bookings where location_id = v_incumbent;
  if n = 0 then
    perform pg_temp.t(7, 'SKIPPED: no branch here has booking history', true,
      'nothing to prove the delete guard against');
  else
    -- Promote the probe branch, which demotes the incumbent as a side effect.
    -- Demoting it directly would be refused — correctly, by the very guard T12
    -- asserts — and that is a trap worth naming: the ONLY way to move the
    -- primary is to name the new one.
    update public.locations set is_primary = true where id = v_branch;
    begin
      delete from public.locations where id = v_incumbent;
      ok := false;
      v_msg := format('deleted a branch holding %s bookings', n);
    exception when others then
      get stacked diagnostics v_msg = message_text;
      ok := v_msg like '%booking%';
    end;
    perform pg_temp.t(7, 'a branch that has traded cannot be deleted', ok, v_msg);
    update public.locations set is_primary = true where id = v_incumbent;
  end if;

  -- Positive control for 6 and 7: an ordinary branch with no history goes.
  insert into public.locations (facility_id, name) values (v_fac, '[sqltest] Spare')
  returning id into v_spare;
  delete from public.locations where id = v_spare;
  perform pg_temp.t(8, 'an ordinary branch with no history deletes cleanly',
    not exists (select 1 from public.locations where id = v_spare));

  -- ── the closed sets ─────────────────────────────────────────────────────

  begin
    insert into public.locations (facility_id, name, status)
    values (v_fac, '[sqltest] Bad status', 'closed');
    ok := false;
  exception when check_violation then ok := true;
  end;
  perform pg_temp.t(9, 'status outside the closed set is refused', ok);

  begin
    insert into public.locations (facility_id, name, short_code)
    values (v_fac, '[sqltest] Dup', 'sqlt');
    ok := false;
  exception when unique_violation then ok := true;
  end;
  perform pg_temp.t(10, 'a short code is unique per facility, case-insensitively',
    ok);

  -- Another facility may reuse it — the index is per facility, not global.
  begin
    insert into public.locations (facility_id, name, short_code)
    values ((select id from public.facilities where id <> v_fac limit 1),
            '[sqltest] Other facility', 'SQLT');
    ok := true;
  exception when unique_violation then ok := false;
  end;
  perform pg_temp.t(11, 'a different facility may use the same short code', ok);

  -- ── clearing the last primary ───────────────────────────────────────────

  delete from public.locations where id = v_branch;
  begin
    update public.locations set is_primary = false where id = v_incumbent;
    ok := false;
  exception when others then
    ok := true;
  end;
  perform pg_temp.t(12, 'the last primary cannot simply be cleared', ok);

  -- ── the guards are attached, and not callable by anon ───────────────────

  perform pg_temp.t(13, 'both location triggers are attached',
    (select count(*) from pg_trigger t
      where not t.tgisinternal
        and t.tgname in ('locations_single_primary', 'locations_guard_delete')) = 2);

  perform pg_temp.t(14, 'anon cannot execute the primary guard',
    not has_function_privilege('anon', 'private.locations_single_primary()', 'execute'));

  perform pg_temp.t(15, 'anon cannot execute the delete guard',
    not has_function_privilege('anon', 'private.guard_location_delete()', 'execute'));

  -- Both revokes, not one. `revoke ... from public` and `... from anon` are
  -- different grants and this repo has got that wrong five times.
  perform pg_temp.t(16, 'public cannot execute either guard',
    not has_function_privilege('public', 'private.locations_single_primary()', 'execute')
    and not has_function_privilege('public', 'private.guard_location_delete()', 'execute'));

  -- ── the write policies still require manage_services ────────────────────

  perform pg_temp.t(17, 'insert, update and delete are gated on manage_services',
    (select count(*) from pg_policies
      where schemaname = 'public' and tablename = 'locations'
        and cmd in ('INSERT','UPDATE','DELETE')
        and coalesce(qual, with_check) like '%manage_services%') = 3);

  -- ── every facility ends with exactly one primary ────────────────────────

  perform pg_temp.t(18, 'every facility with a location has exactly one primary',
    not exists (
      select 1 from public.locations
       group by facility_id
      having count(*) filter (where is_primary) <> 1));
end $$;

select n, name, case when ok then 'PASS' else 'FAIL' end as result, detail
  from tap order by n;

do $$
declare v_failed int;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise exception '% assertion(s) failed', v_failed;
  end if;
end $$;

rollback;
