-- ============================================================================
-- Waivers — the copy, the immutability, and who may read what (20260823300000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/waivers.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ────────────────────────────────────────
--
-- 1. W2 IS THE WHOLE POINT. A signature copies the text it was given and the
--    facility can edit the waiver afterwards. If editing the document changed
--    what somebody is recorded as having agreed to, the record would be worth
--    nothing in the only situation it matters. The fixture this replaces stored
--    a POINTER (`waiverId`) and no copy, so it had exactly that defect.
--
-- 2. READING IS WIDER THAN MANAGING (W7/W9). `view_waivers` is held by owner,
--    admin and manager only - reception does not have it, and reception is who
--    hands the tablet over at check-in. A customer holds no permission at all
--    and still has to read what they sign. If those two ever start failing, the
--    product has stopped being able to take a waiver at the front desk.
--
-- 3. AN ERASURE REQUEST MUST STILL COMPLETE (W12). The signature is append-only,
--    and an append-only table with a BEFORE DELETE guard makes everything above
--    it undeletable - which is what `audit_log` did to facilities
--    (20260822500000). So there is no delete trigger, and this proves the
--    cascade from `clients` really works rather than assuming it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;
-- `serial` makes a sequence and GRANT on the table does not reach it; without
-- this every assertion under `set local role authenticated` dies with
-- "permission denied for sequence tap_n_seq" and the file reports one ERROR
-- instead of one failing assertion.
grant usage, select on sequence tap_n_seq to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

-- ── Fixture ───────────────────────────────────────────────────────────────
--
-- An owner (manages waivers), a receptionist (no `view_waivers`, but must be
-- able to read and to capture one), a caretaker (neither), a customer, a second
-- customer, and a rival at another facility.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001a0001', 'wv-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0002', 'wv-recep@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0003', 'wv-caretaker@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0004', 'wv-customer@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0005', 'wv-other@example.invalid'),
  ('00000000-0000-0000-0000-0000001a0006', 'wv-rival@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001a0001', 'wv-owner@example.invalid', 'WV Owner'),
  ('00000000-0000-0000-0000-0000001a0002', 'wv-recep@example.invalid', 'WV Reception'),
  ('00000000-0000-0000-0000-0000001a0003', 'wv-caretaker@example.invalid', 'WV Caretaker'),
  ('00000000-0000-0000-0000-0000001a0004', 'wv-customer@example.invalid', 'WV Customer'),
  ('00000000-0000-0000-0000-0000001a0005', 'wv-other@example.invalid', 'WV Other'),
  ('00000000-0000-0000-0000-0000001a0006', 'wv-rival@example.invalid', 'WV Rival')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001a0010', 'WV Org', 'wv-org'),
  ('00000000-0000-0000-0000-0000001a0011', 'WV Rival Org', 'wv-rival-org')
on conflict (id) do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001a0020', '00000000-0000-0000-0000-0000001a0010',
   'WV Kennels', 'wv-kennels', 'wv-kennels'),
  ('00000000-0000-0000-0000-0000001a0021', '00000000-0000-0000-0000-0000001a0011',
   'WV Rival Kennels', 'wv-rival-kennels', 'wv-rival-kennels')
on conflict (id) do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001a0030', '00000000-0000-0000-0000-0000001a0020',
   '00000000-0000-0000-0000-0000001a0001', 'owner', true),
  ('00000000-0000-0000-0000-0000001a0031', '00000000-0000-0000-0000-0000001a0020',
   '00000000-0000-0000-0000-0000001a0002', 'reception', true),
  ('00000000-0000-0000-0000-0000001a0032', '00000000-0000-0000-0000-0000001a0020',
   '00000000-0000-0000-0000-0000001a0003', 'caretaker', true),
  ('00000000-0000-0000-0000-0000001a0033', '00000000-0000-0000-0000-0000001a0021',
   '00000000-0000-0000-0000-0000001a0006', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001a0040', '00000000-0000-0000-0000-0000001a0020',
   'WV Customer', 'wv-customer@example.invalid', '00000000-0000-0000-0000-0000001a0004'),
  ('00000000-0000-0000-0000-0000001a0041', '00000000-0000-0000-0000-0000001a0020',
   'WV Other', 'wv-other@example.invalid', '00000000-0000-0000-0000-0000001a0005')
on conflict (id) do nothing;

-- ── As the owner ──────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0001','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.waivers (facility_id, name, body)
    values ('00000000-0000-0000-0000-0000001a0020', 'Empty', '   ');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- A waiver with no text is a document that LOOKS like proof and is not one.
  perform pg_temp.t('W1 a waiver with no text cannot be created',
    state = '23514', 'state=' || state);
end $$;

do $$
declare v_id uuid;
begin
  insert into public.waivers
    (id, facility_id, name, body, version, services, expiry_days)
  values
    ('00000000-0000-0000-0000-0000001a0050',
     '00000000-0000-0000-0000-0000001a0020',
     'Boarding Liability Waiver',
     'THE ORIGINAL TEXT. The owner accepts all risk of injury.',
     '1.0', array['boarding'], 365)
  returning id into v_id;
  perform pg_temp.t('W0 the owner can publish a waiver', v_id is not null, '');
end $$;

-- ── THE ASSERTION THIS TABLE EXISTS FOR ───────────────────────────────────

do $$
declare v_sig_text text; v_hash text; v_now_text text;
begin
  -- Signed against the text as it stands. The route hashes server-side; here
  -- the same thing is done inline so the assertion is about the STORAGE.
  insert into public.waiver_signatures (
    facility_id, waiver_id, client_id,
    waiver_name, waiver_version, waiver_text, waiver_hash,
    signature_name, signed_by, expires_at
  )
  select w.facility_id, w.id, '00000000-0000-0000-0000-0000001a0040',
         w.name, w.version, w.body,
         encode(extensions.digest(w.body, 'sha256'), 'hex'),
         'WV Customer', '00000000-0000-0000-0000-0000001a0001',
         now() + make_interval(days => w.expiry_days)
    from public.waivers w
   where w.id = '00000000-0000-0000-0000-0000001a0050';

  -- The facility then rewrites the document, as it is entitled to.
  update public.waivers
     set body = 'THE REWRITTEN TEXT. The facility accepts all risk instead.',
         version = '2.0'
   where id = '00000000-0000-0000-0000-0000001a0050';

  select waiver_text, waiver_hash into v_sig_text, v_hash
    from public.waiver_signatures
   where waiver_id = '00000000-0000-0000-0000-0000001a0050';

  select body into v_now_text from public.waivers
   where id = '00000000-0000-0000-0000-0000001a0050';

  -- THE POINT. The fixture stored `waiverId` and a name, so this edit would
  -- have silently changed what the customer is recorded as having agreed to.
  perform pg_temp.t('W2 editing the waiver does NOT change what was signed',
    v_sig_text like 'THE ORIGINAL TEXT.%'
      and v_now_text like 'THE REWRITTEN TEXT.%'
      and v_hash = encode(extensions.digest(v_sig_text, 'sha256'), 'hex'),
    'signed=' || left(v_sig_text, 20) || ' now=' || left(v_now_text, 20));
end $$;

-- ── Immutability, with exactly one door ───────────────────────────────────

do $$
declare state text;
begin
  begin
    update public.waiver_signatures set signature_name = 'Somebody Else'
     where waiver_id = '00000000-0000-0000-0000-0000001a0050';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t('W3 a signature cannot be edited',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    update public.waiver_signatures
       set revoked_at = now(), revoked_reason = null
     where waiver_id = '00000000-0000-0000-0000-0000001a0050';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Revoking without saying why is unauditable, so the CHECK refuses it.
  perform pg_temp.t('W4 revoking without a reason is refused',
    state = '23514', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    update public.waiver_signatures
       set revoked_at = now(), revoked_reason = 'Withdrawn',
           waiver_text = 'SOMETHING ELSE ENTIRELY'
     where waiver_id = '00000000-0000-0000-0000-0000001a0050';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- The one permitted change must not be a way to smuggle another one in
  -- alongside it. This is the assertion that makes the door narrow.
  perform pg_temp.t('W5 revoking cannot carry another change with it',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text; v_revoked timestamptz;
begin
  update public.waiver_signatures
     set revoked_at = now(), revoked_reason = 'Consent withdrawn by customer',
         revoked_by = '00000000-0000-0000-0000-0000001a0001'
   where waiver_id = '00000000-0000-0000-0000-0000001a0050';

  select revoked_at into v_revoked from public.waiver_signatures
   where waiver_id = '00000000-0000-0000-0000-0000001a0050';

  begin
    update public.waiver_signatures
       set revoked_at = now(), revoked_reason = 'Again'
     where waiver_id = '00000000-0000-0000-0000-0000001a0050';
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;

  perform pg_temp.t('W6 a signature revokes once, and not twice',
    v_revoked is not null and state = '42501',
    'revoked=' || coalesce(v_revoked::text, 'null') || ' second=' || state);
end $$;

-- ── Reading is wider than managing ────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0002','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_can_manage boolean; v_view boolean; v_visible int; state text;
begin
  v_view := private.has_permission(
    '00000000-0000-0000-0000-0000001a0020'::uuid, 'view_waivers');
  v_can_manage := private.has_permission(
    '00000000-0000-0000-0000-0000001a0020'::uuid, 'settings_manage_forms');
  v_visible := (select count(*) from public.waivers
                 where id = '00000000-0000-0000-0000-0000001a0050');

  -- Reception holds NEITHER permission and must still be able to read the
  -- document, because reception is who hands the tablet across the counter.
  perform pg_temp.t('W7 reception reads an active waiver WITHOUT view_waivers',
    v_view = false and v_can_manage = false and v_visible = 1,
    'view_waivers=' || v_view || ' manage=' || v_can_manage || ' visible=' || v_visible);

  begin
    insert into public.waivers (facility_id, name, body)
    values ('00000000-0000-0000-0000-0000001a0020', 'Reception Waiver', 'Text');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- Reading it is not authoring it. The legal text is owner/admin/manager.
  perform pg_temp.t('W8 reception cannot publish a waiver',
    state = '42501', 'state=' || state);
end $$;

-- ── The customer ──────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0004','role','authenticated')::text, true);
set local role authenticated;

do $$
declare v_active int; v_retired int;
begin
  v_active := (select count(*) from public.waivers
                where id = '00000000-0000-0000-0000-0000001a0050');
  perform pg_temp.t('W9 a customer can read the active waiver they must sign',
    v_active = 1, 'visible=' || v_active);

  -- A customer holds no permission of any kind, so if this ever returns 0 the
  -- product cannot show somebody what they are agreeing to.
  v_retired := (select count(*) from public.waiver_signatures
                 where client_id = '00000000-0000-0000-0000-0000001a0040');
  perform pg_temp.t('W10 a customer sees their own signature',
    v_retired = 1, 'own=' || v_retired);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0005','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('W11 a customer does NOT see another customer''s signature',
  (select count(*) from public.waiver_signatures) = 0,
  'visible=' || (select count(*) from public.waiver_signatures));

-- ── A caretaker holds neither client-document permission ──────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0003','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.waiver_signatures (
      facility_id, client_id, waiver_name, waiver_version,
      waiver_text, waiver_hash, signature_name
    ) values (
      '00000000-0000-0000-0000-0000001a0020',
      '00000000-0000-0000-0000-0000001a0040',
      'Boarding Liability Waiver', '1.0', 'Anything', 'deadbeef', 'Forged'
    );
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  -- `edit_clients`, not `view_client_documents`: a VIEW permission must not
  -- authorise a WRITE, and a caretaker holds neither.
  perform pg_temp.t('W12 a caretaker cannot record a signature for somebody',
    state = '42501', 'state=' || state);
end $$;

-- ── The rival ─────────────────────────────────────────────────────────────

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','00000000-0000-0000-0000-0000001a0006','role','authenticated')::text, true);
set local role authenticated;

select pg_temp.t('W13 another facility sees neither the waiver nor the signature',
  (select count(*) from public.waivers
    where id = '00000000-0000-0000-0000-0000001a0050') = 0
  and (select count(*) from public.waiver_signatures) = 0,
  'waivers=' || (select count(*) from public.waivers
                  where id = '00000000-0000-0000-0000-0000001a0050')
  || ' sigs=' || (select count(*) from public.waiver_signatures));

-- ── An erasure request has to be able to complete ─────────────────────────

reset role;

do $$
declare state text; v_left int;
begin
  begin
    delete from public.clients where id = '00000000-0000-0000-0000-0000001a0040';
    state := 'DELETED';
  exception when others then state := sqlstate || ': ' || sqlerrm;
  end;
  v_left := (select count(*) from public.waiver_signatures
              where client_id = '00000000-0000-0000-0000-0000001a0040');
  -- The signature is append-only, and an append-only table with a BEFORE DELETE
  -- guard makes everything above it undeletable - which is exactly what
  -- audit_log did to facilities. There is no delete trigger, so the cascade
  -- runs. Asserted rather than assumed, because the failure mode is silent
  -- until somebody tries to honour an erasure request.
  perform pg_temp.t('W14 deleting a client cascades the signature away',
    state = 'DELETED' and v_left = 0, 'state=' || state || ' left=' || v_left);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
