-- ============================================================================
-- An agreement link signs without a login, and a booking waits for it. See
-- 20261002123123_an_agreement_link_signs_without_a_login.sql
--
--   bun run test:sql agreement-links
--
-- One transaction, rolled back. Synthetic facility, owner, customer, client,
-- agreements and booking, impersonated through request.jwt.claims and `set
-- local role` — never the superuser, which would bypass every policy here.
-- Each step is its own `do` block, so one failure does not erase the rest.
--
-- A1  anon may call the two link functions and nothing else of it
-- A2  staff who may edit clients record a link; the client may not
-- A3  the page by token: facility, first name, the agreements and which are
--     signed
-- A4  an unknown, short or expired token answers null
-- A5  no consent, no drawn signature where one is needed: refused
-- A6  signing stores the waiver's own text, its hash and the consent time
-- A7  signing twice adds nothing
-- A8  a booking awaiting agreements stays pending while one is unsigned
-- A9  ...and confirms itself when the last is signed by link, as anon
-- A10 a customer signing in the portal confirms their own waiting booking
-- A11 consent is frozen like the rest of a signature
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid, 'role', 'authenticated')::text end,
    true);
end $$;

create temp table state (key text primary key, value text);
grant all on state to authenticated, anon;

-- ── Fixture ────────────────────────────────────────────────────────────────

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000001a9001', 'al-owner@example.invalid'),
  ('00000000-0000-0000-0000-0000001a9003', 'al-customer@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-0000001a9001', 'al-owner@example.invalid', 'AL Owner'),
  ('00000000-0000-0000-0000-0000001a9003', 'al-customer@example.invalid', 'Rhea Okafor')
on conflict (id) do update set full_name = excluded.full_name;

insert into public.orgs (id, name, slug) values
  ('00000000-0000-0000-0000-0000001a9010', 'AL Org', 'al-org')
on conflict do nothing;

insert into public.facilities (id, org_id, name, slug, legacy_id) values
  ('00000000-0000-0000-0000-0000001a9020', '00000000-0000-0000-0000-0000001a9010',
   'Agreement Kennels', 'al-fac', 'al-fac')
on conflict do nothing;

insert into public.facility_memberships (id, facility_id, profile_id, role, is_active) values
  ('00000000-0000-0000-0000-0000001a9030', '00000000-0000-0000-0000-0000001a9020',
   '00000000-0000-0000-0000-0000001a9001', 'owner', true)
on conflict (id) do nothing;

insert into public.clients (id, facility_id, name, email, profile_id) values
  ('00000000-0000-0000-0000-0000001a9040', '00000000-0000-0000-0000-0000001a9020',
   'Rhea Okafor', 'al-c1@example.invalid', '00000000-0000-0000-0000-0000001a9003');

insert into public.pets (id, client_id, name, species) values
  ('00000000-0000-0000-0000-0000001a9050', '00000000-0000-0000-0000-0000001a9040', 'Kofi', 'dog');

-- Three agreements: one for every service, one for boarding, one for grooming
-- only (never applicable to a boarding stay).
insert into public.waivers (id, facility_id, name, services, body, requires_signature,
                            requires_digital_signature, expiry_days) values
  ('00000000-0000-0000-0000-0000001a9060', '00000000-0000-0000-0000-0000001a9020',
   'General release', '{}', 'I release the facility.', true, false, null),
  ('00000000-0000-0000-0000-0000001a9061', '00000000-0000-0000-0000-0000001a9020',
   'Boarding agreement', '{boarding}', 'Boarding terms.', true, true, 365),
  ('00000000-0000-0000-0000-0000001a9062', '00000000-0000-0000-0000-0000001a9020',
   'Grooming consent', '{grooming}', 'Grooming terms.', true, false, null);

-- A boarding stay made pending, waiting for its agreements; and a second
-- pending stay that is NOT waiting (staff left it pending for another reason).
insert into public.bookings (id, facility_id, client_id, service, service_type, status,
                             start_at, end_at, details) values
  ('00000000-0000-0000-0000-0000001a9070', '00000000-0000-0000-0000-0000001a9020',
   '00000000-0000-0000-0000-0000001a9040', 'boarding', 'Suite', 'pending',
   now() + interval '10 days', now() + interval '12 days',
   '{"awaitingAgreements": true}'::jsonb),
  ('00000000-0000-0000-0000-0000001a9071', '00000000-0000-0000-0000-0000001a9020',
   '00000000-0000-0000-0000-0000001a9040', 'boarding', 'Suite', 'pending',
   now() + interval '20 days', now() + interval '22 days', '{}'::jsonb);

-- ── A1 grants ───────────────────────────────────────────────────────────────
do $$
begin
  perform pg_temp.t('A1 anon may read a link page and sign by link',
    has_function_privilege('anon', 'public.agreement_link_by_token(text)', 'execute')
      and has_function_privilege('anon',
        'public.sign_agreement_by_token(text, uuid, text, text, text, text, boolean, text, text)',
        'execute'));
  perform pg_temp.t('A1b anon reaches no link row and no private helper',
    not has_table_privilege('anon', 'public.waiver_signing_links', 'select')
      and not has_table_privilege('anon', 'public.waiver_signing_links', 'insert')
      and not has_function_privilege('anon',
        'private.unsigned_agreement_count(uuid, uuid, text)', 'execute')
      and not has_function_privilege('anon',
        'private.hash_agreement_token(text)', 'execute'));
end $$;

-- ── A2 who records a link ──────────────────────────────────────────────────
do $$
declare v_raised boolean := false;
begin
  -- The client may not mint a link for themselves.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a9003');
  set local role authenticated;
  begin
    insert into public.waiver_signing_links
      (facility_id, client_id, token_hash, service, channel, sent_to, expires_at)
    values ('00000000-0000-0000-0000-0000001a9020',
            '00000000-0000-0000-0000-0000001a9040',
            private.hash_agreement_token('customer-made-token-0001'),
            'boarding', 'email', 'x', now() + interval '7 days');
  exception when others then
    v_raised := true;
  end;
  reset role;
  perform pg_temp.t('A2 a client cannot record a signing link', v_raised);

  -- The owner can — the hash is computed here as the route computes it.
  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a9001');
  set local role authenticated;
  insert into public.waiver_signing_links
    (facility_id, client_id, token_hash, service, channel, sent_to, expires_at)
  values ('00000000-0000-0000-0000-0000001a9020',
          '00000000-0000-0000-0000-0000001a9040',
          extensions.digest('al-live-token-0000000000000001', 'sha256'),
          'boarding', 'email', 'al-c1@example.invalid', now() + interval '7 days');
  reset role;
  perform pg_temp.t('A2b staff who may edit clients record a link', true);
exception when others then
  reset role; perform pg_temp.t('A2 recording a link', false, sqlerrm);
end $$;

-- An expired link, written directly.
insert into public.waiver_signing_links
  (facility_id, client_id, token_hash, service, channel, sent_to, created_at, expires_at)
values ('00000000-0000-0000-0000-0000001a9020', '00000000-0000-0000-0000-0000001a9040',
        extensions.digest('al-expired-token-00000000000001', 'sha256'),
        'boarding', 'sms', '+15145550100', now() - interval '9 days', now() - interval '1 day');

-- ── A3 / A4 the page ───────────────────────────────────────────────────────
do $$
declare v jsonb; v_names text; v_none boolean;
begin
  perform pg_temp.as_user(null);
  set local role anon;
  v := public.agreement_link_by_token('al-live-token-0000000000000001');
  reset role;
  select string_agg(a->>'name', ', ' order by a->>'name') into v_names
    from jsonb_array_elements(v->'agreements') a;
  perform pg_temp.t('A3 the page names the facility, the client''s first name and the boarding agreements',
    v->>'facilityName' = 'Agreement Kennels'
      and v->>'clientFirstName' = 'Rhea'
      and v_names = 'Boarding agreement, General release'
      and not exists (select 1 from jsonb_array_elements(v->'agreements') a
                       where (a->>'signed')::boolean),
    coalesce(v::text, 'null'));

  set local role anon;
  v_none := public.agreement_link_by_token('al-unknown-token-0000000000001') is null
      and public.agreement_link_by_token('short') is null
      and public.agreement_link_by_token('al-expired-token-00000000000001') is null;
  reset role;
  perform pg_temp.t('A4 unknown, short and expired tokens answer null alike', v_none);
exception when others then
  reset role; perform pg_temp.t('A3 the page', false, sqlerrm);
end $$;

-- ── A5 refusals ────────────────────────────────────────────────────────────
do $$
declare v_no_consent boolean := false; v_no_drawing boolean := false;
begin
  perform pg_temp.as_user(null);
  set local role anon;
  begin
    perform public.sign_agreement_by_token('al-live-token-0000000000000001',
      '00000000-0000-0000-0000-0000001a9060', 'Rhea Okafor', null, null, null, false);
  exception when others then v_no_consent := true;
  end;
  begin
    perform public.sign_agreement_by_token('al-live-token-0000000000000001',
      '00000000-0000-0000-0000-0000001a9061', 'Rhea Okafor', null, null, null, true);
  exception when others then v_no_drawing := true;
  end;
  reset role;
  perform pg_temp.t('A5 no consent is refused', v_no_consent);
  perform pg_temp.t('A5b an agreement that needs a drawn signature refuses a typed one',
    v_no_drawing);
end $$;

-- ── A6 / A7 / A8 signing the general release ───────────────────────────────
do $$
declare v jsonb; v_sig public.waiver_signatures; v_count int; v_status text;
begin
  perform pg_temp.as_user(null);
  set local role anon;
  v := public.sign_agreement_by_token('al-live-token-0000000000000001',
    '00000000-0000-0000-0000-0000001a9060', 'Rhea Okafor', null, null, null, true,
    '203.0.113.9', 'test-agent');
  reset role;

  select * into v_sig from public.waiver_signatures
   where client_id = '00000000-0000-0000-0000-0000001a9040'
     and waiver_id = '00000000-0000-0000-0000-0000001a9060';
  perform pg_temp.t('A6 the signature copies the waiver''s own text, its hash and the consent',
    v_sig.waiver_text = 'I release the facility.'
      and v_sig.waiver_hash = encode(extensions.digest('I release the facility.', 'sha256'), 'hex')
      and v_sig.consented_at is not null
      and v_sig.signature_name = 'Rhea Okafor'
      and (v->>'remaining')::int = 1,
    coalesce(v::text, 'null'));

  set local role anon;
  perform public.sign_agreement_by_token('al-live-token-0000000000000001',
    '00000000-0000-0000-0000-0000001a9060', 'Rhea Okafor', null, null, null, true);
  reset role;
  select count(*) into v_count from public.waiver_signatures
   where client_id = '00000000-0000-0000-0000-0000001a9040'
     and waiver_id = '00000000-0000-0000-0000-0000001a9060';
  perform pg_temp.t('A7 signing twice adds nothing', v_count = 1, v_count::text);

  select status into v_status from public.bookings
   where id = '00000000-0000-0000-0000-0000001a9070';
  perform pg_temp.t('A8 the waiting stay is still pending while the boarding agreement is unsigned',
    v_status = 'pending', v_status);
exception when others then
  reset role; perform pg_temp.t('A6 signing', false, sqlerrm);
end $$;

-- ── A9 the last agreement, by link, as anon ────────────────────────────────
do $$
declare v_waiting text; v_other text;
begin
  perform pg_temp.as_user(null);
  set local role anon;
  perform public.sign_agreement_by_token('al-live-token-0000000000000001',
    '00000000-0000-0000-0000-0000001a9061', 'Rhea Okafor',
    'data:image/png;base64,AAAA', null, null, true);
  reset role;
  select status into v_waiting from public.bookings
   where id = '00000000-0000-0000-0000-0000001a9070';
  select status into v_other from public.bookings
   where id = '00000000-0000-0000-0000-0000001a9071';
  perform pg_temp.t('A9 the waiting stay confirms itself; one not waiting is untouched',
    v_waiting = 'confirmed' and v_other = 'pending',
    format('waiting=%s other=%s', v_waiting, v_other));
exception when others then
  reset role; perform pg_temp.t('A9 confirming', false, sqlerrm);
end $$;

-- ── A10 a customer signing in the portal ───────────────────────────────────
do $$
declare v_status text;
begin
  -- A grooming appointment waiting for the grooming consent.
  insert into public.bookings (id, facility_id, client_id, service, service_type, status,
                               start_at, end_at, details)
  values ('00000000-0000-0000-0000-0000001a9072', '00000000-0000-0000-0000-0000001a9020',
          '00000000-0000-0000-0000-0000001a9040', 'grooming', 'Bath', 'pending',
          now() + interval '5 days', now() + interval '5 days 1 hour',
          '{"awaitingAgreements": true}'::jsonb);

  perform pg_temp.as_user('00000000-0000-0000-0000-0000001a9003');
  set local role authenticated;
  insert into public.waiver_signatures (facility_id, waiver_id, client_id, waiver_name,
    waiver_version, waiver_text, waiver_hash, signature_name, consented_at)
  values ('00000000-0000-0000-0000-0000001a9020', '00000000-0000-0000-0000-0000001a9062',
          '00000000-0000-0000-0000-0000001a9040', 'Grooming consent', '1.0',
          'Grooming terms.', encode(extensions.digest('Grooming terms.', 'sha256'), 'hex'),
          'Rhea Okafor', now());
  reset role;

  select status into v_status from public.bookings
   where id = '00000000-0000-0000-0000-0000001a9072';
  perform pg_temp.t('A10 a customer signing in the portal confirms their waiting appointment',
    v_status = 'confirmed', v_status);
exception when others then
  reset role; perform pg_temp.t('A10 portal signing', false, sqlerrm);
end $$;

-- ── A11 consent is frozen ───────────────────────────────────────────────────
do $$
declare v_raised boolean := false;
begin
  begin
    update public.waiver_signatures
       set revoked_at = now(), revoked_reason = 'test', consented_at = now() - interval '1 day'
     where waiver_id = '00000000-0000-0000-0000-0000001a9060'
       and client_id = '00000000-0000-0000-0000-0000001a9040';
  exception when others then v_raised := true;
  end;
  perform pg_temp.t('A11 revoking cannot rewrite when consent was given', v_raised);
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
