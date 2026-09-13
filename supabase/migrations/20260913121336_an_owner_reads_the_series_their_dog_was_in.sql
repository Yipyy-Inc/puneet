-- ============================================================================
-- An owner reads the series their dog was in, after it has ended.
--
-- ── WHAT WAS WRONG ────────────────────────────────────────────────────────
--
-- training_series_read (20260826110000) admitted a client to a series only
-- while its status was 'active' — the right rule for a catalogue they browse,
-- and the wrong one for a class their dog took. training_series_sessions reads
-- through its series, and training_attendance_history() reads the sessions,
-- so the day a series was marked completed, its whole history disappeared
-- from the owner's My Pets tab: every session, every rating, every absence.
--
-- ── THE RULE NOW ──────────────────────────────────────────────────────────
--
-- A client also reads any series one of their own dogs is enrolled in,
-- whatever its status. The enrollment policy already admits them to that
-- enrollment row (client_id in own_client_ids()), so the subquery is read as
-- the client and cannot reach another household's. Browsing is unchanged: the
-- training booking step already drops completed and cancelled series, so an
-- ended class does not reappear as something to book.
-- ============================================================================

drop policy if exists training_series_read on public.training_series;

create policy training_series_read on public.training_series for select
  using (
    private.is_platform_admin()
    or private.has_permission(facility_id, 'view_training_queue')
    or private.has_permission(facility_id, 'training_manage_programs')
    or (status = 'active' and facility_id in (select private.client_facility_ids()))
    or exists (
      select 1 from public.training_series_enrollments e
       where e.series_id = training_series.id
         and e.client_id in (select private.own_client_ids())
    )
  );

comment on policy training_series_read on public.training_series is
  'Staff with view_training_queue or training_manage_programs read every series at their facility; a client reads the active series their facility offers, and every series their own dog was enrolled in — including one that has ended, so its history stays theirs.';
