-- ============================================================================
-- A CUSTOMER SIGNED IN AT yipyy.com COULD NEVER BE LINKED TO THEIR RECORD.
--
-- `/api/clients/me` heals a missing `clients.profile_id` by calling
-- `link_client_record(slug)` — but ONLY when a facility slug is present, and
-- `proxy.ts` stamps an EMPTY slug on the apex. So the self-heal ran on
-- `<facility>.yipyy.com` and never on `yipyy.com`, which is the address a
-- customer is most likely to be given.
--
-- The customer then gets `{ linked: false }`, and every consequence of that
-- reads like a different bug:
--
--   * the portal shows no pets, so booking says "no pet added";
--   * "Add a pet" posts `clientId: undefined` and is refused 422 "A pet needs
--     an owner", which reads as "it won't let me";
--   * a pet the FACILITY added to their record is invisible, because the
--     record itself is.
--
-- Reported by the client on 2026-09-21 as three separate complaints. Measured
-- the same day: client ref 855 at doggieville-mtl carries
-- `singhparminder360@gmail.com` and a dog called Bubu, `profile_id` is null,
-- and a profile with that exact address exists with ZERO linked client rows.
-- The row was still unclaimed AFTER they had tried, which is what proves the
-- heal never ran rather than having run and failed.
--
-- ── WHY NOT SIMPLY CLAIM EVERYWHERE ───────────────────────────────────────
--
-- Because that is the defect spec 002 phase 5 removed: the old unscoped call
-- claimed a row at EVERY facility whose records carried that address, in one
-- unasked-for sweep. A facility that mistypes a customer's email creates a row
-- addressed to somebody else, and claiming it hands that stranger the row's
-- pets and bookings. Visiting a facility's own address is at least a statement
-- of intent; the apex carries none.
--
-- So this claims AT MOST ONE, and only when exactly one unclaimed row matches.
-- Two or more is ambiguous, and an ambiguous claim is the one that can be
-- wrong, so it claims nothing and the caller still gets `{ linked: false }` —
-- the same answer as today, for the case that actually needed thought.
--
-- It reuses `private.link_client_at()` for the claim itself rather than
-- repeating the update, so there is one place where a row changes hands.
-- ============================================================================

create or replace function public.link_my_client_record()
returns uuid
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_user_id  text := (select auth.jwt()->>'sub');
  v_email    text;
  v_existing uuid;
  v_facility uuid;
  v_matches  integer;
begin
  if v_user_id is null then
    return null;
  end if;

  select p.email into v_email
    from public.profiles p
   where p.id = v_user_id;
  if v_email is null then
    return null;
  end if;

  -- Already linked somewhere: nothing to heal. Lowest ref, which is the row
  -- `/api/clients/me` picks on the apex, so the answer agrees with the read.
  select c.id into v_existing
    from public.clients c
   where c.profile_id = v_user_id
   order by c.ref
   limit 1;
  if v_existing is not null then
    return v_existing;
  end if;

  -- Exactly one unclaimed record addressed to them, or nothing happens.
  select count(*), min(c.facility_id)
    into v_matches, v_facility
    from public.clients c
   where lower(c.email) = lower(v_email)
     and c.profile_id is null;

  if v_matches <> 1 then
    return null;
  end if;

  return private.link_client_at(v_facility);
end;
$fn$;

comment on function public.link_my_client_record() is
  'Claim the calling customer''s own client record when no facility is named '
  '(the apex). Claims AT MOST ONE, and only when exactly one unclaimed row '
  'carries their address — an ambiguous match claims nothing.';

-- `revoke ... from public` and `revoke ... from anon` are DIFFERENT grants and
-- both are needed; a revoke naming a privilege the role does not hold succeeds
-- silently and looks identical to one that worked. Asserted against
-- has_function_privilege() in supabase/tests/apex-client-link.sql.
revoke all on function public.link_my_client_record() from public;
revoke all on function public.link_my_client_record() from anon;
grant execute on function public.link_my_client_record() to authenticated;
