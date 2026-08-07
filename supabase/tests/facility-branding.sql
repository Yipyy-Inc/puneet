-- ============================================================================
-- A signed-out visitor can see a facility's face, and nothing else.
--
--   psql "$(supabase status -o json | jq -r .DB_URL)" \
--     -f supabase/tests/facility-branding.sql
--
-- One transaction, rolled back.
--
-- ── WHAT THIS FILE IS REALLY ABOUT ─────────────────────────────────────────
--
-- Spec 002 phase 3. A branded login page is signed out by definition, so the
-- branding must be readable with NO session — while everything else about a
-- facility must stay unreadable. That is the whole tension, and B1/B2 are the
-- assertions that hold the line.
--
-- B2 is also why the plan's original design was abandoned. It said "make
-- facility_branding readable by anon"; anon cannot read `facilities`, so
-- nothing could have turned a subdomain's SLUG into a facility_id to look the
-- branding up by. The measurement came first and the design followed it.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n int, name text, ok boolean, detail text);
grant all on tap to anon, authenticated;

create or replace function pg_temp.t(i int, p text, ok boolean, d text default '')
returns void language sql as $$
  insert into tap(n, name, ok, detail) values (i, p, ok, d);
$$;

insert into public.facility_branding
  (facility_id, logo_url, primary_color, accent_color, tagline, support_email)
select id, 'https://cdn.invalid/logo.png', '#7C3AED', '#059669',
       'Where tails wag', 'help@demo.invalid'
  from public.facilities where legacy_id = '11'
on conflict (facility_id) do update
  set logo_url      = excluded.logo_url,
      primary_color = excluded.primary_color,
      accent_color  = excluded.accent_color,
      tagline       = excluded.tagline,
      support_email = excluded.support_email;

-- ── As a signed-out visitor ────────────────────────────────────────────────

set local role anon;

select pg_temp.t(1, 'B1 anon cannot read facility_branding directly',
  (select count(*) from public.facility_branding) = 0);

select pg_temp.t(2, 'B2 anon cannot read facilities — so a slug is not a way in',
  (select count(*) from public.facilities) = 0);

select pg_temp.t(3, 'B3 anon CAN read the branding projection by exact slug',
  (select name from public.facility_branding_by_slug('yipyy-demo-facility'))
    = 'Yipyy Demo Facility'
  and (select logo_url from public.facility_branding_by_slug('yipyy-demo-facility'))
    = 'https://cdn.invalid/logo.png'
  and (select primary_color from public.facility_branding_by_slug('yipyy-demo-facility'))
    = '#7C3AED');

select pg_temp.t(4, 'B4 an unknown slug answers nothing',
  (select count(*) from public.facility_branding_by_slug('does-not-exist')) = 0);

-- B5: the projection is narrow ON PURPOSE. support_email is stored and must not
-- be published to anonymous callers for scraping, so it is absent from the
-- return type — asserted here so a later "just add one more field" has to
-- delete this line and think about it.
select pg_temp.t(5, 'B5 the anon projection does NOT carry support contact details',
  (select count(*) from information_schema.columns
    where table_schema = 'public'
      and table_name = 'facility_branding_by_slug'
      and column_name in ('support_email', 'support_phone')) = 0);

reset role;

-- ── A colour is a colour ───────────────────────────────────────────────────
--
-- It is rendered into a style attribute, so the shape is checked rather than
-- trusted. `red; } body { display:none` is not a hex colour.

do $$
declare state text;
begin
  begin
    update public.facility_branding set primary_color = 'red; } body{display:none'
     where facility_id = (select id from public.facilities where legacy_id = '11');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(6, 'B6 a non-hex primary_color is REFUSED',
    state = '23514', 'state=' || state);
end $$;

-- ── The logo bucket ────────────────────────────────────────────────────────

select pg_temp.t(7, 'B7 facility-logos is public, capped, and refuses SVG',
  (select public from storage.buckets where id = 'facility-logos') = true
  and (select file_size_limit from storage.buckets where id = 'facility-logos') = 2097152
  and not (select 'image/svg+xml' = any(allowed_mime_types)
             from storage.buckets where id = 'facility-logos'),
  (select array_to_string(allowed_mime_types, ', ')
     from storage.buckets where id = 'facility-logos'));

-- ── Who may set it (phase 3.3) ─────────────────────────────────────────────
--
-- The Branding settings section is gated on `settings_general` in the sidebar.
-- That is the NAV, and a nav is a suggestion. These assert the database agrees,
-- because /api/facility/branding is reachable without the sidebar.

insert into public.profiles (id, email, full_name) values
  ('user_brandOwner00000000000000000', 'bowner@demo.invalid', 'Brand Owner'),
  ('user_brandRecep00000000000000000', 'brecep@demo.invalid', 'Brand Recep')
on conflict (id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_brandOwner00000000000000000', f.id, 'owner', true
  from public.facilities f where f.legacy_id = '11'
on conflict (profile_id, facility_id) do nothing;

insert into public.facility_memberships (profile_id, facility_id, role, is_active)
select 'user_brandRecep00000000000000000', f.id, 'reception', true
  from public.facilities f where f.legacy_id = '11'
on conflict (profile_id, facility_id) do nothing;

-- Reception is a member of this facility and holds no settings_general
-- (role_preset_permissions grants it to owner, admin and manager only).
select set_config('request.jwt.claims',
  json_build_object('sub','user_brandRecep00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.facility_branding (facility_id, primary_color)
    values ((select id from public.facilities where legacy_id = '11'), '#111111');
    state := 'ALLOWED';
  exception when others then state := sqlstate;
  end;
  perform pg_temp.t(8, 'B8 a member WITHOUT settings_general cannot write branding',
    state = '42501', 'state=' || state);
end $$;

reset role;
select set_config('request.jwt.claims',
  json_build_object('sub','user_brandOwner00000000000000000','role','authenticated')::text, true);
set local role authenticated;

do $$
declare state text;
begin
  begin
    insert into public.facility_branding (facility_id, primary_color, tagline)
    values ((select id from public.facilities where legacy_id = '11'),
            '#7C3AED', 'Set by the owner');
    state := 'ALLOWED';
  exception when others then state := sqlstate || ' ' || sqlerrm;
  end;
  perform pg_temp.t(9, 'B9 an OWNER can write their own branding',
    state = 'ALLOWED', state);
end $$;

-- The round trip, which is the only assertion that proves the feature works
-- rather than that two policies exist.
reset role;
set local role anon;
select pg_temp.t(10, 'B10 and a signed-out visitor sees it on the login page',
  (select tagline from public.facility_branding_by_slug('yipyy-demo-facility'))
    = 'Set by the owner');
reset role;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
