-- ============================================================================
-- A customer may read the locations of the facility they are a client of.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- Walking CUJ-20 on 2026-08-19 found the customer booking path writing nothing,
-- and wiring it to POST /api/bookings exposed this: `bookings.location_id` is
-- resolved from the facility's primary location through a read the CALLER has
-- to be able to make, and `locations_read` admitted only members and platform
-- admins. A customer therefore books with no location at all — 245 of the 250
-- bookings in this database carry one, so the customer's would have been the
-- odd row out, and the ops board filters by it.
--
-- `facilities_read` has admitted a client of the facility since
-- 20260801130000, through `private.client_facility_ids()`. This is the same
-- sentence applied to the table one level down; the helper already exists and
-- is already granted to `authenticated`.
--
-- ── WHAT THIS DISCLOSES ───────────────────────────────────────────────────
--
-- `locations` holds id, facility_id, name, is_primary, timezone and legacy_id.
-- No address, no phone, no staffing. So a customer of Doggieville Mtl learns
-- that Doggieville Mtl has a location called "Main" in America/Toronto — which
-- is on their booking confirmation anyway, and which they cannot learn about
-- any facility they are not a client of.
--
-- Deliberately SELECT only. Insert, update and delete keep requiring
-- `manage_services`: a customer may see where they are dropping their dog off,
-- and may not rename it.
-- ============================================================================

drop policy if exists locations_read on public.locations;

create policy locations_read on public.locations
  for select to authenticated
  using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
    or facility_id in (select private.client_facility_ids())
  );

comment on policy locations_read on public.locations is
  'Platform admins, members of the facility, and its own clients. A customer needs the location their booking is at; see 20260819100000.';
