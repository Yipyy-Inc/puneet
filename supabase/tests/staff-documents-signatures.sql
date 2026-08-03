-- ============================================================================
-- Staff documents and signatures — RLS, append-only, and the one property the
-- signatures table exists for. Behaviour tests for 20260804090000.
--
-- Run as the caller (`set local role authenticated` plus the JWT subject),
-- which is the position a browser holding the anon key and a session cookie is
-- in. Testing through the routes would prove the wrong thing: PostgREST is
-- reachable directly, so those routes are a convenience and not a gate.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/staff-documents-signatures.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── FOUR CALLERS, and the third one is the point ───────────────────────────
--
--   alice       owns a document and a signature. The subject.
--   bob         a colleague at the same facility. Must see none of Alice's.
--   supervisor  holds view_staff but NOT manage_staff. The test that a
--               facility-wide read needs the RIGHT permission and not merely
--               a senior-sounding one.
--   manager     holds manage_staff. The control — without it every refusal
--               below is satisfied by a policy set that denies everyone.
--
-- TO CONFIRM THESE FAIL WITHOUT THE MIGRATION: drop the policies and the
-- triggers and re-run. T1/T4 (isolation), T2/T3/T7/T9 (immutability) go red.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e0', 'sd-manager@example.invalid'),
  ('00000000-0000-0000-0000-0000000000e1', 'sd-alice@example.invalid'),
  ('00000000-0000-0000-0000-0000000000e2', 'sd-bob@example.invalid'),
  ('00000000-0000-0000-0000-0000000000e3', 'sd-super@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000e0', 'sd-manager@example.invalid', 'Manager'),
  ('00000000-0000-0000-0000-0000000000e1', 'sd-alice@example.invalid',   'Alice'),
  ('00000000-0000-0000-0000-0000000000e2', 'sd-bob@example.invalid',     'Bob'),
  ('00000000-0000-0000-0000-0000000000e3', 'sd-super@example.invalid',   'Supervisor')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000e8', 'SD Org', 'sd-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-0000000000e8',
   'SD Facility', 'sd-facility', 'sd-a')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000ec', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000e0', 'manager', true),
  ('00000000-0000-0000-0000-0000000000ed', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000e1', 'groomer', true),
  ('00000000-0000-0000-0000-0000000000ee', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000e2', 'groomer', true),
  ('00000000-0000-0000-0000-0000000000ef', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000e3', 'supervisor', true)
on conflict (id) do nothing;

insert into public.staff
  (id, facility_id, membership_id, legacy_id, first_name, last_name, email, primary_role, status)
values
  ('00000000-0000-0000-0000-00000000e101', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000ed', 'sd-alice', 'Alice', 'A',
   'sd-alice@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-00000000e102', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000ee', 'sd-bob', 'Bob', 'B',
   'sd-bob@example.invalid', 'groomer', 'active'),
  ('00000000-0000-0000-0000-00000000e103', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-0000000000ef', 'sd-super', 'Sam', 'S',
   'sd-super@example.invalid', 'supervisor', 'active');

insert into public.staff_documents
  (id, facility_id, staff_id, file_name, content_type, size_bytes, storage_path, doc_type)
values
  ('00000000-0000-0000-0000-00000000f101', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-00000000e101', 'alice-passport.pdf', 'application/pdf', 12345,
   '00000000-0000-0000-0000-0000000000ea/00000000-0000-0000-0000-00000000e101/a1-passport.pdf',
   'id_document'),
  ('00000000-0000-0000-0000-00000000f102', '00000000-0000-0000-0000-0000000000ea',
   '00000000-0000-0000-0000-00000000e102', 'bob-contract.pdf', 'application/pdf', 22345,
   '00000000-0000-0000-0000-0000000000ea/00000000-0000-0000-0000-00000000e102/b1-contract.pdf',
   'contract');

-- THE AGREEMENT, as a row the facility can edit. T6 turns on this being real.
insert into public.onboarding_templates (id, facility_id, name, status) values
  ('00000000-0000-0000-0000-00000000e901', '00000000-0000-0000-0000-0000000000ea',
   'Handbook template', 'draft');
insert into public.onboarding_employee_tasks
  (id, template_id, facility_id, position, task_type, name, document_name, config)
values
  ('00000000-0000-0000-0000-00000000e902', '00000000-0000-0000-0000-00000000e901',
   '00000000-0000-0000-0000-0000000000ea', 1, 'document_sign', 'Employee Handbook',
   'Employee Handbook',
   jsonb_build_object('agreementText', 'Clause 4: two weeks notice.'));

-- Alice signs it. The text is COPIED out of the task at signing time — which is
-- the behaviour under test, so the fixture performs it rather than asserting it.
insert into public.staff_signatures
  (id, facility_id, staff_id, task_key, agreement_key, agreement_title,
   agreement_text, agreement_hash, signature_name, signed_by)
select '00000000-0000-0000-0000-00000000f201', '00000000-0000-0000-0000-0000000000ea',
       '00000000-0000-0000-0000-00000000e101', t.id::text, 'handbook', t.name,
       t.config ->> 'agreementText',
       encode(extensions.digest(t.config ->> 'agreementText', 'sha256'), 'hex'),
       'Alice A', '00000000-0000-0000-0000-0000000000e1'
  from public.onboarding_employee_tasks t
 where t.id = '00000000-0000-0000-0000-00000000e902';

-- ── T0: the fixture ─────────────────────────────────────────────────────────
do $$
declare d integer; s integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into d from public.staff_documents;
  select count(*) into s from public.staff_signatures;
  perform pg_temp.t('T0  fixture: 2 documents, 1 signature', d = 2 and s = 1,
    format('documents=%s signatures=%s', d, s));
end $$;

-- ── T1: a staff member cannot read another's documents ──────────────────────
do $$
declare mine integer; theirs integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  set local role authenticated;
  select count(*) into mine   from public.staff_documents
   where staff_id = '00000000-0000-0000-0000-00000000e101';
  select count(*) into theirs from public.staff_documents
   where staff_id = '00000000-0000-0000-0000-00000000e102';
  reset role;
  perform pg_temp.t('T1  a staff member cannot read another staff member''s documents',
    mine = 1 and theirs = 0, format('own=%s colleague=%s', mine, theirs));
exception when others then reset role; perform pg_temp.t('T1', false, sqlerrm);
end $$;

-- ── T2: cannot delete their own signature ───────────────────────────────────
do $$
declare v_ok boolean; c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  set local role authenticated;
  begin
    delete from public.staff_signatures where id = '00000000-0000-0000-0000-00000000f201';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into c from public.staff_signatures
   where id = '00000000-0000-0000-0000-00000000f201';
  perform pg_temp.t('T2  a staff member cannot delete their own signature',
    v_ok and c = 1, format('refused=%s still_there=%s', v_ok, c));
exception when others then reset role; perform pg_temp.t('T2', false, sqlerrm);
end $$;

-- ── T3: nor can service_role ────────────────────────────────────────────────
-- The reason the audit-log pattern uses a TRIGGER: RLS and GRANTs are both
-- bypassed by privileged roles, and this table's whole value is that its rows
-- cannot be quietly improved after the fact.
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    delete from public.staff_signatures where id = '00000000-0000-0000-0000-00000000f201';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  perform pg_temp.t('T3  not even service_role can delete a signature', v_ok);
exception when others then perform pg_temp.t('T3', false, sqlerrm);
end $$;

-- ── T4: a manager WITHOUT manage_staff cannot read the facility's ───────────
-- The supervisor holds view_staff. That admits them to the roster and must not
-- admit them to a colleague's passport scan — which is exactly why the policy
-- keys on manage_staff and not on the more obvious-sounding view_staff.
do $$
declare c integer; sg integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', true);
  set local role authenticated;
  select count(*) into c  from public.staff_documents;
  select count(*) into sg from public.staff_signatures;
  reset role;
  perform pg_temp.t('T4  a supervisor (view_staff, no manage_staff) reads neither',
    c = 0 and sg = 0, format('documents=%s signatures=%s', c, sg));
exception when others then reset role; perform pg_temp.t('T4', false, sqlerrm);
end $$;

-- ── T5: the control ─────────────────────────────────────────────────────────
do $$
declare c integer; sg integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e0', true);
  set local role authenticated;
  select count(*) into c  from public.staff_documents;
  select count(*) into sg from public.staff_signatures;
  reset role;
  perform pg_temp.t('T5  the control: a manager WITH manage_staff reads both',
    c = 2 and sg = 1, format('documents=%s signatures=%s', c, sg));
exception when others then reset role; perform pg_temp.t('T5', false, sqlerrm);
end $$;

-- ── T6: THE POINT OF THE TABLE ──────────────────────────────────────────────
-- The facility edits the agreement. The signature must still prove what Alice
-- actually agreed to.
--
-- The first version of this test wrote `update … where false` — an edit that
-- edits nothing — and then asserted the signature was unchanged. It passed, and
-- it would have passed just as well against a design that stored a foreign key
-- to the agreement row. A test of "X survives Y" that never performs Y is not a
-- test. T6b performs a real UPDATE of a real row, and T6c deletes it outright.
do $$
declare v_task text; v_sig text;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  select config ->> 'agreementText' into v_task from public.onboarding_employee_tasks
   where id = '00000000-0000-0000-0000-00000000e902';
  select agreement_text into v_sig from public.staff_signatures
   where id = '00000000-0000-0000-0000-00000000f201';
  perform pg_temp.t('T6a BEFORE the edit: the agreement and the signature agree',
    v_task = v_sig and v_sig like '%two weeks%', format('both=[%s]', v_sig));
end $$;

do $$
declare v_task text; v_sig text; v_hash text; v_verifies boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  update public.onboarding_employee_tasks
     set config = jsonb_set(config, '{agreementText}', '"Clause 4: no notice required."')
   where id = '00000000-0000-0000-0000-00000000e902';

  select config ->> 'agreementText' into v_task from public.onboarding_employee_tasks
   where id = '00000000-0000-0000-0000-00000000e902';
  select agreement_text, agreement_hash into v_sig, v_hash
    from public.staff_signatures where id = '00000000-0000-0000-0000-00000000f201';
  v_verifies := v_hash = encode(extensions.digest(v_sig, 'sha256'), 'hex');

  perform pg_temp.t('T6b AFTER the edit: the agreement changed, the signature did not',
    v_task like '%no notice required%' and v_sig like '%two weeks notice%' and v_verifies,
    format('agreement_now=[%s] signature_still=[%s] hash_verifies=%s',
           v_task, v_sig, v_verifies));
end $$;

do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  delete from public.onboarding_employee_tasks
   where id = '00000000-0000-0000-0000-00000000e902';
  select count(*) into c from public.staff_signatures
   where id = '00000000-0000-0000-0000-00000000f201';
  perform pg_temp.t('T6c the signature survives the agreement row being DELETED',
    c = 1, format('signatures=%s', c));
end $$;

-- ── T7: a manager cannot rewrite what was signed ────────────────────────────
do $$
declare v_ok boolean; v_text text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e0', true);
  set local role authenticated;
  begin
    update public.staff_signatures
       set agreement_text = 'Clause 4: no notice required.'
     where id = '00000000-0000-0000-0000-00000000f201';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  select agreement_text into v_text from public.staff_signatures
   where id = '00000000-0000-0000-0000-00000000f201';
  perform pg_temp.t('T7  a manager cannot rewrite what was signed',
    v_ok and v_text like '%two weeks notice%', format('refused=%s', v_ok));
exception when others then reset role; perform pg_temp.t('T7', false, sqlerrm);
end $$;

-- ── T8: an employee cannot delete their own document ────────────────────────
-- No employee DELETE policy exists, so this matches ZERO ROWS rather than
-- raising — checking the row is still there is what tells the two apart.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  set local role authenticated;
  delete from public.staff_documents where id = '00000000-0000-0000-0000-00000000f101';
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
  select count(*) into c from public.staff_documents
   where id = '00000000-0000-0000-0000-00000000f101';
  perform pg_temp.t('T8  an employee cannot delete their own document', c = 1,
    format('still_there=%s', c));
exception when others then reset role; perform pg_temp.t('T8', false, sqlerrm);
end $$;

-- ── T9: nobody relabels a stored document ───────────────────────────────────
-- "This is a contract" must not quietly become "this is a payslip" while the
-- bytes stay put. Replacement is an upload, not an edit.
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e0', true);
  set local role authenticated;
  begin
    update public.staff_documents set doc_type = 'tax_form'
     where id = '00000000-0000-0000-0000-00000000f101';
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T9  nobody can relabel a stored document row', v_ok);
exception when others then reset role; perform pg_temp.t('T9', false, sqlerrm);
end $$;

-- ── T10: nor file one against a colleague ───────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  set local role authenticated;
  begin
    insert into public.staff_documents
      (facility_id, staff_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-00000000e102',
            'planted.pdf', 'application/pdf', 10, 'x/y/planted.pdf');
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T10 an employee cannot file a document against a colleague', v_ok);
exception when others then reset role; perform pg_temp.t('T10', false, sqlerrm);
end $$;

-- ── T11: type and size are refused by the DATABASE ──────────────────────────
-- The route sniffs magic bytes, which is the real defence. These CHECKs are the
-- floor under it: a future caller that forgets to sniff still cannot store an
-- executable, and PostgREST is reachable without going through the route at all.
do $$
declare v_type boolean; v_size boolean;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  begin
    insert into public.staff_documents
      (facility_id, staff_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-00000000e101',
            'evil.exe', 'application/x-msdownload', 10, 'x/y/evil.exe');
    v_type := false;
  exception when check_violation then v_type := true;
  end;
  begin
    insert into public.staff_documents
      (facility_id, staff_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000000000ea', '00000000-0000-0000-0000-00000000e101',
            'huge.pdf', 'application/pdf', 99999999, 'x/y/huge.pdf');
    v_size := false;
  exception when check_violation then v_size := true;
  end;
  perform pg_temp.t('T11 content type and size are refused in the DATABASE, not only the route',
    v_type and v_size, format('type_refused=%s size_refused=%s', v_type, v_size));
exception when others then perform pg_temp.t('T11', false, sqlerrm);
end $$;

-- ── T12: the bucket is private ──────────────────────────────────────────────
do $$
declare v_public boolean; v_policies integer;
begin
  select public into v_public from storage.buckets where id = 'staff-documents';
  select count(*) into v_policies from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname like 'staff_documents_object%';
  perform pg_temp.t('T12 the bucket is PRIVATE and has its own object policies',
    v_public = false and v_policies = 3,
    format('public=%s object_policies=%s', v_public, v_policies));
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
