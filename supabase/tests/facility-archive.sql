-- ============================================================================
-- Archiving a facility hides it. It does not take anything away.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/facility-archive.sql
--
-- One transaction, rolled back.
--
-- ── WHY THE COLUMN EXISTS ─────────────────────────────────────────────────
--
-- 20260920213428. The ask was to delete three of four facilities; the ledger
-- refuses it. payments, loyalty_transactions, gift_card_transactions,
-- store_credit_entries and retail_sales are append-only by trigger, and
-- payments holds a foreign key to facilities — so a facility that has taken
-- money can be neither deleted nor merged without switching those triggers off.
-- Measured 2026-09-20: a dry run moved 14,464 rows and then thirteen tables
-- refused.
--
-- The assertions below are therefore about what archiving MUST NOT do. A flag
-- that quietly took a facility's rows with it would be a delete wearing a
-- softer word, and the ledger it was written to protect would go with it.
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
  v_facility uuid;
  v_org      uuid;
  v_clients  integer;
  v_loc      integer;
  v_archived timestamptz;
begin
  -- A facility of this test's own, so nothing here depends on seed data.
  insert into public.orgs (name, slug)
       values ('[sql] archive org', 'sql-archive-org')
    returning id into v_org;
  insert into public.facilities (org_id, name, slug, timezone)
       values (v_org, '[sql] Archive Test', 'sql-archive-test', 'America/Toronto')
    returning id into v_facility;

  insert into public.locations (facility_id, name, is_primary, timezone)
       values (v_facility, 'Main', true, 'America/Toronto');
  insert into public.clients (facility_id, name, email, status)
       values (v_facility, 'Archive Client', 'archive@example.invalid', 'active');

  -- A1. It starts visible.
  select archived_at into v_archived from public.facilities where id = v_facility;
  perform pg_temp.t(1, 'a new facility is not born archived', v_archived is null);

  -- A2. Archiving is one column.
  update public.facilities set archived_at = now() where id = v_facility;
  select archived_at into v_archived from public.facilities where id = v_facility;
  perform pg_temp.t(2, 'archiving takes', v_archived is not null);

  -- A3/A4. THE ROWS STAY, which is the whole point. If archiving ever cascades
  -- it has become a delete, and the append-only ledger goes with it.
  select count(*) into v_clients from public.clients where facility_id = v_facility;
  select count(*) into v_loc from public.locations where facility_id = v_facility;
  perform pg_temp.t(3, 'the clients stay', v_clients = 1,
                    v_clients || ' client(s) left');
  perform pg_temp.t(4, 'the locations stay', v_loc = 1,
                    v_loc || ' location(s) left');

  -- A5. And it is reversible, exactly.
  update public.facilities set archived_at = null where id = v_facility;
  select archived_at into v_archived from public.facilities where id = v_facility;
  perform pg_temp.t(5, 'a facility comes back', v_archived is null);
end $$;

select n, name, ok, detail from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
