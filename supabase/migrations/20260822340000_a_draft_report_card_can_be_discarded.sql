-- ============================================================================
-- A draft report card can be discarded. A sent one cannot.
--
-- 20260822300000 gave `report_cards` no DELETE policy at all, which made every
-- card permanent from the moment it was created — including one written
-- against the wrong pet and noticed immediately. The facility's only recourse
-- was to send it anyway or leave a wrong card in the list forever.
--
-- ── WHY THE LINE IS AT `sent` AND NOT SOMEWHERE ELSE ──────────────────────
--
-- Before it is sent, a card is the facility's working copy: nobody outside the
-- building has seen it, and deleting it destroys nothing anyone was told.
--
-- After it is sent, it is a thing the owner RECEIVED. It appears in their
-- portal, they may have read it, favourited it, replied to it or rated it —
-- `reply_message` and `rating_stars` live on this row, so erasing the card
-- would erase what the customer said about it. A facility that regrets a sent
-- card is asking to unsay something, and that is not a delete.
--
-- The predicate is in the POLICY rather than in a route, so it holds for
-- PostgREST and for any future caller, and so "which cards can be destroyed"
-- is answered in the same place as "who may write one".
--
-- Same service-specific permission as writing: `may_send_report_card`. Being
-- able to discard a daycare draft does not make somebody a boarding attendant.
-- ============================================================================

drop policy if exists report_cards_delete on public.report_cards;
create policy report_cards_delete on public.report_cards
  for delete using (
    delivery_status <> 'sent'
    and private.may_send_report_card(facility_id, service_type)
  );

comment on table public.report_cards is
  'One report card per pet per visit. `input` is the staff''s answers, `generated` the prose built from them. The owner''s columns (viewed_at, favourite, reply_message, rating_*) are written only by the SECURITY DEFINER functions in 20260822300000 — no customer UPDATE policy exists. A card can be deleted only while it is unsent; once sent it is something the owner received, and it carries their reply and rating.';
