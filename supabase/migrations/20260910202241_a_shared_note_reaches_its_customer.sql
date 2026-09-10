-- ============================================================================
-- A note shared with the customer reaches the customer.
--
-- 20260910201745 stored `visibility = 'shared_with_customer'` and said a
-- customer read policy was a separate decision. It is decided here, because
-- the facility's note editor offers the switch and /customer/pets/[petId]
-- already renders shared notes (NotesList, audience="customer") — a switch
-- that reached nobody would be a promise the database did not keep.
--
-- A customer reads a note only when BOTH hold:
--   visibility is 'shared_with_customer'
--   it is about their OWN pet, their own client record or their own booking
--     — through the same own_*_ids() helpers the tag assignments use
--       (20260906221303), so no policy here evaluates another table's policy.
--
-- Incident and staff notes never reach a customer, shared or not.
-- ============================================================================

drop policy if exists notes_read on public.notes;
create policy notes_read on public.notes
  for select using (
    private.is_platform_admin()
    or private.has_permission(facility_id, private.note_permission(category, false))
    or (
      visibility = 'shared_with_customer'
      and (
        (category = 'pet' and entity_id in (select private.own_pet_ids()))
        or (category = 'customer' and entity_id in (select private.own_client_ids()))
        or (category = 'booking' and entity_id in (select private.own_booking_ids()))
      )
    )
  );

do $verify$
begin
  if (select count(*) from pg_policies where schemaname = 'public' and tablename = 'notes') <> 4 then
    raise exception 'notes should carry exactly four policies';
  end if;
  if has_table_privilege('anon', 'public.notes', 'select') then
    raise exception 'anon can read notes';
  end if;
end $verify$;
