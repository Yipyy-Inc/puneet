import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { StaffAvailability } from "@/lib/bookings/wizard/availability-types";
import { fittingStarts, nextDays } from "@/lib/bookings/wizard/staff-slots";
import {
  facilityHoursForDate,
  type DayOverride,
  type WeeklyHours,
} from "@/lib/settings/facility-hours";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";

// ============================================================================
// When each trainer can take a private lesson or a consult of a given length
// — the booking wizard's "Trainer & time" (the client's mock, 2026-10-01).
// The grooming calculation's twin (`lib/grooming/availability-server.ts`),
// and like it, one calculation for two callers: staff through their own RLS
// session, customers through the service role AFTER they are shown to be a
// client — and given start times only.
//
//   who        staff who train (primary or additional role), active
//   works      their weekly hours (`staff_availability`); a trainer with
//              none set works the facility's hours that day, so a facility
//              that never filled the table still has times to offer
//   is busy    every booking assigned to them, and every scheduled session of
//              a class they run — a class with nobody enrolled yet still
//              holds the trainer
//   is away    approved time off
//
// Trainer time blocks (calendar events) are not read yet — debt map.
// ============================================================================

const BUSY = [
  "pending",
  "request_submitted",
  "confirmed",
  "checked_in",
  "in_progress",
  "ready",
  "completed",
];

interface StaffRow {
  id: string;
  legacy_id: string | null;
  first_name: string;
  last_name: string;
  primary_role: string;
  additional_roles: string[] | null;
  status: string;
}

const minutesOf = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export async function trainingAvailability(
  supabase: SupabaseClient,
  input: {
    facilityId: string;
    from: string;
    days: number;
    minutes: number;
    step?: number;
    forCustomer: boolean;
    excludeBookingIds?: readonly string[];
    noticeHours?: number;
  },
): Promise<StaffAvailability> {
  const step = input.step ?? 30;
  const dates = nextDays(input.from, Math.max(1, Math.min(31, input.days)));
  const last = dates[dates.length - 1]!;

  const [{ data: facility }, { data: people }, { data: settings }] =
    await Promise.all([
      supabase
        .from("facilities")
        .select("timezone")
        .eq("id", input.facilityId)
        .maybeSingle(),
      supabase
        .from("staff")
        .select(
          "id, legacy_id, first_name, last_name, primary_role, additional_roles, status",
        )
        .eq("facility_id", input.facilityId)
        .eq("status", "active"),
      supabase
        .from("facility_settings")
        .select("domain, value")
        .eq("facility_id", input.facilityId)
        .in("domain", ["business_hours", "schedule_time_overrides"]),
    ]);
  const timeZone =
    (facility as { timezone?: string | null } | null)?.timezone ||
    DEFAULT_TIMEZONE;
  const trainers = ((people ?? []) as StaffRow[]).filter(
    (s) =>
      s.primary_role === "trainer" ||
      (s.additional_roles ?? []).includes("trainer"),
  );
  if (trainers.length === 0) {
    return { staff: [], days: dates.map((date) => ({ date, starts: {} })) };
  }
  const staffIds = trainers.map((t) => t.id);
  const setting = (domain: string) =>
    ((settings ?? []) as Array<{ domain: string; value: unknown }>).find(
      (row) => row.domain === domain,
    )?.value;
  const hours = (setting("business_hours") ?? null) as WeeklyHours | null;
  const overrides = (
    Array.isArray(setting("schedule_time_overrides"))
      ? (setting("schedule_time_overrides") as Array<
          DayOverride & { services?: string[] }
        >)
      : []
  ).filter((o) => !o.services?.length || o.services.includes("training"));

  const rangeStart = new Date(`${input.from}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${last}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const [
    { data: profiles },
    { data: weekly },
    { data: timeOff },
    { data: booked },
    { data: classes },
  ] = await Promise.all([
    supabase
      .from("training_trainer_profiles")
      .select("staff_id, specializations, visible_online")
      .eq("facility_id", input.facilityId)
      .in("staff_id", staffIds),
    supabase
      .from("staff_availability")
      .select(
        "staff_id, day_of_week, is_available, available_from, available_to",
      )
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
      .in("assigned_staff_id", staffIds)
      .in("status", BUSY)
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString()),
    supabase
      .from("training_series_sessions")
      .select(
        "start_at, end_at, status, training_series!inner ( staff_id, status )",
      )
      .eq("facility_id", input.facilityId)
      .neq("status", "cancelled")
      .lt("start_at", rangeEnd.toISOString())
      .gt("end_at", rangeStart.toISOString()),
  ]);

  type Window = { start: number; end: number };
  const profileOf = new Map(
    (
      (profiles ?? []) as Array<{
        staff_id: string;
        specializations: string[] | null;
        visible_online: boolean;
      }>
    ).map((p) => [p.staff_id, p]),
  );
  const weeklyRows = (weekly ?? []) as Array<{
    staff_id: string;
    day_of_week: number;
    is_available: boolean;
    available_from: string | null;
    available_to: string | null;
  }>;
  const hasWeekly = new Set(weeklyRows.map((r) => r.staff_id));

  const busy = new Map<string, Window[]>();
  const hold = (staffId: string, startAt: string, endAt: string) => {
    const from = wallClockParts(startAt, timeZone);
    const to = wallClockParts(endAt, timeZone);
    const key = `${staffId}|${from.date}`;
    const list = busy.get(key) ?? [];
    list.push({
      start: minutesOf(from.time),
      end: to.date === from.date ? minutesOf(to.time) : 24 * 60,
    });
    busy.set(key, list);
  };
  const excluded = new Set(input.excludeBookingIds ?? []);
  for (const row of (booked ?? []) as Array<{
    id: string;
    assigned_staff_id: string;
    start_at: string;
    end_at: string;
  }>) {
    if (!excluded.has(row.id))
      hold(row.assigned_staff_id, row.start_at, row.end_at);
  }
  for (const row of (classes ?? []) as unknown as Array<{
    start_at: string;
    end_at: string;
    training_series: { staff_id: string | null; status: string } | null;
  }>) {
    const series = row.training_series;
    if (!series?.staff_id || series.status !== "active") continue;
    if (!staffIds.includes(series.staff_id)) continue;
    hold(series.staff_id, row.start_at, row.end_at);
  }

  const away = (staffId: string, date: string) =>
    (
      (timeOff ?? []) as Array<{
        staff_id: string;
        starts_on: string;
        ends_on: string;
      }>
    ).some(
      (t) => t.staff_id === staffId && t.starts_on <= date && t.ends_on >= date,
    );

  const windowsFor = (staffId: string, date: string): Window[] => {
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (hasWeekly.has(staffId)) {
      return weeklyRows
        .filter(
          (r) =>
            r.staff_id === staffId &&
            r.day_of_week === weekday &&
            r.is_available &&
            r.available_from &&
            r.available_to,
        )
        .map((r) => ({
          start: minutesOf(r.available_from!),
          end: minutesOf(r.available_to!),
        }));
    }
    // No weekly hours set: the facility's own hours that day.
    const day = facilityHoursForDate(date, hours, overrides);
    if (!day?.isOpen) return [];
    return [{ start: minutesOf(day.openTime), end: minutesOf(day.closeTime) }];
  };

  const earliest = new Date(
    Date.now() + Math.max(0, input.noticeHours ?? 0) * 3_600_000,
  );
  const earliestLocal = wallClockParts(earliest.toISOString(), timeZone);

  const appId = (t: StaffRow) => t.legacy_id ?? t.id;
  const days = dates.map((date) => {
    const starts: Record<string, number[]> = {};
    if (date < earliestLocal.date) return { date, starts };
    for (const trainer of trainers) {
      if (away(trainer.id, date)) continue;
      const working = windowsFor(trainer.id, date);
      if (working.length === 0) continue;
      starts[appId(trainer)] = fittingStarts(
        { working, busy: busy.get(`${trainer.id}|${date}`) ?? [] },
        input.minutes,
        step,
        date === earliestLocal.date ? minutesOf(earliestLocal.time) : undefined,
      );
    }
    return { date, starts };
  });

  return {
    staff: trainers.map((t) => {
      const profile = profileOf.get(t.id);
      const first = t.first_name?.trim() ?? "";
      const lastName = t.last_name?.trim() ?? "";
      const name = input.forCustomer
        ? profile?.visible_online
          ? `${first}${lastName ? ` ${lastName.charAt(0)}.` : ""}`.trim() ||
            null
          : null
        : `${first} ${lastName}`.trim() || null;
      return {
        id: appId(t),
        name,
        role:
          (profile?.specializations ?? []).filter(Boolean).join(" · ") || null,
        packageIds: [],
        canHandleMatted: true,
      };
    }),
    days,
  };
}
