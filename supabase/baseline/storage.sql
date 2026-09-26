-- Storage buckets and policies, read from production by `bun run db:local:pull`.
-- `supabase db dump` leaves the storage schema out. Generated; do not edit.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('client-documents', 'client-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/heic']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('facility-logos', 'facility-logos', true, 2097152, array['image/png','image/jpeg','image/webp']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('grooming-photos', 'grooming-photos', false, 10485760, array['image/png','image/jpeg','image/heic']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('merchant-applications', 'merchant-applications', false, 10485760, array['application/pdf','image/png','image/jpeg','image/heic']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('report-card-photos', 'report-card-photos', false, 10485760, array['image/png','image/jpeg','image/heic','image/webp']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('staff-documents', 'staff-documents', false, 10485760, array['application/pdf','image/png','image/jpeg','image/heic']::text[]) on conflict (id) do nothing;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('yipyy-go-photos', 'yipyy-go-photos', false, 10485760, array['image/png','image/jpeg','image/heic']::text[]) on conflict (id) do nothing;

create policy "client_documents_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'client-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'edit_clients'::text)))));
create policy "client_documents_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'client-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'edit_clients'::text)))));
create policy "client_documents_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'client-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'view_client_documents'::text)))));
create policy "facility_logos_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'facility-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'settings_general'::text)))));
create policy "facility_logos_object_read" on storage.objects as permissive for select to "anon", "authenticated" using ((bucket_id = 'facility-logos'::text));
create policy "facility_logos_object_update" on storage.objects as permissive for update to "authenticated" using (((bucket_id = 'facility-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'settings_general'::text)))));
create policy "facility_logos_object_write" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'facility-logos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'settings_general'::text)))));
create policy "grooming_photos_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'grooming-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'edit_bookings'::text)))));
create policy "grooming_photos_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'grooming-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'edit_bookings'::text)))));
create policy "grooming_photos_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'grooming-photos'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'view_bookings'::text)))));
create policy "merchant_documents_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'merchant-applications'::text) AND (EXISTS ( SELECT 1
   FROM public.merchant_applications a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[2]) AND (a.created_by = ( SELECT (auth.jwt() ->> 'sub'::text))) AND (a.status = ANY (ARRAY['draft'::text, 'more_info_needed'::text])))))));
create policy "merchant_documents_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'merchant-applications'::text) AND (private.is_platform_admin() OR (EXISTS ( SELECT 1
   FROM public.merchant_applications a
  WHERE (((a.id)::text = (storage.foldername(objects.name))[2]) AND (a.created_by = ( SELECT (auth.jwt() ->> 'sub'::text)))))))));
create policy "report_card_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'report-card-photos'::text) AND ((storage.foldername(name))[2] IN ( SELECT (c.id)::text AS id
   FROM public.report_cards c
  WHERE private.may_send_report_card(c.facility_id, c.service_type)))));
create policy "report_card_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'report-card-photos'::text) AND ((storage.foldername(name))[2] IN ( SELECT (c.id)::text AS id
   FROM public.report_cards c
  WHERE private.may_send_report_card(c.facility_id, c.service_type)))));
create policy "report_card_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'report-card-photos'::text) AND (((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'view_pet_records'::text))) OR ((storage.foldername(name))[2] IN ( SELECT (c.id)::text AS id
   FROM public.report_cards c
  WHERE (c.client_id IN ( SELECT private.own_client_ids() AS own_client_ids)))))));
create policy "staff_documents_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'staff-documents'::text) AND ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'manage_staff'::text)))));
create policy "staff_documents_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'staff-documents'::text) AND (((storage.foldername(name))[2] IN ( SELECT (s.id)::text AS id
   FROM public.staff s
  WHERE (s.id IN ( SELECT private.own_staff_ids() AS own_staff_ids)))) OR ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'manage_staff'::text))))));
create policy "staff_documents_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'staff-documents'::text) AND (((storage.foldername(name))[2] IN ( SELECT (s.id)::text AS id
   FROM public.staff s
  WHERE (s.id IN ( SELECT private.own_staff_ids() AS own_staff_ids)))) OR ((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'manage_staff'::text))))));
create policy "yipyy_go_photos_object_delete" on storage.objects as permissive for delete to "authenticated" using (((bucket_id = 'yipyy-go-photos'::text) AND ((((storage.foldername(name))[1] || '/'::text) || (storage.foldername(name))[2]) IN ( SELECT (((y.facility_id)::text || '/'::text) || (y.id)::text)
   FROM public.yipyy_go_submissions y
  WHERE private.yipyy_go_owner_may_attach(y.id)))));
create policy "yipyy_go_photos_object_insert" on storage.objects as permissive for insert to "authenticated" with check (((bucket_id = 'yipyy-go-photos'::text) AND ((((storage.foldername(name))[1] || '/'::text) || (storage.foldername(name))[2]) IN ( SELECT (((y.facility_id)::text || '/'::text) || (y.id)::text)
   FROM public.yipyy_go_submissions y
  WHERE private.yipyy_go_owner_may_attach(y.id)))));
create policy "yipyy_go_photos_object_read" on storage.objects as permissive for select to "authenticated" using (((bucket_id = 'yipyy-go-photos'::text) AND (((storage.foldername(name))[1] IN ( SELECT (f.id)::text AS id
   FROM public.facilities f
  WHERE private.has_permission(f.id, 'view_bookings'::text))) OR ((storage.foldername(name))[2] IN ( SELECT (y.id)::text AS id
   FROM public.yipyy_go_submissions y
  WHERE (y.client_id IN ( SELECT private.own_client_ids() AS own_client_ids)))))));
