-- ============================================================================
-- A tag marked "client visible" is finally visible to the client.
--
-- ── WHY THIS EXISTS ───────────────────────────────────────────────────────
--
-- `facility_tags` and `facility_tag_assignments` were created on 2026-08-28 by
-- 20260828134018, whose header says of the existing tag components: "This makes
-- THAT real." It never did. The tables have carried ZERO rows since the day
-- they were created, and every screen has gone on reading the 76 tags in
-- src/data/tags-notes.ts. This change is the half that was missing, and it
-- found one thing the schema could not express.
--
-- `facility_tags.visibility` has two values, 'internal' and 'client_visible',
-- and the read policies admit only `private.member_facility_ids()` — staff.
-- So a client_visible tag was visible to exactly the same people as an internal
-- one, and the column decided nothing. Meanwhile three CUSTOMER-portal surfaces
-- render tags on a pet, a client and a booking (customer/pets, the pet detail
-- page, and the upcoming-booking card), each passing an `isCustomerView` prop
-- that filtered the fixture in the BROWSER.
--
-- A prop a call site has to remember is not an authorisation boundary. This
-- moves the decision to RLS, where forgetting it is impossible, and the prop
-- becomes what it should always have been: a display preference.
--
-- ── WHAT A CUSTOMER MAY READ ──────────────────────────────────────────────
--
--   the tag        only where visibility = 'client_visible' AND is_active,
--                  and only at a facility they are a client of
--   an assignment  only on their OWN pet, their own client record or their own
--                  booking, and only when it carries such a tag
--
-- An internal tag is invisible to them in both directions: they cannot read the
-- tag row, and they cannot read the assignment that points at it — so "which
-- of my dogs is flagged" cannot be inferred from a row that exists with an
-- unreadable name.
--
-- ── WHY THREE SECURITY DEFINER HELPERS ────────────────────────────────────
--
-- A policy body that selects from another RLS-protected table inherits THAT
-- table's policies, so `entity_id in (select id from public.pets ...)` would
-- have quietly depended on the pets policy staying the shape it is today, and
-- on facility_tags' own policy never referencing assignments back. Neither is
-- written down anywhere. `own_pet_ids()` and `own_booking_ids()` mirror the
-- `own_client_ids()` that already exists, and `is_client_visible_tag()` answers
-- the one question without a nested policy evaluation.
-- ============================================================================

create or replace function private.own_pet_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select p.id from public.pets p
   where p.client_id in (
     select c.id from public.clients c
      where c.profile_id = (select auth.jwt()->>'sub'));
$fn$;

comment on function private.own_pet_ids() is
  'The pets belonging to the calling customer, for RLS. Mirrors own_client_ids().';

create or replace function private.own_booking_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select b.id from public.bookings b
   where b.client_id in (
     select c.id from public.clients c
      where c.profile_id = (select auth.jwt()->>'sub'));
$fn$;

comment on function private.own_booking_ids() is
  'The bookings belonging to the calling customer, for RLS. Mirrors own_client_ids().';

create or replace function private.is_client_visible_tag(p_tag_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select exists (
    select 1 from public.facility_tags t
     where t.id = p_tag_id
       and t.visibility = 'client_visible'
       and t.is_active);
$fn$;

comment on function private.is_client_visible_tag(uuid) is
  'Whether a tag is one a facility has chosen to show its clients. SECURITY DEFINER so an assignment policy need not evaluate the tag policy.';

revoke all on function private.own_pet_ids() from public, anon;
revoke all on function private.own_booking_ids() from public, anon;
revoke all on function private.is_client_visible_tag(uuid) from public, anon;
grant execute on function private.own_pet_ids() to authenticated;
grant execute on function private.own_booking_ids() to authenticated;
grant execute on function private.is_client_visible_tag(uuid) to authenticated;

-- ── The two read policies ─────────────────────────────────────────────────
--
-- Staff read is unchanged. The customer branch is added, not substituted.

drop policy if exists facility_tags_read on public.facility_tags;
create policy facility_tags_read on public.facility_tags
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or (
      visibility = 'client_visible'
      and is_active
      and facility_id in (select private.client_facility_ids())
    )
  );

drop policy if exists facility_tag_assignments_read on public.facility_tag_assignments;
create policy facility_tag_assignments_read on public.facility_tag_assignments
  for select using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or (
      private.is_client_visible_tag(tag_id)
      and (
        (entity_type = 'customer' and entity_id in (select private.own_client_ids()))
        or (entity_type = 'pet' and entity_id in (select private.own_pet_ids()))
        or (entity_type = 'booking' and entity_id in (select private.own_booking_ids()))
      )
    )
  );

-- Writing is unchanged and stays staff-only: `facility_tags_write` requires
-- `manage_facility_settings` and `facility_tag_assignments_write` requires
-- `edit_clients`. Both are `for all`, and a `for all` USING clause governs
-- select too — but a customer satisfies neither, so the permissive read
-- policies above are what admits them and nothing here widens a write.

do $verify$
declare
  v_count int;
begin
  select count(*) into v_count from pg_policies
   where schemaname = 'public'
     and tablename in ('facility_tags', 'facility_tag_assignments')
     and policyname like '%_read';
  if v_count <> 2 then
    raise exception 'expected 2 read policies, found %', v_count;
  end if;

  if has_function_privilege('anon', 'private.own_pet_ids()', 'execute') then
    raise exception 'anon can enumerate a customer''s pets';
  end if;
  if has_function_privilege('anon', 'private.is_client_visible_tag(uuid)', 'execute') then
    raise exception 'anon can probe tag visibility';
  end if;
end;
$verify$;
