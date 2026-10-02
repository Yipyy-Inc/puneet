import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { nextDays, shortPersonName } from "@/lib/bookings/wizard/staff-slots";
import { minutesOf, type TimeWindow } from "@/lib/bookings/wizard/time-windows";
import {
  evaluationDay,
  startFor,
  type BookedEvaluation,
  type EvaluationDay,
  type EvaluationStart,
  type EvaluatorDay,
} from "@/lib/evaluations/availability";
import type {
  EvaluationAvailability,
  EvaluatorOption,
} from "@/lib/evaluations/availability-types";
import {
  facilityDay,
  type FacilityCalendar,
} from "@/lib/evaluations/facility-days";
import { evaluationSchedule } from "@/lib/evaluations/schedule";
import { settingsFromRows } from "@/lib/settings/from-rows";
import {
  facilityHoursForDate,
  type WeeklyHours,
} from "@/lib/settings/facility-hours";
import { DEFAULT_TIMEZONE, wallClockParts } from "@/lib/time/facility-time";
import { facilityHolidays } from "@/data/settings";
import type { EvaluationConfig } from "@/types/facility";

// ============================================================================
// When an evaluation can start, over the next days — the booking wizard's
// "Pick a date & time" (the client's mock, 2026-10-02). One calculation
// (`lib/evaluations/availability.ts`), three callers:
//
//   staff      `/api/evaluations/availability`, through their own session
//   customers  `/api/customer/evaluations/availability`, through the service
//              role AFTER the caller is shown to be a client there — given
//              starts, places left and evaluators' first names; never who
//              booked, when, or why anyone is busy
//   a booking  POST /api/bookings re-checks the start it was asked for, so
//              a time somebody else just took is refused, not double-booked
//
// Places: every evaluation not cancelled holds its pets' places from start
// to end plus the buffer. Evaluators: active staff holding "Run evaluations"
// (`public.facility_evaluators`); one works their weekly hours
// (`staff_availability`) — or the facility's hours that day when they have
// none — unless on approved time off, and is busy with the appointments of
// OTHER services assigned to them. Another evaluation at the same time is
// not busy: pets at the same time is the facility's number, and an
// evaluator runs the group.
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

const DOMAINS = [
  "evaluation_config",
  "business_hours",
  "schedule_time_overrides",
  "service_date_blocks",
];

export interface AvailabilityInput {
  facilityId: string;
  /** YYYY-MM-DD, the facility's own day. */
  from: string;
  days: number;
  /** How many pets this booking brings. */
  pets: number;
  forCustomer: boolean;
  /** Bookings being rebooked (an edit): they hold no places. */
  excludeBookingIds?: readonly string[];
  now?: Date;
}

interface BookingRow {
  id: string;
  start_at: string;
  end_at: string;
  assigned_staff_id: string | null;
  service: string;
  booking_pets: Array<{ count: number }> | null;
}

export async function evaluationAvailability(
  supabase: SupabaseClient,
  input: AvailabilityInput,
): Promise<EvaluationAvailability> {
  const now = input.now ?? new Date();
  const dates = nextDays(input.from, Math.max(1, Math.min(31, input.days)));
  const last = dates[dates.length - 1]!;

  const [{ data: facility }, { data: settingRows }, { data: evaluatorRows }] =
    await Promise.all([
      supabase
        .from("facilities")
        .select("timezone")
        .eq("id", input.facilityId)
        .maybeSingle(),
      supabase
        .from("facility_settings")
        .select("domain, value")
        .eq("facility_id", input.facilityId)
        .in("domain", DOMAINS),
      supabase.rpc("facility_evaluators", { p_facility_id: input.facilityId }),
    ]);
  const timeZone =
    (facility as { timezone?: string | null } | null)?.timezone ||
    DEFAULT_TIMEZONE;
  const settings = settingsFromRows(
    (settingRows ?? []) as Array<{ domain: string; value: unknown }>,
  );
  // Parsed against each domain's schema by settingsFromRows; typed here.
  const config = settings.evaluation_config.value as EvaluationConfig;
  const schedule = evaluationSchedule(config);
  const calendar: FacilityCalendar = {
    hours: settings.business_hours.value as WeeklyHours,
    overrides: settings.schedule_time_overrides
      .value as FacilityCalendar["overrides"],
    blocks: settings.service_date_blocks.value as FacilityCalendar["blocks"],
    holidays: facilityHolidays,
  };
  const picksEvaluator = !input.forCustomer || config.customerPicksEvaluator;

  const rangeStart = new Date(`${input.from}T00:00:00Z`);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  const rangeEnd = new Date(`${last}T00:00:00Z`);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 2);

  const evaluators = (
    (evaluatorRows ?? []) as Array<{
      staff_id: string;
      first_name: string;
      last_name: string;
      job_title: string | null;
    }>
  ).map((row) => ({
    id: row.staff_id,
    full: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim(),
    role: row.job_title?.trim() || null,
  }));
  const evaluatorIds = evaluators.map((e) => e.id);

  const [{ data: booked }, { data: weekly }, { data: timeOff }] =
    await Promise.all([
      supabase
        .from("bookings")
        .select(
          "id, start_at, end_at, assigned_staff_id, service, booking_pets(count)",
        )
        .eq("facility_id", input.facilityId)
        .in("status", BUSY)
        .lt("start_at", rangeEnd.toISOString())
        .gt("end_at", rangeStart.toISOString())
        .or(
          evaluatorIds.length > 0 && picksEvaluator
            ? `service.eq.evaluation,assigned_staff_id.in.(${evaluatorIds.join(",")})`
            : "service.eq.evaluation",
        ),
      picksEvaluator && evaluatorIds.length > 0
        ? supabase
            .from("staff_availability")
            .select(
              "staff_id, day_of_week, is_available, available_from, available_to",
            )
            .eq("facility_id", input.facilityId)
            .in("staff_id", evaluatorIds)
        : Promise.resolve({ data: [] }),
      picksEvaluator && evaluatorIds.length > 0
        ? supabase
            .from("staff_time_off_requests")
            .select("staff_id, starts_on, ends_on")
            .eq("facility_id", input.facilityId)
            .eq("status", "approved")
            .in("staff_id", evaluatorIds)
            .lte("starts_on", last)
            .gte("ends_on", input.from)
        : Promise.resolve({ data: [] }),
    ]);

  const excluded = new Set(input.excludeBookingIds ?? []);
  const rows = ((booked ?? []) as BookingRow[]).filter(
    (row) => !excluded.has(row.id),
  );

  // Each evaluation's places, by the facility's day it falls on.
  const held = new Map<string, BookedEvaluation[]>();
  // Each evaluator's other appointments, by day.
  const busy = new Map<string, TimeWindow[]>();
  const span = (row: BookingRow) => {
    const from = wallClockParts(row.start_at, timeZone);
    const to = wallClockParts(row.end_at, timeZone);
    return {
      date: from.date,
      start: minutesOf(from.time) ?? 0,
      end: to.date === from.date ? (minutesOf(to.time) ?? 24 * 60) : 24 * 60,
    };
  };
  for (const row of rows) {
    const { date, start, end } = span(row);
    if (row.service === "evaluation") {
      const pets = Math.max(1, row.booking_pets?.[0]?.count ?? 1);
      const list = held.get(date) ?? [];
      list.push({ start, end, pets });
      held.set(date, list);
    } else if (row.assigned_staff_id) {
      const key = `${row.assigned_staff_id}|${date}`;
      const list = busy.get(key) ?? [];
      list.push({ start, end });
      busy.set(key, list);
    }
  }

  const weeklyRows = (weekly ?? []) as Array<{
    staff_id: string;
    day_of_week: number;
    is_available: boolean;
    available_from: string | null;
    available_to: string | null;
  }>;
  const hasWeekly = new Set(weeklyRows.map((r) => r.staff_id));
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
  const workingOn = (staffId: string, date: string): TimeWindow[] => {
    if (away(staffId, date)) return [];
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
          start: minutesOf(r.available_from) ?? 0,
          end: minutesOf(r.available_to) ?? 0,
        }));
    }
    // No weekly hours set: the facility's own hours that day, else all day.
    const day = facilityHoursForDate(date, calendar.hours, calendar.overrides);
    if (day && !day.isOpen) return [];
    const open = minutesOf(day?.openTime);
    const close = minutesOf(day?.closeTime);
    return open !== null && close !== null && close > open
      ? [{ start: open, end: close }]
      : [{ start: 0, end: 24 * 60 }];
  };

  // Today's starts that have passed — and, for a customer, the notice and
  // the furthest day the facility takes bookings for.
  const nowLocal = wallClockParts(now.toISOString(), timeZone);
  const earliestLocal = input.forCustomer
    ? wallClockParts(
        new Date(
          now.getTime() + schedule.noticeHours * 3_600_000,
        ).toISOString(),
        timeZone,
      )
    : nowLocal;
  const lastDay =
    input.forCustomer && schedule.aheadDays !== null
      ? nextDays(nowLocal.date, schedule.aheadDays + 1).at(-1)!
      : null;

  const days: EvaluationDay[] = dates.map((date) => {
    const base = facilityDay(date, calendar);
    const tooSoon = date < earliestLocal.date;
    const tooFar = lastDay !== null && date > lastDay;
    const evaluatorDays: EvaluatorDay[] = picksEvaluator
      ? evaluators.map((e) => ({
          id: e.id,
          working: workingOn(e.id, date),
          busy: busy.get(`${e.id}|${date}`) ?? [],
        }))
      : [];
    return evaluationDay(
      schedule,
      {
        ...base,
        closed: base.closed || tooSoon || tooFar,
        booked: held.get(date) ?? [],
        notBefore:
          date === earliestLocal.date
            ? (minutesOf(earliestLocal.time) ?? 0)
            : undefined,
        evaluators: evaluatorDays,
      },
      input.pets,
    );
  });

  const named: EvaluatorOption[] = picksEvaluator
    ? evaluators.map((e) => ({
        id: e.id,
        name: input.forCustomer ? shortPersonName(e.full) : e.full || null,
        role: e.role,
      }))
    : [];

  return {
    mode: schedule.mode,
    minutes: schedule.minutes,
    capacity: schedule.capacity,
    windows: schedule.windows.map((w) => ({ id: w.id, label: w.label })),
    dropOff: schedule.mode === "days" ? schedule.openRange : null,
    picksEvaluator,
    evaluators: named,
    // A customer never learns which evaluator is free when; staff do.
    days:
      input.forCustomer && !config.customerPicksEvaluator
        ? days.map((day) => ({
            ...day,
            starts: day.starts.map((s) => ({ ...s, evaluatorIds: [] })),
          }))
        : days,
  };
}

/**
 * The start a booking asks for, re-checked against everything booked now —
 * null when it is not offered, has no room for `pets`, or the chosen
 * evaluator is not free then.
 */
export async function checkEvaluationStart(
  supabase: SupabaseClient,
  input: {
    facilityId: string;
    date: string;
    /** Minutes from midnight. */
    start: number;
    pets: number;
    evaluatorId?: string | null;
    forCustomer: boolean;
    excludeBookingIds?: readonly string[];
    now?: Date;
  },
): Promise<EvaluationStart | null> {
  const availability = await evaluationAvailability(supabase, {
    facilityId: input.facilityId,
    from: input.date,
    days: 1,
    pets: input.pets,
    forCustomer: input.forCustomer,
    excludeBookingIds: input.excludeBookingIds,
    now: input.now,
  });
  const day = availability.days[0];
  if (!day || day.date !== input.date) return null;
  return startFor(day, input.start, input.pets, input.evaluatorId);
}
