-- ============================================================================
-- A customer's request gets an ANSWER.
--
-- `customer_request` ('note' | 'change_dates' | 'cancel_request') has been on
-- notes since 20260919170912, widened for cancellations in 20260922180000.
-- A customer could ask; nothing recorded whether anybody answered, so a
-- request sat in the booking's notes forever and the only way to know it had
-- been dealt with was to look at the booking and infer.
--
-- ── WHY THIS IS COLUMNS AND NOT A FUNCTION ───────────────────────────────
--
-- The obvious shape is a SECURITY DEFINER rpc that decides and replies in one
-- transaction. It is not worth a new definer surface: `notes_update` already
-- says who may write a booking note, `private.guard_customer_request` already
-- stops anyone rewriting `customer_request` itself (on UPDATE it restores the
-- old value), and the decision is an ordinary staff write to a row staff
-- already own.
--
-- So the route does two writes in the order that fails safely — the REPLY
-- first, the decision second. Reply fails: nothing is decided, staff retry.
-- Decision fails after the reply: the customer has their answer and the
-- request still reads as pending, so staff retry and the worst case is a
-- second reply. The other order loses the explanation and tells nobody.
--
-- ── APPROVING A CANCELLATION IS NOT A SECOND WAY TO CANCEL ───────────────
--
-- `approved` records that staff agreed, and nothing here touches the booking.
-- The cancel goes through the path that already exists, where
-- `cancellation_terms` decides what it costs and staff see the figure before
-- they commit it. A second route that cancels would be a second thing to keep
-- in step with the policy engine, and that is the defect this whole area was
-- built to remove.
--
-- A request on a booking that is already cancelled is spent whatever these
-- columns say. The list derives that rather than storing it, so a staff
-- cancellation by any route settles the request without bookkeeping.
-- ============================================================================

alter table public.notes
  add column if not exists customer_request_decision text,
  add column if not exists customer_request_decided_at timestamptz,
  add column if not exists customer_request_decided_by text;

alter table public.notes drop constraint if exists notes_request_decision_check;
alter table public.notes add constraint notes_request_decision_check
  check (customer_request_decision is null
         or customer_request_decision = any (array['approved'::text, 'declined'::text]));

-- A decision belongs to a request. Without this, a plain note could carry one
-- and the pending list would have to defend itself against rows that mean
-- nothing.
alter table public.notes drop constraint if exists notes_decision_needs_request;
alter table public.notes add constraint notes_decision_needs_request
  check (customer_request_decision is null
         or (customer_request is not null and customer_request <> 'note'));

-- Decided implies when and by whom, so an audit that asks "who answered this"
-- always has a row to point at.
alter table public.notes drop constraint if exists notes_decision_is_attributed;
alter table public.notes add constraint notes_decision_is_attributed
  check ((customer_request_decision is null
          and customer_request_decided_at is null
          and customer_request_decided_by is null)
      or (customer_request_decision is not null
          and customer_request_decided_at is not null
          and customer_request_decided_by is not null));

-- The pending list reads "requests on this facility, not yet decided". Narrow
-- and partial: the vast majority of notes carry no request at all.
create index if not exists notes_pending_customer_request_idx
  on public.notes (facility_id, created_at desc)
  where customer_request is not null
    and customer_request <> 'note'
    and customer_request_decision is null;

comment on column public.notes.customer_request_decision is
  'approved | declined — staff''s answer to a change_dates or cancel_request note. Approving a cancellation records agreement; the cancel itself goes through the policy-aware path.';
