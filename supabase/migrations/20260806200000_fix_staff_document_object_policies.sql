-- ============================================================================
-- FIX: the staff-documents storage policies have never matched for a manager.
--
-- 20260804090000 wrote all three object policies with a `manage_staff` arm of
-- the shape:
--
--   exists (select 1 from public.facilities f
--            where f.id::text = (storage.foldername(name))[1]
--              and private.has_permission(f.id, 'manage_staff'))
--
-- `public.facilities` HAS A COLUMN CALLED `name`. Inside that subquery the
-- unqualified `name` binds to the FACILITY's name, not the storage object's, so
-- the predicate compares a facility's id against a segment of its own name and
-- is false for every row. Nothing raises; the access is simply denied.
--
-- ── WHAT WAS ACTUALLY BROKEN ───────────────────────────────────────────────
--
--   read    the employee's own-prefix arm works, so a hire can still read their
--           own uploads. The MANAGER arm never matched — `manage_staff` could
--           not read anything in the bucket.
--   insert  same split: an employee could upload to their own prefix, a manager
--           could not upload on someone's behalf.
--   delete  the manager arm is the ONLY arm, so NOBODY could delete a staff
--           document. 20260804090000 says in its own header that documents are
--           "deletable by manage_staff" precisely so a passport scan can be
--           destroyed on request. That has never worked.
--
-- It fails CLOSED, so this is a functionality bug and not a leak — no one ever
-- saw a file they should not have. It is still worth its own migration rather
-- than a quiet edit, because it CHANGES WHO CAN REACH EXISTING FILES: after
-- this, `manage_staff` holders can read, upload and delete in that bucket, which
-- is what the original design intended and what the table policies have been
-- allowing all along.
--
-- ── THE FIX, AND WHY THIS SHAPE ────────────────────────────────────────────
--
-- The segment is computed in the OUTER scope and compared against a SET of
-- facility ids. That removes the shadowing entirely rather than papering over it
-- with a qualified `objects.name` — there is no ambiguity left to get wrong the
-- next time somebody edits this.
--
-- The employee arm is unchanged. It already computes `(storage.foldername(
-- name))[2]` outside its subquery, which is exactly why it worked.
--
-- Found while writing the equivalent policies for `grooming-photos`
-- (20260806180000), where the same mistake was made and caught by a test that
-- asserts the POSITIVE case — "a facility CAN upload under its own prefix" —
-- alongside the negative one. The negative assertion had been passing
-- vacuously.
-- ============================================================================

drop policy if exists staff_documents_object_read on storage.objects;
create policy staff_documents_object_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'staff-documents'
    and (
      -- your own prefix
      (storage.foldername(name))[2] in (
        select s.id::text from public.staff s
         where s.id in (select private.own_staff_ids())
      )
      -- or a facility you administer
      or (storage.foldername(name))[1] in (
        select f.id::text from public.facilities f
         where private.has_permission(f.id, 'manage_staff')
      )
    )
  );

drop policy if exists staff_documents_object_insert on storage.objects;
create policy staff_documents_object_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'staff-documents'
    and (
      (storage.foldername(name))[2] in (
        select s.id::text from public.staff s
         where s.id in (select private.own_staff_ids())
      )
      or (storage.foldername(name))[1] in (
        select f.id::text from public.facilities f
         where private.has_permission(f.id, 'manage_staff')
      )
    )
  );

drop policy if exists staff_documents_object_delete on storage.objects;
create policy staff_documents_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'staff-documents'
    -- Manager-only, as originally intended: the uploader must not be able to
    -- quietly remove what they submitted (20260804090000, "append-only for the
    -- employee").
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'manage_staff')
    )
  );
