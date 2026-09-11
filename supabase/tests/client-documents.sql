-- ============================================================================
-- A client's files: who reads, who files, who removes, and where the bytes may
-- go (20260911111658).
--
--   bun run test:sql client-documents
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   C1  the owner files a document; it lands at the CLIENT's facility, even
--       when the insert names another
--   C2  a groomer (view_client_documents, no edit_clients) reads it
--   C3  the groomer cannot file one
--   C4  the groomer cannot remove one — zero rows, the row survives
--   C5  a caretaker (no view_client_documents) reads none of it
--   C6  another business reads none of it, and cannot file against this client
--   C7  a pet that belongs to another client is refused
--   C8  anon has no privilege on the table
--   S1  the owner CAN upload bytes under the facility's prefix (arms S2/S3)
--   S2  the groomer cannot upload bytes under it
--   S3  another business cannot upload under it, and reads no object
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
end $$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001c0001', 'cd-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0002', 'cd-groom@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0003', 'cd-care@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0004', 'cd-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001c0001', 'cd-owner@example.invalid', 'CD Owner'),
  ('00000000-0000-0000-0000-0000001c0002', 'cd-groom@example.invalid', 'CD Groomer'),
  ('00000000-0000-0000-0000-0000001c0003', 'cd-care@example.invalid', 'CD Caretaker'),
  ('00000000-0000-0000-0000-0000001c0004', 'cd-rival@example.invalid', 'CD Rival')
on conflict (id) do nothing;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001c0010', 'CD Org', 'cd-org'),
  ('00000000-0000-0000-0000-0000001c0011', 'CD Rival Org', 'cd-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0010',
   'CD Kennels', 'cd-kennels', 'cd-kennels'),
  ('00000000-0000-0000-0000-0000001c0021', '00000000-0000-0000-0000-0000001c0011',
   'CD Rival Kennels', 'cd-rival', 'cd-rival')
on conflict (id) do nothing;

insert into public.facility_memberships (facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0002', 'groomer', true),
  ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0003', 'caretaker', true),
  ('00000000-0000-0000-0000-0000001c0021', '00000000-0000-0000-0000-0000001c0004', 'owner', true)
on conflict do nothing;

insert into public.clients (id, facility_id, name, email) values
  ('00000000-0000-0000-0000-0000001c0040', '00000000-0000-0000-0000-0000001c0020',
   'CD Client', 'cd-client@example.invalid'),
  ('00000000-0000-0000-0000-0000001c0041', '00000000-0000-0000-0000-0000001c0020',
   'CD Other Client', 'cd-other@example.invalid')
on conflict (id) do nothing;

insert into public.pets (id, client_id, facility_id, name, species) values
  ('00000000-0000-0000-0000-0000001c0050', '00000000-0000-0000-0000-0000001c0040',
   '00000000-0000-0000-0000-0000001c0020', 'CD Dog', 'dog'),
  ('00000000-0000-0000-0000-0000001c0051', '00000000-0000-0000-0000-0000001c0041',
   '00000000-0000-0000-0000-0000001c0020', 'CD Other Dog', 'dog')
on conflict (id) do nothing;

-- ── C1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_facility uuid;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  begin
    insert into public.client_documents
      (id, facility_id, client_id, pet_id, doc_type, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000001c0060',
            '00000000-0000-0000-0000-0000001c0021',  -- the RIVAL, on purpose
            '00000000-0000-0000-0000-0000001c0040',
            '00000000-0000-0000-0000-0000001c0050',
            'vaccination', 'rabies.pdf', 'application/pdf', 1024,
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/a-rabies.pdf');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  select facility_id into v_facility from public.client_documents
   where id = '00000000-0000-0000-0000-0000001c0060';
  perform pg_temp.t('C1  the owner files one, and it lands at the client''s facility',
    v_state = 'inserted' and v_facility = '00000000-0000-0000-0000-0000001c0020',
    v_state || ' / facility ' || coalesce(v_facility::text, 'none'));
end $$;

-- ── C2 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  select count(*) into v_rows from public.client_documents
   where client_id = '00000000-0000-0000-0000-0000001c0040';
  reset role;
  perform pg_temp.t('C2  a groomer reads the client''s files', v_rows = 1, 'rows ' || v_rows);
end $$;

-- ── C3 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  begin
    insert into public.client_documents
      (facility_id, client_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0040',
            'x.pdf', 'application/pdf', 10,
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/b-x.pdf');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C3  a groomer cannot file a document', v_state <> 'inserted', v_state);
end $$;

-- ── C4 ────────────────────────────────────────────────────────────────────
do $$
declare v_touched int; v_left int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  delete from public.client_documents where id = '00000000-0000-0000-0000-0000001c0060';
  get diagnostics v_touched = row_count;
  reset role;
  select count(*) into v_left from public.client_documents
   where id = '00000000-0000-0000-0000-0000001c0060';
  perform pg_temp.t('C4  a groomer cannot remove one',
    v_touched = 0 and v_left = 1, 'touched ' || v_touched || ' / left ' || v_left);
end $$;

-- ── C5 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0003');
  set local role authenticated;
  select count(*) into v_rows from public.client_documents;
  reset role;
  perform pg_temp.t('C5  a caretaker reads none of it', v_rows = 0, 'rows ' || v_rows);
end $$;

-- ── C6 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int; v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0004');
  set local role authenticated;
  select count(*) into v_rows from public.client_documents
   where client_id = '00000000-0000-0000-0000-0000001c0040';
  begin
    insert into public.client_documents
      (facility_id, client_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000001c0021', '00000000-0000-0000-0000-0000001c0040',
            'steal.pdf', 'application/pdf', 10,
            '00000000-0000-0000-0000-0000001c0021/00000000-0000-0000-0000-0000001c0040/c-steal.pdf');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C6  another business reads none, and cannot file against this client',
    v_rows = 0 and v_state <> 'inserted', 'rows ' || v_rows || ' / ' || v_state);
end $$;

-- ── C7 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  begin
    insert into public.client_documents
      (facility_id, client_id, pet_id, file_name, content_type, size_bytes, storage_path)
    values ('00000000-0000-0000-0000-0000001c0020', '00000000-0000-0000-0000-0000001c0040',
            '00000000-0000-0000-0000-0000001c0051',  -- another client's dog
            'wrong.pdf', 'application/pdf', 10,
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/d-wrong.pdf');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('C7  another client''s pet is refused', v_state = '23514', v_state);
end $$;

-- ── C8 ────────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('C8  anon has no privilege on the table',
    not has_table_privilege('anon', 'public.client_documents', 'select')
    and not has_table_privilege('anon', 'public.client_documents', 'insert'),
    'anon holds a privilege');
end $$;

-- ── S1 ────────────────────────────────────────────────────────────────────
do $$
declare ok boolean := false;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0001');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('client-documents',
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/a-rabies.pdf');
    ok := true;
  exception when others then
    ok := false;
  end;
  reset role;
  perform pg_temp.t('S1  the owner CAN upload under the facility''s prefix (arms S2, S3)', ok);
end $$;

-- ── S2 ────────────────────────────────────────────────────────────────────
do $$
declare ok boolean;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0002');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('client-documents',
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/groom.pdf');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  reset role;
  perform pg_temp.t('S2  a groomer cannot upload a client''s file', ok);
end $$;

-- ── S3 ────────────────────────────────────────────────────────────────────
do $$
declare ok boolean; v_seen int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001c0004');
  set local role authenticated;
  begin
    insert into storage.objects (bucket_id, name)
    values ('client-documents',
            '00000000-0000-0000-0000-0000001c0020/00000000-0000-0000-0000-0000001c0040/steal.pdf');
    ok := false;
  exception when insufficient_privilege then ok := true; end;
  select count(*) into v_seen from storage.objects where bucket_id = 'client-documents'
     and name like '00000000-0000-0000-0000-0000001c0020/%';
  reset role;
  perform pg_temp.t('S3  another business cannot upload under the prefix, and reads no object',
    ok and v_seen = 0, 'refused ' || ok || ' / seen ' || v_seen);
end $$;

select n, name, ok, detail from tap order by n;

rollback;
