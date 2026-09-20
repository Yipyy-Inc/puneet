-- ============================================================================
-- public.form_versions_current — the two versions a form screen actually uses.
--
-- ── WHY ───────────────────────────────────────────────────────────────────
--
-- `GET /api/forms` read EVERY version of EVERY form and then threw almost all
-- of them away: `toFormRow()` keeps exactly two — the highest-numbered
-- PUBLISHED version and the highest-numbered DRAFT — and discards the rest.
--
-- A version is frozen on publish and a new one is written on every edit, so
-- the discarded pile only ever grows. A form edited fifty times shipped fifty
-- schemas to the browser to render two.
--
-- Worse, the query was unbounded, so PostgREST capped it at 1,000 rows. Past
-- that cap a form comes back with NO version attached and renders as
-- "0 questions" — a form that looks empty rather than one that looks missing.
-- Measured 2026-09-08 there is already a facility with 525 forms.
--
-- ── WHY A VIEW AND NOT A LIMIT ────────────────────────────────────────────
--
-- A limit on the raw table cannot be shared out fairly: ordered by version,
-- one form with fifty edits eats the budget and the forms after it get
-- nothing. DISTINCT ON gives at most two rows PER FORM, so the row count is
-- bounded by the number of forms rather than by their edit history, and the
-- caller can bound it at 2x its own form limit and know it can never bite
-- first.
--
-- ── RLS ───────────────────────────────────────────────────────────────────
--
-- `security_invoker = true`, like all nine views already in this schema, so
-- `form_versions`' own policies still decide what the caller sees. The view
-- adds no reach: someone who cannot read a draft still cannot read it here.
-- Asserted in supabase/tests/form-versions-current.sql rather than assumed.
--
-- Columns are listed rather than `v.*` on purpose — a view freezes its column
-- list at creation, so a star here would silently ignore any column added to
-- `form_versions` later and the omission would be invisible.
-- ============================================================================

create or replace view public.form_versions_current
with (security_invoker = true) as
select distinct on (v.form_id, (v.published_at is not null))
       v.id,
       v.form_id,
       v.facility_id,
       v.version_number,
       v.schema,
       v.published_at,
       v.created_by,
       v.created_at
  from public.form_versions v
 order by v.form_id,
          (v.published_at is not null),
          v.version_number desc;

comment on view public.form_versions_current is
  'At most two rows per form: the highest-numbered published version and the highest-numbered draft. security_invoker, so form_versions RLS still applies.';

-- The table's own grants decide the rest; the view must not widen them.
revoke all on public.form_versions_current from public;
revoke all on public.form_versions_current from anon;
grant select on public.form_versions_current to authenticated;
grant select on public.form_versions_current to service_role;
