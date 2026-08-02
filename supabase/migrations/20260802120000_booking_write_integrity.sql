-- ============================================================================
-- Booking write integrity.
--
-- 20260801120000 made bookings real, and RLS there decides WHOSE booking a row
-- is. It never decided WHAT a caller may put in one. Those are different
-- questions and only the first was answered:
--
--   • base_price / discount / total_cost / tip_amount arrive from the request
--     body — src/lib/api/mappers/booking.ts::bookingToRow passes them through
--     untouched. A signed-in customer can book at zero.
--   • status and payment_status arrive the same way, so a customer can insert
--     'confirmed' / 'paid' and skip the counter entirely.
--   • facility_id is caller-supplied and never checked against the client's
--     facility, so a booking can be planted in a facility its client has no
--     relationship with.
--   • booking_pets used the READ predicate for INSERT and DELETE, so anyone who
--     could see a booking could re-crew it: a view-only staff member could, and
--     so could a customer attaching a pet belonging to somebody else.
--
-- None of that is theoretical. PostgREST is reachable directly with the anon
-- key and a session cookie, so the Route Handler in src/app/api/bookings/ is a
-- convenience, not a gate — the note at the top of that file says as much. Every
-- rule below therefore lives in the database.
--
-- What this migration deliberately does NOT do is compute a price. There is no
-- service or rate table yet (src/data/service-catalog.ts and friends are still
-- mocks), so the honest stored value for a customer-submitted booking is zero —
-- "not priced yet" — with whatever the browser quoted preserved under
-- details.requestedQuote so the counter has something to reconcile against.
-- When the service catalogue lands, the clamp in the trigger becomes a call
-- into it and the quote becomes a comparison rather than a record.
-- ============================================================================

-- ── Money that cannot be nonsense ───────────────────────────────────────────
-- Deliberately NOT `total_cost = base_price - discount`. Add-ons, taxes and
-- deposits still live in `details`, so that equality is not yet true, and a
-- constraint that is wrong on day one is a constraint someone drops on day two.
-- It becomes checkable when pricing becomes a table.
alter table public.bookings
  add constraint bookings_money_non_negative check (
    base_price >= 0
    and discount >= 0
    and total_cost >= 0
    and (tip_amount is null or tip_amount >= 0)
  ),
  add constraint bookings_discount_within_price check (discount <= base_price);

-- ── The facility of a booking is a fact about its client ────────────────────
-- SECURITY DEFINER because the trigger below has to resolve this for callers
-- who cannot read the clients table — a staff member may hold create_bookings
-- without view_clients, and that must not turn into a failed insert.
create or replace function private.facility_of_client(p_client_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.facility_id from public.clients c where c.id = p_client_id;
$$;

grant execute on function private.facility_of_client(uuid) to authenticated;
revoke execute on function private.facility_of_client(uuid) from anon;

-- ── What a caller may put in a booking ──────────────────────────────────────
-- A BEFORE trigger rather than more RLS, because RLS answers yes/no about a row
-- and this has to answer "yes, but not with those numbers". Runs before the
-- WITH CHECK policy, so by the time RLS is evaluated facility_id is already the
-- derived one and the policy can trust it.
create or replace function private.enforce_booking_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_client_facility uuid;
  v_is_staff        boolean;
begin
  -- 1. facility_id is DERIVED, never accepted. Validating the caller's value
  --    would work too; deriving it removes the parameter from the attack
  --    surface entirely. There is no legitimate booking whose facility differs
  --    from its client's.
  v_client_facility := private.facility_of_client(new.client_id);
  if v_client_facility is null then
    raise exception 'Booking references a client that does not exist.'
      using errcode = '23503';
  end if;
  new.facility_id := v_client_facility;

  -- 2. A location, if one is given, has to belong to that facility.
  if new.location_id is not null
     and not exists (
       select 1
         from public.locations l
        where l.id = new.location_id
          and l.facility_id = new.facility_id
     )
  then
    raise exception 'Location does not belong to this booking''s facility.'
      using errcode = '23514';
  end if;

  -- 3. service_role — seeds, and any server-side job — bypasses RLS and has to
  --    bypass this too, or `bun run db:seed:apply` writes a database full of
  --    zero-priced requests. auth.uid() is null in exactly that case.
  if (select auth.uid()) is null then
    return new;
  end if;

  v_is_staff := private.has_permission(
    new.facility_id,
    case when tg_op = 'INSERT' then 'create_bookings' else 'edit_bookings' end
  );

  if v_is_staff then
    return new;
  end if;

  -- ── Everything below is the customer path ────────────────────────────────

  if tg_op = 'INSERT' then
    -- A booking a customer makes is a REQUEST. The facility confirms it and the
    -- facility prices it. Keep what the browser quoted them — that is the
    -- number they will refer to on the phone — but keep it as a claim, in
    -- details, not as the price.
    if coalesce(new.base_price, 0) <> 0 or coalesce(new.total_cost, 0) <> 0 then
      new.details := coalesce(new.details, '{}'::jsonb) || jsonb_build_object(
        'requestedQuote', jsonb_build_object(
          'basePrice', new.base_price,
          'discount',  new.discount,
          'totalCost', new.total_cost,
          'quotedAt',  now()
        )
      );
    end if;

    new.status         := 'request_submitted'::public.booking_status;
    new.payment_status := 'pending';
    new.base_price     := 0;
    new.discount       := 0;
    new.total_cost     := 0;
    new.tip_amount     := null;

    -- Staffing is a rota decision, not a customer preference. The request can
    -- carry one in details; it does not get to set the column.
    new.assigned_staff_id   := null;
    new.assigned_staff_name := null;

    return new;
  end if;

  -- UPDATE by a customer, on their own booking, and only while it is still
  -- ahead of them. Once the pet is on site the record is the facility's.
  if old.status not in (
       'pending', 'request_submitted', 'estimate_sent', 'waitlisted', 'confirmed'
     )
  then
    raise exception 'This booking can no longer be changed.'
      using errcode = '42501';
  end if;

  -- Two moves are theirs: leave the status alone (they are editing their notes)
  -- or call the booking off. Anything else — confirming it, marking it paid,
  -- checking themselves in — is the facility's to do.
  if new.status is distinct from old.status
     and new.status <> 'cancelled'::public.booking_status
  then
    raise exception 'You may only cancel this booking.'
      using errcode = '42501';
  end if;

  -- Everything they do not own is put back rather than rejected, so the
  -- existing PATCH route — which merges the whole booking and sends it all —
  -- keeps working instead of erroring on fields it never meant to change.
  -- What is left writable: special_requests, and the long tail in details.
  new.client_id           := old.client_id;
  new.service             := old.service;
  new.service_type        := old.service_type;
  new.payment_status      := old.payment_status;
  new.base_price          := old.base_price;
  new.discount            := old.discount;
  new.total_cost          := old.total_cost;
  new.tip_amount          := old.tip_amount;
  new.start_at            := old.start_at;
  new.end_at              := old.end_at;
  new.assigned_staff_id   := old.assigned_staff_id;
  new.assigned_staff_name := old.assigned_staff_name;

  return new;
end;
$$;

-- Fires before bookings_set_updated_at — triggers run in name order, and
-- "enforce" sorts before "set", which is the order we want rather than a
-- coincidence to rely on quietly.
drop trigger if exists bookings_enforce_integrity on public.bookings;
create trigger bookings_enforce_integrity
  before insert or update on public.bookings
  for each row execute function private.enforce_booking_integrity();

-- ── A customer may cancel their own booking ─────────────────────────────────
-- bookings_update was staff-only, which meant the person who made the booking
-- could not call it off — they had to phone the facility to change a row they
-- own. The trigger above is what makes widening this safe: it constrains the
-- customer branch to a status move to 'cancelled' and nothing else.
--
-- bookings_insert is left as it stands. It was already correct once facility_id
-- became derived, because RLS evaluates WITH CHECK against the post-trigger row.
drop policy if exists bookings_update on public.bookings;
create policy bookings_update on public.bookings
  for update to authenticated
  using (
    client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'edit_bookings')
  )
  with check (
    client_id in (select private.own_client_ids())
    or private.has_permission(facility_id, 'edit_bookings')
  );

-- ── Who may change a booking's crew ─────────────────────────────────────────
-- The old policies asked "can you see this booking", which is the read
-- question. Seeing a booking and being allowed to change which animals are on
-- it are not the same right.
--
-- create_bookings counts as well as edit_bookings because attaching pets is
-- part of creating: the POST route inserts the booking and then the join rows,
-- and a staff member with create_bookings but not edit_bookings would otherwise
-- create a booking with no pets on it. The cost is that such a member can also
-- re-crew an existing booking; that is the lesser of the two wrongs until
-- "create" and "edit" are separable in the route.
create or replace function private.can_write_booking(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.bookings b
     where b.id = p_booking_id
       and (
         private.has_permission(b.facility_id, 'edit_bookings')
         or private.has_permission(b.facility_id, 'create_bookings')
         or (
           b.client_id in (select private.own_client_ids())
           and b.status in (
             'pending', 'request_submitted', 'estimate_sent', 'waitlisted'
           )
         )
       )
  );
$$;

grant execute on function private.can_write_booking(uuid) to authenticated;
revoke execute on function private.can_write_booking(uuid) from anon;

-- A pet can only join a booking made for its own client. Without this a
-- customer could attach a stranger's pet to their own booking and the facility
-- would read it as consent to hand that animal over.
create or replace function private.pet_matches_booking_client(
  p_booking_id uuid,
  p_pet_id     uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.bookings b
      join public.pets p on p.id = p_pet_id
     where b.id = p_booking_id
       and p.client_id = b.client_id
  );
$$;

grant execute on function private.pet_matches_booking_client(uuid, uuid) to authenticated;
revoke execute on function private.pet_matches_booking_client(uuid, uuid) from anon;

drop policy if exists booking_pets_insert on public.booking_pets;
create policy booking_pets_insert on public.booking_pets
  for insert to authenticated
  with check (
    private.can_write_booking(booking_id)
    and private.pet_matches_booking_client(booking_id, pet_id)
  );

-- Detaching does not repeat the ownership check. If a pet was moved to another
-- client after the booking was made, the row still has to be removable —
-- otherwise the stale link is the thing that survives.
drop policy if exists booking_pets_delete on public.booking_pets;
create policy booking_pets_delete on public.booking_pets
  for delete to authenticated
  using (private.can_write_booking(booking_id));

-- booking_pets_read is unchanged: the read predicate was always right for
-- reads. It was only ever wrong as a stand-in for the write one.
