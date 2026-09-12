-- ============================================================================
-- A trainer's pre-session briefing, and the exercises planned for a session,
-- are kept on the session.
--
-- ── WHAT IT REPLACES ──────────────────────────────────────────────────────
--
-- The pre-session briefing's "Mark briefed" and the session view's planned
-- exercises were written into the browser's query cache: "Briefing reviewed.
-- Have a great session!" was toasted, and the reminder was back on the next
-- load, on every other device, and for the trainer covering the class. The
-- plan a trainer built before a class was gone when they opened it on the
-- floor tablet.
--
-- ── THE SHAPE ─────────────────────────────────────────────────────────────
--
-- Three columns on the session they describe. Exercise ids are the
-- facility's own library (`training_exercises`, a settings domain), so they
-- are text, not a foreign key.
--
-- ── WHO ───────────────────────────────────────────────────────────────────
--
-- The session's existing UPDATE policy already admits check_in_out or
-- training_manage_programs (20260911143447), and authenticated holds UPDATE
-- on `status` alone. These three join that column grant — nothing else about
-- the session becomes writable.
-- ============================================================================

alter table public.training_series_sessions
  add column if not exists briefed_at timestamptz,
  add column if not exists briefed_by_name text,
  add column if not exists planned_exercise_ids text[] not null default '{}';

comment on column public.training_series_sessions.briefed_at is
  'When a trainer marked the pre-session briefing reviewed; null until then.';
comment on column public.training_series_sessions.planned_exercise_ids is
  'Exercise ids (the facility''s training_exercises library) planned for this session, in order.';

grant update (briefed_at, briefed_by_name, planned_exercise_ids)
  on public.training_series_sessions to authenticated;

do $verify$
begin
  if not has_column_privilege('authenticated', 'public.training_series_sessions', 'briefed_at', 'update') then
    raise exception 'authenticated cannot mark a session briefed';
  end if;
  if has_column_privilege('authenticated', 'public.training_series_sessions', 'start_at', 'update') then
    raise exception 'authenticated can move a session';
  end if;
  if has_column_privilege('anon', 'public.training_series_sessions', 'briefed_at', 'update') then
    raise exception 'anon can mark a session briefed';
  end if;
end $verify$;
