-- ============================================================================
-- Estimates: numbering, who reads and writes, and what a customer may do
-- (20260911113556).
--
--   bun run test:sql estimates
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
--   E1  the owner writes an estimate; it lands at the client's facility and is
--       numbered E10001 under the default prefix
--   E2  the next one is E10002, and a facility's own prefix and width apply
--   E3  a groomer (no view_estimates) reads none, and cannot write one
--   E4  the client's customer cannot read a DRAFT
--   E5  once sent, the customer reads it and can view it (viewed_at stamped)
--   E6  the customer accepts it through respond_to_estimate
--   E7  the customer cannot edit an estimate directly — zero rows
--   E8  another business reads none of it
--   E9  a draft can be deleted; a sent estimate cannot
--   E10 the number, token and facility do not move on update
--   E11 a pet that is not the client's is refused
--   E12 anon cannot respond to an estimate
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
  ('00000000-0000-0000-0000-0000001d0001', 'est-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0002', 'est-groom@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0003', 'est-cust@example.invalid'),
  ('00000000-0000-0000-0000-0000001d0004', 'est-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001d0001', 'est-owner@example.invalid', 'EST Owner'),
  ('00000000-0000-0000-0000-0000001d0002', 'est-groom@example.invalid', 'EST Groomer'),
  ('00000000-0000-0000-0000-0000001d0003', 'est-cust@example.invalid', 'EST Customer'),
  ('00000000-0000-0000-0000-0000001d0004', 'est-rival@example.invalid', 'EST Rival')
-- A signup trigger may have made these rows already, without a name.
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001d0010', 'EST Org', 'est-org'),
  ('00000000-0000-0000-0000-0000001d0011', 'EST Rival Org', 'est-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0010',
   'EST Kennels', 'est-kennels', 'est-kennels'),
  ('00000000-0000-0000-0000-0000001d0021', '00000000-0000-0000-0000-0000001d0011',
   'EST Rival Kennels', 'est-rival', 'est-rival')
on conflict (id) do nothing;

insert into public.facility_memberships (facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0002', 'groomer', true),
  ('00000000-0000-0000-0000-0000001d0021', '00000000-0000-0000-0000-0000001d0004', 'owner', true)
on conflict do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001d0040', '00000000-0000-0000-0000-0000001d0020',
   'EST Client', 'est-client@example.invalid', '00000000-0000-0000-0000-0000001d0003'),
  ('00000000-0000-0000-0000-0000001d0041', '00000000-0000-0000-0000-0000001d0020',
   'EST Other', 'est-other@example.invalid', null)
on conflict (id) do nothing;

insert into public.pets (id, client_id, facility_id, name, species) values
  ('00000000-0000-0000-0000-0000001d0050', '00000000-0000-0000-0000-0000001d0040',
   '00000000-0000-0000-0000-0000001d0020', 'EST Dog', 'dog'),
  ('00000000-0000-0000-0000-0000001d0051', '00000000-0000-0000-0000-0000001d0041',
   '00000000-0000-0000-0000-0000001d0020', 'EST Other Dog', 'dog')
on conflict (id) do nothing;

-- ── E1 ────────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none'; v_row record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  begin
    insert into public.estimates
      (id, facility_id, client_id, pet_ids, service, line_items, subtotal, total)
    values ('00000000-0000-0000-0000-0000001d0060',
            '00000000-0000-0000-0000-0000001d0021',  -- the rival, on purpose
            '00000000-0000-0000-0000-0000001d0040',
            array['00000000-0000-0000-0000-0000001d0050']::uuid[],
            'boarding', '[{"label":"Night","amount":55,"quantity":2,"total":110}]', 110, 110);
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate || ' ' || sqlerrm;
  end;
  reset role;
  select facility_id, estimate_number, status into v_row from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.t('E1  written at the client''s facility, numbered E10001',
    v_state = 'inserted'
      and v_row.facility_id = '00000000-0000-0000-0000-0000001d0020'
      and v_row.estimate_number = 'E10001' and v_row.status = 'draft',
    v_state || ' / ' || coalesce(v_row.estimate_number, 'none'));
end $$;

-- ── E2 ────────────────────────────────────────────────────────────────────
do $$
declare v_second text; v_third text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  insert into public.estimates (id, facility_id, client_id, service)
  values ('00000000-0000-0000-0000-0000001d0061', '00000000-0000-0000-0000-0000001d0020',
          '00000000-0000-0000-0000-0000001d0040', 'daycare');
  reset role;
  select estimate_number into v_second from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0061';

  insert into public.facility_settings (facility_id, domain, value)
  values ('00000000-0000-0000-0000-0000001d0020', 'estimate_settings',
          '{"estimateNumberPrefix":"EK-","minDigits":3}')
  on conflict (facility_id, domain) do update set value = excluded.value;

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  insert into public.estimates (id, facility_id, guest, service)
  values ('00000000-0000-0000-0000-0000001d0062', '00000000-0000-0000-0000-0000001d0020',
          '{"name":"Walk-in","email":"walkin@example.invalid"}', 'grooming');
  reset role;
  select estimate_number into v_third from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0062';
  perform pg_temp.t('E2  the next is E10002, and the facility''s own prefix applies',
    v_second = 'E10002' and v_third = 'EK-10003',
    v_second || ' / ' || v_third);
end $$;

-- ── E3 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int; v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0002');
  set local role authenticated;
  select count(*) into v_rows from public.estimates;
  begin
    insert into public.estimates (facility_id, client_id, service)
    values ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0040', 'daycare');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('E3  a groomer reads none and writes none',
    v_rows = 0 and v_state <> 'inserted', 'rows ' || v_rows || ' / ' || v_state);
end $$;

-- ── E4 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0003');
  set local role authenticated;
  select count(*) into v_rows from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  reset role;
  perform pg_temp.t('E4  the customer cannot read a draft', v_rows = 0, 'rows ' || v_rows);
end $$;

-- ── E5 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int; v_viewed timestamptz;
begin
  update public.estimates set status = 'sent', sent_at = now(), sent_via = 'link'
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0003');
  set local role authenticated;
  select count(*) into v_rows from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform public.respond_to_estimate('00000000-0000-0000-0000-0000001d0060', 'view');
  reset role;
  select viewed_at into v_viewed from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.t('E5  once sent, the customer reads it, and viewing is stamped',
    v_rows = 1 and v_viewed is not null, 'rows ' || v_rows);
end $$;

-- ── E6 ────────────────────────────────────────────────────────────────────
do $$
declare v_status text; v_by text;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0003');
  set local role authenticated;
  perform public.respond_to_estimate('00000000-0000-0000-0000-0000001d0060', 'accept');
  reset role;
  select status, accepted_by into v_status, v_by from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.t('E6  the customer accepts it, under their own name',
    v_status = 'accepted' and v_by = 'EST Customer',
    coalesce(v_status, 'none') || ' / ' || coalesce(v_by, 'nobody'));
end $$;

-- ── E7 ────────────────────────────────────────────────────────────────────
do $$
declare v_touched int; v_total numeric;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0003');
  set local role authenticated;
  update public.estimates set total = 1
   where id = '00000000-0000-0000-0000-0000001d0060';
  get diagnostics v_touched = row_count;
  reset role;
  select total into v_total from public.estimates
   where id = '00000000-0000-0000-0000-0000001d0060';
  perform pg_temp.t('E7  the customer cannot edit the price', v_touched = 0 and v_total = 110,
    'touched ' || v_touched || ' / total ' || v_total);
end $$;

-- ── E8 ────────────────────────────────────────────────────────────────────
do $$
declare v_rows int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0004');
  set local role authenticated;
  select count(*) into v_rows from public.estimates
   where facility_id = '00000000-0000-0000-0000-0000001d0020';
  reset role;
  perform pg_temp.t('E8  another business reads none of it', v_rows = 0, 'rows ' || v_rows);
end $$;

-- ── E9 ────────────────────────────────────────────────────────────────────
do $$
declare v_draft int; v_sent int;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  delete from public.estimates where id = '00000000-0000-0000-0000-0000001d0061';
  get diagnostics v_draft = row_count;
  delete from public.estimates where id = '00000000-0000-0000-0000-0000001d0060';
  get diagnostics v_sent = row_count;
  reset role;
  perform pg_temp.t('E9  a draft can be deleted, an answered estimate cannot',
    v_draft = 1 and v_sent = 0, 'draft ' || v_draft || ' / sent ' || v_sent);
end $$;

-- ── E10 ───────────────────────────────────────────────────────────────────
do $$
declare v_row record;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  update public.estimates
     set estimate_number = 'X1', token = 'guess', facility_id = '00000000-0000-0000-0000-0000001d0021',
         internal_note = 'edited'
   where id = '00000000-0000-0000-0000-0000001d0062';
  reset role;
  select estimate_number, token, facility_id, internal_note into v_row
    from public.estimates where id = '00000000-0000-0000-0000-0000001d0062';
  perform pg_temp.t('E10 number, token and facility stay; the note changes',
    v_row.estimate_number = 'EK-10003' and v_row.token <> 'guess'
      and v_row.facility_id = '00000000-0000-0000-0000-0000001d0020'
      and v_row.internal_note = 'edited',
    coalesce(v_row.estimate_number, 'none'));
end $$;

-- ── E11 ───────────────────────────────────────────────────────────────────
do $$
declare v_state text := 'none';
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001d0001');
  set local role authenticated;
  begin
    insert into public.estimates (facility_id, client_id, pet_ids, service)
    values ('00000000-0000-0000-0000-0000001d0020', '00000000-0000-0000-0000-0000001d0040',
            array['00000000-0000-0000-0000-0000001d0051']::uuid[], 'daycare');
    v_state := 'inserted';
  exception when others then
    v_state := sqlstate;
  end;
  reset role;
  perform pg_temp.t('E11 another client''s pet is refused', v_state = '23514', v_state);
end $$;

-- ── E12 ───────────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('E12 anon cannot respond to an estimate',
    not has_function_privilege('anon', 'public.respond_to_estimate(uuid, text, text)', 'execute'),
    'anon can execute');
end $$;

select n, name, ok, detail from tap order by n;

rollback;
