-- ============================================================================
-- A customer can ask whether they belong here, and the door can say it is open.
--
-- Spec 002 phase 5 built the WRITES — register_client, link_client_record,
-- allow_customer_signup — and stopped there. Nothing calls them: a pet owner
-- arriving at pawradise.yipyy.com can create a Clerk account and ends up with
-- no `clients` row at all, which is to say signed in and a stranger.
--
-- Wiring that up needs two READS the schema does not have, and both are
-- blocked by the same wall the phase-5 migration documented:
--
--   `facilities_read` admits members, existing clients and platform admins. A
--   person who is not yet a customer CANNOT turn a slug into a facility id by
--   any query available to them.
--
-- So both answers have to come from SECURITY DEFINER functions that take a
-- slug, exactly as `facility_branding_by_slug` already does for the logo.
--
-- ── 1. my_client_at(slug) — "am I a customer here?" ───────────────────────
--
-- Needed by the customer portal's gate, which must send a stranger to /join
-- rather than into a dashboard scoped to a facility they have no record at.
-- It answers ONLY about the caller, so it reveals nothing: you already know
-- whether you are a customer somewhere.
--
-- ── 2. the flag on the branding projection ────────────────────────────────
--
-- The sign-up page is signed out by definition, so it cannot read `facilities`
-- either — and it has to know whether to invite somebody to register or tell
-- them to ask the facility. The flag is inherently public: it decides what a
-- public page offers. Publishing it discloses nothing the page would not.
-- ============================================================================

-- ── Am I a customer at this facility? ──────────────────────────────────────

create or replace function public.my_client_at(p_facility_slug text)
returns uuid
language sql
stable
security definer
set search_path to ''
as $fn$
  select c.id
    from public.clients c
    join public.facilities f on f.id = c.facility_id
   where f.slug = lower(trim(p_facility_slug))
     and c.profile_id = (select auth.jwt()->>'sub')
   limit 1;
$fn$;

-- Authenticated only. `anon` asking this would be asking about nobody, and a
-- function granted to anon is one more surface to reason about for no gain.
revoke execute on function public.my_client_at(text) from public, anon;
grant execute on function public.my_client_at(text) to authenticated;

-- ── Does this facility take registrations? ─────────────────────────────────
--
-- Added to the existing projection rather than as a second anonymous function:
-- the sign-up page already fetches branding, and two anonymous lookups where
-- one would do is two things to keep in agreement.
--
-- The column list is APPENDED to. `facility_branding_by_slug` returns a TABLE,
-- and callers select by name, so adding a trailing column cannot break the
-- sign-in page that already reads it.

create or replace function public.facility_branding_by_slug(p_slug text)
returns table(
  facility_id           uuid,
  name                  text,
  slug                  text,
  logo_url              text,
  wordmark_url          text,
  primary_color         text,
  accent_color          text,
  tagline               text,
  allow_customer_signup boolean
)
language sql
stable
security definer
set search_path to ''
as $fn$
  select f.id, f.name, f.slug,
         b.logo_url, b.wordmark_url, b.primary_color, b.accent_color, b.tagline,
         f.allow_customer_signup
    from public.facilities f
    left join public.facility_branding b on b.facility_id = f.id
   where f.slug = lower(trim(p_slug))
   limit 1;
$fn$;

-- Re-granted because the function was REPLACED with a new return type, which
-- drops and recreates it. Anonymous on purpose: it is the branding of a login
-- page nobody has signed in to. Still a lookup by exact slug, never a
-- directory — `select * from facility_branding_by_slug(...)` needs the slug.
grant execute on function public.facility_branding_by_slug(text) to anon, authenticated;
