-- ============================================================================
-- A submission can be sent back for changes.
--
-- The facility's `form_notifications.customer.formRejectedNeedsCorrection`
-- promised to tell a customer when staff send a form back, and a submission
-- had no status for it. `changes_requested` is that status, with the note staff
-- write (`review_note`), which the customer is emailed.
--
-- Answers stay final: the customer corrects a form by submitting it again, a
-- new row. A submission sent back does not count as having the form
-- (private.missing_required_forms counts submitted, reviewed and flagged), so a
-- required form is missing again until the new one arrives.
-- ============================================================================

alter table public.form_submissions
  drop constraint form_submissions_status_check;

alter table public.form_submissions
  add constraint form_submissions_status_check
  check (status = any (array['draft', 'submitted', 'reviewed', 'flagged', 'archived', 'changes_requested']));

alter table public.form_submissions
  add column review_note text
  check (review_note is null or length(review_note) <= 1000);

do $check$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'form_submissions_status_check'
       and pg_get_constraintdef(oid) like '%changes_requested%'
  ) then
    raise exception 'changes_requested is not an allowed submission status';
  end if;
end
$check$;
