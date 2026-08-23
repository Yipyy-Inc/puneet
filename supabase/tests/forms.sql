-- ============================================================================
-- Forms — the frozen version, the final answers, and who reads what
-- (20260823400000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/forms.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- F3 IS THE POINT. The fixture had a version table and submissions carried a
-- `formVersionId`, and `updateForm()` rewrote the latest version IN PLACE —
-- deleting its sections, fields and logic — whether or not it was published and
-- whether or not anybody had answered it. So editing a form silently changed
-- the questions every past submission was recorded against, while the answers
-- stayed put.
--
-- A structure that LOOKS like it preserves history is worse than an obvious
-- absence of one, because nobody thinks to check it. F3 is the check.
--
-- F6 is its twin on the other side: what somebody answered cannot be rewritten
-- either, or the pair proves nothing.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
-- `serial` makes a sequence and GRANT on the table does not reach it.
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001b0001', 'fm-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0002', 'fm-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0003', 'fm-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0004', 'fm-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000001b0005', 'fm-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001b0001', 'fm-owner@example.invalid', 'FM Owner'),
  ('00000000-0000-0000-0000-0000001b0002', 'fm-recep@example.invalid', 'FM Reception'),
  ('00000000-0000-0000-0000-0000001b0003', 'fm-caretaker@example.invalid', 'FM Caretaker'),
  ('00000000-0000-0000-0000-0000001b0004', 'fm-customer@example.invalid', 'FM Customer'),
  ('00000000-0000-0000-0000-0000001b0005', 'fm-rival@example.invalid', 'FM Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001b0010', 'FM Org', 'fm-org'),
  ('00000000-0000-0000-0000-0000001b0011', 'FM Rival Org', 'fm-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001b0020', '00000000-0000-0000-0000-0000001b0010',
   'FM Kennels', 'fm-kennels', 'fm-kennels'),
  ('00000000-0000-0000-0000-0000001b0021', '00000000-0000-0000-0000-0000001b0011',
   'FM Rival', 'fm-rival', 'fm-rival')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001b0030', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001b0031', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0002', 'reception', true),
  ('00000000-0000-0000-0000-0000001b0032', '00000000-0000-0000-0000-0000001b0020',
   '00000000-0000-0000-0000-0000001b0003', 'caretaker', true),
  ('00000000-0000-0000-0000-0000001b0033', '00000000-0000-0000-0000-0000001b0021',
   '00000000-0000-0000-0000-0000001b0005', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001b0040', '00000000-0000-0000-0000-0000001b0020',
   'FM Customer', 'fm-customer@example.invalid', '00000000-0000-0000-0000-0000001b0004')
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001b0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.forms (facility_id, name, slug)
    values ('00000000-0000-0000-0000-0000001b0020', '  ', 'blank');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('F1 a form with no name cannot be created',
    state = '23514', 'state=' || state);
end $$;

do $$
begin
  insert into public.forms (id, facility_id, name, slug, status, audience)
  values ('00000000-0000-0000-0000-0000001b0050',
          '00000000-0000-0000-0000-0000001b0020',
          'Boarding Intake', 'boarding-intake', 'published', 'customer');

  insert into public.form_versions
    (id, form_id, facility_id, version_number, schema, published_at)
  values
    ('00000000-0000-0000-0000-0000001b0060',
     '00000000-0000-0000-0000-0000001b0050',
     '00000000-0000-0000-0000-0000001b0020', 1,
     '{"sections":[{"id":"s1","title":"Health","fields":[
        {"id":"f1","label":"ORIGINAL QUESTION: is your dog vaccinated?","type":"yes_no"}
      ]}]}'::jsonb,
     now());

  perform pg_temp.t('F2 a published form and its first version exist',
    (select count(*) from public.form_versions
      where form_id = '00000000-0000-0000-0000-0000001b0050') = 1, '');
end $$;

-- ── THE ASSERTION THIS SCHEMA EXISTS FOR ──────────────────────────────────

do $$
declare state text; v_schema jsonb;
begin
  begin
    update public.form_versions
       set schema = '{"sections":[{"id":"s1","title":"Health","fields":[
             {"id":"f1","label":"REWRITTEN QUESTION: do you accept all risk?","type":"yes_no"}
           ]}]}'::jsonb
     where id = '00000000-0000-0000-0000-0000001b0060';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  select schema into v_schema from public.form_versions
   where id = '00000000-0000-0000-0000-0000001b0060';

  -- The fixture's updateForm() did exactly this rewrite, in place, on the
  -- version submissions point at. Refused now, and the questions are checked
  -- afterwards rather than trusting the refusal.
  perform pg_temp.t('F3 a PUBLISHED version cannot be rewritten',
    state = '42501' and v_schema::text like '%ORIGINAL QUESTION%',
    'state=' || state || ' schema=' || left(v_schema::text, 40));
end $$;

do $$
declare v_number int;
begin
  -- The supported path: edit by publishing a NEW version. The old one stays
  -- exactly as answered.
  insert into public.form_versions
    (form_id, facility_id, version_number, schema, published_at)
  values
    ('00000000-0000-0000-0000-0000001b0050',
     '00000000-0000-0000-0000-0000001b0020', 2,
     '{"sections":[{"id":"s1","title":"Health","fields":[
        {"id":"f1","label":"REWRITTEN QUESTION: do you accept all risk?","type":"yes_no"}
      ]}]}'::jsonb,
     now());

  select count(*) into v_number from public.form_versions
   where form_id = '00000000-0000-0000-0000-0000001b0050';

  perform pg_temp.t('F4 editing is publishing a NEW version, and both survive',
    v_number = 2, 'versions=' || v_number);
end $$;

do $$
declare state text; v_schema jsonb;
begin
  -- A DRAFT is still being written and may be edited freely - that is the
  -- difference the freeze turns on, so it is asserted rather than assumed.
  insert into public.form_versions
    (id, form_id, facility_id, version_number, schema)
  values
    ('00000000-0000-0000-0000-0000001b0061',
     '00000000-0000-0000-0000-0000001b0050',
     '00000000-0000-0000-0000-0000001b0020', 3,
     '{"draft":true}'::jsonb);
  begin
    update public.form_versions set schema = '{"draft":"edited"}'::jsonb
     where id = '00000000-0000-0000-0000-0000001b0061';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select schema into v_schema from public.form_versions
   where id = '00000000-0000-0000-0000-0000001b0061';
  perform pg_temp.t('F5 an UNPUBLISHED draft can still be edited',
    state = 'ALLOWED' and v_schema::text like '%edited%',
    'state=' || state);
end $$;

-- ── The answers are the record ────────────────────────────────────────────

do $$
declare state text; v_answers jsonb;
begin
  insert into public.form_submissions
    (id, facility_id, form_version_id, form_id, client_id, answers, status)
  values
    ('00000000-0000-0000-0000-0000001b0070',
     '00000000-0000-0000-0000-0000001b0020',
     '00000000-0000-0000-0000-0000001b0060',
     '00000000-0000-0000-0000-0000001b0050',
     '00000000-0000-0000-0000-0000001b0040',
     '{"f1":"yes"}'::jsonb, 'submitted');

  begin
    update public.form_submissions set answers = '{"f1":"no"}'::jsonb
     where id = '00000000-0000-0000-0000-0000001b0070';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  select answers into v_answers from public.form_submissions
   where id = '00000000-0000-0000-0000-0000001b0070';

  perform pg_temp.t('F6 submitted answers cannot be rewritten',
    state = '42501' and v_answers->>'f1' = 'yes',
    'state=' || state || ' answers=' || v_answers::text);
end $$;

do $$
declare state text; v_status text;
begin
  begin
    update public.form_submissions set status = 'reviewed', score = 10
     where id = '00000000-0000-0000-0000-0000001b0070';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  select status into v_status from public.form_submissions
   where id = '00000000-0000-0000-0000-0000001b0070';
  -- The REVIEW STATE has to move; only the answers are fixed.
  perform pg_temp.t('F7 the review state still advances',
    state = 'ALLOWED' and v_status = 'reviewed',
    'state=' || state || ' status=' || v_status);
end $$;

do $$
declare state text;
begin
  begin
    update public.form_submissions
       set status = 'flagged',
           client_id = null
     where id = '00000000-0000-0000-0000-0000001b0070';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Reviewing must not be a way to reassign whose answers these were.
  perform pg_temp.t('F8 a submission cannot be reassigned while being reviewed',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    delete from public.form_versions
     where id = '00000000-0000-0000-0000-0000001b0060';
    state := 'DELETED';
  exception when others then state := sqlstate;
  end;
  -- `on delete restrict`: a version somebody has answered cannot be removed,
  -- because the answers would stop being readable.
  perform pg_temp.t('F9 a version with answers against it cannot be deleted',
    state = '23503', 'state=' || state);
end $$;

-- ── Who reads what ────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001b0004','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_forms int; v_versions int; v_drafts int; v_subs int;
begin
  v_forms := (select count(*) from public.forms
               where id = '00000000-0000-0000-0000-0000001b0050');
  v_versions := (select count(*) from public.form_versions
                  where id = '00000000-0000-0000-0000-0000001b0060');
  v_drafts := (select count(*) from public.form_versions
                where id = '00000000-0000-0000-0000-0000001b0061');
  v_subs := (select count(*) from public.form_submissions);

  -- A customer holds no permission at all and must see the published form and
  -- their own answers - and must NOT see a draft the facility is still writing.
  perform pg_temp.t('F10 a customer sees the published form, its version, and their own answers',
    v_forms = 1 and v_versions = 1 and v_subs = 1,
    'forms=' || v_forms || ' versions=' || v_versions || ' subs=' || v_subs);
  perform pg_temp.t('F11 a customer does NOT see an unpublished draft version',
    v_drafts = 0, 'drafts=' || v_drafts);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001b0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text; v_subs int;
begin
  v_subs := (select count(*) from public.form_submissions);
  begin
    insert into public.form_submissions
      (facility_id, form_version_id, client_id, answers)
    values ('00000000-0000-0000-0000-0000001b0020',
            '00000000-0000-0000-0000-0000001b0060',
            '00000000-0000-0000-0000-0000001b0040',
            '{"f1":"forged"}'::jsonb);
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- A caretaker holds neither `view_client_documents` nor `edit_clients`.
  perform pg_temp.t('F12 a caretaker sees no submissions and cannot file one',
    v_subs = 0 and state = '42501',
    'visible=' || v_subs || ' insert=' || state);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001b0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.forms (facility_id, name, slug)
    values ('00000000-0000-0000-0000-0000001b0020', 'Reception Form', 'reception-form');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Reception can READ a published form and file a submission, and cannot
  -- author the questions. Same split as waivers.
  perform pg_temp.t('F13 reception can read a form but not author one',
    state = '42501'
      and (select count(*) from public.forms
            where id = '00000000-0000-0000-0000-0000001b0050') = 1,
    'state=' || state);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001b0005','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('F14 another facility sees none of it',
  (select count(*) from public.forms
    where id = '00000000-0000-0000-0000-0000001b0050') = 0
  and (select count(*) from public.form_submissions) = 0,
  'forms=' || (select count(*) from public.forms
                where id = '00000000-0000-0000-0000-0000001b0050')
  || ' subs=' || (select count(*) from public.form_submissions));

-- ── An erasure request has to be able to complete ─────────────────────────

reset role;

do $$
declare state text; v_left int;
begin
  begin
    delete from public.clients where id = '00000000-0000-0000-0000-0000001b0040';
    state := 'DELETED';
  exception when others then state := sqlstate || ': ' || sqlerrm;
  end;
  v_left := (select count(*) from public.form_submissions
              where client_id = '00000000-0000-0000-0000-0000001b0040');
  -- No BEFORE DELETE trigger, for the reason the ledgers have none: it would
  -- fire on the cascade and make the client undeletable.
  perform pg_temp.t('F15 deleting a client cascades their submissions away',
    state = 'DELETED' and v_left = 0, 'state=' || state || ' left=' || v_left);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
