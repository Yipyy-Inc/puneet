-- ============================================================================
-- A guest journal's free-text note is a Daily Care record.
--
-- Kind journal_note, subject the booking ref, occurred_on the day it belongs
-- to. It was one browser tab's memory (src/data/journal-notes-store.ts), so a
-- note like "Owner called — told them Bella is doing great" was gone for the
-- next shift.
--
-- Additive: the kind check gains one value. The existing policies already
-- cover it — read and write with view_pet_records in the facility, and the
-- delete policy stays flags-only, so a journal note, like a shift note, is a
-- record rather than a toggle. Many per guest per day: the one-per-subject
-- index is limited to pet_flag and head_count.
-- ============================================================================

alter table public.daily_care_records
  drop constraint if exists daily_care_records_kind_check;
alter table public.daily_care_records
  add constraint daily_care_records_kind_check
  check (kind in ('shift_note', 'pet_flag', 'head_count', 'journal_note'));

create index if not exists daily_care_records_subject_idx
  on public.daily_care_records (facility_id, kind, subject);

do $verify$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'daily_care_records_kind_check'
       and pg_get_constraintdef(oid) like '%journal_note%'
  ) then
    raise exception 'journal_note is not an allowed kind';
  end if;
end $verify$;
