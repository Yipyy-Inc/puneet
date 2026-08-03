-- ============================================================================
-- Client and pet write integrity.
--
-- `clients_update` lets you write your own row: `profile_id = auth.uid() OR
-- has_permission(facility_id, 'edit_clients')`. That is the right RULE — a
-- customer must be able to fix their phone number without asking staff — but
-- RLS gates ROWS, so "your own row" meant every column of it.
--
-- Demonstrated against the live project before writing this, as the customer,
-- against a fixture in a rolled-back transaction:
--
--     BEFORE  is_blocked=true  reason='Repeated no-shows'
--             outstanding_balance=480.00  no_show_count=7  status='inactive'
--
--       update public.clients
--          set is_blocked = false, blocked_reason = null,
--              outstanding_balance = 0, no_show_count = 0, status = 'active'
--        where email = '…';
--
--     AFTER   is_blocked=false reason=null
--             outstanding_balance=0.00  no_show_count=0  status='active'
--
-- A blocked customer unblocked themselves, cleared the debt, reset the
-- no-show counter and reactivated the account, in one statement, reachable
-- from PostgREST with the anon key and a session cookie. The same row also
-- carries `details.storeCredit`, `details.packages` and `details.membership` —
-- money and entitlements the facility grants, sitting in a column its owner
-- could write.
--
-- Pets have the quieter version. `details.evaluations` is the facility's
-- assessment of the animal — temperament, handling notes, whether it can join
-- group play. The owner of the pet could rewrite it, and `status` (which
-- includes 'deceased') with it.
--
-- ── SHAPE ───────────────────────────────────────────────────────────────────
--
-- BEFORE triggers, same as bookings (20260802120000) and staff
-- (20260802140000): RLS answers yes/no about a row, and this has to answer
-- "yes, but not that column".
--
-- Moving a record between facilities or between owners RAISES — it is not an
-- edit, it is a different record, and failing loudly is right.
--
-- Everything else REVERTS silently, because the app PATCHes the whole merged
-- object. A customer editing their address sends the entire client back,
-- balance included; erroring on that would make every legitimate edit fail,
-- and taking it at face value is the bug above. Reverting is what lets a
-- partial view be written back safely.
--
-- WHAT STAYS EDITABLE BY THE OWNER, deliberately: name, email, phone, language,
-- photo, address, additional contacts, saved cards — and for a pet, everything
-- descriptive (name, breed, weight, allergies, special needs). This is not a
-- lockdown. It is the line between "my details" and "the facility's record of
-- me", and only the second half moves out of reach.
-- ============================================================================

-- ── Clients ─────────────────────────────────────────────────────────────────

create or replace function private.enforce_client_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_can_edit boolean;
begin
  -- service_role: seeds and server-side jobs. No JWT subject, no restriction —
  -- the same carve-out the bookings and staff triggers make, and for the same
  -- reason: the service role bypasses RLS entirely, so applying column rules to
  -- it would only break seeding.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Checked against the STORED facility, not the incoming one: asking whether
  -- the caller may edit the facility they are trying to move the row to is the
  -- wrong question, and answers yes for anyone with rights at the destination.
  v_can_edit := private.has_permission(old.facility_id, 'edit_clients');

  if v_can_edit or private.is_platform_admin() then
    return new;
  end if;

  -- ── Identity: raise ───────────────────────────────────────────────────────

  if new.facility_id is distinct from old.facility_id then
    raise exception 'A client record belongs to one facility and cannot be moved.'
      using errcode = '42501';
  end if;

  if new.profile_id is distinct from old.profile_id then
    raise exception 'You may not change which account a client record belongs to.'
      using errcode = '42501';
  end if;

  if new.ref is distinct from old.ref then
    raise exception 'A client reference is assigned once.'
      using errcode = '42501';
  end if;

  -- ── The facility's record of the relationship: revert ─────────────────────

  new.status              := old.status;
  new.is_blocked          := old.is_blocked;
  new.blocked_at          := old.blocked_at;
  new.blocked_reason      := old.blocked_reason;
  new.outstanding_balance := old.outstanding_balance;
  new.no_show_count       := old.no_show_count;
  new.last_visit_date     := old.last_visit_date;

  -- Money and entitlements live in `details` rather than columns, which makes
  -- them no less the facility's to grant. Rebuilt from the STORED value so a
  -- caller who sends the object back without them preserves what was there,
  -- and one who invents a storeCredit balance does not get it.
  new.details := (new.details - 'membership' - 'packages' - 'storeCredit')
    || jsonb_strip_nulls(jsonb_build_object(
         'membership',  old.details -> 'membership',
         'packages',    old.details -> 'packages',
         'storeCredit', old.details -> 'storeCredit'));

  return new;
end;
$$;

create trigger clients_enforce_integrity
  before update on public.clients
  for each row execute function private.enforce_client_integrity();

-- ── Pets ────────────────────────────────────────────────────────────────────

create or replace function private.enforce_pet_integrity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_facility_id uuid;
  v_can_edit    boolean;
begin
  -- service_role: seeds and server-side jobs. Omitting this cost a test — the
  -- fixture's own INSERT ran with no JWT subject, was treated as an owner
  -- adding a pet, and had its seeded evaluation stripped before a single
  -- assertion ran. T8 then failed reporting an empty evaluation, which read
  -- like the trigger not firing and was the opposite: it fired on the seed.
  if (select auth.uid()) is null then
    return new;
  end if;

  -- Derived from the owner rather than read off the row.
  --
  -- `pets_set_facility` already does this, but relying on it here would make
  -- this function depend on trigger firing order — both are BEFORE triggers on
  -- the same table, resolved alphabetically, which is a fact nobody should have
  -- to know to read this. On INSERT the incoming facility_id is also just
  -- whatever the caller sent.
  select c.facility_id into v_facility_id
    from public.clients c
   where c.id = new.client_id;

  v_can_edit := private.has_permission(v_facility_id, 'edit_pet_records');

  if v_can_edit or private.is_platform_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- A pet arrives without the facility's assessment of it, whatever the
    -- caller attached. Status likewise: 'deceased' is not a thing you register
    -- an animal as.
    new.details := new.details - 'evaluations';
    new.status  := 'active';
    return new;
  end if;

  if new.client_id is distinct from old.client_id then
    raise exception 'Re-homing a pet is done by the facility.'
      using errcode = '42501';
  end if;

  new.status  := old.status;
  new.details := (new.details - 'evaluations')
    || jsonb_strip_nulls(jsonb_build_object(
         'evaluations', old.details -> 'evaluations'));

  return new;
end;
$$;

create trigger pets_enforce_integrity
  before insert or update on public.pets
  for each row execute function private.enforce_pet_integrity();

comment on function private.enforce_client_integrity() is
  'Column-level rules for clients. RLS says which rows; this says which columns of them.';
comment on function private.enforce_pet_integrity() is
  'Column-level rules for pets. Keeps the facility''s assessment out of the owner''s reach.';
