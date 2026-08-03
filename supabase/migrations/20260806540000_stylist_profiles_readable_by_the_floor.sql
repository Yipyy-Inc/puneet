-- ============================================================================
-- A groomer can see the groomers.
--
-- ── THE BUG ───────────────────────────────────────────────────────────────
--
-- 20260806500000 gated reads on `view_services`, reasoning that the people who
-- need to know who can take a matted giant-breed at 3pm are schedulers. That
-- reasoning skipped the most obvious reader: the groomer standing at the
-- board. A groomer holds no `view_services`, so the roster came back empty for
-- them -- measured, not assumed:
--
--   groomer sees 0 profiles          <- the whole point of the assigned_only
--   customer sees 1 (visible_online)    queue is that a groomer uses it
--
-- Every surface that scopes work to "your queue" runs `useStylistIdForStaff`,
-- which needs this table. With the old policy the grooming board showed a
-- groomer no columns and no cards, and `/groomer/dashboard` could not identify
-- who was looking at it.
--
-- ── THE RULE THAT SHOULD HAVE BEEN USED ───────────────────────────────────
--
-- `staff_read` already answers this question for the person: any member of the
-- facility may read its staff roster. A grooming profile is strictly less
-- sensitive than the staff record it hangs off -- a skill tier and a list of
-- specialisations, beside a name and an email that the same viewer can already
-- see. Making the profile HARDER to read than the person is incoherent, and it
-- is what broke.
--
-- So reads now mirror `staff_read`: facility membership, nothing finer. Writes
-- are untouched and still require `manage_staff`, because changing somebody's
-- tier or capacity is a decision about their job -- S6 covers that, and it
-- passed throughout.
--
-- The customer policy is untouched too: `visible_online` only, and only at a
-- facility they are a client of.
--
-- ── WHY THE TEST CAUGHT IT AND THE TYPES DID NOT ──────────────────────────
--
-- The same shape as the portal packages a day earlier: a permission chosen by
-- thinking about who *administers* a thing rather than who *uses* it. Both
-- times every static gate passed and the assertion that failed was the
-- POSITIVE one -- "this role can see it" -- not a deny.
-- ============================================================================

drop policy grooming_stylist_profiles_read on public.grooming_stylist_profiles;
create policy grooming_stylist_profiles_read on public.grooming_stylist_profiles
  for select to authenticated
  using (private.is_platform_admin()
         or facility_id in (select private.member_facility_ids()));

drop policy grooming_stylist_availability_read
  on public.grooming_stylist_availability;
create policy grooming_stylist_availability_read
  on public.grooming_stylist_availability
  for select to authenticated
  using (private.is_platform_admin()
         or facility_id in (select private.member_facility_ids()));
