-- ============================================================================
-- Every staff row gets the id the rest of the application keys people by.
--
-- ── THE BUG ───────────────────────────────────────────────────────────────
--
-- POST /api/staff mints a fresh `fs-*` legacy_id for every hire it creates,
-- and says why: 47 files still key people by that shape, so a person whose id
-- does not look like the others goes quietly missing from whichever screen has
-- not moved onto the API yet.
--
-- `provision_facility` inserts the OWNER'S staff row directly and does not.
-- Both provisioned owners currently have legacy_id = null, while all 23 seeded
-- staff have one.
--
-- That is not cosmetic, because of how the two layers disagree about it:
--
--   src/lib/api/mappers/staff.ts:61   id: row.legacy_id ?? row.id
--   src/app/api/staff/[id]/invite     .eq("legacy_id", staffLegacyId)
--                                     p_staff_legacy_id: staff.legacy_id!
--
-- The mapper falls back to the uuid, so the owner's card renders with a uuid
-- as its id. The invite route then looks that uuid up in `legacy_id`, finds
-- nothing — and even if it did, it passes `staff.legacy_id!` to the RPC, which
-- is null.
--
-- So the Invite action on a facility owner's own card fails, on exactly one row
-- per facility, and it is the row most likely to be used: the owner resending
-- their own invitation, or a manager inviting the person who runs the business.
--
-- ── A TRIGGER, NOT A LINE IN provision_facility ───────────────────────────
--
-- Same reasoning as the audit triggers. provision_facility is one writer;
-- migrations, seeds, imports and a support engineer with psql are others, and
-- each of them can create a staff row. A default-on-insert covers all of them
-- and cannot be forgotten by the next writer.
--
-- The shape matches what the route mints — `fs-` plus eight hex characters —
-- because the 47 files above pattern-match on it.
-- ============================================================================

create or replace function private.staff_legacy_id_default()
returns trigger
language plpgsql
as $fn$
begin
  if new.legacy_id is null or trim(new.legacy_id) = '' then
    -- new.id is already populated: column defaults are applied before BEFORE
    -- INSERT triggers fire, so this is the row's real uuid rather than null.
    new.legacy_id := 'fs-' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;
  return new;
end;
$fn$;

drop trigger if exists staff_legacy_id_default on public.staff;
create trigger staff_legacy_id_default
  before insert on public.staff
  for each row execute function private.staff_legacy_id_default();

-- ── The rows already missing one ───────────────────────────────────────────
--
-- Narrow: only rows with no legacy_id at all. Nothing that already has one is
-- touched, because 47 files key people by the existing value and changing it
-- would orphan them from every screen at once.

update public.staff
   set legacy_id = 'fs-' || substr(replace(id::text, '-', ''), 1, 8)
 where legacy_id is null or trim(legacy_id) = '';
