-- ============================================================================
-- A submission with nobody's name on it can be given one — once.
--
-- ── WHY THIS LOOSENS A GUARD I WROTE YESTERDAY ────────────────────────────
--
-- `private.submitted_answers_are_final` froze `client_id` outright, so that
-- "mark as reviewed" could not be used to quietly move somebody's answers onto
-- a different customer. That reasoning still holds for a REASSIGNMENT and this
-- migration keeps refusing one.
--
-- What it got wrong is the case it never separated: a submission that arrives
-- with NO client at all. Staff capture one at the counter before the person has
-- a record, and the public form route will land them the same way. Under the
-- outright freeze those answers could never be attached to anyone, which does
-- not make them safer — it makes them unusable, and the screen that was meant
-- to reconcile them had to pretend instead.
--
-- So: null -> a client is allowed, exactly once. A client -> a different client
-- is refused. A client -> null is refused. The transition is one-way, which is
-- the same shape a waiver revocation has, and for the same reason: an operation
-- that can be performed twice is an operation that can be undone quietly.
--
-- ── AND IT IS A CLIENT-RECORD CHANGE, NOT A REVIEW NOTE ───────────────────
--
-- `form_submissions_review` is gated on `view_client_documents`, because the
-- front desk marks a form read. Deciding WHOSE file these answers belong in is
-- a different act, so the trigger asks for `edit_clients` on top — the same
-- permission that authorises the insert. A VIEW permission must not authorise
-- a write, and this is the write.
--
-- The client must also belong to the submission's own facility. Without that
-- line, `edit_clients` at one facility would be enough to file answers into
-- another's client record.
-- ============================================================================

create or replace function private.submitted_answers_are_final()
returns trigger
language plpgsql
as $$
begin
  -- A draft the customer has not sent yet is still theirs to change.
  if old.status = 'draft' then
    return new;
  end if;

  if new.answers is distinct from old.answers then
    raise exception
      'Those answers have been submitted and cannot be edited. They are the record of what the person said.'
      using errcode = '42501';
  end if;

  if new.form_version_id is distinct from old.form_version_id
     or new.submitted_at is distinct from old.submitted_at
     or new.submitted_by is distinct from old.submitted_by
  then
    raise exception
      'A submission cannot be re-dated or re-versioned. Only its review state changes.'
      using errcode = '42501';
  end if;

  if new.client_id is distinct from old.client_id then
    -- The one permitted transition: nobody -> somebody.
    if old.client_id is not null then
      raise exception
        'These answers are already filed under a customer. They cannot be moved to another one.'
        using errcode = '42501';
    end if;

    if new.client_id is null then
      raise exception
        'A submission cannot be un-filed once it has been attached to a customer.'
        using errcode = '42501';
    end if;

    if not private.has_permission(new.facility_id, 'edit_clients') then
      raise exception
        'Filing answers under a customer changes their record, which needs permission to edit clients.'
        using errcode = '42501';
    end if;

    if not exists (
      select 1 from public.clients c
       where c.id = new.client_id
         and c.facility_id = new.facility_id
    ) then
      raise exception
        'That customer belongs to a different facility.'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
