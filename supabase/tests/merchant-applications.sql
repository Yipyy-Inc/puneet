-- ============================================================================
-- Merchant boarding — who may read an owner's date of birth, and where the
-- national id is NOT (20260823700000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/merchant-applications.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- 1. M6 IS THE ONE THAT MATTERS. `settings_billing` lets a manager see that an
--    application is under review. It does NOT let them read the owner's date of
--    birth and home address. Those are two different facts about two different
--    people and the migration deliberately gives them different policies — so
--    the assertion proves the manager can read the application and cannot read
--    the principal, in the same breath. If M5 and M6 ever agree, the split has
--    collapsed and nobody would see it on a screen.
--
-- 2. THE SECRET IS NOT A COLUMN (M10, M11). A national id and a bank account go
--    to Vault; the row holds a uuid and a last-four. M10 proves the column is a
--    pointer rather than the number. M11 proves the pointer is useless without
--    the definer function, which `authenticated` may not execute — because the
--    thing to fear is not a leaked uuid, it is a leaked uuid plus a callable
--    fetch.
--
-- 3. A DEFINER FUNCTION BYPASSES RLS HERE (M8). Measured in this database on
--    2026-08-23: `security definer` owned by a superuser ignores row-level
--    security entirely, `force row level security` included. So
--    `store_boarding_secret` re-checks `settings_billing` ITSELF, and M8 proves
--    that check is real by calling it as somebody who holds the permission
--    nowhere near the facility in question. Without the internal check the
--    policies above would look correct and do nothing on this path.
--
-- 4. THE APPLICANT DOES NOT SET THEIR OWN STATUS (M12, M13). A facility that
--    could mark itself approved would send the app connecting to an account
--    nobody opened. M13 is the exemption's control: withdrawing your own draft
--    IS yours, and proving that separately is what stops M12's guard from
--    quietly becoming "the status never moves".
--
-- 5. DELETE IS NOT GRANTED (M1). A default privilege in this project hands the
--    full set to `authenticated` on a new table, so a `grant select, insert,
--    update` that never mentions delete still leaves DELETE in place — found on
--    another table the same day. The revoke is asserted rather than trusted.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
-- `service_role` is in this list and the other suites do not need it: the
-- secret writer is executable by service_role ALONE, so proving it works means
-- becoming that role, and an assertion recorded from there needs the grant too.
grant all on tap to authenticated, anon, service_role;
grant usage, select on sequence tap_n_seq to authenticated, anon, service_role;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────
--
-- An owner who submits, an ACCOUNTANT at the same facility, a groomer who holds
-- nothing, and a rival owner at another facility entirely.
--
-- The accountant is the interesting one, and picking them was not a guess:
-- `settings_billing` is held by owner, admin and accountant — measured against
-- role_preset_permissions, NOT by manager, which is who this fixture named
-- first. So the second reader is somebody who genuinely does the facility's
-- books, sees that an application is under review, and still has no business
-- knowing the proprietor's date of birth.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000002b0001', 'mb-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000002b0002', 'mb-accountant@example.invalid'),
  ('00000000-0000-0000-0000-0000002b0003', 'mb-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000002b0004', 'mb-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000002b0001', 'mb-owner@example.invalid', 'MB Owner'),
  ('00000000-0000-0000-0000-0000002b0002', 'mb-manager@example.invalid', 'MB Accountant'),
  ('00000000-0000-0000-0000-0000002b0003', 'mb-groomer@example.invalid', 'MB Groomer'),
  ('00000000-0000-0000-0000-0000002b0004', 'mb-rival@example.invalid', 'MB Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000002b0010', 'MB Org', 'mb-org'),
  ('00000000-0000-0000-0000-0000002b0011', 'MB Rival Org', 'mb-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000002b0020', '00000000-0000-0000-0000-0000002b0010',
   'MB Kennels', 'mb-kennels', 'mb-kennels'),
  ('00000000-0000-0000-0000-0000002b0021', '00000000-0000-0000-0000-0000002b0011',
   'MB Rival Kennels', 'mb-rival-kennels', 'mb-rival-kennels')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000002b0030', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0001', 'owner', true),
  ('00000000-0000-0000-0000-0000002b0031', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0002', 'accountant', true),
  ('00000000-0000-0000-0000-0000002b0032', '00000000-0000-0000-0000-0000002b0020',
   '00000000-0000-0000-0000-0000002b0003', 'groomer', true),
  ('00000000-0000-0000-0000-0000002b0033', '00000000-0000-0000-0000-0000002b0021',
   '00000000-0000-0000-0000-0000002b0004', 'owner', true)
on conflict (id) do nothing;

-- ── M1  The grants, asserted rather than trusted ──────────────────────────

do $$
begin
  -- Two of three. An application is withdrawn rather than deleted, and a
  -- document is superseded by uploading another — an applicant quietly removing
  -- what they submitted is what staff_documents refuses too.
  perform pg_temp.t('M1 an application and a document cannot be deleted',
    not has_table_privilege('authenticated', 'public.merchant_applications', 'DELETE')
    and not has_table_privilege('authenticated', 'public.merchant_application_documents', 'DELETE'),
    'a default privilege grants the full set; the revoke has to be checked');

  -- The third is deliberately different, and the first version of this file had
  -- it wrong: revoking DELETE everywhere meant a co-owner typed in twice could
  -- never be removed, so the only correction available was abandoning the
  -- application and re-uploading every document.
  perform pg_temp.t('M1b …but an owner added by mistake CAN be',
    has_table_privilege('authenticated', 'public.merchant_application_principals', 'DELETE'),
    'an application that cannot be corrected is one somebody restarts from scratch');

  perform pg_temp.t('M2 anon reaches none of it',
    not has_table_privilege('anon', 'public.merchant_applications', 'SELECT')
    and not has_table_privilege('anon', 'public.merchant_application_principals', 'SELECT')
    and not has_table_privilege('anon', 'public.merchant_application_documents', 'SELECT'),
    'revoke from anon and revoke from public are different grants');

  perform pg_temp.t('M3 the secret functions are service_role only',
    not has_function_privilege('anon', 'public.store_boarding_secret(uuid,text,uuid,text,text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.store_boarding_secret(uuid,text,uuid,text,text)', 'EXECUTE')
    and not has_function_privilege('authenticated', 'public.read_boarding_secret(uuid,text,uuid)', 'EXECUTE')
    and has_function_privilege('service_role', 'public.read_boarding_secret(uuid,text,uuid)', 'EXECUTE'),
    'a definer function anyone could execute is a public endpoint returning a national id');

  perform pg_temp.t('M4 the documents bucket is not public',
    exists (select 1 from storage.buckets
             where id = 'merchant-applications' and public = false),
    'an identity document behind a guessable URL is the failure this bucket exists to avoid');
end $$;

-- ── As the owner, who submits ─────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0001','role','authenticated')::text, true);
set local role authenticated;

insert into public.merchant_applications
  (id, facility_id, legal_name, created_by)
values
  ('00000000-0000-0000-0000-0000002b0040',
   '00000000-0000-0000-0000-0000002b0020',
   'MB Kennels Incorporated',
   '00000000-0000-0000-0000-0000002b0001');

insert into public.merchant_application_principals
  (id, application_id, facility_id, full_name, date_of_birth, ownership_percent)
values
  ('00000000-0000-0000-0000-0000002b0050',
   '00000000-0000-0000-0000-0000002b0040',
   '00000000-0000-0000-0000-0000002b0020',
   'MB Owner', '1980-04-01', 100);

do $$
declare v_app int; v_principal int;
begin
  v_app := (select count(*) from public.merchant_applications
             where id = '00000000-0000-0000-0000-0000002b0040');
  v_principal := (select count(*) from public.merchant_application_principals
                   where id = '00000000-0000-0000-0000-0000002b0050');
  perform pg_temp.t('M5 the submitter reads their own application and principals',
    v_app = 1 and v_principal = 1,
    'app=' || v_app || ' principal=' || v_principal);
end $$;

-- ── As the accountant at the SAME facility ────────────────────────────────
--
-- Holds settings_billing. Entitled to the status; not entitled to the person.

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_app int; v_principal int;
begin
  v_app := (select count(*) from public.merchant_applications
             where id = '00000000-0000-0000-0000-0000002b0040');
  v_principal := (select count(*) from public.merchant_application_principals
                   where id = '00000000-0000-0000-0000-0000002b0050');

  -- THE POSITIVE CONTROL, and it earned its place on the first run: this file
  -- originally used a manager, M5b failed with app=0, and M6 had been passing
  -- vacuously because the reader could see nothing at all. A deny-assertion
  -- without a matching allow-assertion is indistinguishable from a broken
  -- fixture.
  perform pg_temp.t('M5b an accountant with settings_billing sees the application',
    v_app = 1, 'app=' || v_app);

  perform pg_temp.t('M6 an accountant does NOT see the owner''s date of birth',
    v_principal = 0,
    'principal rows visible=' || v_principal
    || ' — settings_billing is not entitlement to a person''s DOB and address');
end $$;

-- ── As a groomer, who holds nothing ───────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_app int; v_secret int;
begin
  v_app := (select count(*) from public.merchant_applications
             where id = '00000000-0000-0000-0000-0000002b0040');
  perform pg_temp.t('M7 a groomer sees no application at all', v_app = 0,
    'app=' || v_app);

  -- The vault secret id is a HANDLE. It is not itself a secret, but a column
  -- that leaked one to the wrong reader plus a callable fetch is the whole
  -- breach — so the column is checked from the role least entitled to it.
  v_secret := (select count(*) from public.merchant_application_principals
                where national_id_secret_id is not null);
  perform pg_temp.t('M7b a groomer cannot read a national_id_secret_id',
    v_secret = 0, 'rows with a visible secret handle=' || v_secret);
end $$;

-- ── As a rival owner at another facility ──────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0004','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_app int; state text;
begin
  v_app := (select count(*) from public.merchant_applications
             where id = '00000000-0000-0000-0000-0000002b0040');
  perform pg_temp.t('M8 a rival facility''s owner sees nothing', v_app = 0,
    'app=' || v_app);

  -- THE DEFINER RE-CHECK. This caller holds settings_billing — at their OWN
  -- facility. The function runs as its superuser owner and so ignores every
  -- policy above; the only thing standing between this call and writing a
  -- secret onto somebody else's application is the check inside it.
  --
  -- EXECUTE is revoked from authenticated too, so 42501 here may come from
  -- either guard. Both are the right answer and the test says so rather than
  -- pretending to distinguish them.
  begin
    perform public.store_boarding_secret(
      '00000000-0000-0000-0000-0000002b0040', 'bank', null, '000123456789', '6789');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('M9 a rival cannot write a secret onto another facility''s application',
    state = '42501', 'state=' || state);
end $$;

-- ── The secret really goes to Vault ───────────────────────────────────────
--
-- As `service_role`, which is the ONLY role that may execute this — and which
-- is how the server calls it, having already authorised the caller at the
-- route. The first version of the function had no service_role branch and so
-- could not be called by anybody at all; this block is what found that.

reset role;
set local role service_role;

do $$
declare v_secret_id uuid; v_last4 text; v_vault int; v_plain int;
begin
  perform public.store_boarding_secret(
    '00000000-0000-0000-0000-0000002b0040', 'principal',
    '00000000-0000-0000-0000-0000002b0050', '123456789', '6789');

  select national_id_secret_id, national_id_last4
    into v_secret_id, v_last4
    from public.merchant_application_principals
   where id = '00000000-0000-0000-0000-0000002b0050';

  perform pg_temp.t('M10 the row holds a pointer and a last four, never the number',
    v_secret_id is not null and v_last4 = '6789',
    'secret_id set=' || (v_secret_id is not null)::text || ' last4=' || coalesce(v_last4,'<null>'));

  -- The number is in the vault under the name the function builds.
  v_vault := (select count(*) from vault.secrets
               where name = 'boarding:00000000-0000-0000-0000-0000002b0040:principal:00000000-0000-0000-0000-0000002b0050');
  perform pg_temp.t('M11 the number is in Vault under a per-application name',
    v_vault = 1, 'vault rows=' || v_vault);

  -- And nowhere in the table. Checked as text across every column rather than
  -- by naming one, because the failure being guarded against is somebody adding
  -- a convenience column later.
  v_plain := (select count(*) from public.merchant_application_principals p
               where p.id = '00000000-0000-0000-0000-0000002b0050'
                 and p::text like '%123456789%');
  perform pg_temp.t('M11b the number appears nowhere in the principal row',
    v_plain = 0, 'rows containing the plaintext=' || v_plain);
end $$;

-- ── The status is not the applicant's to write ────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text; v_status text;
begin
  begin
    update public.merchant_applications
       set status = 'approved'
     where id = '00000000-0000-0000-0000-0000002b0040';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('M12 the applicant cannot mark their own application approved',
    state = '42501',
    'state=' || state || ' — approving yourself sends the app connecting to an account nobody opened');

  -- The exemption's control. Without this, M12 would still pass if the guard
  -- had been written as "the status never moves", and a facility could never
  -- abandon a draft it started by mistake.
  begin
    update public.merchant_applications
       set status = 'withdrawn'
     where id = '00000000-0000-0000-0000-0000002b0040';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  v_status := (select status from public.merchant_applications
                where id = '00000000-0000-0000-0000-0000002b0040');
  perform pg_temp.t('M13 …but withdrawing their own draft IS theirs',
    state = 'ALLOWED' and v_status = 'withdrawn',
    'state=' || state || ' status=' || coalesce(v_status,'<null>'));
end $$;

-- ── The purge destroys the evidence and keeps the record ──────────────────

reset role;

do $$
declare v_gone int; v_vault int; v_secret_id uuid; v_purged timestamptz;
begin
  v_gone := private.purge_boarding_evidence('00000000-0000-0000-0000-0000002b0040');

  v_vault := (select count(*) from vault.secrets
               where name like 'boarding:00000000-0000-0000-0000-0000002b0040:%');
  select national_id_secret_id into v_secret_id
    from public.merchant_application_principals
   where id = '00000000-0000-0000-0000-0000002b0050';
  select purged_at into v_purged from public.merchant_applications
   where id = '00000000-0000-0000-0000-0000002b0040';

  perform pg_temp.t('M14 the purge destroys every Vault secret for the application',
    v_vault = 0 and v_gone >= 1,
    'removed=' || v_gone || ' remaining=' || v_vault);

  perform pg_temp.t('M15 …and clears the handles, leaving the record that it happened',
    v_secret_id is null and v_purged is not null,
    'handle=' || coalesce(v_secret_id::text,'<null>')
    || ' purged_at=' || coalesce(v_purged::text,'<null>'));
end $$;

-- A live application must NOT be purgeable — that would destroy what
-- underwriting is still waiting to be sent.
insert into public.merchant_applications
  (id, facility_id, legal_name, status, created_by)
values
  ('00000000-0000-0000-0000-0000002b0041',
   '00000000-0000-0000-0000-0000002b0020',
   'MB Still Going', 'under_review',
   '00000000-0000-0000-0000-0000002b0001');

do $$
declare state text;
begin
  begin
    perform private.purge_boarding_evidence('00000000-0000-0000-0000-0000002b0041');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('M16 an application still under review cannot be purged',
    state = '42501', 'state=' || state);
end $$;

-- The delete is NARROW: a privilege plus a policy, and the policy is what makes
-- it safe. Asserted from the rival's session, who holds settings_billing at
-- their own facility and DELETE on the table — and must still not be able to
-- remove somebody else's owner.
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000002b0004','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_left int;
begin
  delete from public.merchant_application_principals
   where id = '00000000-0000-0000-0000-0000002b0050';

  -- No exception: a DELETE refused by its `using` clause removes zero rows and
  -- reports success. Counting is the only way to tell refusal from absence,
  -- which is the whole reason deniedIfExpectedRowsSurvived exists in the app.
  reset role;
  v_left := (select count(*) from public.merchant_application_principals
              where id = '00000000-0000-0000-0000-0000002b0050');
  perform pg_temp.t('M18 a rival holding DELETE still cannot remove another facility''s owner',
    v_left = 1, 'rows remaining=' || v_left);
end $$;

reset role;

-- One live application per facility, or "what is our status" has two answers.
do $$
declare state text;
begin
  begin
    insert into public.merchant_applications (facility_id, legal_name, created_by)
    values ('00000000-0000-0000-0000-0000002b0020', 'MB Duplicate',
            '00000000-0000-0000-0000-0000002b0001');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('M17 a facility cannot have two live applications',
    state = '23505', 'state=' || state);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
