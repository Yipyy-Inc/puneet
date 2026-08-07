-- ============================================================================
-- A facility has a face.
--
-- Spec 002, phase 3. `facilities` carries id, org_id, name, slug, timezone and
-- legacy_id — nothing a branded login page could render. D2 puts every facility
-- on its own subdomain, and a subdomain that shows Yipyy's logo is not a
-- white-label product.
--
-- ── A SEPARATE TABLE, NOT COLUMNS ON `facilities` ─────────────────────────
--
-- Because of who is allowed to read it. A login page is signed out by
-- definition, so the branding has to be reachable with no session at all —
-- while `facilities` holds tenancy the anon role must never see, and will hold
-- more of it as this grows. Splitting them means the public projection can
-- never accidentally widen when someone adds a column.
-- ============================================================================

create table if not exists public.facility_branding (
  facility_id   uuid primary key references public.facilities(id) on delete cascade,
  logo_url      text,
  wordmark_url  text,
  primary_color text,
  accent_color  text,
  support_email text,
  support_phone text,
  tagline       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Rendered straight into a style attribute. A check here is cheaper than
  -- trusting every future caller to sanitise it, and there is exactly one
  -- correct shape.
  constraint facility_branding_primary_color_is_hex
    check (primary_color is null or primary_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint facility_branding_accent_color_is_hex
    check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$')
);

drop trigger if exists facility_branding_set_updated_at on public.facility_branding;
create trigger facility_branding_set_updated_at
  before update on public.facility_branding
  for each row execute function private.set_updated_at();

alter table public.facility_branding enable row level security;

-- Direct table reads stay scoped exactly like the facility itself: staff see
-- their own facility's branding in the app shell. The signed-out case does NOT
-- go through this policy — see the function below.
drop policy if exists facility_branding_read on public.facility_branding;
create policy facility_branding_read on public.facility_branding
  for select to authenticated
  using (
    private.is_platform_admin()
    or facility_id in (select private.member_facility_ids())
  );

drop policy if exists facility_branding_insert on public.facility_branding;
create policy facility_branding_insert on public.facility_branding
  for insert to authenticated
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_general')
  );

drop policy if exists facility_branding_update on public.facility_branding;
create policy facility_branding_update on public.facility_branding
  for update to authenticated
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_general')
  )
  with check (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'settings_general')
  );

-- No delete policy. Branding dies with its facility (on delete cascade); there
-- is no reason to remove it while the facility exists, and "the login page went
-- blank" is a bad thing to make one click away.

-- ── The signed-out projection ──────────────────────────────────────────────
--
-- The plan said "make facility_branding readable by anon". That does not work
-- and would have been worse if it did:
--
--   IT DOES NOT WORK. A visitor at pawradise.yipyy.com has a SLUG, and the slug
--   lives on `facilities`, whose read policy admits members, clients and
--   platform admins — not anon. An anon-readable branding table still could not
--   be reached, because nothing could turn the slug into a facility_id.
--
--   IT WOULD BE WORSE. A readable table is a listable one: `select * from
--   facility_branding` hands over every facility on the platform. This takes an
--   EXACT slug and answers about one facility, so it is a lookup rather than a
--   directory. Guessing slugs one at a time is still possible and is fine —
--   these are names on a shopfront.
--
-- What it returns is deliberately narrow. `support_email` and `support_phone`
-- are NOT here: they are for signed-in screens, and a public function is the
-- wrong place to publish a facility's contact details for scraping.

create or replace function public.facility_branding_by_slug(p_slug text)
returns table (
  facility_id   uuid,
  name          text,
  slug          text,
  logo_url      text,
  wordmark_url  text,
  primary_color text,
  accent_color  text,
  tagline       text
)
language sql
stable
security definer
set search_path to ''
as $fn$
  select f.id, f.name, f.slug,
         b.logo_url, b.wordmark_url, b.primary_color, b.accent_color, b.tagline
    from public.facilities f
    left join public.facility_branding b on b.facility_id = f.id
   where f.slug = lower(trim(p_slug))
   limit 1;
$fn$;

-- Anon by design: this is what a signed-out login page calls.
grant execute on function public.facility_branding_by_slug(text) to anon, authenticated;

-- ── Logos ──────────────────────────────────────────────────────────────────
--
-- A PUBLIC bucket, and a deliberate departure from the private-bucket rule that
-- governs staff-documents and grooming-photos. Those hold a person's medical
-- notes and a customer's pet; this holds a business's shopfront logo, rendered
-- on a page nobody has signed in to. A signed URL cannot exist there — there is
-- no session to sign it with.
--
-- NO SVG. An SVG is a document that can carry script, and this bucket is served
-- to anonymous visitors. It is hosted on the Storage origin rather than
-- yipyy.com, so it is not an XSS against the app — but "we host arbitrary
-- attacker-supplied documents on our domain" is not a sentence worth earning
-- for a file format nobody needs for a logo.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'facility-logos',
  'facility-logos',
  true,
  2097152,  -- 2 MB. A logo that needs more than this is the wrong asset.
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Same path convention as the other two buckets: {facility_id}/{file}. The
-- first segment IS the tenancy boundary, which is what the policies below key
-- on.

drop policy if exists facility_logos_object_read on storage.objects;
create policy facility_logos_object_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'facility-logos');

drop policy if exists facility_logos_object_write on storage.objects;
create policy facility_logos_object_write on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'settings_general')
    )
  );

drop policy if exists facility_logos_object_update on storage.objects;
create policy facility_logos_object_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'settings_general')
    )
  );

drop policy if exists facility_logos_object_delete on storage.objects;
create policy facility_logos_object_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'facility-logos'
    and (storage.foldername(name))[1] in (
      select f.id::text from public.facilities f
       where private.has_permission(f.id, 'settings_general')
    )
  );
