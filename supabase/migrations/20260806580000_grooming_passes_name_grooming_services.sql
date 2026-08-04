-- ============================================================================
-- A grooming pass names a grooming service, so it can be spent where grooming
-- happens.
--
-- ── THE BUG ───────────────────────────────────────────────────────────────
--
-- `prepaid_package_lines.service_id` is text, and grooming lines were written
-- in TWO id namespaces:
--
--   the counter's packages (gpp-*)  ->  groom-pkg-001, groom-pkg-002
--   the portal's packages  (pkg-*)  ->  srv-005, srv-006
--
-- Redemption matches a pool by `service_id`, and a grooming appointment now
-- carries `grooming_services.id` (20260806560000). So a grooming pass bought in
-- the customer portal could never be spent: the counter looks for
-- `groom-pkg-001` and the pool says `srv-005`. The customer paid, the pass sat
-- there, and nothing anywhere reported a problem.
--
-- ── THEY ARE THE SAME SERVICE, AND THE DATA SAYS SO ───────────────────────
--
-- This was recorded in the debt map as an open product question -- whether
-- "Bath & Brush at 40" and "Basic Bath at 35" are the same thing. Reading both
-- definitions settles it without anybody having to decide:
--
--   srv-005        Bath & Brush  40  60min  "Basic bath, blow dry, brush out,
--                                            ear cleaning, and nail trim"
--   groom-pkg-001  Basic Bath    35  60min  includes: Shampoo & conditioner /
--                                            Towel and blow dry / Brush out /
--                                            Nail trim / Ear cleaning
--
-- Same contents, same hour. And srv-006 / groom-pkg-002 are both "Full Groom"
-- at 65, which was never in doubt.
--
-- `src/data/services-pricing.ts` is NOT a rival grooming catalogue and is left
-- alone: it is the platform-wide service list spanning boarding, daycare and
-- training too, and it backs memberships, credits and promo codes. Only its
-- two grooming rows overlap with anything, and only for this purpose.
--
-- ── DECISION: THE PRICE MOVES TO THE CATALOGUE'S, AND ONE PACKAGE STOPS ───
-- ── LOOKING LIKE A DEAL ───────────────────────────────────────────────────
--
-- `price_per_session` is what the shop quotes as the per-session list value,
-- and `prepaid_package_pricing` derives the "Save $X" badge from it. Re-keying
-- the line without repricing it would leave the portal advertising a saving
-- against 40 for a service the counter charges 35 for -- a false claim to a
-- customer, which is worse than an unattractive package. So the name and the
-- price come from `grooming_services` here.
--
-- The consequence, stated rather than hidden:
--
--   Weekend Getaway       115   saving 15 -> 10
--   Vacation Package      499   saving 91 -> 91   (Full Groom was already 65)
--   Grooming Maintenance  140   saving 20 ->  0   <-- 4 x Basic Bath at 35
--
-- "Grooming Maintenance" was only ever a deal because it was priced against a
-- stale 40. Its package_price is NOT touched here: inventing a discount is a
-- commercial decision and not one a migration gets to make. The shop already
-- guards both the badge and the struck-through price on `savings > 0`, so it
-- renders as a plain 140 claiming nothing. Someone should reprice it.
--
-- ── WHAT IS NOT CONSTRAINED, DELIBERATELY ─────────────────────────────────
--
-- The trigger below guards `prepaid_package_lines` -- the CATALOGUE. It does
-- not guard `customer_package_lines`, which is the snapshot of what somebody
-- bought. A pass already sold must survive its service being retired from the
-- menu; that is the whole point of copying the name and price at purchase.
-- Constraining the source is what keeps the copies right.
--
-- No customer data is rewritten by this migration. Checked first: the only
-- purchased package in this project is already on `groom-pkg-001`, and the one
-- redeemed pass entry names `groom-pkg-001` too.
-- ============================================================================

-- ── The re-key ──────────────────────────────────────────────────────────────
--
-- Joined to the catalogue rather than hardcoding 35 and "Basic Bath": the pair
-- of ids is the judgement being made here, and the price is then whatever the
-- facility's own row says at the time this runs.
with remap(old_id, new_id) as (
  values ('srv-005', 'groom-pkg-001'),
         ('srv-006', 'groom-pkg-002')
)
update public.prepaid_package_lines l
   set service_id        = g.legacy_id,
       service_name      = g.name,
       price_per_session = g.base_price
  from remap r,
       public.prepaid_packages p,
       public.grooming_services g
 where l.package_id  = p.id
   and l.module      = 'grooming'
   and l.service_id  = r.old_id
   and g.facility_id = p.facility_id
   and g.legacy_id   = r.new_id;

-- ── The rule, so this cannot come back ─────────────────────────────────────
--
-- Without it the next portal package re-introduces `srv-*` and the pass is
-- unspendable again, silently, exactly as before. A CHECK constraint cannot
-- express this (it spans three tables), and a foreign key cannot either:
-- `grooming_services.legacy_id` is unique per facility, not globally, and the
-- line does not carry a facility of its own.
create or replace function private.grooming_line_names_a_grooming_service()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_facility_id uuid;
begin
  if new.module is distinct from 'grooming' then
    return new;
  end if;

  select p.facility_id into v_facility_id
    from public.prepaid_packages p
   where p.id = new.package_id;

  if not exists (
    select 1
      from public.grooming_services g
     where g.facility_id = v_facility_id
       and g.legacy_id = new.service_id
  ) then
    raise exception
      'A grooming pass must name a grooming service; % is not one at this facility.',
      coalesce(new.service_id, '(none)')
      using errcode = '23503';
  end if;

  return new;
end;
$$;

create trigger prepaid_package_lines_grooming_service
  before insert or update of service_id, module
  on public.prepaid_package_lines
  for each row
  execute function private.grooming_line_names_a_grooming_service();

comment on function private.grooming_line_names_a_grooming_service() is
  'A prepaid package line in the grooming module must name a service that '
  'exists in grooming_services for the package''s facility, so the pass can be '
  'redeemed against a grooming appointment.';
