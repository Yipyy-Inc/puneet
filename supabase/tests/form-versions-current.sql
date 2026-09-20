-- ============================================================================
-- public.form_versions_current — see the migration
-- 20260920125726_a_form_carries_two_versions_not_all_of_them.sql
--
--   bun run test:sql form-versions-current
--
-- One transaction, rolled back. It builds its own form with a version history,
-- because no form in the database has more than one version yet — which is
-- exactly why the old unbounded read looked harmless.
--
-- ── WHAT THIS FILE IS ABOUT ────────────────────────────────────────────────
--
-- T1  Two rows per form and no more: the HIGHEST-numbered published version
--     and the HIGHEST-numbered draft. Three versions in, two rows out, and
--     they are v2 and v3 rather than v1 and v3.
-- T2  THE ONE THAT MATTERS. A view is a new way to reach a table, so it is a
--     new way to get RLS wrong. `security_invoker = true` means
--     `form_versions_read` still decides: a member WITHOUT
--     settings_manage_forms sees the published row and NOT the draft. A view
--     built the default way (definer's rights) would hand them both.
-- T3  The positive control for T2 — somebody who DOES hold
--     settings_manage_forms sees both, so "the groomer sees one" is a
--     statement about the policy and not about a query that returns nothing.
-- T4  Grants. anon holds no select on the view; authenticated does. The view
--     must not widen what the table already allows.
-- ============================================================================

begin;

set local client_min_messages to warning;

create temp table tap (n serial, name text, ok boolean, detail text);
grant all on tap to authenticated;

create or replace function pg_temp.t(p_name text, p_ok boolean, p_detail text default '')
returns void language sql as $$
  insert into tap(name, ok, detail) values (p_name, p_ok, p_detail);
$$;

create or replace function pg_temp.as_user(p_sub text)
returns void language sql as $$
  select set_config('request.jwt.claims',
    json_build_object('sub', p_sub, 'role', 'authenticated')::text, true);
$$;

do $$
declare
  v_facility uuid := 'a0000000-0000-4000-8000-0000000000f1';
  v_form     uuid;
  v_stamp    text := to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
  v_groomer  text;
  v_owner    text;
  v_rows     integer;
  v_pub      integer;
  v_draft    integer;
  v_g_total  integer;
  v_g_draft  integer;
  v_o_total  integer;
begin
  select id into v_groomer from public.profiles where email = 'groomer@yipyy.dev';
  select id into v_owner   from public.profiles where email = 'owner@yipyy.dev';

  insert into public.forms (facility_id, name, slug)
       values (v_facility, '[e2e] versions probe ' || v_stamp,
                           'e2e-versions-probe-' || v_stamp)
    returning id into v_form;

  -- Three versions: two published, one still a draft. The view must pick v2
  -- (the highest PUBLISHED) and v3 (the draft), never v1.
  insert into public.form_versions (form_id, facility_id, version_number, published_at)
       values (v_form, v_facility, 1, now() - interval '2 days'),
              (v_form, v_facility, 2, now() - interval '1 day'),
              (v_form, v_facility, 3, null);

  select count(*) into v_rows
    from public.form_versions_current where form_id = v_form;
  select version_number into v_pub
    from public.form_versions_current
   where form_id = v_form and published_at is not null;
  select version_number into v_draft
    from public.form_versions_current
   where form_id = v_form and published_at is null;

  perform pg_temp.t(
    'T1 two rows per form, and the highest of each kind',
    v_rows = 2 and v_pub = 2 and v_draft = 3,
    format('rows=%s published=%s draft=%s (want 2, 2, 3)', v_rows, v_pub, v_draft));

  -- ── T2: RLS still decides, through the view ──────────────────────────────
  perform pg_temp.as_user(v_groomer);
  set local role authenticated;
    select count(*) into v_g_total
      from public.form_versions_current where form_id = v_form;
    select count(*) into v_g_draft
      from public.form_versions_current
     where form_id = v_form and published_at is null;
  reset role;

  perform pg_temp.t(
    'T2 a member without settings_manage_forms gets the published one only',
    v_g_total = 1 and v_g_draft = 0,
    format('groomer saw %s row(s), %s of them drafts (want 1, 0)',
      v_g_total, v_g_draft));

  -- ── T3: the positive control ─────────────────────────────────────────────
  perform pg_temp.as_user(v_owner);
  set local role authenticated;
    select count(*) into v_o_total
      from public.form_versions_current where form_id = v_form;
  reset role;

  perform pg_temp.t(
    'T3 somebody who may author forms sees both',
    v_o_total = 2,
    format('owner saw %s row(s) (want 2) — if this is 0 the sign-in claim is '
           'wrong and T2 proves nothing', v_o_total));
exception when others then
  reset role;
  perform pg_temp.t('T1-T3 form_versions_current', false, sqlerrm);
end $$;

do $$
begin
  perform pg_temp.t(
    'T4 the view widens no grant',
    not has_table_privilege('anon', 'public.form_versions_current', 'select')
      and has_table_privilege('authenticated', 'public.form_versions_current', 'select')
      and 'true' = (select option_value
                      from pg_class c
                      join pg_namespace n on n.oid = c.relnamespace,
                           pg_options_to_table(c.reloptions)
                     where n.nspname = 'public'
                       and c.relname = 'form_versions_current'
                       and option_name = 'security_invoker'),
    format('anon=%s authenticated=%s',
      has_table_privilege('anon', 'public.form_versions_current', 'select'),
      has_table_privilege('authenticated', 'public.form_versions_current', 'select')));
exception when others then
  perform pg_temp.t('T4 grants', false, sqlerrm);
end $$;

-- ── Report ──────────────────────────────────────────────────────────────────
select case when ok then '  PASS  ' else '> FAIL <' end as result, name, detail
  from tap order by n;

select count(*) filter (where ok) || ' passed, '
    || count(*) filter (where not ok) || ' failed' as summary
  from tap;

rollback;
