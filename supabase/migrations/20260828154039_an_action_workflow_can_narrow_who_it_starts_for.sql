-- ============================================================================
-- An action-based workflow can now narrow WHO it starts for and WHAT it starts
-- on.
--
-- The spec asks for two different things, and it is worth keeping them apart
-- because they are answered by different data:
--
--   trigger_filters  about the CLIENT   "only for clients who have not visited
--                                        in 90 days"
--   service_types    about the EVENT    "only for grooming bookings"
--
-- The first reuses the audience compiler wholesale — the same filter model, the
-- same SQL, the same set semantics as a scheduled workflow. So "lapsed clients
-- who just booked" needs no new query language, and the wizard offers the
-- filter builder it already has. It also means the preview and the live check
-- cannot disagree, because they are the same function.
--
-- The second is a plain array matched against the booking behind the event,
-- exactly as `automation_rules.service_types` already is. MoeGo scopes its
-- conditions to the chosen action, and care type only means anything on a
-- booking trigger — which is why this is a narrow column rather than a general
-- condition engine nobody asked for.
--
-- ── WHY `audience` IS NOT REUSED FOR THIS ─────────────────────────────────
--
-- `workflows_kind_target` says an event workflow has a trigger and NO audience.
-- That CHECK is what stops a row carrying both and leaving the engine to guess
-- which one starts it. Overloading `audience` to mean "the schedule's set" for
-- one kind and "a narrowing filter" for the other would put that ambiguity
-- straight back, in a column whose name would then be wrong half the time.
--
-- ── THE ENGINE FAILS CLOSED ───────────────────────────────────────────────
--
-- If `compile_audience` errors on these filters, the engine enrols NOBODY and
-- records the reason. The whole purpose of a narrowing filter is to exclude
-- people, so "we could not work out who to exclude, so we included everyone" is
-- the one outcome it must never produce.
-- ============================================================================

alter table public.workflows
  add column if not exists trigger_filters jsonb,
  add column if not exists service_types text[] not null default '{}';

comment on column public.workflows.trigger_filters is
  'Optional audience filter applied to the CLIENT at enrolment, for kind=event. Same shape as `audience`; compiled by the same function.';

comment on column public.workflows.service_types is
  'Optional care-type narrowing matched against the booking behind the event. Empty means every service, never none.';

-- Only meaningful on an event workflow. A scheduled one selects its people by
-- filter already, so a second filter here would be two answers to one question.
alter table public.workflows
  drop constraint if exists workflows_filters_are_for_events;
alter table public.workflows
  add constraint workflows_filters_are_for_events check (
    kind = 'event' or (trigger_filters is null and service_types = '{}')
  );

do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workflows'
       and column_name = 'trigger_filters'
  ) then
    raise exception 'trigger_filters was not added';
  end if;
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'workflows'
       and column_name = 'service_types'
  ) then
    raise exception 'service_types was not added';
  end if;
end $$;
