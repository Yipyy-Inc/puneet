-- ============================================================================
-- The other eight authorship columns.
--
-- ── WHAT WAS BROKEN ───────────────────────────────────────────────────────
--
-- 20260805223000 converted ELEVEN identity columns from uuid to text and
-- rewrote the trigger functions that write them, including this one:
--
--     new.created_by := (select auth.jwt()->>'sub');   -- line 173
--
-- and it left a comment saying "v_uid becomes text along with the columns it is
-- written into". For eleven columns it did. For eight it did not:
--
--     booking_line_items, daycare_attendance, grooming_appointment_history,
--     grooming_intake, grooming_photos, package_pass_entries, payments,
--     store_credit_entries
--
-- The same commit dropped those eight columns' foreign keys to auth.users --
-- deliberately, and reasoned about it at length -- so the set was enumerated
-- correctly and then only half-treated. The FK went; the type stayed uuid.
--
-- Every insert that stamps one therefore fails:
--
--     invalid input syntax for type uuid: "user_3HYHqxUfSn9nMazIRnVX7t9KAQg"
--
-- ── WHAT THAT MEANT ───────────────────────────────────────────────────────
--
-- THE MONEY PATH WAS DOWN. `payments`, `booking_line_items` and
-- `store_credit_entries` are three of the eight, so taking a payment, adding a
-- line item and issuing store credit all 500'd. So did daycare check-in and
-- every grooming intake, photo and history write.
--
-- Nothing caught it. The columns are nullable with no default, so no schema
-- check complains; typecheck, lint and the build cannot see a Postgres cast;
-- and the SQL suites set a JWT claim of their own choosing -- uuid-shaped
-- strings, which cast into a uuid column perfectly well. It took a browser
-- signing in as a real Clerk subject to produce a value that does not.
--
-- The restored e2e suite found it on its first full run.
--
-- ── THE CHANGE ────────────────────────────────────────────────────────────
--
-- Exactly what the earlier migration did to the other eleven: `type text using
-- created_by::text`. Existing rows keep their uuid-shaped strings, which point
-- at identities retired by 20260805233000 and are audit history rather than
-- anything resolvable -- the same state the other eleven are already in.
--
-- No policy references these columns (checked in the catalog), so nothing has
-- to be dropped and recreated around the change.
-- ============================================================================

alter table public.booking_line_items           alter column created_by type text using created_by::text;
alter table public.daycare_attendance           alter column created_by type text using created_by::text;
alter table public.grooming_appointment_history alter column created_by type text using created_by::text;
alter table public.grooming_intake              alter column created_by type text using created_by::text;
alter table public.grooming_photos              alter column created_by type text using created_by::text;
alter table public.package_pass_entries         alter column created_by type text using created_by::text;
alter table public.payments                     alter column created_by type text using created_by::text;
alter table public.store_credit_entries         alter column created_by type text using created_by::text;

-- The guard. A ninth column added later as uuid would fail the same way, at
-- runtime, in whichever screen happened to write it first -- so the invariant
-- is asserted here rather than left to be rediscovered.
do $$
declare
  v_offenders text;
begin
  select string_agg(table_name || '.' || column_name, ', ' order by table_name)
    into v_offenders
    from information_schema.columns
   where table_schema = 'public'
     and data_type = 'uuid'
     and column_name in ('created_by', 'completed_by', 'uploaded_by', 'signed_by');

  if v_offenders is not null then
    raise exception
      'These authorship columns are still uuid and cannot hold a Clerk subject: %', v_offenders;
  end if;
end $$;
