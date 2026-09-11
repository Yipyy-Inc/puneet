-- ============================================================================
-- A training session can be marked held.
--
-- `training_series_sessions` (20260826110000) was insert-and-select only: a
-- session was scheduled when its series was created and stayed "scheduled"
-- forever. The session view's "Complete session" therefore changed the
-- screen and nothing else, and the calendar went on showing a class that ran
-- last Tuesday as still to come.
--
-- The status — and only the status — may now be changed, by whoever runs
-- sessions: check_in_out (the floor) or training_manage_programs (whoever
-- owns the series). The date, the time, the number and the series stay as
-- create_training_series wrote them; the schedule is still immutable (see
-- that migration's header for why).
--
-- The table had kept Supabase's default table-wide UPDATE grant for
-- authenticated AND anon, which only the absence of an UPDATE policy made
-- harmless. That grant goes; authenticated gets UPDATE on `status` alone.
-- ============================================================================

revoke update on public.training_series_sessions from authenticated;
revoke update on public.training_series_sessions from anon;
revoke update on public.training_series_sessions from public;
grant update (status) on public.training_series_sessions to authenticated;

create policy training_series_sessions_mark_held
  on public.training_series_sessions for update
  using (
    exists (
      select 1 from public.training_series ts
       where ts.id = series_id
         and (private.has_permission(ts.facility_id, 'check_in_out')
              or private.has_permission(ts.facility_id, 'training_manage_programs'))
    )
  )
  with check (
    exists (
      select 1 from public.training_series ts
       where ts.id = series_id
         and (private.has_permission(ts.facility_id, 'check_in_out')
              or private.has_permission(ts.facility_id, 'training_manage_programs'))
    )
  );

do $verify$
begin
  if has_table_privilege('anon', 'public.training_series_sessions', 'update') then
    raise exception 'anon can still update training sessions';
  end if;
  if has_column_privilege('authenticated', 'public.training_series_sessions', 'start_at', 'update') then
    raise exception 'authenticated can still move a session';
  end if;
  if not has_column_privilege('authenticated', 'public.training_series_sessions', 'status', 'update') then
    raise exception 'authenticated cannot mark a session held';
  end if;
end $verify$;
