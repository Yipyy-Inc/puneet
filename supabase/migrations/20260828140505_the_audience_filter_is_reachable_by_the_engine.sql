-- ============================================================================
-- The audience filter has to be reachable by the thing that runs it.
--
-- 20260828134244 put `audience_filter` in the `private` schema, next to the RLS
-- helpers. Measured immediately after, against production:
--
--   has_schema_privilege('authenticated','private','usage')  ->  true
--   has_schema_privilege('service_role','private','usage')   ->  false
--
-- So the WIZARD's estimate worked — it runs as the signed-in user — and the
-- SCHEDULED RUN did not, failing with "permission denied for schema private"
-- and enrolling nobody. That is the worst shape a bug can take here: a workflow
-- that looks active, shows a sensible recipient count on screen, and silently
-- never sends. Found by running the engine rather than by reading it.
--
-- Fixed by MOVING the function to `public`, not by granting service_role usage
-- on the whole `private` schema. That schema holds is_platform_admin(),
-- has_permission() and member_facility_ids(); opening all of it to reach one
-- filter helper is far more than the problem needs.
--
-- It stays SECURITY INVOKER, which is the property that actually matters: a
-- manager scoped to one branch still cannot preview another branch's audience,
-- because RLS decides. service_role bypasses RLS as it always has, which is
-- right for a background job running on the facility's behalf.
--
-- Same shape and same cause as 20260827112121, where ensure_message_templates
-- had to leave `private` before PostgREST could call it at all. Twice now — if
-- a function has to be callable by anything other than a policy, it does not
-- belong in `private`.
-- ============================================================================

drop function if exists private.audience_filter(uuid, text, text, jsonb);

create or replace function public.audience_filter(
  p_facility_id uuid,
  p_field text,
  p_operator text,
  p_value jsonb
)
returns setof uuid
language plpgsql
stable
security invoker
set search_path = ''
as $fn$
declare
  v_zone text;
  v_today date;
  v_num int;
  v_text text;
  v_arr text[];
begin
  -- The facility's own calendar day. `current_date` is the SERVER's, and the
  -- container runs UTC, so a Montreal facility's "90 days ago" would drift by
  -- one day for five hours out of every twenty-four.
  select coalesce(f.timezone, 'America/Toronto') into v_zone
    from public.facilities f where f.id = p_facility_id;
  v_today := (now() at time zone coalesce(v_zone, 'America/Toronto'))::date;

  case p_field

  -- ── Last visit ──────────────────────────────────────────────────────────
  when 'last_visit_days' then
    v_num := (p_value #>> '{}')::int;
    if p_operator = 'more_than' then
      -- Never visited counts as "more than N days ago". A client who has never
      -- been is exactly who a win-back campaign is looking for.
      return query select c.id from public.clients c
        where c.facility_id = p_facility_id
          and (c.last_visit_date is null or c.last_visit_date < v_today - v_num);
    elsif p_operator = 'less_than' then
      return query select c.id from public.clients c
        where c.facility_id = p_facility_id
          and c.last_visit_date is not null
          and c.last_visit_date >= v_today - v_num;
    else
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;

  -- ── Last service type ───────────────────────────────────────────────────
  when 'last_service_type' then
    select array_agg(x) into v_arr from jsonb_array_elements_text(p_value) x;
    if p_operator not in ('in', 'not_in') then
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;
    return query
      with latest as (
        select distinct on (b.client_id) b.client_id, b.service_type
          from public.bookings b
         where b.facility_id = p_facility_id
         order by b.client_id, b.start_at desc
      )
      select c.id from public.clients c
        left join latest l on l.client_id = c.id
       where c.facility_id = p_facility_id
         and case when p_operator = 'in'
                  then l.service_type = any(v_arr)
                  else l.service_type is null or not (l.service_type = any(v_arr))
             end;

  -- ── Vaccinations ────────────────────────────────────────────────────────
  --
  -- The spec's flagship filter, and the reason pet_vaccinations exists. Before
  -- 20260828134018 these records lived in a jsonb blob that could not be
  -- queried across pets at all.
  when 'vaccination_status' then
    if p_operator = 'expired' then
      return query select distinct p.client_id from public.pets p
        join public.pet_vaccinations v on v.pet_id = p.id
       where p.facility_id = p_facility_id
         and v.status = 'approved'
         and v.expires_on is not null
         and v.expires_on < v_today;
    elsif p_operator = 'expiring_within' then
      v_num := (p_value #>> '{}')::int;
      return query select distinct p.client_id from public.pets p
        join public.pet_vaccinations v on v.pet_id = p.id
       where p.facility_id = p_facility_id
         and v.status = 'approved'
         and v.expires_on is not null
         and v.expires_on >= v_today
         and v.expires_on <= v_today + v_num;
    elsif p_operator = 'missing' then
      -- A pet with no approved record at all. Distinct from "expired": nobody
      -- ever gave us one, so the reminder has to say something different.
      return query select distinct p.client_id from public.pets p
       where p.facility_id = p_facility_id
         and not exists (
           select 1 from public.pet_vaccinations v
            where v.pet_id = p.id and v.status = 'approved'
         );
    else
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;

  -- ── Tags ────────────────────────────────────────────────────────────────
  when 'customer_tag' then
    v_text := p_value #>> '{}';
    if p_operator = 'has' then
      return query select distinct a.entity_id from public.facility_tag_assignments a
       where a.facility_id = p_facility_id
         and a.entity_type = 'customer'
         and a.tag_id = v_text::uuid
         and (a.expires_at is null or a.expires_at > now());
    elsif p_operator = 'not_has' then
      return query select c.id from public.clients c
       where c.facility_id = p_facility_id
         and not exists (
           select 1 from public.facility_tag_assignments a
            where a.entity_type = 'customer' and a.entity_id = c.id
              and a.tag_id = v_text::uuid
              and (a.expires_at is null or a.expires_at > now())
         );
    else
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;

  -- ── Upcoming booking ────────────────────────────────────────────────────
  when 'has_active_booking' then
    if p_operator <> 'is' then
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;
    if (p_value #>> '{}')::boolean then
      return query select distinct b.client_id from public.bookings b
       where b.facility_id = p_facility_id
         and b.start_at >= now()
         and b.status not in ('cancelled', 'declined', 'no_show');
    else
      return query select c.id from public.clients c
       where c.facility_id = p_facility_id
         and not exists (
           select 1 from public.bookings b
            where b.client_id = c.id and b.start_at >= now()
              and b.status not in ('cancelled', 'declined', 'no_show')
         );
    end if;

  -- ── Total visits ────────────────────────────────────────────────────────
  when 'total_visits' then
    v_num := (p_value #>> '{}')::int;
    if p_operator not in ('more_than', 'less_than') then
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;
    return query
      with visits as (
        select c.id as client_id,
               (select count(*) from public.bookings b
                 where b.client_id = c.id and b.status = 'completed') as n
          from public.clients c
         where c.facility_id = p_facility_id
      )
      select v.client_id from visits v
       where case when p_operator = 'more_than' then v.n > v_num else v.n < v_num end;

  -- ── Last booking date ───────────────────────────────────────────────────
  when 'last_booking_date' then
    if p_operator not in ('before', 'after') then
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;
    return query
      with latest as (
        select b.client_id, max(b.start_at) as last_at
          from public.bookings b
         where b.facility_id = p_facility_id
         group by b.client_id
      )
      select l.client_id from latest l
       where case when p_operator = 'before'
                  then l.last_at < ((p_value #>> '{}')::date)
                  else l.last_at >= ((p_value #>> '{}')::date)
             end;

  -- ── Membership ──────────────────────────────────────────────────────────
  when 'membership_status' then
    if p_operator <> 'is' then
      raise exception 'operator "%" is not valid for %', p_operator, p_field;
    end if;
    v_text := p_value #>> '{}';
    if v_text = 'none' then
      return query select c.id from public.clients c
       where c.facility_id = p_facility_id
         and not exists (
           select 1 from public.customer_memberships m
            where m.client_id = c.id and m.status = 'active'
         );
    else
      return query select distinct m.client_id from public.customer_memberships m
       where m.facility_id = p_facility_id and m.status = v_text;
    end if;

  else
    -- NEVER fall through. An unrecognised field that matched everybody would
    -- mail the entire client list.
    raise exception 'unknown audience field "%"', p_field;
  end case;
end;
$fn$;

create or replace function public.compile_audience(
  p_facility_id uuid,
  p_filters jsonb
)
returns setof uuid
language plpgsql
stable
security invoker
set search_path = ''
as $fn$
declare
  v_group jsonb;
  v_filter jsonb;
  v_group_ids uuid[];
  v_filter_ids uuid[];
  v_result uuid[] := null;
  v_op text := coalesce(p_filters ->> 'groupLogicOperator', 'AND');
  v_first boolean := true;
begin
  if p_filters is null or jsonb_array_length(coalesce(p_filters -> 'filterGroups', '[]'::jsonb)) = 0 then
    -- An empty filter names NOBODY, not everybody. A workflow saved with its
    -- audience half-built must not mail the entire client list on its first run.
    return;
  end if;

  for v_group in select * from jsonb_array_elements(p_filters -> 'filterGroups') loop
    v_group_ids := null;

    for v_filter in select * from jsonb_array_elements(coalesce(v_group -> 'filters', '[]'::jsonb)) loop
      select coalesce(array_agg(id), '{}') into v_filter_ids
        from public.audience_filter(
          p_facility_id,
          v_filter ->> 'field',
          v_filter ->> 'operator',
          coalesce(v_filter -> 'value', 'null'::jsonb)
        ) as id;

      -- AND within the group.
      if v_group_ids is null then
        v_group_ids := v_filter_ids;
      else
        select coalesce(array_agg(x), '{}') into v_group_ids
          from unnest(v_group_ids) x where x = any(v_filter_ids);
      end if;
    end loop;

    if v_group_ids is null then
      continue;
    end if;

    if v_first then
      v_result := v_group_ids;
      v_first := false;
    elsif v_op = 'OR' then
      select coalesce(array_agg(distinct x), '{}') into v_result
        from unnest(v_result || v_group_ids) x;
    else
      select coalesce(array_agg(x), '{}') into v_result
        from unnest(v_result) x where x = any(v_group_ids);
    end if;
  end loop;

  if v_result is null then
    return;
  end if;

  return query select distinct x from unnest(v_result) x;
end;
$fn$;

comment on function public.audience_filter(uuid, text, text, jsonb) is
  'One filter -> the client ids it names. SECURITY INVOKER. In public rather than private only because service_role cannot reach the private schema.';

revoke execute on function public.audience_filter(uuid, text, text, jsonb) from public, anon;
grant  execute on function public.audience_filter(uuid, text, text, jsonb) to authenticated, service_role;
revoke execute on function public.compile_audience(uuid, jsonb) from public, anon;
grant  execute on function public.compile_audience(uuid, jsonb) to authenticated, service_role;
revoke execute on function public.count_audience(uuid, jsonb) from public, anon;
grant  execute on function public.count_audience(uuid, jsonb) to authenticated, service_role;

do $$
begin
  if has_function_privilege('anon', 'public.audience_filter(uuid, text, text, jsonb)', 'execute') then
    raise exception 'anon can run an audience filter';
  end if;
  if has_function_privilege('anon', 'public.count_audience(uuid, jsonb)', 'execute') then
    raise exception 'anon can count an audience';
  end if;
  -- The two that were actually broken. Both are asserted because the failure
  -- was invisible: the wizard worked and only the scheduled run did not.
  if not has_function_privilege('service_role', 'public.compile_audience(uuid, jsonb)', 'execute') then
    raise exception 'service_role cannot compile an audience - the scheduled run will enrol nobody';
  end if;
  if not has_function_privilege('authenticated', 'public.count_audience(uuid, jsonb)', 'execute') then
    raise exception 'authenticated cannot count an audience - the wizard estimate will fail';
  end if;
end $$;
