-- ============================================================================
-- The suite takes its report cards back out.
--
-- ── WHY A PURGE AND NOT A CLEANER SPEC ────────────────────────────────────
--
-- `tests/e2e/report-cards.spec.ts` deletes every DRAFT it creates, which
-- 20260822340000 allows. It cannot delete the one card it SENDS, and that
-- refusal is correct: a sent card is a thing the owner received, and it carries
-- their reply and rating.
--
-- The usual answer to "a row my spec creates cannot be deleted" is to make it
-- INERT at creation — the way `loyalty-redemptions.spec.ts` issues its probe
-- voucher already expired and at zero points, so it can never come off a bill.
-- There is no inert report card. Being sent IS being visible in the owner's
-- portal; there is no equivalent of a zero-value expired reward.
--
-- So the same route `purge_e2e_bookings` took on 2026-08-20: a service_role
-- function that removes what the application must not be able to remove. One
-- sent card per CI run, on a demo client, otherwise accrues forever.
--
-- ── IT MATCHES ALMOST NOTHING, DELIBERATELY ───────────────────────────────
--
-- No argument, so there is no pattern for a caller to get wrong. It can only
-- ever match a card whose generated opening line begins "E2E: ", which is
-- written by the spec and by nothing a facility can type — the report-card form
-- composes that section from the facility's own templates.
--
-- And it refuses any card a CUSTOMER has touched. If a real person opened,
-- favourited, replied to or rated it, then whatever it is, it is not test
-- residue, and the reply and rating are theirs rather than the suite's. That
-- check is redundant against the prefix and is here anyway: the safety belongs
-- in the function, because the function is the thing that cannot be called
-- carelessly.
--
-- Photos cascade with the row. The objects in the bucket do not — Storage and
-- Postgres share no transaction — so the bytes are collected separately; this
-- deliberately does not reach into `storage.objects`, where a wrong predicate
-- would destroy a facility's real photographs.
-- ============================================================================

create or replace function public.purge_e2e_report_cards()
returns integer
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_deleted integer;
begin
  with removable as (
    select c.id
      from public.report_cards c
     where c.generated->>'todaysVibe' like 'E2E: %'
       -- Untouched by the person it was addressed to.
       and c.viewed_at is null
       and c.reply_message is null
       and c.rating_submitted_at is null
       and c.favourite = false
  )
  delete from public.report_cards t
   using removable r
   where t.id = r.id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$fn$;

comment on function public.purge_e2e_report_cards() is
  'YES, THIS DELETES SENT REPORT CARDS — that is the point, and it is why it is service_role only. A sent card has no DELETE policy for anyone, deliberately, because the owner received it; the suite therefore cannot clean up the one card it sends per run. Takes no argument on purpose, so there is no pattern for a caller to widen: it can only ever match generated->>''todaysVibe'' like ''E2E: %'', which the report-card form cannot produce, and never a card a customer has opened, replied to, rated or favourited. Run by scripts/purge-e2e-bookings.ts after a suite run.';

-- ── The grant is the boundary ─────────────────────────────────────────────
--
-- Same rule as `purge_e2e_bookings`: SECURITY DEFINER because a sent card has
-- no DELETE policy for anyone, and EXECUTE to `service_role` alone — a value no
-- browser holds and no app route needs. Nothing in src/ calls this.
--
-- `anon` is named explicitly in the revoke. Revoking from `public` does not
-- remove it: Supabase grants execute on every function in `public` to anon by
-- default privilege, which is the trap 20260805210403 documents and which
-- 20260822320000 had to correct for the report-card RPCs a few hours ago.
revoke all on function public.purge_e2e_report_cards() from public, anon, authenticated;
grant execute on function public.purge_e2e_report_cards() to service_role;
