-- ============================================================================
-- Per-facility telephony: who may read a connection, who may write one, and
-- who may reach the auth token.
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/communication-rls.sql
--
-- ── WHY THIS FILE EXISTS BEFORE THE FEATURE DOES ───────────────────────────
--
-- `communication_connections`, `communication_numbers` and
-- `private.communication_credentials` shipped on 2026-08-09 (20260809200000)
-- and have never held a row. Provisioning is Phase 2 and is about to start
-- writing to them, which makes this the last moment the boundary can be
-- established rather than assumed — once a feature depends on a policy,
-- discovering the policy is wrong is a migration AND a rollback.
--
-- ── WHAT MAKES THIS ONE DIFFERENT FROM A READ TEST ─────────────────────────
--
-- The tables carry INSERT, UPDATE and DELETE grants to `authenticated` — the
-- Supabase default — and NO write policy. That combination is correct and it
-- looks alarming, so it gets asserted rather than explained: RLS denies a write
-- that no policy permits, whatever the grant says. Provisioning runs as
-- service_role, which bypasses RLS, and that is the whole design.
--
-- The same shape as `anon` holding SELECT on `public.clients` (debt map,
-- 2026-08-29): a grant nobody revoked, inert only because a policy says so. A
-- test is the difference between "inert" and "believed to be inert".
--
-- ── AND WHY `has_function_privilege` RATHER THAN READING THE MIGRATION ──────
--
-- A revoke naming a privilege the role does not hold SUCCEEDS SILENTLY and is
-- indistinguishable from one that worked. `revoke ... from public` and
-- `revoke ... from anon` are different grants and both are needed; 20260822610000
-- exists only because an earlier attempt named one of them. So the three RPCs
-- are asked, not read about.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to authenticated, anon;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

-- ── The grants on the three SECURITY DEFINER functions ─────────────────────
--
-- Asked of the database. Every one of these is a front door to a credential:
-- `communication_auth_token` RETURNS a facility's Twilio auth token, and
-- `store_communication_credentials` writes one.

select pg_temp.t(1, 'M1 anon cannot execute store_communication_credentials',
  not has_function_privilege('anon',
    'public.store_communication_credentials(uuid, text, text, text, text, text)',
    'EXECUTE'));

select pg_temp.t(2, 'M2 authenticated cannot execute store_communication_credentials',
  not has_function_privilege('authenticated',
    'public.store_communication_credentials(uuid, text, text, text, text, text)',
    'EXECUTE'));

-- The one that hands back a live credential. If any of these three ever
-- returns true, every facility's outbound number is someone else's to use.
select pg_temp.t(3, 'M3 anon cannot execute communication_auth_token',
  not has_function_privilege('anon',
    'public.communication_auth_token(uuid, text)', 'EXECUTE'));

select pg_temp.t(4, 'M4 authenticated cannot execute communication_auth_token',
  not has_function_privilege('authenticated',
    'public.communication_auth_token(uuid, text)', 'EXECUTE'));

select pg_temp.t(5, 'M5 anon cannot execute record_communication_connection_error',
  not has_function_privilege('anon',
    'public.record_communication_connection_error(uuid, text, text)', 'EXECUTE'));

select pg_temp.t(6, 'M6 authenticated cannot execute record_communication_connection_error',
  not has_function_privilege('authenticated',
    'public.record_communication_connection_error(uuid, text, text)', 'EXECUTE'));

-- The positive control. Six refusals prove nothing on their own — a function
-- that had been renamed would refuse everybody and pass all six.
select pg_temp.t(7, 'M7 service_role CAN execute all three (the six above are about a live boundary)',
  has_function_privilege('service_role',
    'public.store_communication_credentials(uuid, text, text, text, text, text)', 'EXECUTE')
  and has_function_privilege('service_role',
    'public.communication_auth_token(uuid, text)', 'EXECUTE')
  and has_function_privilege('service_role',
    'public.record_communication_connection_error(uuid, text, text)', 'EXECUTE'));

-- ── The credentials table is not reachable at all ──────────────────────────

select pg_temp.t(8, 'M8 anon and authenticated hold no privilege on private.communication_credentials',
  not has_table_privilege('anon', 'private.communication_credentials', 'SELECT')
  and not has_table_privilege('authenticated', 'private.communication_credentials', 'SELECT')
  and not has_table_privilege('authenticated', 'private.communication_credentials', 'INSERT')
  and not has_table_privilege('authenticated', 'private.communication_credentials', 'UPDATE')
  and not has_table_privilege('authenticated', 'private.communication_credentials', 'DELETE'));

select pg_temp.t(9, 'M9 row-level security is on for all three tables',
  (select bool_and(c.relrowsecurity)
     from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where (n.nspname, c.relname) in (
      ('public','communication_connections'),
      ('public','communication_numbers'),
      ('private','communication_credentials'))));

-- `anon` has no business here even before RLS is considered.
select pg_temp.t(10, 'M10 anon holds no SELECT on either public telephony table',
  not has_table_privilege('anon', 'public.communication_connections', 'SELECT')
  and not has_table_privilege('anon', 'public.communication_numbers', 'SELECT'));

-- ── There is no write policy, and that is the design ───────────────────────
--
-- Provisioning is service_role. A write policy would let a member of a facility
-- edit which number their calls come from.

select pg_temp.t(11, 'M11 neither table has an INSERT, UPDATE or DELETE policy',
  (select count(*) from pg_policies
    where schemaname = 'public'
      and tablename in ('communication_connections','communication_numbers')
      and cmd <> 'SELECT') = 0,
  'found: ' || coalesce((select string_agg(policyname || ' (' || cmd || ')', ', ')
     from pg_policies
    where schemaname = 'public'
      and tablename in ('communication_connections','communication_numbers')
      and cmd <> 'SELECT'), 'none'));

-- ── Two facilities, and a member of one ────────────────────────────────────

insert into public.profiles (id, email, full_name) values
  ('user_crAdmin0000000000000000000000', 'cradmin@yipyy.invalid', 'CR Admin')
on conflict (id) do nothing;

insert into public.platform_memberships (profile_id, role) values
  ('user_crAdmin0000000000000000000000', 'superadmin')
on conflict (profile_id) do nothing;

select set_config('request.jwt.claims',
  json_build_object('sub','user_crAdmin0000000000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
begin
  perform public.provision_facility('0000000e-0000-4000-8000-000000000001'::uuid,
    'Comm Alpha', 'comm-alpha', 'America/Toronto', 'CA Owner', 'caowner@alpha.invalid');
  perform public.provision_facility('0000000e-0000-4000-8000-000000000002'::uuid,
    'Comm Beta', 'comm-beta', 'America/Toronto', 'CB Owner', 'cbowner@beta.invalid');
end $$;

reset role;

-- ── A REAL MEMBER ─────────────────────────────────────────────────────────
--
-- `provision_facility` creates the facility and invites the owner; it does NOT
-- leave an active membership behind (measured: memberships=0 immediately
-- after). Relying on it silently gave this file a session with `sub` null,
-- which reads nothing — and a "cannot read another facility" assertion that
-- passed because it could not read ANYTHING. The positive control is what
-- caught it.
-- The facility ids, captured while RLS is bypassed.
--
-- `provision_facility`'s first argument is `p_request_id` — an idempotency key,
-- not the facility id, which is generated. And a session under RLS cannot
-- SELECT a facility it is not a member of, so later statements cannot look one
-- up: a temp table is how the ids reach them without granting visibility that
-- would undermine what is being tested.
create temp table ids (slug text primary key, id uuid);
grant all on ids to authenticated, anon;
insert into ids (slug, id)
select slug, id from public.facilities where slug in ('comm-alpha', 'comm-beta');

insert into public.profiles (id, email, full_name) values
  ('user_crAlpha0000000000000000000000', 'cralpha@yipyy.invalid', 'CR Alpha')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_crAlpha0000000000000000000000', id, 'owner', true
  from ids where slug = 'comm-alpha'
on conflict do nothing;

-- Seeded as service_role would: RLS bypassed, which is the only path that
-- exists for these rows.
insert into public.communication_connections
  (facility_id, provider, subaccount_sid, status, connected_at)
select id, 'twilio', 'AC' || repeat('a', 32), 'connected', now()
  from public.facilities where slug = 'comm-alpha';

insert into public.communication_connections
  (facility_id, provider, subaccount_sid, status, connected_at)
select id, 'twilio', 'AC' || repeat('b', 32), 'connected', now()
  from public.facilities where slug = 'comm-beta';

insert into public.communication_numbers
  (facility_id, provider, phone_number, number_sid, voice_enabled, sms_enabled)
select id, 'twilio', '+15145550111', 'PN' || repeat('a', 32), true, true
  from public.facilities where slug = 'comm-alpha';

insert into public.communication_numbers
  (facility_id, provider, phone_number, number_sid, voice_enabled, sms_enabled)
select id, 'twilio', '+15145550222', 'PN' || repeat('b', 32), true, true
  from public.facilities where slug = 'comm-beta';

-- ── Alpha's owner ──────────────────────────────────────────────────────────

select set_config('request.jwt.claims',
  json_build_object('sub','user_crAlpha0000000000000000000000','role','authenticated')::text,
  true);
set local role authenticated;

select pg_temp.t(12, 'M12 a member reads their own facility''s connection',
  (select count(*) from public.communication_connections c
     join public.facilities f on f.id = c.facility_id
    where f.slug = 'comm-alpha') = 1);

-- The assertion that matters. The positive above is what makes it meaningful:
-- zero rows because the policy works, not zero rows because nothing was seeded.
select pg_temp.t(13, 'M13 and CANNOT read another facility''s connection',
  (select count(*) from public.communication_connections c
     join public.facilities f on f.id = c.facility_id
    where f.slug = 'comm-beta') = 0);

select pg_temp.t(14, 'M14 a member reads their own facility''s numbers, and only those',
  (select count(*) from public.communication_numbers) = 1
  and (select count(*) from public.communication_numbers
        where phone_number = '+15145550111') = 1);

-- ── And cannot write, despite holding the grant ────────────────────────────

-- VALUES, not INSERT..SELECT, and the id is a literal.
--
-- The first version of this selected the facility id in the same statement.
-- Under RLS that subquery returns no rows for a session that cannot see the
-- facility, so the insert inserted NOTHING, raised NOTHING, and this test
-- reported "INSERTED" — reading a no-op as a success. That is precisely the
-- defect `check:rls-writes` exists to catch in the API layer, written into the
-- test meant to prove the boundary. Row count is asserted as well as the
-- exception, so neither outcome can be mistaken for the other.
do $$
declare state text; n int := -1;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, number_sid, voice_enabled)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550999', 'PN' || repeat('z', 32), true);
    get diagnostics n = row_count;
    state := 'INSERTED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(15,
    'M15 a member cannot INSERT a number for their own facility',
    state = '42501' and n = -1, 'state=' || state || ' rows=' || n);
end $$;

do $$
declare n int;
begin
  update public.communication_numbers set phone_number = '+15145550000'
   where phone_number = '+15145550111';
  get diagnostics n = row_count;
  -- No UPDATE policy means the row is not visible to the update at all, so this
  -- reports zero rather than raising. Silence is the refusal, which is exactly
  -- why `check:rls-writes` exists for the API layer.
  perform pg_temp.t(16,
    'M16 a member''s UPDATE of their own number changes nothing',
    n = 0, 'rows=' || n);
end $$;

do $$
declare n int;
begin
  delete from public.communication_connections;
  get diagnostics n = row_count;
  perform pg_temp.t(17, 'M17 and a DELETE removes nothing', n = 0, 'rows=' || n);
end $$;

-- ── The credentials table, from a session ──────────────────────────────────

do $$
declare state text;
begin
  begin
    perform 1 from private.communication_credentials;
    state := 'READ';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(18,
    'M18 a member cannot read private.communication_credentials at all',
    state = '42501', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    perform public.communication_auth_token(
      (select id from public.facilities where slug = 'comm-alpha'), 'twilio');
    state := 'CALLED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(19,
    'M19 and cannot call the RPC that returns one',
    state = '42501', 'state=' || state);
end $$;

reset role;

-- ── The lifecycle constraints (20260901231203) ─────────────────────────────
--
-- Seeded as the migration role, because these are shape rules rather than
-- authorisation rules and provisioning writes them as service_role.

do $$
declare state text;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, status)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550777', 'provisioning');
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  -- The opening move of provisioning: a number whose capabilities are not yet
  -- known. The original `communication_number_does_something` refused exactly
  -- this, which would have made the flow impossible to start.
  perform pg_temp.t(20,
    'M20 a provisioning row may have no capabilities yet',
    state = 'ACCEPTED', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, status)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550778', 'active');
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  -- And the rule still bites where it was doing the work. Without this, M20
  -- would read as "the constraint was deleted".
  perform pg_temp.t(21,
    'M21 but an ACTIVE row with no capabilities is still refused',
    state = '23514', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, status, voice_enabled)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550779', 'released', true);
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(22,
    'M22 released and released_at cannot disagree',
    state = '23514', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, status, voice_enabled, is_primary)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550780', 'active', true, true),
           ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550781', 'active', true, true);
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(23,
    'M23 a facility cannot have two primary numbers',
    state = '23505', 'state=' || state);
end $$;

do $$
declare state text;
begin
  begin
    insert into public.communication_numbers
      (facility_id, provider, phone_number, status, voice_enabled, is_primary)
    values ((select id from ids where slug = 'comm-alpha'), 'twilio',
            '+15145550782', 'active', true, true);
    state := 'ACCEPTED';
  exception when others then state := sqlstate;
  end;
  -- The control for M23: the index is PARTIAL, so many non-primary numbers
  -- coexist and exactly one primary is allowed. A plain unique index on
  -- (facility_id, is_primary) would have permitted one non-primary number too,
  -- and M23 alone cannot tell the two shapes apart.
  perform pg_temp.t(24,
    'M24 and one primary alongside several non-primaries is fine',
    state = 'ACCEPTED', 'state=' || state);
end $$;

-- ── Report ─────────────────────────────────────────────────────────────────

select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
