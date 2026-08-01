-- ============================================================================
-- Custom Access Token Hook — put the caller's tenancy into the JWT.
--
-- Supabase Auth calls this while minting an access token, so a request arrives
-- already knowing which facilities the caller belongs to and in what role.
-- Without it every RLS policy re-queries facility_memberships for every row it
-- evaluates; `private.member_facility_ids()` becomes a per-row subquery rather
-- than a claim read.
--
-- It is also the answer to the two competing role systems the app carries
-- today — the `user_role` cookie (server portal gate) and
-- `scheduling-current-user-role` in localStorage (client HQ). Both are
-- client-writable. This one is signed.
--
-- SECURITY NOTES
--   • Claims land in `app_metadata`, never `user_metadata`. user_metadata is
--     user-editable and surfaces in auth.jwt(), so authorising against it would
--     let any user grant themselves a facility.
--   • SECURITY DEFINER, in the unexposed `private` schema, so it reads across
--     RLS without bypass grants and cannot be invoked as an RPC by a client.
--   • EXECUTE is granted to supabase_auth_admin only, and explicitly revoked
--     from authenticated/anon/public.
--
-- ONE MANUAL STEP: creating the function does not enable it. Turn it on at
-- Dashboard > Authentication > Hooks > Customize Access Token (JWT) Claims and
-- select `private.custom_access_token_hook`. Until then tokens mint without
-- these claims and any policy reading them sees nothing.
--
-- Verified against the live project before commit: a user with one active
-- membership gets it in `memberships`; flipping is_platform_admin is
-- reflected; and a membership set is_active = false disappears from the token,
-- so suspending a staff member revokes access on the next refresh.
--
-- End-to-end, with the hook enabled: signing in as a user with one membership
-- yielded a token carrying that membership; `permissions` returned 168 rows
-- where anon sees 0; and with TWO facilities in the table the user saw exactly
-- one — their own. Tenant isolation demonstrated, not assumed.
--
-- SEEDING USERS VIA SQL — the trap that costs an hour:
-- auth.users has confirmation_token, recovery_token, email_change,
-- email_change_token_new, email_change_token_current, phone_change,
-- phone_change_token and reauthentication_token as NULLABLE columns, but
-- GoTrue scans them into non-nullable Go strings. Insert a row leaving them
-- NULL and every sign-in fails with an EMPTY error message — no code, no
-- detail, nothing in the client. Always set them to '' explicitly. Prefer the
-- auth API over direct inserts where you can; note it rejects reserved TLDs
-- such as .test, so use a real domain for fixtures.
-- ============================================================================

create or replace function private.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid  := (event ->> 'user_id')::uuid;
  v_claims  jsonb := coalesce(event -> 'claims', '{}'::jsonb);
  v_app     jsonb := coalesce(v_claims -> 'app_metadata', '{}'::jsonb);
  v_admin   boolean;
  v_members jsonb;
begin
  select coalesce(p.is_platform_admin, false)
    into v_admin
    from public.profiles p
   where p.id = v_user_id;

  -- Only ACTIVE memberships. Deactivating a staff member must drop their
  -- facility from the next token rather than requiring a policy change.
  select coalesce(
           jsonb_agg(jsonb_build_object(
             'membership_id', m.id,
             'facility_id',   m.facility_id,
             'role',          m.role
           ) order by m.created_at),
           '[]'::jsonb)
    into v_members
    from public.facility_memberships m
   where m.profile_id = v_user_id
     and m.is_active;

  v_app := jsonb_set(v_app, '{is_platform_admin}', to_jsonb(coalesce(v_admin, false)));
  v_app := jsonb_set(v_app, '{memberships}', v_members);

  return jsonb_set(event, '{claims,app_metadata}', v_app);
end;
$$;

comment on function private.custom_access_token_hook is
  'Supabase Auth JWT hook: injects app_metadata.memberships and app_metadata.is_platform_admin. Enable at Dashboard > Authentication > Hooks.';

grant usage   on schema private                                to supabase_auth_admin;
grant execute on function private.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function private.custom_access_token_hook(jsonb) from authenticated, anon, public;
