-- ============================================================================
-- training_notes: a trainer's note is a row (see the migration of that name).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/training-notes.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  The facility and the owner come from the PET — a caller naming another
--     facility gets the pet's anyway.
-- T2  An alert is lifted with a reason or not at all.
-- T3  One pinned note per pet.
-- T4  Somebody else's facility can neither read nor write.
-- T5  The pet's owner reads a shared note and not a private one.
-- T6  anon holds nothing.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001d0001', 'tn-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0002', 'tn-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0003', 'tn-client@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001d0001', 'tn-owner@example.invalid', 'Owner'),
  ('00000000-0000-0000-0000-0000001d0002', 'tn-other@example.invalid', 'Other'),
  ('00000000-0000-0000-0000-0000001d0003', 'tn-client@example.invalid', 'Client')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001d0010', 'TN Org', 'tn-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0010',
   'Academy', 'tn-a', 'tn-a'),
  ('00000000-0000-0000-0000-0000001d0021', '00000000-0000-0000-0000-0000001d0010',
   'Elsewhere', 'tn-b', 'tn-b')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001d0030', '00000000-0000-0000-0000-0000001d0020',
   '00000000-0000-0000-0000-0000001d0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001d0031', '00000000-0000-0000-0000-0000001d0021',
   '00000000-0000-0000-0000-0000001d0002', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001d0040', '00000000-0000-0000-0000-0000001d0020',
   'Guest One', 'tn-c1@example.invalid', '00000000-0000-0000-0000-0000001d0003');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001d0050', '00000000-0000-0000-0000-0000001d0040', 'Rex', 'dog');

-- ── T1  facility and owner from the pet ─────────────────────────────────────
do $$
declare v_facility uuid; v_client uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  -- The caller names the WRONG facility; the trigger replaces it.
  insert into public.training_notes (id, facility_id, pet_id, category, body, is_private)
  values ('00000000-0000-0000-0000-0000001d0060', '00000000-0000-0000-0000-0000001d0021',
          '00000000-0000-0000-0000-0000001d0050', 'progress', 'Sits on cue.', false);
  insert into public.training_notes (id, facility_id, pet_id, category, body, is_private, is_active_alert)
  values ('00000000-0000-0000-0000-0000001d0061', '00000000-0000-0000-0000-0000001d0020',
          '00000000-0000-0000-0000-0000001d0050', 'concern', 'Reactive to bikes.', true, true);
  reset role;
  select facility_id, client_id into v_facility, v_client
    from public.training_notes where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.t('T1  the pet decides the facility and the owner',
    v_facility = '00000000-0000-0000-0000-0000001d0020'
      and v_client = '00000000-0000-0000-0000-0000001d0040',
    format('facility=%s client=%s', v_facility, v_client));
exception when others then
  reset role; perform pg_temp.t('T1  insert', false, sqlerrm);
end $$;

-- ── T2  a lift needs a reason ───────────────────────────────────────────────
do $$
declare v_blank boolean := false; v_ok boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  begin
    update public.training_notes set deactivated_at = now()
     where id = '00000000-0000-0000-0000-0000001d0061';
  exception when check_violation then v_blank := true; end;
  update public.training_notes
     set deactivated_at = now(), deactivation_reason = 'Calm for three weeks.'
   where id = '00000000-0000-0000-0000-0000001d0061';
  v_ok := found;
  reset role;
  perform pg_temp.t('T2  an alert is lifted with a reason or not at all',
    v_blank and v_ok, format('blank refused=%s with reason=%s', v_blank, v_ok));
exception when others then
  reset role; perform pg_temp.t('T2  lift', false, sqlerrm);
end $$;

-- ── T3  one pin per pet ─────────────────────────────────────────────────────
do $$
declare v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  update public.training_notes set is_pinned = true, pinned_at = now()
   where id = '00000000-0000-0000-0000-0000001d0060';
  begin
    update public.training_notes set is_pinned = true, pinned_at = now()
     where id = '00000000-0000-0000-0000-0000001d0061';
  exception when unique_violation then v_refused := true; end;
  reset role;
  perform pg_temp.t('T3  a second pin on the same pet is refused', v_refused);
exception when others then
  reset role; perform pg_temp.t('T3  pin', false, sqlerrm);
end $$;

-- ── T4  another facility sees nothing and writes nothing ────────────────────
do $$
declare v_seen integer; v_refused boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0002');
  set local role authenticated;
  select count(*) into v_seen from public.training_notes
   where pet_id = '00000000-0000-0000-0000-0000001d0050';
  begin
    insert into public.training_notes (facility_id, pet_id, category, body)
    values ('00000000-0000-0000-0000-0000001d0021',
            '00000000-0000-0000-0000-0000001d0050', 'general', 'Not my dog.');
  exception when insufficient_privilege then v_refused := true; end;
  reset role;
  perform pg_temp.t('T4  another facility neither reads nor writes',
    v_seen = 0 and v_refused, format('seen=%s refused=%s', v_seen, v_refused));
exception when others then
  reset role; perform pg_temp.t('T4  stranger', false, sqlerrm);
end $$;

-- ── T5  the owner reads what is shared ──────────────────────────────────────
do $$
declare v_shared integer; v_private integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0003');
  set local role authenticated;
  select count(*) filter (where not is_private), count(*) filter (where is_private)
    into v_shared, v_private
    from public.training_notes where pet_id = '00000000-0000-0000-0000-0000001d0050';
  reset role;
  perform pg_temp.t('T5  the owner reads the shared note, not the private one',
    v_shared = 1 and v_private = 0, format('shared=%s private=%s', v_shared, v_private));
exception when others then
  reset role; perform pg_temp.t('T5  owner', false, sqlerrm);
end $$;

-- ── T6  anon ────────────────────────────────────────────────────────────────
select pg_temp.t('T6  anon holds nothing on training_notes',
  not has_table_privilege('anon', 'public.training_notes', 'select')
    and not has_table_privilege('anon', 'public.training_notes', 'insert')
    and not has_function_privilege('anon', 'private.training_note_from_pet()', 'execute'));

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
