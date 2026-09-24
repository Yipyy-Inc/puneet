-- ============================================================================
-- A SERVICE PICTURE IS UPLOADED, NOT PASTED.
--
-- Every screen that lets a facility put a photo on something they sell asked
-- for an IMAGE URL: a text box with `https://images.example.com/full-groom.jpg`
-- in it. That is not a thing a groomer has. To use it they would need to host
-- the picture somewhere public first, which means they either do not bother or
-- they paste a link to somebody else's server that can vanish, rate-limit, or
-- start serving something else entirely.
--
-- Client feedback, 2026-09-24, and it is right: let people choose a file.
--
-- ── WHY A NEW BUCKET RATHER THAN facility-logos ───────────────────────────
--
-- `facility-logos` is gated on `settings_general` — the permission for the
-- business profile. Menu pictures are gated on `manage_services`, because
-- authoring a menu is the job that puts them there, and it is the same split
-- the service tables themselves use: `manage_services` writes the service,
-- `manage_rates` writes its price.
--
-- Reusing the logo bucket would mean anybody who may edit a service could also
-- overwrite the mark on the facility's invoices.
--
-- ── IT IS PUBLIC, AND THAT IS THE POINT ───────────────────────────────────
--
-- These pictures are shown to CUSTOMERS choosing a service, including on the
-- public `book/` token routes where nobody is signed in. A signed-URL bucket
-- would mean every card on the booking wizard waits on a round trip that can
-- expire mid-page. Same decision `facility-logos` already made, for the same
-- reason, and the read policy admits `anon` deliberately.
--
-- Nothing private belongs here: a picture of a grooming suite is marketing.
-- The WRITE side is where the tenancy boundary is, and it is the first folder
-- segment — the facility id — exactly as the logo policies key on it.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-images',
  'service-images',
  true,
  -- 5 MB. Larger than a logo because these are photographs of rooms and
  -- animals rather than a mark, and smaller than the 10 MB document buckets
  -- because a menu card renders at a few hundred pixels.
  5242880,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- ── Read: anybody, including a customer who is not signed in ──────────────

drop policy if exists service_images_object_read on storage.objects;
create policy service_images_object_read on storage.objects
  for select to authenticated, anon
  using (bucket_id = 'service-images');

-- ── Write, update, delete: the facility's own folder, manage_services ─────
--
-- `(storage.foldername(name))[1]` is the first path segment and it IS the
-- tenancy boundary — not a tidy convention. A path that does not start with a
-- facility the caller may manage services for matches nothing here and the
-- upload is refused.

drop policy if exists service_images_object_write on storage.objects;
create policy service_images_object_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'manage_services')
    )
  );

drop policy if exists service_images_object_update on storage.objects;
create policy service_images_object_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'manage_services')
    )
  );

drop policy if exists service_images_object_delete on storage.objects;
create policy service_images_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'service-images'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'manage_services')
    )
  );

comment on table storage.buckets is
  'Storage buckets. `service-images` (20260924240000) is public on purpose: '
  'menu pictures are drawn on the customer booking wizard, including the '
  'signed-out token routes. Its write side is scoped by the first path '
  'segment, which is the facility id.';
