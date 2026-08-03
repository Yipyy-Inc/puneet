-- ============================================================================
-- Onboarding/offboarding templates + HR config — RLS and integrity tests for
-- 20260803140000.
--
-- Run as the caller (`set local role authenticated` + a JWT subject), which is
-- the position a browser holding the anon key and a session cookie is in.
-- Testing through the route handlers would prove the wrong thing: PostgREST is
-- reachable directly, so those routes are a convenience and not a gate.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/onboarding-templates-rls.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid so this
-- cannot collide with a seeded database — auth.users has a unique index on
-- email, and `on conflict (id)` does not save you from it.
--
-- THREE CALLERS, because every refusal has to be a refusal of the CALLER and
-- not of the operation:
--
--   manager  — manage_staff + view_onboarding. Writes.
--   groomer  — view_onboarding only. Reads, and must not write.
--   outsider — a member of a DIFFERENT facility. Must see nothing at all;
--              this is the test that a permission check without a facility
--              check would pass.
--
-- TO CONFIRM THESE FAIL WITHOUT THE MIGRATION: drop the policies and re-run.
-- T4-T7 go green-to-red — those are the ones asserting a refusal.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ─────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a0', 'ot-manager@example.invalid'),
  ('00000000-0000-0000-0000-0000000000a1', 'ot-groomer@example.invalid'),
  ('00000000-0000-0000-0000-0000000000a2', 'ot-outsider@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000000000a0', 'ot-manager@example.invalid',  'Manager'),
  ('00000000-0000-0000-0000-0000000000a1', 'ot-groomer@example.invalid',  'Groomer'),
  ('00000000-0000-0000-0000-0000000000a2', 'ot-outsider@example.invalid', 'Outsider')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000000000a8', 'OT Test Org', 'ot-test-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000000000aa', '00000000-0000-0000-0000-0000000000a8',
   'OT Facility A', 'ot-facility-a', 'ot-a'),
  ('00000000-0000-0000-0000-0000000000ab', '00000000-0000-0000-0000-0000000000a8',
   'OT Facility B', 'ot-facility-b', 'ot-b')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000000000ac', '00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000000a0', 'manager', true),
  ('00000000-0000-0000-0000-0000000000ad', '00000000-0000-0000-0000-0000000000aa',
   '00000000-0000-0000-0000-0000000000a1', 'groomer', true),
  ('00000000-0000-0000-0000-0000000000ae', '00000000-0000-0000-0000-0000000000ab',
   '00000000-0000-0000-0000-0000000000a2', 'manager', true)
on conflict (id) do nothing;

-- Seeded as service_role (no JWT subject) — the carve-out every trigger opens
-- with. T9 asserts that path stays open.
insert into public.onboarding_templates
  (id, facility_id, legacy_id, name, status, applies_to_roles, welcome_message)
values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000aa',
   'ot-tpl-groomer', 'Groomer Onboarding', 'active', array['groomer'], 'Welcome!');

insert into public.onboarding_manager_tasks
  (template_id, facility_id, position, task_type, name, when_due)
values
  ('00000000-0000-0000-0000-00000000a001', '00000000-0000-0000-0000-0000000000aa',
   1, 'facility_tour', 'Facility tour', 'on_hire');

insert into public.onboarding_employee_tasks
  (id, template_id, facility_id, position, task_type, name, config)
values
  ('00000000-0000-0000-0000-00000000a002', '00000000-0000-0000-0000-00000000a001',
   '00000000-0000-0000-0000-0000000000aa', 1, 'banking', 'Bank details',
   jsonb_build_object('fields', jsonb_build_array(
     jsonb_build_object('key', 'iban', 'label', 'IBAN', 'kind', 'iban', 'required', true))));

insert into public.staff_hr_config (facility_id, employment_types, invite_expiry_days)
values ('00000000-0000-0000-0000-0000000000aa', array['full_time','part_time'], 7);

-- ── T0: the fixture is what the tests below think it is ─────────────────────
do $$
declare c integer; e jsonb;
begin
  select count(*) into c from public.onboarding_templates
   where facility_id = '00000000-0000-0000-0000-0000000000aa';
  select config into e from public.onboarding_employee_tasks
   where id = '00000000-0000-0000-0000-00000000a002';
  perform pg_temp.t('T0  fixture: one template, employee task keeps its config',
    c = 1 and e -> 'fields' -> 0 ->> 'kind' = 'iban',
    format('templates=%s field_kind=%s', c, e -> 'fields' -> 0 ->> 'kind'));
end $$;

-- ── T1: a groomer can READ the template ─────────────────────────────────────
-- view_onboarding is held by every role preset, on purpose: a hire working
-- through a checklist has to be able to see it.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  select count(*) into c from public.onboarding_templates;
  reset role;
  perform pg_temp.t('T1  a groomer reads templates (view_onboarding)', c = 1,
    format('rows=%s', c));
exception when others then
  reset role; perform pg_temp.t('T1  groomer read', false, sqlerrm);
end $$;

-- ── T2: …and the tasks under it ─────────────────────────────────────────────
do $$
declare m integer; e integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  select count(*) into m from public.onboarding_manager_tasks;
  select count(*) into e from public.onboarding_employee_tasks;
  reset role;
  perform pg_temp.t('T2  a groomer reads both task tables', m = 1 and e = 1,
    format('manager=%s employee=%s', m, e));
exception when others then
  reset role; perform pg_temp.t('T2  groomer task read', false, sqlerrm);
end $$;

-- ── T3: a manager can WRITE ─────────────────────────────────────────────────
-- The control. Without it, every refusal below is satisfied by a policy set
-- that simply denies everyone.
do $$
declare v_id uuid; v_fac uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  insert into public.onboarding_templates (facility_id, name, status, applies_to_roles)
  values ('00000000-0000-0000-0000-0000000000aa', 'Reception Onboarding', 'active',
          array['reception'])
  returning id into v_id;
  insert into public.onboarding_employee_tasks
    (template_id, position, task_type, name, facility_id)
  values (v_id, 1, 'personal_info', 'Your details',
          '00000000-0000-0000-0000-0000000000ab')  -- WRONG facility on purpose
  returning facility_id into v_fac;
  reset role;
  perform pg_temp.t('T3  a manager writes, and a task inherits its template''s facility',
    v_id is not null and v_fac = '00000000-0000-0000-0000-0000000000aa',
    format('task_facility=%s', v_fac));
exception when others then
  reset role; perform pg_temp.t('T3  manager write', false, sqlerrm);
end $$;

-- ── T4: a groomer cannot INSERT ─────────────────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  begin
    insert into public.onboarding_templates (facility_id, name)
    values ('00000000-0000-0000-0000-0000000000aa', 'Groomer''s own template');
    v_ok := false;
  exception when insufficient_privilege then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T4  a groomer cannot create a template (read grant is not write)', v_ok);
exception when others then
  reset role; perform pg_temp.t('T4  groomer insert', false, sqlerrm);
end $$;

-- ── T5: nor UPDATE ──────────────────────────────────────────────────────────
-- Matches ZERO ROWS rather than raising — an UPDATE the policy refuses is not
-- an error, it is a no-op. Checking the stored value is what tells them apart,
-- and asserting on the error alone would pass while the row changed.
do $$
declare v_name text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  update public.onboarding_templates set name = 'Hijacked'
   where id = '00000000-0000-0000-0000-00000000a001';
  reset role;
  select name into v_name from public.onboarding_templates
   where id = '00000000-0000-0000-0000-00000000a001';
  perform pg_temp.t('T5  a groomer cannot rename a template', v_name = 'Groomer Onboarding',
    format('name=%s', v_name));
exception when others then
  reset role; perform pg_temp.t('T5  groomer update', false, sqlerrm);
end $$;

-- ── T6: nor DELETE ──────────────────────────────────────────────────────────
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  delete from public.onboarding_templates
   where id = '00000000-0000-0000-0000-00000000a001';
  reset role;
  select count(*) into c from public.onboarding_templates
   where id = '00000000-0000-0000-0000-00000000a001';
  perform pg_temp.t('T6  a groomer cannot delete a template', c = 1, format('rows=%s', c));
exception when others then
  reset role; perform pg_temp.t('T6  groomer delete', false, sqlerrm);
end $$;

-- ── T7: another facility's manager sees nothing ─────────────────────────────
-- The outsider HOLDS manage_staff — at facility B. A policy that checked the
-- permission without scoping it to the row's facility would pass T4-T6 and
-- fail here, which is why this caller exists.
do $$
declare t integer; m integer; e integer; h integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  set local role authenticated;
  select count(*) into t from public.onboarding_templates;
  select count(*) into m from public.onboarding_manager_tasks;
  select count(*) into e from public.onboarding_employee_tasks;
  select count(*) into h from public.staff_hr_config;
  reset role;
  perform pg_temp.t('T7  a manager at another facility reads none of it',
    t = 0 and m = 0 and e = 0 and h = 0,
    format('templates=%s manager=%s employee=%s config=%s', t, m, e, h));
exception when others then
  reset role; perform pg_temp.t('T7  cross-facility read', false, sqlerrm);
end $$;

-- ── T8: one active template per role (Decision 4) ───────────────────────────
do $$
declare v_ok boolean; v_msg text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  begin
    insert into public.onboarding_templates (facility_id, name, status, applies_to_roles)
    values ('00000000-0000-0000-0000-0000000000aa', 'Second Groomer Template', 'active',
            array['groomer', 'trainer']);
    v_ok := false;
  exception when unique_violation then v_ok := true; v_msg := sqlerrm;
  end;
  reset role;
  perform pg_temp.t('T8  a second ACTIVE template for a role is refused, and names it',
    v_ok and v_msg like '%groomer%', coalesce(v_msg, '(no error)'));
exception when others then
  reset role; perform pg_temp.t('T8  role uniqueness', false, sqlerrm);
end $$;

-- ── T9: a DRAFT for the same role is fine ───────────────────────────────────
-- The rule is about resolveTemplateForRole, which only ever looks at actives.
-- Blocking drafts would stop a manager preparing next season's checklist.
do $$
declare v_id uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  insert into public.onboarding_templates (facility_id, name, status, applies_to_roles)
  values ('00000000-0000-0000-0000-0000000000aa', 'Groomer v2 (draft)', 'draft',
          array['groomer'])
  returning id into v_id;
  reset role;
  perform pg_temp.t('T9  a DRAFT for the same role is allowed', v_id is not null);
exception when others then
  reset role; perform pg_temp.t('T9  draft allowed', false, sqlerrm);
end $$;

-- ── T10: two universal actives are refused too ──────────────────────────────
-- The partial unique index, not the trigger: an empty applies_to_roles overlaps
-- nothing, so the trigger's `&&` test cannot see it.
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  insert into public.onboarding_templates (facility_id, name, status)
  values ('00000000-0000-0000-0000-0000000000aa', 'Universal A', 'active');
  begin
    insert into public.onboarding_templates (facility_id, name, status)
    values ('00000000-0000-0000-0000-0000000000aa', 'Universal B', 'active');
    v_ok := false;
  exception when unique_violation then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T10 a second universal ACTIVE template is refused', v_ok);
exception when others then
  reset role; perform pg_temp.t('T10 universal uniqueness', false, sqlerrm);
end $$;

-- ── T11: positions are reorderable inside one transaction ───────────────────
-- The deferrable half of Decision 3. Swapping 1 and 2 duplicates a value
-- mid-statement; a non-deferrable constraint would reject the obvious UPDATE.
do $$
declare v_a integer; v_b integer; v_tpl uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  insert into public.onboarding_templates (facility_id, name, status)
  values ('00000000-0000-0000-0000-0000000000aa', 'Ordering fixture', 'draft')
  returning id into v_tpl;
  insert into public.onboarding_manager_tasks
    (template_id, facility_id, position, task_type, name, when_due)
  values (v_tpl, '00000000-0000-0000-0000-0000000000aa', 1, 'facility_tour', 'First', 'on_hire'),
         (v_tpl, '00000000-0000-0000-0000-0000000000aa', 2, 'meet_the_team', 'Second', 'on_hire');

  update public.onboarding_manager_tasks
     set position = case position when 1 then 2 else 1 end
   where template_id = v_tpl;

  select position into v_a from public.onboarding_manager_tasks
   where template_id = v_tpl and name = 'First';
  select position into v_b from public.onboarding_manager_tasks
   where template_id = v_tpl and name = 'Second';
  reset role;
  perform pg_temp.t('T11 positions can be swapped in one statement (deferrable)',
    v_a = 2 and v_b = 1, format('First=%s Second=%s', v_a, v_b));
exception when others then
  reset role; perform pg_temp.t('T11 reorder', false, sqlerrm);
end $$;

-- ── T12: "due in N days" cannot omit N ──────────────────────────────────────
do $$
declare v_ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  begin
    insert into public.onboarding_manager_tasks
      (template_id, facility_id, position, task_type, name, when_due)
    values ('00000000-0000-0000-0000-00000000a001',
            '00000000-0000-0000-0000-0000000000aa', 99, 'custom', 'Vague', 'within_days');
    v_ok := false;
  exception when check_violation then v_ok := true;
  end;
  reset role;
  perform pg_temp.t('T12 within_days without a day count is refused', v_ok);
exception when others then
  reset role; perform pg_temp.t('T12 when_days check', false, sqlerrm);
end $$;

-- ── T13: HR config — groomer reads, cannot write ────────────────────────────
do $$
declare v_days integer; v_after integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  set local role authenticated;
  select invite_expiry_days into v_days from public.staff_hr_config;
  update public.staff_hr_config set invite_expiry_days = 365
   where facility_id = '00000000-0000-0000-0000-0000000000aa';
  reset role;
  select invite_expiry_days into v_after from public.staff_hr_config
   where facility_id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.t('T13 a groomer reads HR config but cannot change it',
    v_days = 7 and v_after = 7, format('read=%s after=%s', v_days, v_after));
exception when others then
  reset role; perform pg_temp.t('T13 hr config', false, sqlerrm);
end $$;

-- ── T14: there is no DELETE policy on staff_hr_config ───────────────────────
-- Asserted rather than assumed. A facility with no config is a state nothing
-- can render, so even a manager must not be able to produce it.
do $$
declare c integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a0', true);
  set local role authenticated;
  delete from public.staff_hr_config
   where facility_id = '00000000-0000-0000-0000-0000000000aa';
  reset role;
  select count(*) into c from public.staff_hr_config
   where facility_id = '00000000-0000-0000-0000-0000000000aa';
  perform pg_temp.t('T14 not even a manager can delete the HR config', c = 1,
    format('rows=%s', c));
exception when others then
  reset role; perform pg_temp.t('T14 hr config delete', false, sqlerrm);
end $$;

-- ── T15: the seed path survives ─────────────────────────────────────────────
-- service_role has no JWT subject, so the role-uniqueness trigger returns early
-- and a seed can insert a whole catalogue without tripping over itself.
do $$
declare v_id uuid;
begin
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.onboarding_templates (facility_id, name, status, applies_to_roles)
  values ('00000000-0000-0000-0000-0000000000aa', 'Seeded duplicate', 'active',
          array['groomer'])
  returning id into v_id;
  perform pg_temp.t('T15 seeds bypass the uniqueness trigger', v_id is not null);
exception when others then
  perform pg_temp.t('T15 seed path', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
