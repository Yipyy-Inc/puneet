-- ============================================================================
-- A PET OWNER COULD NOT READ THEIR OWN PET'S VACCINATION RECORD.
--
-- `pet_vaccinations_read` admits platform admins and members of the facility,
-- and nobody else. `private.customer_visible_setting_domains()` did not carry
-- `vaccination_rules`. So a customer could see neither what their facility
-- REQUIRES nor what their pet HAS.
--
-- The customer portal filled both gaps with fixtures, and the result reached
-- real people: the dashboard raised "Vaccination missing for <pet>" for every
-- required vaccine, for every pet, because `vaccinationRecords` is keyed by
-- fixture pet ids (1, 2, 3, 5, 13, 14) and a real pet's ref matches none of
-- them. A real customer was photographed being told this three times over for
-- one dog on 2026-09-20. It is wrong in the other direction too: a real pet
-- whose ref happens to be 1 or 2 is credited with a fixture animal's rabies
-- certificate.
--
-- ── WHY A FUNCTION AND NOT A SECOND READ POLICY ───────────────────────────
--
-- A permissive SELECT policy would OR with the staff one and let an owner read
-- the WHOLE ROW, and the row carries `notes`, `reviewed_by`, `reviewed_at` and
-- `review_reason` — staff-internal text written about the owner's own
-- paperwork. Postgres has no per-policy column list, so the table policy is
-- left exactly as it is and the owner reads through a function that returns
-- only the columns a customer may see.
--
-- `review_reason` is deliberately NOT among them. An owner arguably should be
-- told why a certificate was refused, but that text is written for colleagues,
-- not for the customer, and inventing a customer-facing version of it is a
-- product decision rather than a migration. Recorded in the debt map.
--
-- ── AND THE RULES THEMSELVES ──────────────────────────────────────────────
--
-- `vaccination_rules` joins the customer-visible domains. Its fallback keeps
-- the SHIPPED list rather than an empty one (see lib/settings/vaccinations.ts:
-- an unset fee fails safe, an unset requirement fails open), so a customer at
-- a facility that has never opened that settings screen still reads the
-- standard list — the same list the facility is checking.
-- ============================================================================

-- ── 1. The rules a customer is allowed to read ──────────────────────────────
--
-- Rewritten whole from the LIVE definition (pg_get_functiondef), not from a
-- migration file, because several migrations have appended to this array and
-- the file that created it is long out of date.
create or replace function private.customer_visible_setting_domains()
returns text[]
language sql
immutable
set search_path = ''
as $function$
  select array[
    'business_hours',
    'booking_rules',
    'tip_config',
    'booking_flow',
    'daycare_config',
    'boarding_config',
    'grooming_config',
    'training_config',
    'tax_config',
    'loyalty_config',
    'yipyy_go_config',
    'mobile_app_config',
    'training_module_settings',
    'training_pathways',
    'training_disciplines',
    'pricing_rules',
    'deposit_rules',
    'service_addons',
    'care_fees',
    'booking_approval',
    'evaluation_config',
    'daycare_rates',
    'service_date_blocks',
    'schedule_time_overrides',
    'drop_off_pick_up_overrides',
    'grooming_scheduling',
    'training_programs',
    'training_course_types',
    -- What this facility requires, so the customer portal can stop checking a
    -- shipped fixture. A customer is ASKED for these records; being unable to
    -- read the list is why three screens invented one.
    'vaccination_rules'
  ];
$function$;

-- ── 2. The records their own pets hold ──────────────────────────────────────
create or replace function public.my_pet_vaccinations()
returns table (
  id uuid,
  -- The pet's NUMERIC ref, not its uuid: that is the id every customer screen
  -- already holds, and `rowToVaccination` maps the staff route the same way.
  -- Handing back a uuid would make the portal translate one.
  pet_ref integer,
  vaccine_name text,
  administered_on date,
  expires_on date,
  veterinarian_name text,
  veterinary_clinic text,
  document_url text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $fn$
  select v.id,
         p.ref,
         v.vaccine_name,
         v.administered_on,
         v.expires_on,
         v.veterinarian_name,
         v.veterinary_clinic,
         v.document_url,
         v.status
    from public.pet_vaccinations v
    join public.pets p on p.id = v.pet_id
   -- SECURITY DEFINER runs as the owner, so the session check is explicit
   -- rather than inherited from RLS. `own_pet_ids()` is empty for a caller
   -- with no client row, which makes this empty too — but an anonymous caller
   -- must not reach the scan at all.
   where (select auth.jwt()->>'sub') is not null
     and v.pet_id in (select private.own_pet_ids())
   order by v.expires_on desc nulls last;
$fn$;

comment on function public.my_pet_vaccinations() is
  'The calling customer''s own pets'' vaccination records, without the '
  'staff-internal review columns. The pet_vaccinations table policy stays '
  'staff-only; this is the owner''s window onto it.';

-- A revoke naming a privilege the role does not hold succeeds silently and
-- looks identical to one that worked, and `public` and `anon` are DIFFERENT
-- grants — both are needed. Asserted in supabase/tests/customer-vaccinations.sql
-- against has_function_privilege(), which is the only thing that proves it.
revoke all on function public.my_pet_vaccinations() from public;
revoke all on function public.my_pet_vaccinations() from anon;
grant execute on function public.my_pet_vaccinations() to authenticated;
