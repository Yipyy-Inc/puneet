-- ============================================================================
-- A required form is a question the database answers.
--
-- `form_requirements` (facility_settings) says which forms a service needs,
-- at which stage (before booking, before approval, before check-in), and
-- whether a missing one blocks or warns. Nothing read it. This is the one place
-- that does, so every gate that enforces it (create_booking, approval,
-- check-in) and every screen that shows it ask the same function.
--
-- What counts as having the form:
--   * a submission of that form, by that client, with status submitted,
--     reviewed or flagged (a draft or an archived one does not count; there is
--     no expiry column, so a submission does not lapse);
--   * for a form answered once per pet (`repeat_per_pet`), one for each booked
--     pet the requirement applies to; with no pets named it is asked once;
--   * a requirement naming pet types applies to booked pets of those species,
--     compared case-insensitively (species are stored as "Dog" and "dog").
--
-- A requirement naming a form that is not published, or has no published
-- version, is skipped: nobody could answer it, so it must not block anyone.
-- When one form is listed twice for a stage, block wins over warn.
--
-- `form_requirement_overrides` records a staff member going ahead without a
-- blocking form, with their reason. It is read by staff who see bookings and
-- written only by the functions that enforce the gates (a later migration).
--
-- SQL R1-R9 in form-requirements.sql.
-- ============================================================================

create or replace function private.missing_required_forms(
  p_facility_id uuid,
  p_client_id uuid,
  p_pet_ids uuid[],
  p_service text,
  p_stage text
)
returns table (form_id uuid, form_name text, form_slug text, pet_id uuid, enforcement text)
language sql
stable
security definer
set search_path = ''
as $$
  with req as (
    select f.id as form_id, f.name as form_name, f.slug as form_slug,
           f.repeat_per_pet,
           g->>'enforcement' as enforcement,
           case
             when jsonb_typeof(r->'petTypes') = 'array'
              and jsonb_array_length(r->'petTypes') > 0
             then array(select lower(x) from jsonb_array_elements_text(r->'petTypes') x)
           end as pet_types
      from public.facility_settings s
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(s.value->'services') = 'array'
             then s.value->'services' else '[]'::jsonb end) svc
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(svc->'requirements') = 'array'
             then svc->'requirements' else '[]'::jsonb end) r
      cross join lateral jsonb_array_elements(
        case when jsonb_typeof(r->'gates') = 'array'
             then r->'gates' else '[]'::jsonb end) g
      join public.forms f
        on f.id::text = r->>'formId' and f.facility_id = s.facility_id
     where s.facility_id = p_facility_id
       and s.domain = 'form_requirements'
       and svc->>'serviceType' = p_service
       and coalesce(r->>'enabled', 'true') <> 'false'
       and g->>'stage' = p_stage
       and g->>'enforcement' in ('block', 'warn')
       and f.status = 'published'
       and exists (select 1 from public.form_versions v
                    where v.form_id = f.id and v.published_at is not null)
  ),
  booked as (
    select p.id as pet_id, lower(p.species) as species
      from public.pets p
     where p.id = any(coalesce(p_pet_ids, '{}'::uuid[]))
       and p.client_id = p_client_id
  ),
  needed as (
    select rq.form_id, rq.form_name, rq.form_slug, null::uuid as pet_id, rq.enforcement
      from req rq
     where (not rq.repeat_per_pet or not exists (select 1 from booked))
       and (rq.pet_types is null
            or exists (select 1 from booked b where b.species = any(rq.pet_types)))
    union all
    select rq.form_id, rq.form_name, rq.form_slug, b.pet_id, rq.enforcement
      from req rq
      join booked b on rq.pet_types is null or b.species = any(rq.pet_types)
     where rq.repeat_per_pet
  )
  select distinct on (n.form_id, n.pet_id)
         n.form_id, n.form_name, n.form_slug, n.pet_id, n.enforcement
    from needed n
   where not exists (
     select 1 from public.form_submissions fs
      where fs.form_id = n.form_id
        and fs.client_id = p_client_id
        and fs.status in ('submitted', 'reviewed', 'flagged')
        and (n.pet_id is null or fs.pet_id = n.pet_id)
   )
   order by n.form_id, n.pet_id, (n.enforcement = 'block') desc;
$$;

revoke all on function private.missing_required_forms(uuid, uuid, uuid[], text, text) from public;
revoke all on function private.missing_required_forms(uuid, uuid, uuid[], text, text) from anon;
grant execute on function private.missing_required_forms(uuid, uuid, uuid[], text, text)
  to authenticated, service_role;

-- What a screen asks about one booking. INVOKER: the booking, its pets and the
-- pets' names are read under the caller's own RLS, so a customer sees their own
-- booking's gaps and staff need to be able to see the booking.
create or replace function public.booking_missing_forms(p_booking_id uuid, p_stage text)
returns table (form_id uuid, form_name text, form_slug text, pet_id uuid, pet_name text, enforcement text)
language sql
stable
security invoker
set search_path = ''
as $$
  select m.form_id, m.form_name, m.form_slug, m.pet_id, p.name, m.enforcement
    from public.bookings b
    cross join lateral private.missing_required_forms(
      b.facility_id,
      b.client_id,
      array(select bp.pet_id from public.booking_pets bp where bp.booking_id = b.id),
      b.service,
      p_stage
    ) m
    left join public.pets p on p.id = m.pet_id
   where b.id = p_booking_id
     and p_stage in ('before_booking', 'before_approval', 'before_checkin');
$$;

revoke all on function public.booking_missing_forms(uuid, text) from public;
revoke all on function public.booking_missing_forms(uuid, text) from anon;
grant execute on function public.booking_missing_forms(uuid, text) to authenticated, service_role;

create table public.form_requirement_overrides (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references public.facilities(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  stage text not null
    check (stage in ('before_booking', 'before_approval', 'before_checkin')),
  form_id uuid not null references public.forms(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete set null,
  reason text not null check (length(btrim(reason)) between 1 and 500),
  created_by text,
  created_at timestamptz not null default now()
);

create index form_requirement_overrides_booking_idx
  on public.form_requirement_overrides (booking_id);

alter table public.form_requirement_overrides enable row level security;

create policy form_requirement_overrides_read on public.form_requirement_overrides
  for select to authenticated
  using (
    private.is_platform_admin()
    or facility_id in (select private.permitted_facility_ids('view_bookings'))
  );

revoke all on public.form_requirement_overrides from public, anon, authenticated;
grant select on public.form_requirement_overrides to authenticated;
grant all on public.form_requirement_overrides to service_role;

do $check$
begin
  if has_function_privilege('anon', 'private.missing_required_forms(uuid,uuid,uuid[],text,text)', 'execute') then
    raise exception 'anon can execute missing_required_forms';
  end if;
  if has_function_privilege('anon', 'public.booking_missing_forms(uuid,text)', 'execute') then
    raise exception 'anon can execute booking_missing_forms';
  end if;
  if not has_function_privilege('authenticated', 'public.booking_missing_forms(uuid,text)', 'execute') then
    raise exception 'authenticated cannot execute booking_missing_forms';
  end if;
  if has_table_privilege('anon', 'public.form_requirement_overrides', 'select') then
    raise exception 'anon can read form_requirement_overrides';
  end if;
  if has_table_privilege('authenticated', 'public.form_requirement_overrides', 'insert') then
    raise exception 'authenticated can write form_requirement_overrides directly';
  end if;
end
$check$;
