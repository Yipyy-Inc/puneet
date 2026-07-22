"use client";

import { useMemo } from "react";
import { useEffectivePermissions } from "@/hooks/use-facility-rbac";
import { useDailyCareConfig } from "@/hooks/use-daily-care-config";
import { generateScheduledTasks, todayIso } from "@/lib/care-log-scheduler";
import { getCurrentGuests } from "@/data/boarding";
import { groomingAppointments } from "@/data/grooming";
import { stylistIdForStaff } from "@/lib/api/grooming";
import { bookings } from "@/data/bookings";
import { scopeBookingsToStaff } from "@/lib/api/booking";
import type { PermissionKey } from "@/types/facility-staff";

// ============================================================================
// Section 4B — "Today" summary counts, derived from the viewer's SCOPED data.
//
// The dashboard used to print a single generic `staff.upcomingAppointments`
// field for everyone. That's wrong per role: a Groomer's "appointments" are the
// grooming appointments assigned to THEM, while a back-of-house attendant may
// have zero appointments but a full care round. These counts come from the same
// scoping helpers the screens use (Part 3 / 8B), so the dashboard can never
// disagree with what the viewer actually sees when they click through.
// ============================================================================

export interface EmployeeTodayCounts {
  /** Appointments assigned to the viewer today (grooming or bookings). */
  appointments: number;
  /** Care tasks today that the viewer is actually permitted to log. */
  careTasks: number;
  /** Whether care tasks are a meaningful metric for this viewer at all. */
  showCareTasks: boolean;
}

export function useEmployeeTodayCounts(staffId: string): EmployeeTodayCounts {
  const permissions = useEffectivePermissions();
  const { config } = useDailyCareConfig();

  return useMemo(() => {
    const has = (k: PermissionKey) => permissions[k] !== false;
    const today = todayIso();

    // ── Appointments ──────────────────────────────────────────────────────
    // A stylist counts their own grooming appointments; everyone else counts
    // the bookings assigned to them (both are the assigned_only scope).
    const stylistId = stylistIdForStaff(staffId);
    let appointments = 0;
    if (stylistId) {
      appointments = groomingAppointments.filter(
        (a) => a.date === today && a.stylistId === stylistId,
      ).length;
    } else if (has("view_bookings")) {
      appointments = scopeBookingsToStaff(bookings, staffId).filter(
        (b) => b.startDate === today,
      ).length;
    }

    // ── Care tasks ────────────────────────────────────────────────────────
    // Only counted for staff who can reach Daily Care, and only the task types
    // they may log — a groomer with no care keys gets no care-task chip at all
    // rather than a misleading "0".
    const canDailyCare = has("log_feedings") || has("boarding_daily_care_log");
    let careTasks = 0;
    if (canDailyCare) {
      const tasks = generateScheduledTasks(
        getCurrentGuests(),
        config,
        new Date(`${today}T00:00:00`),
      );
      careTasks = tasks.filter((t) =>
        t.taskType === "feeding"
          ? has("log_feedings")
          : t.taskType === "medication"
            ? has("log_medications")
            : true,
      ).length;
    }

    return { appointments, careTasks, showCareTasks: canDailyCare };
  }, [permissions, config, staffId]);
}
