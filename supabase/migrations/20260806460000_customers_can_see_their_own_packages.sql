-- ============================================================================
-- A customer can see the shop, their own packages, and their own pass history.
--
-- ── FOUND BY RUNNING IT, NOT BY READING IT ────────────────────────────────
--
-- The package tables were built for the facility, and every read policy says so:
--
--   prepaid_packages       has_permission(facility_id, 'view_services')
--   customer_packages      has_permission(facility_id, 'financial_view_amounts')
--   package_pass_entries   has_permission(facility_id, 'financial_view_amounts')
--
-- A customer holds none of those — they have no facility membership at all — so
-- pointing the portal at these tables produced a shop with nothing in it and a
-- "My prepaid packs" section showing a customer none of their own packages.
--
-- Typecheck, lint and build were all green. It took signing in as a customer
-- and loading the page to see it, which is the argument for the browser test
-- that now covers it.
--
-- ── FOUR POLICIES, AND ONE DELIBERATELY MISSING ───────────────────────────
--
-- SELECT on the catalogue, on their own purchases, and on their own ledger:
-- clearly theirs to see. Scoped through `private.own_client_ids()`, the same
-- helper `bookings_read` uses, so "mine" means one thing across the schema.
--
-- INSERT on `package_pass_entries`, NARROWLY: `reason = 'redeemed'` and
-- `passes = -1`, against a package they own. Spending your own pass is what
-- "Book with Pass" does, and it cannot create value — the constraint makes it
-- impossible to write a `reversed` or a positive `adjustment`, which is the
-- entry that would hand a customer passes they never bought.
--
-- THERE IS NO CUSTOMER INSERT ON `customer_packages`, and that is the point.
-- A row there is a package somebody paid for. If a client could write one, a
-- client could grant themselves a package for nothing — and not only through
-- the checkout screen, but from any client-side query for the rest of the
-- project's life. The portal's purchase therefore does NOT go through the
-- caller's own privileges; the route performs it server-side after checking
-- the session owns that client (src/app/api/packages/owned/route.ts).
--
-- That leaves a real gap, stated rather than buried: nothing in that route
-- takes payment. It is a prototype checkout, exactly as the mock it replaces
-- was. The difference is that the capability to create a paid-for package now
-- lives in one server route that can have a payment gate added to it, instead
-- of in every browser holding a session.
-- ============================================================================

-- The shop. A customer sees the catalogue of a facility they are a client of —
-- not every facility's, which is what a bare `to authenticated` would give.
create policy prepaid_packages_read_customer on public.prepaid_packages
  for select to authenticated
  using (
    facility_id in (
      select c.facility_id from public.clients c
       where c.id in (select private.own_client_ids())
    )
  );

-- Their own purchases. `customer_package_lines` needs no new policy: its read
-- rule already mirrors the parent, so a pool becomes visible exactly when the
-- purchase it belongs to does.
create policy customer_packages_read_own on public.customer_packages
  for select to authenticated
  using (client_id in (select private.own_client_ids()));

-- Their own pass history — the "used on 3 May, Buddy, Full Groom" rows.
create policy package_pass_entries_read_own on public.package_pass_entries
  for select to authenticated
  using (
    customer_package_id in (
      select cp.id from public.customer_packages cp
       where cp.client_id in (select private.own_client_ids())
    )
  );

-- Spending one, and only spending one.
create policy package_pass_entries_redeem_own on public.package_pass_entries
  for insert to authenticated
  with check (
    reason = 'redeemed'
    and passes = -1
    and customer_package_id in (
      select cp.id from public.customer_packages cp
       where cp.client_id in (select private.own_client_ids())
    )
  );
