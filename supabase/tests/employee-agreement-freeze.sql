-- ============================================================================
-- An employee signs an agreement, and the record survives the agreement.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/employee-agreement-freeze.sql
--
-- One transaction, rolled back — which is the ONLY teardown available here:
-- public.staff_signatures is append-only for every role including its owner,
-- so a committed test could never clean up after itself.
--
-- ── WHY THIS IS SQL AND NOT AN E2E ────────────────────────────────────────
--
-- The chain needs an `onboarding_instances` row, and there is NO route that
-- removes one — PATCH offers review / resend / request-change / resolve-change
-- and nothing else. An e2e that created one for a dev account would leave that
-- account mid-onboarding for ever, and the employee layout redirects anyone in
-- that state to their checklist — so a run that died between setup and cleanup
-- would break every later spec that signs in as them, looking like an app bug.
--
-- A transaction that rolls back has none of that blast radius, and the property
-- worth proving is a database property anyway.
--
-- ── WHAT WAS ACTUALLY BROKEN ──────────────────────────────────────────────
--
-- Both ends of a well-built mechanism were disconnected:
--
--   * `employeeTasksToRows` never wrote `config.agreementText`, so every task a
--     manager could author was unsignable — /api/staff-signatures refuses a
--     task with no words, correctly.
--   * `useSignAgreement()` had ZERO callers, so nothing had ever recorded a
--     signature. The table, the hashing and 26 assertions were built and unused.
--
-- T4 is the one the feature exists for: EDIT the agreement after signing, and
-- the signature still reads what was agreed.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

do $$
declare
  v_fac       uuid;
  v_staff     uuid;
  v_profile   text;
  v_tmpl      uuid;
  v_task      uuid;
  v_instance  uuid;
  n           int;
  v_text      text;
  v_hash      text;
  v_after     text;
  v_rows      int;
  c_original  constant text := 'I agree to the terms of employment, including the confidentiality clause.';
  c_edited    constant text := 'COMPLETELY DIFFERENT TERMS. If a signature reads this, the freeze failed.';
begin
  select id into v_fac from public.facilities where legacy_id = '11';

  -- An ordinary employee: a groomer, not an admin.
  select m.profile_id into v_profile
    from public.facility_memberships m
    join public.profiles p on p.id = m.profile_id
   where p.email = 'groomer@yipyy.dev' limit 1;
  select s.id into v_staff
    from public.staff s
    join public.facility_memberships m on m.id = s.membership_id
   where m.profile_id = v_profile limit 1;

  insert into public.onboarding_templates(facility_id, name, status,
    applies_to_roles, completion_deadline_days, invite_expiry_days)
    values (v_fac, 'Freeze probe template', 'active',
            array['groomer']::public.facility_staff_role[], 7, 7)
    returning id into v_tmpl;

  -- THE WORDS live in config.agreementText. Before this change the mapper
  -- dropped them, so this row could not have existed from the app.
  insert into public.onboarding_employee_tasks(template_id, facility_id, position,
    task_type, name, required, config)
    values (v_tmpl, v_fac, 1, 'document_sign', 'Employment agreement', true,
            jsonb_build_object('agreementText', c_original))
    returning id into v_task;

  insert into public.onboarding_instances(facility_id, staff_id, template_id,
    token_hash, token_expires_at)
    values (v_fac, v_staff, v_tmpl, 'freeze-probe-hash', now() + interval '7 days')
    returning id into v_instance;

  -- ── the employee can see what they are being asked to sign ──────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_profile, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.onboarding_employee_tasks
   where template_id = v_tmpl and task_type = 'document_sign';
  perform pg_temp.t(1, 'the employee can read their own agreement task', n = 1, n::text);

  execute 'reset role';

  -- ── signing copies the words and hashes them ────────────────────────────
  --
  -- Mirrors exactly what /api/staff-signatures does: read the text from the
  -- task, hash the bytes stored, never trust a caller-supplied copy.

  select (config->>'agreementText') into v_text
    from public.onboarding_employee_tasks where id = v_task;
  v_hash := encode(digest(v_text, 'sha256'), 'hex');

  insert into public.staff_signatures(facility_id, staff_id, instance_id, task_key,
    agreement_key, agreement_title, agreement_text, agreement_hash,
    signature_name, signed_by)
    values (v_fac, v_staff, v_instance, v_task::text, 'employment',
            'Employment agreement', v_text, v_hash, 'Probe Signer', v_profile);

  perform pg_temp.t(2, 'the signature stores the words, not a reference',
    (select agreement_text from public.staff_signatures where task_key = v_task::text)
      = c_original);

  perform pg_temp.t(3, 'the hash is over exactly the bytes stored',
    (select agreement_hash = encode(digest(agreement_text, 'sha256'), 'hex')
       from public.staff_signatures where task_key = v_task::text));

  -- ── THE POINT: editing the agreement does not rewrite history ───────────

  update public.onboarding_employee_tasks
     set config = jsonb_build_object('agreementText', c_edited)
   where id = v_task;

  select agreement_text into v_after
    from public.staff_signatures where task_key = v_task::text;

  perform pg_temp.t(4, 'EDITING the agreement leaves the signature untouched',
    v_after = c_original, left(v_after, 40));

  -- ── and deleting the source does not either ─────────────────────────────
  --
  -- There is deliberately NO foreign key from the signature to the task.

  delete from public.onboarding_employee_tasks where id = v_task;

  select count(*) into n from public.staff_signatures where task_key = v_task::text;
  perform pg_temp.t(5, 'DELETING the agreement leaves the signature standing',
    n = 1, n::text);

  -- ── the employee reads their own signature back ─────────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', v_profile, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.staff_signatures where staff_id = v_staff;
  perform pg_temp.t(6, 'the employee can read their OWN signature', n = 1, n::text);

  -- Append-only means append-only, including for the person who signed.
  begin
    update public.staff_signatures set signature_name = 'TAMPERED'
     where staff_id = v_staff;
    get diagnostics v_rows = row_count;
    perform pg_temp.t(7, 'the signer cannot rewrite their own signature',
      v_rows = 0, v_rows || ' rows affected');
  exception when others then
    perform pg_temp.t(7, 'the signer cannot rewrite their own signature', true,
      'refused: ' || sqlerrm);
  end;

  execute 'reset role';

  -- ── somebody else's signature is not theirs to read ─────────────────────

  perform set_config('request.jwt.claims',
    json_build_object('sub', 'user_notAMemberOfThisFacility00'::text,
                      'role', 'authenticated')::text, true);
  execute 'set local role authenticated';

  select count(*) into n from public.staff_signatures where staff_id = v_staff;
  perform pg_temp.t(8, 'a stranger reads no signature of theirs', n = 0, n::text);

  execute 'reset role';
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
