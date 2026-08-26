-- ============================================================================
-- The waitlist is a sales list, and only Yipyy reads it (20260826130000).
--
--   psql "$SUPABASE_DB_URL" -f supabase/tests/waitlist-signups.sql
--
-- One transaction, rolled back. Fixture emails are @example.invalid.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- 1. IT IS THE ONE PUBLIC WRITE PATH IN THE APPLICATION (W1-W4). Every other
--    route refuses an anonymous caller; the coming-soon form cannot, because
--    the visitor has no account. So the protection is not a session — it is
--    that `anon` holds NOTHING on this table and there is no insert policy for
--    anybody. If a later migration hands `anon` a grant "so the form works",
--    these are the assertions that say what was actually opened.
--
--    The tempting shortcut is a SECURITY DEFINER function granted to `anon`,
--    which is precisely the shape `rpc-session-required.sql` was written to
--    forbid after two shipped RPCs turned out to be reachable from the
--    publishable key in every browser bundle. `POST /api/waitlist` writes with
--    the service role instead.
--
-- 2. EVERY SIGNED-IN USER IS NOT A PLATFORM ADMIN (W5/W6). `authenticated` is
--    every customer and every staff member at every facility. The read policy
--    is `private.is_platform_admin()` and nothing else — there is no facility
--    column here to scope by, because these rows belong to Yipyy rather than to
--    any tenant. W6 is the positive control: without it, a table nobody could
--    read at all would pass W5 and look perfectly configured.
--
-- 3. THE WRITE LOCK IS TWO LOCKS (W3/W7). RLS with no INSERT policy already
--    refuses, and the GRANT is revoked as well. Asserted separately against
--    `has_table_privilege`, because a revoke is not verified by having been
--    written — and because a future `grant all on all tables to authenticated`
--    would silently restore one of the two.
--
-- 4. ONE ROW PER EMAIL, CASE-INSENSITIVELY (W8/W9). The route answers a
--    duplicate as SUCCESS rather than as a conflict, which is only honest if
--    the second submission really did leave the person on the list once. If
--    the unique index were ever dropped, the route would start silently
--    creating duplicate leads instead of erroring — so the index is the thing
--    under test, not the route's handling of it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_uid uuid) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    case when p_uid is null then ''
         else json_build_object('sub', p_uid::text,
                                'role', 'authenticated')::text end,
    true);
end $$;

-- ── Fixtures: one ordinary signed-in person, one platform admin ────────────
--
-- `profiles.id` is TEXT, not uuid — it holds the WorkOS subject
-- (`user_01M07...`) since ADR 0004. The ids below are uuid-SHAPED strings only
-- because `auth.users.id` really is a uuid and the JWT `sub` has to match both.
-- Writing `'...'::uuid` here is what the first draft did, and Postgres answers
-- `operator does not exist: text = uuid`.

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000019f001', 'wl-ordinary@example.invalid'),
  ('00000000-0000-0000-0000-00000019f002', 'wl-admin@example.invalid')
on conflict (id) do nothing;

insert into public.profiles (id, email, full_name) values
  ('00000000-0000-0000-0000-00000019f001', 'wl-ordinary@example.invalid', 'Ordinary'),
  ('00000000-0000-0000-0000-00000019f002', 'wl-admin@example.invalid', 'Admin')
on conflict (id) do update set full_name = excluded.full_name;

-- ── The rows under test, written as the owner (service-role equivalent) ────

insert into public.waitlist_signups (facility_name, contact_name, email, phone)
values ('Pawradise', 'Sam Doe', 'wl-lead@example.invalid', '+1 514 555 0100');

-- ── W1-W4: anon holds nothing ──────────────────────────────────────────────

do $$
begin
  perform pg_temp.t('W1 anon cannot SELECT the waitlist',
    not has_table_privilege('anon', 'public.waitlist_signups', 'SELECT'), '');

  perform pg_temp.t('W2 anon cannot INSERT into the waitlist',
    not has_table_privilege('anon', 'public.waitlist_signups', 'INSERT'), '');

  perform pg_temp.t('W3 authenticated cannot INSERT — the grant is gone',
    not has_table_privilege('authenticated', 'public.waitlist_signups', 'INSERT'), '');

  perform pg_temp.t('W4 authenticated cannot UPDATE or DELETE a lead',
    not has_table_privilege('authenticated', 'public.waitlist_signups', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.waitlist_signups', 'DELETE'), '');
end $$;

-- ── W5/W6: only a platform admin reads it ──────────────────────────────────

do $$
declare v_seen integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000019f001');
  set local role authenticated;
  select count(*) into v_seen from public.waitlist_signups;
  reset role;

  perform pg_temp.t('W5 an ordinary signed-in user sees no leads',
    v_seen = 0, format('saw %s', v_seen));
end $$;

-- ── A PLATFORM ADMIN IS A MEMBERSHIP, NOT A FLAG ──────────────────────────
--
-- `private.is_platform_admin()` reads `platform_memberships` by the JWT `sub`.
-- Setting a `profiles.is_platform_admin` column — which is what the first draft
-- tried — changes nothing the policy looks at, so W6 would have failed while
-- the table was in fact configured correctly.
insert into public.platform_memberships (profile_id, role) values
  ('00000000-0000-0000-0000-00000019f002', 'superadmin')
on conflict (profile_id) do nothing;

do $$
declare v_seen integer;
begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000019f002');
  set local role authenticated;
  select count(*) into v_seen from public.waitlist_signups;
  reset role;

  -- The positive control. Without it, a table nobody can read passes W5 and
  -- looks correctly locked rather than merely broken.
  perform pg_temp.t('W6 a platform admin does see them — the lock is not a wall',
    v_seen > 0, format('saw %s', v_seen));
end $$;

-- ── W7: RLS is on AND forced ───────────────────────────────────────────────

do $$
declare v_on boolean; v_forced boolean;
begin
  select c.relrowsecurity, c.relforcerowsecurity into v_on, v_forced
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'waitlist_signups';

  perform pg_temp.t('W7 row level security is enabled and FORCED',
    v_on and v_forced, format('enabled=%s forced=%s', v_on, v_forced));
end $$;

-- ── W8/W9: one row per email, whatever the casing ──────────────────────────

do $$
declare v_failed boolean := false;
begin
  begin
    insert into public.waitlist_signups (facility_name, contact_name, email)
    values ('Pawradise Again', 'Sam Doe', 'WL-LEAD@example.invalid');
  exception when unique_violation then
    v_failed := true;
  end;

  perform pg_temp.t('W8 the same email in different casing is refused',
    v_failed, '');
end $$;

do $$
declare v_rows integer;
begin
  select count(*) into v_rows
    from public.waitlist_signups
   where lower(email) = 'wl-lead@example.invalid';

  perform pg_temp.t('W9 and the list still holds exactly one of them',
    v_rows = 1, format('%s row(s)', v_rows));
end $$;

-- ── Results ────────────────────────────────────────────────────────────────

do $$
declare v_failed integer;
begin
  select count(*) into v_failed from tap where not ok;
  if v_failed > 0 then
    raise warning '% assertion(s) FAILED', v_failed;
  else
    raise warning 'all % assertions passed', (select count(*) from tap);
  end if;
end $$;

select n, case when ok then 'PASS' else 'FAIL' end as result, name, detail
  from tap order by n;

rollback;
