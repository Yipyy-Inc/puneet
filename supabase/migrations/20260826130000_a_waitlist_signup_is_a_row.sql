-- ============================================================================
-- The waitlist behind the coming-soon page.
--
-- ── WHY THIS IS A TABLE AND NOT A MAILTO ──────────────────────────────────
--
-- The page tells whoever fills the form "You're on the list." That sentence has
-- to be true. A form that prints it and stores nothing is precisely the defect
-- `bun run check:success-claims` exists to catch, and this codebase has deleted
-- two such screens already rather than repair them.
--
-- ── NOBODY READS THIS EXCEPT A PLATFORM ADMIN ─────────────────────────────
--
-- Every row is a named person at a named business with their phone number: it
-- is a sales list and a small pile of personal data, and it belongs to Yipyy
-- rather than to any facility. So there is no facility_id, no per-tenant policy,
-- and the only SELECT policy is `private.is_platform_admin()`.
--
-- ── AND NOBODY WRITES IT FROM A BROWSER ───────────────────────────────────
--
-- The visitor filling this form has no session at all. The obvious move — a
-- SECURITY DEFINER function granted to `anon` — is the exact shape
-- `supabase/tests/rpc-session-required.sql` was written to forbid, after two
-- shipped RPCs turned out to be reachable from the publishable key that ships
-- in every browser bundle.
--
-- So there is NO insert policy and no grant to anon. `POST /api/waitlist`
-- writes with the service role, having already validated the body and throttled
-- the caller. The front door is a route handler we control, not a table.
-- ============================================================================

create table if not exists public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  facility_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  -- Which page sent them, so a second campaign is distinguishable from this one
  -- without guessing from timestamps.
  source text not null default 'coming-soon',
  -- Free text for whoever works the list. Never written by the public route.
  note text,
  created_at timestamptz not null default now()
);

comment on table public.waitlist_signups is
  'Facilities who asked to be told when Yipyy launches. Written only by the service role via /api/waitlist; readable only by platform admins.';

-- ── ONE ROW PER EMAIL ──────────────────────────────────────────────────────
--
-- Somebody who submits twice is not two leads, and the route treats a conflict
-- as success — "you're on the list" is still true the second time. Lower(), so
-- Sam@x.com and sam@x.com are the same person.
create unique index if not exists waitlist_signups_email_once
  on public.waitlist_signups (lower(email));

-- Worked newest-first by whoever is following these up.
create index if not exists waitlist_signups_created_at_idx
  on public.waitlist_signups (created_at desc);

alter table public.waitlist_signups enable row level security;
-- FORCED, so the table owner is not quietly exempt from its own policy. The
-- read side of this table is a privacy boundary, not a convenience.
alter table public.waitlist_signups force row level security;

-- No grants to the browser-facing roles at all. `anon` is the publishable key,
-- and `authenticated` is every signed-in customer and staff member at every
-- facility — none of whom have any business reading Yipyy's sales pipeline.
revoke all on public.waitlist_signups from anon;
revoke all on public.waitlist_signups from public;

drop policy if exists waitlist_signups_read on public.waitlist_signups;
create policy waitlist_signups_read on public.waitlist_signups
  for select to authenticated
  using (private.is_platform_admin());

-- Deliberately absent: INSERT, UPDATE and DELETE policies. With RLS forced and
-- no policy, `authenticated` and `anon` cannot write a row by any route. The
-- service role bypasses RLS and is the only writer, which is what makes the
-- API route the single front door rather than one of two.

-- ── TWO LAYERS, NOT ONE ────────────────────────────────────────────────────
--
-- RLS with no INSERT policy already refuses an authenticated writer. The GRANT
-- goes too, so the refusal does not depend on a single mechanism staying
-- correct — this repo has paid for "a revoke is not verified by having been
-- written" more than once, so both are asserted in the SQL test.
--
-- SELECT is deliberately KEPT: `authenticated` is the role a platform admin
-- browses as, and the read policy above is what narrows it to them.
revoke insert, update, delete, truncate on public.waitlist_signups from authenticated;
