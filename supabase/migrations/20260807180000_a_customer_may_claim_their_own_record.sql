-- ============================================================================
-- A customer may claim their own record, and only their own.
--
-- ── WHAT WAS BROKEN ───────────────────────────────────────────────────────
--
-- public.link_client_record() is the only thing that connects a signed-in pet
-- owner to their `clients` row. It matches the caller's VERIFIED profile email
-- against `clients.email` and claims the row if it is unclaimed.
--
-- It could never work. private.enforce_client_integrity() refuses any change to
-- profile_id unless the caller holds `edit_clients`, and a customer by
-- definition does not:
--
--   42501: You may not change which account a client record belongs to.
--
-- SECURITY DEFINER did not help — the function runs as the owner, but the
-- trigger reads auth.jwt()->>'sub', which is still the customer. So the update
-- was refused, `clients.profile_id` stayed NULL for everybody, and the portal
-- had nothing to show even once it started asking.
--
-- That is the second half of the same defect as MOCK_CUSTOMER_ID: the screens
-- did not ask who the customer was, and the database could not have answered.
--
-- ── THE CARVE-OUT, AND WHY IT IS SAFE ─────────────────────────────────────
--
-- Three conditions, all required:
--
--   old.profile_id IS NULL      only an UNCLAIMED row. Taking a record from
--                               somebody else stays refused, which is what the
--                               original rule is for.
--   new.profile_id = the caller you may claim a row FOR YOURSELF and for no one
--                               else. Assigning a record to another account is
--                               still refused.
--   the address matches         `clients.email` must equal the email on the
--                               caller's own profile, which Clerk verified
--                               before the sync webhook wrote it.
--
-- The third is what makes this a claim rather than a land grab. Without it, any
-- customer could take any unclaimed client record — including one belonging to
-- a person who has not signed up yet.
--
-- Nothing else changes: every other refusal and every silently-reverted column
-- below them is untouched.
--
-- ── WHY THE TRIGGER AND NOT JUST THE FUNCTION ─────────────────────────────
--
-- link_client_record() already checks the address, so this could have been left
-- to it. It is enforced here as well because the trigger is the last line: it
-- fires on any UPDATE from any path, and a future route that sets profile_id
-- directly should meet the same rule rather than inherit an exemption.
--
-- RLS makes that route hard to reach anyway — `clients_update` admits a row
-- only when `profile_id = sub` (false while it is NULL) or the caller holds
-- edit_clients — so today the SECURITY DEFINER function is the only way in.
-- That is a reason to keep both, not to rely on either.
-- ============================================================================

create or replace function private.enforce_client_integrity()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_can_edit    boolean;
  v_caller      text := (select auth.jwt()->>'sub');
  v_caller_mail text;
begin
  if v_caller is null then
    return new;
  end if;

  v_can_edit := private.has_permission(old.facility_id, 'edit_clients');

  if v_can_edit or private.is_platform_admin() then
    return new;
  end if;

  if new.facility_id is distinct from old.facility_id then
    raise exception 'A client record belongs to one facility and cannot be moved.'
      using errcode = '42501';
  end if;

  if new.profile_id is distinct from old.profile_id then
    -- THE ONE ALLOWED TRANSITION: an unclaimed record, claimed by the person
    -- whose verified address is on it. See the header.
    select p.email into v_caller_mail
      from public.profiles p where p.id = v_caller;

    if not (
      old.profile_id is null
      and new.profile_id = v_caller
      and v_caller_mail is not null
      and lower(coalesce(new.email, '')) = lower(v_caller_mail)
    ) then
      raise exception 'You may not change which account a client record belongs to.'
        using errcode = '42501';
    end if;
  end if;

  if new.ref is distinct from old.ref then
    raise exception 'A client reference is assigned once.'
      using errcode = '42501';
  end if;

  new.status              := old.status;
  new.is_blocked          := old.is_blocked;
  new.blocked_at          := old.blocked_at;
  new.blocked_reason      := old.blocked_reason;
  new.outstanding_balance := old.outstanding_balance;
  new.no_show_count       := old.no_show_count;
  new.last_visit_date     := old.last_visit_date;

  new.details := (new.details - 'membership' - 'packages' - 'storeCredit')
    || jsonb_strip_nulls(jsonb_build_object(
         'membership',  old.details -> 'membership',
         'packages',    old.details -> 'packages',
         'storeCredit', old.details -> 'storeCredit'));

  return new;
end;
$$;
