-- ============================================================================
-- DEVELOPMENT ACCOUNTS — never run this against production.
--
-- Every login in the app is now a real Supabase sign-in, which means an empty
-- auth.users table makes the whole product unreachable: correct, and useless.
-- This creates one real account per role so each portal can actually be
-- opened, and so the role-based landing (landingPathForClaims) has something
-- to route.
--
-- Shared password for all of them:  YipyyDev!2026
--
-- Apply with:  supabase db execute --file supabase/seed/dev-accounts.sql
--   (or paste into the SQL editor). Re-running is safe — every insert is
--   guarded, so it tops up whatever is missing rather than erroring.
--
-- Deliberately NOT in supabase/migrations/: migrations run everywhere,
-- including production, and a known-password account that ships to production
-- is a back door with a changelog entry.
--
-- ── The trap this file exists to encode ────────────────────────────────────
-- auth.users declares confirmation_token, recovery_token, email_change,
-- email_change_token_new, email_change_token_current, phone_change,
-- phone_change_token and reauthentication_token as NULLABLE, but GoTrue scans
-- them into non-nullable Go strings. Insert a user leaving them NULL and every
-- sign-in fails with a completely EMPTY error — no code, no message, nothing
-- in the client or the logs. Hence the '' on every one of them below.
-- ============================================================================

do $$
declare
  v_org_id  uuid := 'a0000000-0000-4000-8000-000000000001';
  v_fac_id  uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_loc_id  uuid := 'a0000000-0000-4000-8000-0000000000c1';
  v_pwd     text := 'YipyyDev!2026';
  v_user_id uuid;
  r         record;
begin
  -- ── Tenancy ──────────────────────────────────────────────────────────────
  insert into public.orgs (id, name, slug, legacy_id)
  values (v_org_id, 'Yipyy Demo Group', 'yipyy-demo', 'demo')
  on conflict (id) do nothing;

  -- legacy_id '11' is the demo facility the mock data references throughout.
  insert into public.facilities (id, org_id, name, slug, legacy_id, timezone)
  values (v_fac_id, v_org_id, 'Yipyy Demo Facility', 'yipyy-demo-facility', '11', 'America/Toronto')
  on conflict (id) do nothing;

  insert into public.locations (id, facility_id, name, is_primary, timezone, legacy_id)
  values (v_loc_id, v_fac_id, 'Main Location', true, 'America/Toronto', '11-1')
  on conflict (id) do nothing;

  -- ── Accounts ─────────────────────────────────────────────────────────────
  -- One per portal the app exposes, so every gate can be exercised:
  --   platform admin -> /dashboard
  --   owner/manager  -> /facility/dashboard
  --   groomer        -> /groomer/dashboard
  --   caretaker      -> /employee/schedule
  --   customer       -> /customer/dashboard  (no membership, by design)
  for r in
    select * from (values
      ('admin@yipyy.dev',     'Platform Admin',  true,  null),
      ('owner@yipyy.dev',     'Dana Okafor',     false, 'owner'),
      ('manager@yipyy.dev',   'Priya Raman',     false, 'manager'),
      ('groomer@yipyy.dev',   'Jessica Alvarez', false, 'groomer'),
      ('caretaker@yipyy.dev', 'Marcus Bell',     false, 'caretaker'),
      ('reception@yipyy.dev', 'Iris Nakamura',   false, 'reception'),
      ('customer@yipyy.dev',  'Sam Whitlock',    false, null)
    ) as t(email, full_name, is_admin, role)
  loop
    select id into v_user_id from auth.users where email = r.email;

    if v_user_id is null then
      v_user_id := gen_random_uuid();

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        -- All eight of these must be '' and not NULL. See the header.
        confirmation_token, recovery_token, email_change,
        email_change_token_new, email_change_token_current,
        phone_change, phone_change_token, reauthentication_token
      ) values (
        '00000000-0000-0000-0000-000000000000',
        v_user_id,
        'authenticated', 'authenticated',
        r.email,
        extensions.crypt(v_pwd, extensions.gen_salt('bf')),
        -- Pre-confirmed: dev inboxes do not exist, and the built-in SMTP is
        -- rate-limited to a couple of mails an hour.
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', r.full_name),
        '', '', '', '', '', '', '', ''
      );
    end if;

    -- profiles is created by the on_auth_user_created trigger; only the admin
    -- flag needs setting here.
    update public.profiles
       set is_platform_admin = r.is_admin,
           full_name         = coalesce(full_name, r.full_name)
     where id = v_user_id;

    if r.role is not null then
      insert into public.facility_memberships
        (profile_id, facility_id, role, home_location_id, is_active)
      values
        (v_user_id, v_fac_id, r.role::public.facility_staff_role, v_loc_id, true)
      on conflict do nothing;
    end if;
  end loop;
end $$;

-- Verification — every row here should be non-zero, and each account should
-- show the role its portal expects.
select p.email,
       p.is_platform_admin,
       coalesce(m.role::text, '(customer — no membership)') as membership
  from public.profiles p
  left join public.facility_memberships m on m.profile_id = p.id
 where p.email like '%@yipyy.dev'
 order by p.is_platform_admin desc, m.role nulls last, p.email;
