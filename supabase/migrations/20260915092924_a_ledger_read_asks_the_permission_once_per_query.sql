-- ============================================================================
-- A ledger read asks the viewer's permission once, not once per row.
--
-- The money ledgers' read policies called
-- `private.has_permission(facility_id, '<permission>')` in their USING clause.
-- That argument is the row's own column, so Postgres evaluates it for every
-- row it considers. For a viewer who is let in by an earlier arm (a platform
-- admin) that is cheap; for one who is NOT (a groomer reading gift cards) it
-- runs to the end of the table. Measured 2026-09-15: a groomer's read of the
-- e2e facility's 5,373 gift cards took 10.2 s to return nothing, and the
-- nightly suite's `gift-cards` spec failed on the statement timeout. After
-- this migration the same read took 0.25 s.
--
-- `private.permitted_facility_ids(permission)` answers the same question as
-- `has_permission` for every facility at once. It is uncorrelated, so a policy
-- written as `facility_id in (select private.permitted_facility_ids(...))`
-- becomes one hashed subplan per query. Its body is `has_permission`'s own
-- conditions, word for word: an active membership, a subscription that is not
-- suspended or cancelled (an absent one counts as active), and a resolved scope
-- other than 'none'; and every facility for a platform admin.
--
-- Grants mirror `has_permission` exactly. These policies apply to every role
-- that can select the tables, anon included, and a helper anon could not
-- execute would turn anon's empty read into an error.
--
-- ALTER POLICY changes only USING, so each policy keeps its roles and its
-- permissive flag. SQL P1-P6 in permitted-facility-ids.sql.
-- ============================================================================

create or replace function private.permitted_facility_ids(p_permission text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select f.id
    from public.facilities f
   where private.is_platform_admin()
  union
  select m.facility_id
    from public.facility_memberships m
    left join public.facility_subscriptions s on s.facility_id = m.facility_id
   where m.profile_id = (select auth.jwt()->>'sub')
     and m.is_active
     and coalesce(s.status, 'active') not in ('suspended', 'cancelled')
     and coalesce(private.resolve_permission(m.id, p_permission),
                  'none'::public.access_scope) <> 'none'::public.access_scope;
$$;

revoke all on function private.permitted_facility_ids(text) from public;
grant execute on function private.permitted_facility_ids(text) to anon, authenticated, service_role;

alter policy gift_cards_read on public.gift_cards
  using (
    private.is_platform_admin()
    or purchased_by_client_id in (select private.own_client_ids())
    or facility_id in (select private.permitted_facility_ids('financial_manage_gift_cards'))
  );

alter policy gift_card_transactions_read on public.gift_card_transactions
  using (
    private.is_platform_admin()
    or gift_card_id in (
      select c.id from public.gift_cards c
       where c.purchased_by_client_id in (select private.own_client_ids())
    )
    or facility_id in (select private.permitted_facility_ids('financial_manage_gift_cards'))
  );

alter policy loyalty_transactions_read on public.loyalty_transactions
  using (
    private.is_platform_admin()
    or account_id in (
      select a.id from public.loyalty_accounts a
       where a.client_id in (select private.own_client_ids())
    )
    or facility_id in (select private.permitted_facility_ids('marketing_view'))
  );

alter policy payments_read on public.payments
  using (
    private.is_platform_admin()
    or facility_id in (select private.permitted_facility_ids('financial_view_amounts'))
  );

alter policy store_credit_read on public.store_credit_entries
  using (
    private.is_platform_admin()
    or facility_id in (select private.permitted_facility_ids('financial_view_amounts'))
  );

do $check$
begin
  if has_function_privilege('anon', 'private.permitted_facility_ids(text)', 'execute')
     <> has_function_privilege('anon', 'private.has_permission(uuid,text)', 'execute') then
    raise exception 'anon execute on permitted_facility_ids differs from has_permission';
  end if;
  if not has_function_privilege('authenticated', 'private.permitted_facility_ids(text)', 'execute') then
    raise exception 'authenticated cannot execute permitted_facility_ids';
  end if;
  if exists (
    select 1 from pg_policy pol join pg_class c on c.oid = pol.polrelid
     where c.relnamespace = 'public'::regnamespace
       and (c.relname, pol.polname) in (('gift_cards', 'gift_cards_read'),
                                        ('gift_card_transactions', 'gift_card_transactions_read'),
                                        ('loyalty_transactions', 'loyalty_transactions_read'),
                                        ('payments', 'payments_read'),
                                        ('store_credit_entries', 'store_credit_read'))
       and pg_get_expr(pol.polqual, pol.polrelid) ~ 'has_permission\(\s*facility_id'
  ) then
    raise exception 'a ledger read policy still checks has_permission per row';
  end if;
end
$check$;
