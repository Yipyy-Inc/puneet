import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { fittingStarts, nextDays } from "@/lib/bookings/wizard/staff-slots";
import { wallClockParts, DEFAULT_TIMEZONE } from "@/lib/time/facility-time";
import type { StaffAvailability } from "@/lib/bookings/wizard/availability-types";

// ============================================================================
// When each groomer can take an appointment of a given length, over the next
// days — the booking wizard's "Groomer & time" (the client's mock,
// 2026-10-01). One calculation, two callers:
//
//   staff      `/api/grooming/availability`, through their own RLS session
//   customers  `/api/customer/grooming/availability`, through the service
//              role, AFTER the caller is shown to be a client there — and
//              given START TIMES ONLY. Never who is busy, when, or why.
//
// A groomer works their weekly hours (`grooming_stylist_availability`, 0 =
// Sunday, several windows a day allowed) unless on approved time off or on
// leave; their grooms (`bookings.assigned_staff_id`) are what they are busy
// with. Which DAYS the facility is closed is the wizard's, from the
// facility's hours and date blocks — the same rules every schedule screen
// reads — so it is not decided twice.
// ============================================================================

/** A groom that is not cancelled, declined, a no-show, waitlisted or an estimate. */
const BUSY = [
  "pending",
  "request_submitted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
];

interface ProfileRow {
  id: string;
  legacy_id: string | null;
  staff_id: string;
  specializations: string[] | null;
  on_leave: boolean;
  visible_online: boolean;
  qualified_service_ids: string[] | null;
  can_handle_matted: boolean;
  staff: { first_name: string; last_name: string; status: string } | null;
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export async function groomingAvailability(
  supabase: SupabaseClient,
  input: {
    facilityId: string;
    /** YYYY-MM-DD, the facility's own day. */
    from: string;
    days: number;
    /** The whole appointment: every pet back to back, add-ons included. */
    minutes: number;
    step?: number;
    /** A customer's view: online-visible names only, initials for surnames. */
    forCustomer: boolean;
    /** Bookings whose time is being rebooked (an edit): not busy. */
    excludeBookingIds?: readonly string[];
    /** A customer may not start sooner than this many hours ahead. */
    noticeHours?: number;
  },
): Promise<StaffAvailability> {
  const step = input.step ?? 30;
  const dates = nextDays(input.from, Math.max(1, Math.min(31, input.days)));
  const last = dates[dates.length - 1]!;

  const [{ data: facility }, { data: profiles }] = await Promise.all([
    supabase
      .from("facilities")
      .select("timezone")
      .eq("id", input.facilityId)
      .maybeSingle(),
    supabase
      .from("grooming_stylist_profiles")
      .select(
        "id, legacy_id, staff_id, specializations, on_leave, visible_online, qualified_service_ids, can_handle_matted, staff ( first_name, last_name, status )",
      )
      .eq("facility_id", input.facilityId),
  ]);
  const timeZone =
    (facility as { timezone?: string | null } | null)?.timezone ||
    DEFAULT_TIMEZONE;

  const groomers = ((profiles ?? []) as unknown as ProfileRow[]).filter(
    (p) => p.staff?.status === "active" && !p.on_leave,
  );
  if (groomers.length === 0) {
    return { staff: [], days: dates.map((date) => ({ date, starts: {} })) };
  }
  const staffIds = groomers.map((g) => g.staff_id);

  const rangeStart = new Date(`${input.from}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${last}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const [{ data: weekly }, { data: timeOff }, { data: grooms }] =
    await Promise.all([
      supabase
        .from("grooming_stylist_availability")
        .select("staff_id, day_of_week, start_time, end_time, is_available")
        .eq("facility_id", input.facilityId)
        .in("staff_id", staffIds),
      supabase
        .from("staff_time_off_requests")
        .select("staff_id, starts_on, ends_on")
        .eq("facility_id", input.facilityId)
        .eq("status", "approved")
        .in("staff_id", staffIds)
        .lte("starts_on", last)
        .gte("ends_on", input.from),
      supabase
        .from("bookings")
        .select("id, assigned_staff_id, start_at, end_at")
        .eq("facility_id", input.facilityId)
        .eq("service", "grooming")
        .in("assigned_staff_id", staffIds)
        .in("status", BUSY)
        .lt("start_at", rangeEnd.toISOString())
        .gt("end_at", rangeStart.toISOString()),
    ]);

  type Window = { start: number; end: number };
  const windows = new Map<string, Window[]>();
  for (const row of (weekly ?? []) as Array<{
    staff_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_available: boolean;
  }>) {
    if (!row.is_available) continue;
    const key = `${row.staff_id}|${row.day_of_week}`;
    const list = windows.get(key) ?? [];
    list.push({
      start: minutesOf(row.start_time),
      end: minutesOf(row.end_time),
    });
    windows.set(key, list);
  }

  const off = (staffId: string, date: string) =>
    (
      (timeOff ?? []) as Array<{
        staff_id: string;
        starts_on: string;
        ends_on: string;
      }>
    ).some(
      (t) => t.staff_id === staffId && t.starts_on <= date && t.ends_on >= date,
    );

  const excluded = new Set(input.excludeBookingIds ?? []);
  const busy = new Map<string, Window[]>();
  for (const row of (grooms ?? []) as Array<{
    id: string;
    assigned_staff_id: string;
    start_at: string;
    end_at: string;
  }>) {
    if (excluded.has(row.id)) continue;
    const from = wallClockParts(row.start_at, timeZone);
    const to = wallClockParts(row.end_at, timeZone);
    const key = `${row.assigned_staff_id}|${from.date}`;
    const list = busy.get(key) ?? [];
    list.push({
      start: minutesOf(from.time),
      // A groom past midnight holds the rest of its first day.
      end: to.date === from.date ? minutesOf(to.time) : 24 * 60,
    });
    busy.set(key, list);
  }

  // The earliest start a booking may take: now, plus a customer's notice.
  const earliest = new Date(
    Date.now() + Math.max(0, input.noticeHours ?? 0) * 3_600_000,
  );
  const earliestLocal = wallClockParts(earliest.toISOString(), timeZone);

  const days = dates.map((date) => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const starts: Record<string, number[]> = {};
    if (date < earliestLocal.date) return { date, starts };
    for (const g of groomers) {
      if (off(g.staff_id, date)) continue;
      const working = windows.get(`${g.staff_id}|${weekday}`) ?? [];
      if (working.length === 0) continue;
      starts[g.legacy_id ?? g.id] = fittingStarts(
        { working, busy: busy.get(`${g.staff_id}|${date}`) ?? [] },
        input.minutes,
        step,
        date === earliestLocal.date ? minutesOf(earliestLocal.time) : undefined,
      );
    }
    return { date, starts };
  });

  return {
    staff: groomers.map((g) => {
      const first = g.staff?.first_name?.trim() ?? "";
      const lastName = g.staff?.last_name?.trim() ?? "";
      const name = input.forCustomer
        ? g.visible_online
          ? `${first}${lastName ? ` ${lastName.charAt(0)}.` : ""}`.trim() ||
            null
          : null
        : `${first} ${lastName}`.trim() || null;
      return {
        id: g.legacy_id ?? g.id,
        name,
        role: (g.specializations ?? []).filter(Boolean).join(" · ") || null,
        packageIds: g.qualified_service_ids ?? [],
        canHandleMatted: g.can_handle_matted,
      };
    }),
    days,
  };
}
